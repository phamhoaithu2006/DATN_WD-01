<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreBookingRequest;
use App\Http\Requests\Customer\UpdateCustomerBookingInformationRequest;
use App\Jobs\ProcessTourRefundOutbox;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\TourRefundOutbox;
use App\Models\User;
use App\Services\BookingPhoneDuplicateGuard;
use App\Services\TourPricingService;
use App\Services\VnpayPaymentLifecycleService;
use App\Services\VnpayService;
use App\Support\BookingPhoneNormalizer;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CustomerBookingController extends Controller
{
    public function __construct(
        private readonly TourPricingService $tourPricingService,
        private readonly BookingPhoneDuplicateGuard $bookingPhoneDuplicateGuard,
        private readonly VnpayService $vnpayService,
        private readonly VnpayPaymentLifecycleService $paymentLifecycleService,
    ) {}

    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tour_departure_id' => ['required', 'integer', 'exists:tour_departures,id'],
            'quantity_summary' => ['required', 'array', 'min:1', 'max:20'],
            'quantity_summary.*.rule_id' => ['nullable', 'integer', 'exists:tour_age_pricing_rules,id'],
            'quantity_summary.*.quantity' => ['required', 'integer', 'min:0', 'max:20'],
        ]);

        $departure = TourDeparture::query()->findOrFail($data['tour_departure_id']);
        $tour = Tour::query()
            ->with('agePricingRules')
            ->findOrFail($departure->tour_id);

        $this->ensureDepartureCanBeBooked($tour, $departure);

        $summary = $this->buildQuantityPricing($tour, $departure, $data['quantity_summary']);
        $availableSlots = (int) $departure->total_slots - (int) $departure->booked_slots;

        if ($summary['total_people'] < 1) {
            throw ValidationException::withMessages([
                'quantity_summary' => 'Vui lòng chọn ít nhất 1 người tham gia.',
            ]);
        }

        if ($availableSlots < $summary['total_people']) {
            throw ValidationException::withMessages([
                'quantity_summary' => "Lịch này chỉ còn {$availableSlots} chỗ trống.",
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Tính giá đặt tour thành công.',
            'data' => [
                'tour_departure_id' => $departure->id,
                'departure_date' => $departure->departure_date?->toDateString(),
                'return_date' => $departure->return_date?->toDateString(),
                'adult_price' => $summary['adult_price'],
                'available_slots' => $availableSlots,
                'total_people' => $summary['total_people'],
                'subtotal' => $summary['subtotal'],
                'discount_amount' => 0,
                'total_amount' => $summary['subtotal'],
                'pricing_groups' => $summary['groups'],
            ],
        ]);
    }

    public function activePending(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tour_id' => ['required', 'integer', 'exists:tours,id'],
        ]);

        $booking = $this->activeCustomerPendingBooking(
            (int) $request->user()->id,
            (int) $data['tour_id'],
        );

        return response()->json([
            'success' => true,
            'data' => $booking,
        ]);
    }

    public function store(StoreBookingRequest $request): JsonResponse
    {
        $idempotencyKey = $this->idempotencyKey($request);

        if (! $this->vnpayService->isConfigured()) {
            throw ValidationException::withMessages([
                'payment' => ['VNPAY Sandbox chưa được cấu hình. Vui lòng liên hệ quản trị viên.'],
            ]);
        }

        $data = $request->validated();
        $user = $request->user();
        $userId = (int) $user->id;
        $frontendOrigin = $this->vnpayService->frontendOrigin($request);

        $result = DB::transaction(function () use ($data, $userId, $idempotencyKey, $frontendOrigin) {
            // Khóa user để hai request tạo booking khác nhau của cùng khách
            // không thể cùng vượt qua kiểm tra đơn chờ thanh toán.
            $lockedUser = User::query()
                ->lockForUpdate()
                ->findOrFail($userId);

            $existingBooking = Booking::query()
                ->where('user_id', $lockedUser->id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existingBooking) {
                if ($frontendOrigin) {
                    $existingBooking->payment()->update([
                        'frontend_origin' => $frontendOrigin,
                    ]);
                }

                return ['booking' => $existingBooking, 'created' => false];
            }

            // Scheduler thường xuyên dọn các đơn hết hạn, nhưng xử lý thêm tại
            // thời điểm đặt để không giữ chỗ cũ nếu scheduler vừa chậm chạy.
            $this->expireCustomerPendingBookings($lockedUser->id);

            $activePendingBooking = $this->activeCustomerPendingBooking($lockedUser->id);

            if ($activePendingBooking) {
                return [
                    'booking' => $activePendingBooking,
                    'blocked' => true,
                ];
            }

            // Khóa lịch khởi hành để tránh overbooking khi nhiều người đặt cùng lúc
            $departure = TourDeparture::query()
                ->lockForUpdate()
                ->findOrFail($data['tour_departure_id']);

            // Tour dùng SoftDelete thì query này tự bỏ tour đã bị xóa mềm
            $tour = Tour::query()
                ->with('agePricingRules')
                ->lockForUpdate()
                ->findOrFail($departure->tour_id);

            $this->ensureDepartureCanBeBooked($tour, $departure);
            $this->bookingPhoneDuplicateGuard->ensureAvailable(
                $tour->id,
                $this->submittedPhones($data['contact'], $data['participants'])
            );

            $numberOfPeople = (int) $data['number_of_people'];
            $quantitySummary = ! empty($data['quantity_summary'])
                ? $data['quantity_summary']
                : [
                    ['rule_id' => null, 'quantity' => $numberOfPeople],
                ];
            $pricingSummary = $this->buildQuantityPricing($tour, $departure, $quantitySummary);

            if ($pricingSummary['total_people'] < 1) {
                throw ValidationException::withMessages([
                    'quantity_summary' => 'Vui lòng chọn ít nhất 1 người tham gia.',
                ]);
            }

            $availableSlots = (int) $departure->total_slots
                - (int) $departure->booked_slots;

            if ($pricingSummary['total_people'] !== $numberOfPeople) {
                throw ValidationException::withMessages([
                    'quantity_summary' => ['Tổng số lượng theo nhóm giá phải đúng bằng số hành khách.'],
                ]);
            }

            if ($availableSlots < $pricingSummary['total_people']) {
                throw ValidationException::withMessages([
                    'number_of_people' => [
                        "Lịch này chỉ còn {$availableSlots} chỗ trống.",
                    ],
                ]);
            }

            // Giá lịch khởi hành được ưu tiên.
            // Nếu lịch chưa có giá thì lấy giá khuyến mãi tour, sau đó mới lấy giá gốc.
            $unitPrice = $this->tourPricingService->resolveAdultPrice($tour, $departure);

            if ($unitPrice <= 0) {
                throw ValidationException::withMessages([
                    'tour_departure_id' => [
                        'Lịch khởi hành chưa có giá hợp lệ.',
                    ],
                ]);
            }

            $discountAmount = 0;
            $pricedParticipants = collect($data['participants'] ?? [])
                ->map(function (array $participant, int $index) use ($tour, $departure) {
                    $birthDate = Carbon::parse($participant['birth_date']);
                    $age = (int) $birthDate->diffInYears($departure->departure_date);

                    if ($birthDate->isAfter($departure->departure_date) || $age > 120) {
                        throw ValidationException::withMessages([
                            "participants.{$index}.birth_date" => ['Ngày sinh không hợp lệ.'],
                        ]);
                    }

                    $pricing = $this->tourPricingService->calculateParticipantPrice(
                        $tour,
                        $departure,
                        $birthDate,
                        $departure->departure_date
                    );
                    $rule = $pricing['rule'];

                    return [
                        'full_name' => $participant['full_name'],
                        'phone' => $participant['phone'] ?? null,
                        'phone_normalized' => $participant['phone'] ?? null,
                        'birth_date' => $birthDate->toDateString(),
                        'gender' => $participant['gender'] ?? null,
                        'identity_number' => $participant['identity_number'] ?? null,
                        'participant_type' => $this->participantTypeFromPricingRule($rule),
                        'unit_price' => $pricing['unit_price'],
                        'pricing_rule_label' => $rule?->label ?? 'Người lớn mặc định',
                        'pricing_type' => $rule?->pricing_type ?? 'percentage',
                        'pricing_value' => $rule?->price_value ?? 100,
                        '_pricing_rule_id' => $rule?->id,
                        '_derived_type' => $this->participantTypeFromPricingRule($rule),
                        '_participant_index' => $index,
                    ];
                });

            // Loại khách suy ra từ quy tắc giá (không tin participant_type do client gửi)
            if (! $pricedParticipants->contains(fn (array $participant) => $participant['_derived_type'] === 'adult')) {
                throw ValidationException::withMessages([
                    'participants' => ['Đơn đặt tour phải có ít nhất 1 người lớn đi kèm.'],
                ]);
            }

            $this->ensureParticipantGroupsMatchQuantitySummary($pricedParticipants, $quantitySummary);

            $participantsForInsert = $pricedParticipants
                ->map(function (array $participant) {
                    unset(
                        $participant['_pricing_rule_id'],
                        $participant['_derived_type'],
                        $participant['_participant_index'],
                    );

                    return $participant;
                });
            $participantsSubtotal = (float) $pricedParticipants->sum('unit_price');
            $totalAmount = round(max(0, $participantsSubtotal - $discountAmount), 2);

            if ($totalAmount < VnpayService::MIN_AMOUNT || $totalAmount >= VnpayService::MAX_AMOUNT) {
                throw ValidationException::withMessages([
                    'payment' => ['Tổng tiền thanh toán qua VNPAY phải từ 5.000đ đến dưới 1 tỷ đồng.'],
                ]);
            }

            $booking = Booking::create([
                'booking_code' => 'BK-'.Str::upper((string) Str::ulid()),
                'idempotency_key' => $idempotencyKey,
                'user_id' => $lockedUser->id,
                'tour_id' => $tour->id,
                'tour_departure_id' => $departure->id,

                // Chưa xử lý mã khuyến mãi thì để null / 0
                'promotion_id' => null,
                'staff_id' => null,

                'number_of_people' => $numberOfPeople,
                'unit_price' => $unitPrice,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,

                // Đổi lại nếu ENUM/status của bạn dùng tên khác
                'status' => 'pending',
                'payment_status' => 'unpaid',

                'note' => $data['note'] ?? null,
            ]);

            $booking->contact()->create([
                'contact_name' => $data['contact']['contact_name'],
                'contact_email' => $data['contact']['contact_email'] ?? null,
                'contact_phone' => $data['contact']['contact_phone'],
                'phone_normalized' => $data['contact']['contact_phone'],
                'address' => $data['contact']['address'] ?? null,
                'special_request' => $data['contact']['special_request'] ?? null,
            ]);

            $booking->participants()->createMany($participantsForInsert->all());

            $booking->payment()->create([
                'frontend_origin' => $frontendOrigin,
                'payment_method' => 'vnpay',
                'amount' => $totalAmount,
                'status' => 'pending',
                'paid_at' => null,
                'expires_at' => now('Asia/Ho_Chi_Minh')->addMinutes(15),
            ]);

            $booking->statusHistories()->create([
                'changed_by' => $lockedUser->id,
                'old_status' => null,
                'new_status' => 'pending',
                'note' => 'Khách hàng tạo đơn đặt tour.',
            ]);

            return ['booking' => $booking, 'created' => true];
        }, 3);

        $booking = $result['booking'];

        if ($result['blocked'] ?? false) {
            $booking->load([
                'tour:id,title,slug',
                'tourDeparture:id,tour_id,departure_date,return_date',
                'payment:id,booking_id,amount,status,expires_at',
            ]);

            return response()->json([
                'success' => false,
                'code' => 'ACTIVE_PENDING_BOOKING',
                'message' => 'Bạn đang có một đơn chờ thanh toán. Vui lòng tiếp tục thanh toán đơn hiện có trước khi đặt tour mới.',
                'data' => [
                    'booking_id' => $booking->id,
                    'booking_code' => $booking->booking_code,
                    'tour_title' => $booking->tour?->title,
                    'departure_date' => $booking->tourDeparture?->departure_date?->toDateString(),
                    'number_of_people' => $booking->number_of_people,
                    'total_amount' => $booking->total_amount,
                    'payment_id' => $booking->payment?->id,
                    'expires_at' => $booking->payment?->expires_at?->toIso8601String(),
                ],
            ], 409);
        }

        $booking->load([
            'tour:id,title,slug',
            'tourDeparture:id,tour_id,departure_date,return_date,price,base_price,discount_price,total_slots,booked_slots,status',
            'contact',
            'participants',
            'payment',
        ]);

        $checkoutUrl = $this->vnpayService->createPaymentUrl($booking->payment, $request);

        return response()->json([
            'success' => true,
            'message' => 'Đặt tour thành công. Đang chuyển đến VNPAY để thanh toán.',
            'data' => array_merge($booking->toArray(), [
                'checkout_url' => $checkoutUrl,
                'payment_id' => $booking->payment->id,
                'expires_at' => $booking->payment->expires_at?->toIso8601String(),
            ]),
        ], $result['created'] ? 201 : 200);
    }

    public function updateInformation(UpdateCustomerBookingInformationRequest $request, Booking $booking): JsonResponse
    {
        if ($booking->user_id !== $request->user()->id) {
            abort(404);
        }

        $data = $request->validated();

        $updatedBooking = DB::transaction(function () use ($booking, $request, $data): Booking {
            $lockedBooking = Booking::query()
                ->with(['tourDeparture', 'contact', 'participants'])
                ->lockForUpdate()
                ->findOrFail($booking->id);

            if ($lockedBooking->user_id !== $request->user()->id) {
                abort(404);
            }

            $this->ensureBookingInformationCanBeUpdated($lockedBooking);
            $this->ensureSameParticipants($lockedBooking, $data['participants']);
            $this->bookingPhoneDuplicateGuard->ensureAvailable(
                $lockedBooking->tour_id,
                $this->submittedPhones($data['contact'], $data['participants']),
                $lockedBooking->id,
            );

            $before = $this->bookingInformationSnapshot($lockedBooking);
            $lockedBooking->contact()->updateOrCreate(
                ['booking_id' => $lockedBooking->id],
                [
                    'contact_name' => $data['contact']['contact_name'],
                    'contact_email' => $data['contact']['contact_email'] ?? null,
                    'contact_phone' => $data['contact']['contact_phone'],
                    'phone_normalized' => $data['contact']['contact_phone'],
                    'address' => $data['contact']['address'] ?? null,
                    'special_request' => $data['contact']['special_request'] ?? null,
                ],
            );

            $participantsById = $lockedBooking->participants->keyBy('id');
            foreach ($data['participants'] as $participant) {
                $participantsById[(int) $participant['id']]->update([
                    'full_name' => $participant['full_name'],
                    'phone' => $participant['phone'] ?? null,
                    'phone_normalized' => $participant['phone'] ?? null,
                    'gender' => $participant['gender'],
                    'identity_number' => $participant['identity_number'] ?? null,
                ]);
            }

            $lockedBooking->load(['contact', 'participants']);
            $lockedBooking->informationChangeHistories()->create([
                'changed_by' => $request->user()->id,
                'before' => $before,
                'after' => $this->bookingInformationSnapshot($lockedBooking),
            ]);

            return $lockedBooking;
        }, 3);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật thông tin booking.',
            'data' => $updatedBooking->fresh([
                'tour.category',
                'tour.destination',
                'tour.thumbnail',
                'tourDeparture',
                'payment',
                'contact',
                'participants',
            ]),
        ]);
    }

    public function continuePayment(Request $request, Booking $booking): JsonResponse
    {
        if ($booking->user_id !== $request->user()->id) {
            abort(404);
        }

        $frontendOrigin = $this->vnpayService->frontendOrigin($request);

        $result = DB::transaction(function () use ($booking, $request, $frontendOrigin): array {
            $lockedBooking = Booking::query()
                ->lockForUpdate()
                ->findOrFail($booking->id);

            if ($lockedBooking->user_id !== $request->user()->id) {
                abort(404);
            }

            $payment = Payment::query()
                ->where('booking_id', $lockedBooking->id)
                ->lockForUpdate()
                ->first();

            if (
                $lockedBooking->status !== 'pending'
                || $lockedBooking->payment_status !== 'unpaid'
                || ! $payment
                || $payment->payment_method !== 'vnpay'
                || $payment->status !== 'pending'
            ) {
                return ['error' => 'Đơn hàng này không còn ở trạng thái chờ thanh toán.'];
            }

            if (! $payment->expires_at || $payment->expires_at->isPast()) {
                $this->paymentLifecycleService->failPendingPayment(
                    $payment,
                    'Link thanh toán VNPAY đã hết hạn.'
                );

                return ['error' => 'Đơn hàng đã hết thời gian thanh toán.'];
            }

            $payment->update([
                'gateway_response' => null,
                'frontend_origin' => $frontendOrigin ?: $payment->frontend_origin,
            ]);

            return [
                'data' => [
                    'booking_id' => $lockedBooking->id,
                    'payment_id' => $payment->id,
                    'checkout_url' => $this->vnpayService->createPaymentUrl($payment, $request),
                    'expires_at' => $payment->expires_at->toIso8601String(),
                ],
            ];
        }, 3);

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đang chuyển đến VNPAY để tiếp tục thanh toán.',
            'data' => $result['data'],
        ]);
    }

    public function cancel(Request $request, Booking $booking): JsonResponse
    {
        if ($booking->user_id !== $request->user()->id) {
            abort(404);
        }

        $data = $request->validate([
            // Cho phép API cũ không gửi lý do; vẫn lưu note mặc định trong lịch sử.
            'reason' => ['nullable', 'string', 'min:5', 'max:1000'],
        ]);
        $reason = trim((string) ($data['reason'] ?? '')) ?: 'Khách hàng chủ động hủy booking.';

        $result = DB::transaction(function () use ($booking, $request, $reason): array {
            $lockedBooking = Booking::query()
                ->lockForUpdate()
                ->findOrFail($booking->id);

            if ($lockedBooking->user_id !== $request->user()->id) {
                abort(404);
            }

            if ($lockedBooking->status === 'cancelled') {
                return ['booking' => $lockedBooking->fresh(['payment'])];
            }

            // Chỉ những trạng thái này khách mới được tự hủy.
            // Đã khởi hành / đã hoàn thành / đang bảo lưu thì không được hủy tự động.
            if (! in_array($lockedBooking->status, ['pending', 'confirmed'], true)) {
                return ['error' => 'Không thể hủy đơn ở trạng thái hiện tại. Vui lòng liên hệ hỗ trợ nếu cần xử lý.'];
            }

            // Đơn đang chờ thanh toán nhưng đã thanh toán thành công phải được
            // xử lý qua quy trình hoàn tiền, không được khách tự hủy trực tiếp.
            if ($lockedBooking->status === 'pending' && $lockedBooking->payment_status !== 'unpaid') {
                return ['error' => 'Đơn đã thanh toán không thể tự hủy. Vui lòng liên hệ hỗ trợ để được xử lý.'];
            }

            try {
                $this->ensureCancelLimitNotExceeded($request->user()->id);
            } catch (ValidationException $exception) {
                return ['error' => collect($exception->errors())->flatten()->first() ?? 'Bạn đã hủy đủ số lần cho phép của tour này.'];
            }

            $oldStatus = $lockedBooking->status;

            $payment = Payment::query()
                ->where('booking_id', $lockedBooking->id)
                ->lockForUpdate()
                ->first();

            // Trường hợp 1: đơn đang chờ thanh toán VNPAY.
            // Đơn chờ không giữ chỗ nên việc hủy chỉ cập nhật payment/booking.
            if (
                $lockedBooking->status === 'pending'
                && $lockedBooking->payment_status === 'unpaid'
                && $payment
                && $payment->payment_method === 'vnpay'
                && $payment->status === 'pending'
            ) {
                $this->paymentLifecycleService->failPendingPayment(
                    $payment,
                    'Khách hàng chủ động hủy đơn chờ thanh toán.'
                );

                // Service đã cập nhật booking và ghi lịch sử.
                // Không tạo thêm một lịch sử hủy lần nữa ở phía dưới.
                return ['booking' => $lockedBooking->fresh(['payment'])];
            }

            // Trường hợp 2: đơn đã xác nhận / đã thanh toán -> khách chủ động hủy tour
            $lockedBooking->status = 'cancelled';
            $lockedBooking->cancel_reason = $reason;
            $lockedBooking->cancelled_at = now();

            if ($lockedBooking->payment_status === 'paid') {
                // Đánh dấu chờ admin xử lý hoàn tiền thủ công (VD: qua VNPAY / chuyển khoản)
                $lockedBooking->payment_status = 'refund_pending';
            }

            $lockedBooking->save();

            // Chỉ hoàn chỗ nếu booking đã thực sự commit slot sau thanh toán.
            $this->paymentLifecycleService->releaseCommittedSlots($lockedBooking);

            $lockedBooking->statusHistories()->create([
                'changed_by' => $request->user()->id,
                'old_status' => $oldStatus,
                'new_status' => 'cancelled',
                'note' => $reason,
            ]);

            return ['booking' => $lockedBooking->fresh(['payment'])];
        }, 3);

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], 422);
        }

        $bookingData = $result['booking']->toArray();
        $bookingData['customer_cancellation_count'] = Booking::customerCancellationCountForTour(
            $request->user()->id,
            $result['booking']->tour_id
        );
        $bookingData['customer_cancellation_limit'] = Booking::CUSTOMER_CANCELLATION_LIMIT;

        return response()->json([
            'success' => true,
            'message' => 'Đã hủy đơn hàng và cập nhật lại số chỗ nếu booking đã được xác nhận.',
            'data' => $bookingData,
        ]);
    }

    /**
     * Khách hàng sửa thông tin liên hệ sau khi đã đặt tour.
     * Chỉ cho phép khi đơn chưa khởi hành / chưa hoàn thành / chưa hủy.
     */
    public function updateContact(Request $request, Booking $booking): JsonResponse
    {
        if ($booking->user_id !== $request->user()->id) {
            abort(404);
        }

        $lockedBooking = DB::transaction(function () use ($request, $booking): Booking {
            $lockedBooking = Booking::query()
                ->with(['tourDeparture', 'contact', 'participants'])
                ->lockForUpdate()
                ->findOrFail($booking->id);

            if ($lockedBooking->user_id !== $request->user()->id) {
                abort(404);
            }

            $this->ensureBookingInformationCanBeUpdated($lockedBooking);
            $request->merge([
                'contact_phone' => BookingPhoneNormalizer::normalize($request->input('contact_phone')),
            ]);

            $data = $request->validate([
                'contact_name' => ['required', 'string', 'max:150'],
                'contact_email' => ['nullable', 'email', 'max:150'],
                'contact_phone' => ['required', 'string', 'regex:/^0\d{9}$/'],
                'address' => ['nullable', 'string', 'max:255'],
                'special_request' => ['nullable', 'string', 'max:2000'],
            ]);

            $this->bookingPhoneDuplicateGuard->ensureAvailable(
                $lockedBooking->tour_id,
                [
                    $data['contact_phone'],
                    ...$lockedBooking->participants->pluck('phone_normalized')->all(),
                ],
                $lockedBooking->id,
            );

            $before = $this->bookingInformationSnapshot($lockedBooking);
            $lockedBooking->contact()->updateOrCreate(
                ['booking_id' => $lockedBooking->id],
                [
                    'contact_name' => $data['contact_name'],
                    'contact_email' => $data['contact_email'] ?? null,
                    'contact_phone' => $data['contact_phone'],
                    'phone_normalized' => $data['contact_phone'],
                    'address' => $data['address'] ?? null,
                    'special_request' => $data['special_request'] ?? null,
                ],
            );

            $lockedBooking->load(['contact', 'participants']);
            $lockedBooking->informationChangeHistories()->create([
                'changed_by' => $request->user()->id,
                'before' => $before,
                'after' => $this->bookingInformationSnapshot($lockedBooking),
            ]);

            return $lockedBooking;
        }, 3);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật thông tin liên hệ.',
            'data' => $lockedBooking->fresh(['contact', 'participants']),
        ]);
    }

    /**
     * Khách hàng sửa thông tin hành khách (không cho sửa ngày sinh vì ảnh hưởng đến giá vé).
     */
    public function updateParticipants(Request $request, Booking $booking): JsonResponse
    {
        if ($booking->user_id !== $request->user()->id) {
            abort(404);
        }

        $lockedBooking = DB::transaction(function () use ($request, $booking): Booking {
            $lockedBooking = Booking::query()
                ->with(['tourDeparture', 'contact', 'participants'])
                ->lockForUpdate()
                ->findOrFail($booking->id);

            if ($lockedBooking->user_id !== $request->user()->id) {
                abort(404);
            }

            $this->ensureBookingInformationCanBeUpdated($lockedBooking);

            $participantsInput = collect($request->input('participants', []))
                ->map(function (array $participant): array {
                    $participant['phone'] = BookingPhoneNormalizer::normalize($participant['phone'] ?? null);

                    return $participant;
                })
                ->all();
            $request->merge(['participants' => $participantsInput]);

            $data = $request->validate([
                'participants' => ['required', 'array', 'min:1'],
                'participants.*.id' => [
                    'required',
                    'integer',
                    Rule::exists('booking_participants', 'id')->where('booking_id', $lockedBooking->id),
                ],
                'participants.*.full_name' => ['required', 'string', 'max:150'],
                'participants.*.phone' => ['nullable', 'string', 'regex:/^0\d{9}$/'],
                'participants.*.gender' => ['nullable', 'in:male,female,other'],
                'participants.*.identity_number' => ['nullable', 'string', 'max:30'],
            ]);

            $submittedById = collect($data['participants'])->keyBy(fn (array $participant): int => (int) $participant['id']);
            $phones = [
                $lockedBooking->contact?->phone_normalized,
                ...$lockedBooking->participants->map(function ($participant) use ($submittedById): ?string {
                    $submitted = $submittedById->get($participant->id);

                    return is_array($submitted) && array_key_exists('phone', $submitted)
                        ? $submitted['phone']
                        : $participant->phone_normalized;
                })->all(),
            ];
            $this->bookingPhoneDuplicateGuard->ensureAvailable($lockedBooking->tour_id, $phones, $lockedBooking->id);

            $before = $this->bookingInformationSnapshot($lockedBooking);
            foreach ($data['participants'] as $participant) {
                $lockedBooking->participants()
                    ->whereKey($participant['id'])
                    ->update([
                        'full_name' => $participant['full_name'],
                        'phone' => $participant['phone'] ?? null,
                        'phone_normalized' => $participant['phone'] ?? null,
                        'gender' => $participant['gender'] ?? null,
                        'identity_number' => $participant['identity_number'] ?? null,
                    ]);
            }

            $lockedBooking->load(['contact', 'participants']);
            $lockedBooking->informationChangeHistories()->create([
                'changed_by' => $request->user()->id,
                'before' => $before,
                'after' => $this->bookingInformationSnapshot($lockedBooking),
            ]);

            return $lockedBooking;
        }, 3);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật thông tin hành khách.',
            'data' => $lockedBooking->fresh(['contact', 'participants']),
        ]);
    }

    /** Giới hạn khách tự hủy tối đa 2 booking theo chính sách ViVuGo. */
    private function ensureCancelLimitNotExceeded(int $userId): void
    {
        $cancelledCount = Booking::customerCancellationCountForUser($userId);

        if ($cancelledCount >= Booking::CUSTOMER_CANCELLATION_LIMIT) {
            throw ValidationException::withMessages([
                'booking' => ['Bạn đã sử dụng hết giới hạn '.Booking::CUSTOMER_CANCELLATION_LIMIT.' lần hủy booking theo chính sách ViVuGo.'],
            ]);
        }
    }

    public function selectTourCancellationResolution(Request $request, Booking $booking): JsonResponse
    {
        if ($booking->user_id !== $request->user()->id) {
            abort(404);
        }

        $data = $request->validate([
            'resolution' => ['required', 'in:change_departure_date,change_tour,full_refund,store_credit'],
            'tour_departure_id' => ['required_if:resolution,change_departure_date,change_tour', 'nullable', 'integer', 'exists:tour_departures,id'],
        ]);

        $result = DB::transaction(function () use ($booking, $data): array {
            $source = Booking::query()->with(['contact', 'participants', 'payment'])->lockForUpdate()->findOrFail($booking->id);
            if ($source->status !== 'cancelled_by_tour' || $source->resolution_status !== 'pending_selection') {
                return ['error' => 'Booking này không chờ lựa chọn phương án xử lý.'];
            }

            if (in_array($data['resolution'], ['change_departure_date', 'change_tour'], true)) {
                $target = TourDeparture::query()->lockForUpdate()->findOrFail($data['tour_departure_id']);
                if ($target->status !== 'open' || $target->total_slots - $target->booked_slots < $source->number_of_people) {
                    return ['error' => 'Lịch khởi hành mới không còn mở hoặc không đủ chỗ.'];
                }

                $replacement = $source->replicate(['booking_code', 'created_at', 'updated_at']);
                $replacement->fill([
                    'booking_code' => 'BK-'.Str::upper((string) Str::ulid()),
                    'tour_id' => $target->tour_id,
                    'tour_departure_id' => $target->id,
                    'source_booking_id' => $source->id,
                    'status' => 'pending',
                    'payment_status' => 'unpaid',
                    'cancel_reason' => null,
                    'cancellation_reason' => null,
                    'resolution_status' => null,
                    'cancelled_at' => null,
                ]);
                $replacement->save();
                $replacement->contact()->create($source->contact?->only(['contact_name', 'contact_email', 'contact_phone', 'address', 'special_request']) ?? []);
                $replacement->participants()->createMany($source->participants->map(fn ($participant) => $participant->only([
                    'full_name',
                    'phone',
                    'birth_date',
                    'gender',
                    'identity_number',
                    'participant_type',
                    'unit_price',
                    'pricing_rule_label',
                    'pricing_type',
                    'pricing_value',
                ]))->all());
                $replacement->statusHistories()->create(['old_status' => null, 'new_status' => 'pending', 'note' => "Created from cancelled booking {$source->booking_code}."]);
                $source->update(['resolution_status' => $data['resolution']]);

                return ['booking' => $replacement];
            }

            $source->update(['resolution_status' => $data['resolution']]);
            if ($data['resolution'] === 'full_refund' && $source->payment_status === 'paid' && $source->payment) {
                $amount = max(0, (float) $source->payment->amount);
                $refundRequestId = DB::table('refund_requests')->insertGetId([
                    'booking_id' => $source->id,
                    'payment_id' => $source->payment->id,
                    'requested_by' => $source->user_id,
                    'amount' => $amount,
                    'reason' => 'Tour cancelled due to insufficient participants.',
                    'status' => 'pending',
                    'requested_at' => now(),
                ]);
                $outbox = TourRefundOutbox::query()->create([
                    'booking_id' => $source->id,
                    'refund_request_id' => $refundRequestId,
                    'payload' => ['amount' => $amount],
                ]);
            }

            return ['booking' => $source->fresh('payment'), 'refund_outbox_id' => $outbox->id ?? null];
        }, 3);

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], 422);
        }

        if ($result['refund_outbox_id'] ?? null) {
            ProcessTourRefundOutbox::dispatch($result['refund_outbox_id']);
        }

        return response()->json(['success' => true, 'data' => $result['booking']]);
    }

    private function ensureDepartureCanBeBooked(Tour $tour, TourDeparture $departure): void
    {
        if ($tour->status !== 'published') {
            throw ValidationException::withMessages([
                'tour_departure_id' => ['Tour hiện chưa sẵn sàng để đặt.'],
            ]);
        }

        if ($departure->status !== 'open') {
            throw ValidationException::withMessages([
                'tour_departure_id' => ['Lịch khởi hành hiện không mở để đặt.'],
            ]);
        }

        if ($departure->departure_date->isBefore(today())) {
            throw ValidationException::withMessages([
                'tour_departure_id' => ['Lịch khởi hành này đã qua.'],
            ]);
        }
    }

    private function buildQuantityPricing(Tour $tour, TourDeparture $departure, array $quantitySummary): array
    {
        $adultPrice = $this->tourPricingService->resolveAdultPrice($tour, $departure);

        if ($adultPrice <= 0) {
            throw ValidationException::withMessages([
                'tour_departure_id' => ['Lịch khởi hành chưa có giá hợp lệ.'],
            ]);
        }

        $activeRules = $tour->agePricingRules
            ->where('is_active', true)
            ->keyBy('id');
        $groups = [];
        $totalPeople = 0;
        $adultCount = 0;
        $subtotal = 0;

        foreach ($quantitySummary as $index => $item) {
            $quantity = (int) ($item['quantity'] ?? 0);

            if ($quantity < 1) {
                continue;
            }

            $ruleId = $item['rule_id'] ?? null;
            $rule = $ruleId ? $activeRules->get((int) $ruleId) : null;

            if ($ruleId && ! $rule) {
                throw ValidationException::withMessages([
                    "quantity_summary.{$index}.rule_id" => 'Nhóm giá đã chọn không hợp lệ cho tour này.',
                ]);
            }

            $unitPrice = $this->calculateUnitPriceFromRule($adultPrice, $rule);
            $lineTotal = round($unitPrice * $quantity, 2);
            $totalPeople += $quantity;
            if (! $rule) {
                $adultCount += $quantity;
            }
            $subtotal += $lineTotal;

            $groups[] = [
                'rule_id' => $rule?->id,
                'label' => $rule?->label ?? 'Người lớn mặc định',
                'pricing_type' => $rule?->pricing_type ?? 'percentage',
                'price_value' => $rule?->price_value ?? 100,
                'unit_price' => $unitPrice,
                'quantity' => $quantity,
                'line_total' => $lineTotal,
            ];
        }

        return [
            'adult_price' => $adultPrice,
            'adult_count' => $adultCount,
            'total_people' => $totalPeople,
            'subtotal' => round($subtotal, 2),
            'groups' => $groups,
        ];
    }

    private function calculateUnitPriceFromRule(float $adultPrice, $rule): float
    {
        if (! $rule) {
            return $adultPrice;
        }

        return match ($rule->pricing_type) {
            'free' => 0.0,
            'fixed' => (float) $rule->price_value,
            default => round($adultPrice * ((float) $rule->price_value) / 100, 2),
        };
    }

    private function ensureParticipantGroupsMatchQuantitySummary($pricedParticipants, array $quantitySummary): void
    {
        $selectedQuantityByRule = [];

        foreach ($quantitySummary as $item) {
            $ruleKey = ($item['rule_id'] ?? null) === null
                ? 'adult_default'
                : (string) (int) $item['rule_id'];

            $selectedQuantityByRule[$ruleKey] = ($selectedQuantityByRule[$ruleKey] ?? 0)
                + (int) ($item['quantity'] ?? 0);
        }

        $validationErrors = [];
        $participantsByRule = $pricedParticipants->groupBy(
            fn (array $participant) => $participant['_pricing_rule_id'] === null
                ? 'adult_default'
                : (string) $participant['_pricing_rule_id']
        );

        foreach ($participantsByRule as $ruleKey => $participants) {
            $allowedQuantity = (int) ($selectedQuantityByRule[$ruleKey] ?? 0);

            if ($participants->count() <= $allowedQuantity) {
                continue;
            }

            foreach ($participants->slice($allowedQuantity) as $participant) {
                $participantIndex = (int) $participant['_participant_index'];
                $validationErrors["participants.{$participantIndex}.birth_date"] = [
                    'Ngày sinh không hợp lệ.',
                ];
            }
        }

        if ($validationErrors !== []) {
            throw ValidationException::withMessages($validationErrors);
        }
    }

    private function participantTypeFromPricingRule($rule): string
    {
        if (! $rule || $rule->max_age === null) {
            return 'adult';
        }

        return (int) $rule->max_age <= 4 ? 'infant' : 'child';
    }

    private function expireCustomerPendingBookings(int $userId): void
    {
        $expiredBookings = Booking::query()
            ->with('payment')
            ->where('user_id', $userId)
            ->where('status', 'pending')
            ->where('payment_status', 'unpaid')
            ->whereHas('payment', function ($query): void {
                $query
                    ->where('status', 'pending')
                    ->where(function ($query): void {
                        $query
                            ->whereNull('expires_at')
                            ->orWhere('expires_at', '<=', now());
                    });
            })
            ->orderBy('id')
            ->get();

        foreach ($expiredBookings as $booking) {
            if ($booking->payment) {
                $this->paymentLifecycleService->failPendingPayment(
                    $booking->payment,
                    'Booking đã hết hạn thanh toán VNPAY sau 15 phút.'
                );
            }
        }
    }

    private function activeCustomerPendingBooking(int $userId, ?int $tourId = null): ?Booking
    {
        return Booking::query()
            ->with([
                'tour:id,title,slug',
                'tourDeparture:id,tour_id,departure_date,return_date',
                'payment:id,booking_id,amount,status,expires_at',
            ])
            ->where('user_id', $userId)
            ->when($tourId !== null, fn ($query) => $query->where('tour_id', $tourId))
            ->where('status', 'pending')
            ->where('payment_status', 'unpaid')
            ->whereHas('payment', function ($query): void {
                $query
                    ->where('status', 'pending')
                    ->where('expires_at', '>', now());
            })
            ->orderBy('id')
            ->first();
    }

    private function idempotencyKey(Request $request): string
    {
        $key = trim((string) $request->header('Idempotency-Key'));

        if ($key === '') {
            return (string) Str::uuid();
        }

        if (preg_match('/^[A-Za-z0-9-]{16,64}$/', $key) !== 1) {
            throw ValidationException::withMessages([
                'idempotency_key' => 'Yêu cầu đặt tour không hợp lệ. Vui lòng thử lại.',
            ]);
        }

        return $key;
    }

    private function submittedPhones(array $contact, array $participants): array
    {
        return [
            $contact['contact_phone'] ?? null,
            ...collect($participants)->pluck('phone')->all(),
        ];
    }

    private function ensureBookingInformationCanBeUpdated(Booking $booking): void
    {
        $departureDate = $booking->tourDeparture?->departure_date;
        $lastEditableDate = $departureDate?->copy()->subDays(3);

        if (
            ! in_array($booking->status, ['pending', 'confirmed'], true)
            || ! $lastEditableDate
            || today('Asia/Ho_Chi_Minh')->gt($lastEditableDate)
        ) {
            throw ValidationException::withMessages([
                'booking' => 'Booking này không còn trong thời hạn được sửa thông tin.',
            ]);
        }
    }

    private function ensureSameParticipants(Booking $booking, array $participants): void
    {
        $existingIds = $booking->participants->pluck('id')->sort()->values()->all();
        $submittedIds = collect($participants)->pluck('id')->map(fn ($id) => (int) $id)->sort()->values()->all();

        if ($existingIds !== $submittedIds) {
            throw ValidationException::withMessages([
                'participants' => 'Chỉ được sửa thông tin của các hành khách hiện có.',
            ]);
        }
    }

    private function bookingInformationSnapshot(Booking $booking): array
    {
        return [
            'contact' => $booking->contact?->only([
                'contact_name',
                'contact_email',
                'contact_phone',
                'address',
                'special_request',
            ]),
            'participants' => $booking->participants->map(fn ($participant) => $participant->only([
                'id',
                'full_name',
                'phone',
                'gender',
                'identity_number',
            ]))->values()->all(),
        ];
    }
}
