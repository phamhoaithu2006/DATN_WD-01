<?php

// app/Http/Controllers/Api/Admin/BookingController.php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Services\TourPricingService;
use App\Services\VnpayPaymentLifecycleService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BookingController extends Controller
{
    public function __construct(
        private readonly TourPricingService $tourPricingService,
        private readonly VnpayPaymentLifecycleService $paymentLifecycleService,
    ) {}

    /**
     * GET /api/admin/bookings
     * Danh sách booking có phân trang + tìm kiếm + lọc
     */
    public function index(Request $request)
    {
        $request->validate([
            'search' => 'nullable|string|max:100',
            'status' => ['nullable', Rule::in(['pending', 'confirmed', 'departed', 'completed', 'cancelled', 'cancelled_by_tour', 'cancelled_all'])],
            'payment_status' => ['nullable', Rule::in(['unpaid', 'paid', 'failed', 'refunded', 'refund_pending'])],
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
            'per_page' => 'nullable|integer|min:5|max:100',
            'sort_by' => ['nullable', Rule::in(['updated_at', 'created_at', 'total_amount', 'booking_code'])],
            'sort_dir' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $this->synchronizeBookingStatusesWithDepartures();

        $bookings = Booking::with([
            'user:id,full_name,email',
            'tour:id,title',
            'contact:booking_id,contact_name,contact_phone',
            'payment',
            'participants:id,booking_id,full_name,phone,birth_date,gender,participant_type,unit_price',
        ])
            ->withCount('participants')

            ->search($request->search)
            ->filterStatus($request->status)
            ->filterPaymentStatus($request->payment_status)
            ->filterDate($request->from_date, $request->to_date)
            ->orderBy($request->sort_by ?? 'updated_at', $request->sort_dir ?? 'desc')
            ->orderByDesc('id')
            ->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => $bookings->items(),
            'meta' => [
                'current_page' => $bookings->currentPage(),
                'last_page' => $bookings->lastPage(),
                'per_page' => $bookings->perPage(),
                'total' => $bookings->total(),
            ],
        ]);
    }

    /**
     * GET /api/admin/bookings/statistics
     * Tổng số lượng, tổng booking theo từng trạng thái
     */
    public function statistics(Request $request)
    {
        $year = $request->integer('year');
        $this->synchronizeBookingStatusesWithDepartures();
        $query = Booking::query();

        if ($year) {
            $query->whereYear('created_at', $year);
        }

        $stats = $query->selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
            SUM(CASE WHEN status = 'departed'  THEN 1 ELSE 0 END) as departed,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status IN ('cancelled', 'cancelled_by_tour') THEN 1 ELSE 0 END) as cancelled,
            SUM(CASE WHEN payment_status = 'unpaid'   THEN 1 ELSE 0 END) as unpaid,
            SUM(CASE WHEN payment_status = 'paid'     THEN 1 ELSE 0 END) as paid,
            SUM(CASE WHEN payment_status = 'failed'   THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN payment_status = 'refunded' THEN 1 ELSE 0 END) as refunded,
            SUM(CASE WHEN payment_status = 'refund_pending' THEN 1 ELSE 0 END) as refund_pending,
            SUM(CASE WHEN payment_status = 'paid' AND status NOT IN ('cancelled', 'cancelled_by_tour') THEN total_amount ELSE 0 END) as total_revenue
        ")->first();

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * GET /api/admin/bookings/{id}
     * Chi tiết booking
     */
    public function show($id)
    {
        $booking = Booking::with([
            'user:id,full_name,email,phone',
            'tour:id,title,summary',
            'tourDeparture:id,departure_date,return_date',
            // 'promotion:id,code,discount_value', ← xóa dòng này
            'contact',
            'participants',
            'payment',
            'statusHistories' => fn($q) => $q->with('changedBy:id,full_name')->latest(),
            'informationChangeHistories' => fn($q) => $q->with('changedBy:id,full_name')->latest(),
            'disruptionRequests' => fn($q) => $q
                ->with(['requestedDeparture:id,departure_date,return_date', 'processedBy:id,full_name'])
                ->latest(),
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $booking,
        ]);
    }

    public function trash(Request $request)
    {
        $request->validate(['per_page' => 'nullable|integer|min:5|max:100']);
        $bookings = Booking::onlyTrashed()
            ->with(['user:id,full_name,email', 'tour:id,title', 'contact', 'payment', 'participants'])
            ->latest('deleted_at')
            ->paginate($request->integer('per_page', 15));

        return response()->json(['success' => true, 'data' => $bookings->items(), 'meta' => [
            'current_page' => $bookings->currentPage(), 'last_page' => $bookings->lastPage(),
            'per_page' => $bookings->perPage(), 'total' => $bookings->total(),
        ]]);
    }

    public function showTrashed($id)
    {
        $booking = Booking::onlyTrashed()->with([
            'user:id,full_name,email,phone', 'tour:id,title,summary',
            'tourDeparture:id,departure_date,return_date,status', 'contact', 'participants', 'payment',
            'statusHistories' => fn ($query) => $query->with('changedBy:id,full_name')->latest(),
            'informationChangeHistories' => fn ($query) => $query->with('changedBy:id,full_name')->latest(),
            'disruptionRequests' => fn ($query) => $query->with(['requestedDeparture:id,departure_date,return_date', 'processedBy:id,full_name'])->latest(),
        ])->findOrFail($id);

        return response()->json(['success' => true, 'data' => $booking]);
    }

    // ─── Thêm/Tạo booking ─────────────────────────────────────────
    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'tour_id' => 'required|exists:tours,id',
            'tour_departure_id' => 'nullable|exists:tour_departures,id',
            'promotion_id' => 'nullable|exists:promotions,id',
            'staff_id' => 'nullable|exists:users,id',
            'number_of_people' => 'nullable|integer|min:1',
            'unit_price' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'note' => 'nullable|string',
            'contact' => 'nullable|array',
            'contact.contact_name' => 'required_with:contact|string|max:150',
            'contact.contact_email' => 'nullable|email|max:150',
            'contact.contact_phone' => 'required_with:contact|string|max:20',
            'contact.address' => 'nullable|string|max:255',
            'contact.special_request' => 'nullable|string',
            'participants' => 'nullable|array|min:1',
            'participants.*.full_name' => 'required_with:participants|string|max:150',
            'participants.*.phone' => 'nullable|string|max:20',
            'participants.*.birth_date' => 'required_with:participants|date|before_or_equal:today',
            'participants.*.gender' => 'nullable|in:male,female,other',
            'participants.*.identity_number' => 'nullable|string|max:30',
            'participants.*.participant_type' => 'nullable|in:adult,child,infant',
        ]);

        $participants = $data['participants'] ?? [];
        $contact = $data['contact'] ?? null;
        unset($data['participants'], $data['contact']);

        $data['booking_code'] = 'BK' . now()->format('Ymd') . strtoupper(Str::random(4));
        $data['discount_amount'] = $data['discount_amount'] ?? 0;
        $data['status'] = 'pending';
        $data['payment_status'] = 'unpaid';

        $booking = DB::transaction(function () use ($data, $participants, $contact) {
            if ($participants !== []) {
                $tour = Tour::with('agePricingRules')->findOrFail($data['tour_id']);
                $departure = $this->resolveDeparture($tour, $data['tour_departure_id'] ?? null);
                $pricingSummary = $this->buildParticipantPricing($tour, $departure, $participants);

                $data['number_of_people'] = count($pricingSummary['participants']);
                $data['unit_price'] = $pricingSummary['adult_price'];
                $data['total_amount'] = max(0, $pricingSummary['total_amount'] - $data['discount_amount']);
            } else {
                if (! isset($data['number_of_people'], $data['unit_price'])) {
                    throw ValidationException::withMessages([
                        'participants' => 'Vui lòng nhập danh sách người tham gia hoặc nhập số người và đơn giá.',
                    ]);
                }

                $data['total_amount'] = ($data['unit_price'] * $data['number_of_people']) - $data['discount_amount'];
            }

            $booking = Booking::create($data);

            if ($contact) {
                $booking->contact()->create($contact);
            }

            if ($participants !== []) {
                $booking->participants()->createMany($pricingSummary['participants']);
            }

            $booking->payment()->create([
                'payment_method' => 'cod',
                'amount' => $booking->total_amount,
                'status' => 'pending',
                'paid_at' => null,
            ]);

            return $booking;
        });

        return response()->json([
            'success' => true,
            'message' => 'Tạo booking thành công.',
            'data' => $booking->load(['contact', 'participants', 'payment']),
        ], 201);
    }

    // ─── Sửa booking ──────────────────────────────────────────────
    public function update(Request $request, $id)
    {
        $booking = Booking::with(['tour.agePricingRules', 'tourDeparture', 'participants', 'contact', 'payment'])->findOrFail($id);

        $data = $request->validate([
            'number_of_people' => 'sometimes|integer|min:1',
            'unit_price' => 'sometimes|numeric|min:0',
            'discount_amount' => 'sometimes|numeric|min:0',
            'status' => ['sometimes', Rule::in(['pending', 'confirmed', 'departed', 'completed', 'cancelled', 'retained'])],
            'payment_status' => ['prohibited'],
            'note' => 'nullable|string',
            'cancel_reason' => 'nullable|string',
            'staff_id' => 'nullable|exists:users,id',
            'contact' => 'nullable|array',
            'contact.contact_name' => 'required_with:contact|string|max:150',
            'contact.contact_email' => 'nullable|email|max:150',
            'contact.contact_phone' => 'required_with:contact|string|max:20',
            'contact.address' => 'nullable|string|max:255',
            'contact.special_request' => 'nullable|string',
            'participants' => 'nullable|array|min:1',
            'participants.*.full_name' => 'required_with:participants|string|max:150',
            'participants.*.phone' => 'nullable|string|max:20',
            'participants.*.birth_date' => 'required_with:participants|date|before_or_equal:today',
            'participants.*.gender' => 'nullable|in:male,female,other',
            'participants.*.identity_number' => 'nullable|string|max:30',
            'participants.*.participant_type' => 'nullable|in:adult,child,infant',
        ]);

        // Tự tính lại total nếu có thay đổi giá/số người
        $participants = $data['participants'] ?? null;
        $contact = $data['contact'] ?? null;
        unset($data['participants'], $data['contact']);
        $pricingSummary = null;

        if ($participants !== null) {
            $pricingSummary = $this->buildParticipantPricing($booking->tour, $booking->tourDeparture, $participants);
            $discount = $data['discount_amount'] ?? $booking->discount_amount;
            $data['number_of_people'] = count($pricingSummary['participants']);
            $data['unit_price'] = $pricingSummary['adult_price'];
            $data['total_amount'] = max(0, $pricingSummary['total_amount'] - $discount);
        }

        if ($participants === null && (isset($data['unit_price']) || isset($data['number_of_people']) || isset($data['discount_amount']))) {
            $unitPrice = $data['unit_price'] ?? $booking->unit_price;
            $numPeople = $data['number_of_people'] ?? $booking->number_of_people;
            $discount = $data['discount_amount'] ?? $booking->discount_amount;
            $data['total_amount'] = ($unitPrice * $numPeople) - $discount;
        }

        // Nếu huỷ thì ghi thời gian
        if (isset($data['status']) && $data['status'] === 'cancelled') {
            $data['cancelled_at'] = Carbon::now();
        }

        DB::transaction(function () use ($booking, $data, $participants, $contact, $pricingSummary) {
            $lockedBooking = Booking::query()
                ->with('tourDeparture')
                ->lockForUpdate()
                ->findOrFail($booking->id);
            $requestedStatus = $data['status'] ?? null;
            $originalNumberOfPeople = (int) $lockedBooking->number_of_people;
            $updatedNumberOfPeople = (int) ($data['number_of_people'] ?? $originalNumberOfPeople);

            if (in_array($lockedBooking->status, ['departed', 'completed'], true)) {
                throw ValidationException::withMessages([
                    'status' => 'Booking đang diễn ra, đã hủy hoặc đã hoàn thành chỉ có thể xem chi tiết.',
                ]);
            }

            if ($lockedBooking->status === 'cancelled_by_tour') {
                if ($requestedStatus === 'pending') {
                    throw ValidationException::withMessages([
                        'status' => 'Booking bị hủy theo tour không thể chuyển về Chờ xác nhận.',
                    ]);
                }
            }

            if (
                $lockedBooking->status === 'cancelled'
                && $requestedStatus !== null
                && $requestedStatus !== 'cancelled'
            ) {
                throw ValidationException::withMessages([
                    'status' => 'Booking đã hủy không thể chuyển sang trạng thái khác.',
                ]);
            }

            $departureIsCompleted = $lockedBooking->tourDeparture?->status === 'completed';
            if ($requestedStatus === 'pending' && (
                $lockedBooking->payment_status === 'paid'
                || $lockedBooking->status === 'completed'
                || $departureIsCompleted
            )) {
                throw ValidationException::withMessages([
                    'status' => 'Booking đã thanh toán hoặc tour đã hoàn thành không thể chuyển về Chờ xác nhận.',
                ]);
            }

            $shouldReleaseSlots = ($data['status'] ?? null) === 'cancelled'
                && $lockedBooking->status !== 'cancelled';

            $oldStatus = $lockedBooking->status;

            if ($requestedStatus === 'confirmed') {
                if ($lockedBooking->payment_status !== 'paid') {
                    throw ValidationException::withMessages(['status' => 'Booking chỉ được xác nhận sau khi đã thanh toán.']);
                }
                if (! $this->paymentLifecycleService->commitSlotsForPaidBooking($lockedBooking)) {
                    $data['status'] = 'pending';
                    $requestedStatus = 'pending';
                    throw ValidationException::withMessages(['status' => 'Booking đang chờ xác nhận vì tour/lịch không hoạt động hoặc không còn đủ chỗ.']);
                }
            }

            if ($lockedBooking->slot_committed_at && $updatedNumberOfPeople !== $originalNumberOfPeople) {
                $lockedDeparture = TourDeparture::query()
                    ->lockForUpdate()
                    ->findOrFail($lockedBooking->tour_departure_id);
                $slotDifference = $updatedNumberOfPeople - $originalNumberOfPeople;
                $updatedBookedSlots = (int) $lockedDeparture->booked_slots + $slotDifference;

                if ($updatedBookedSlots > (int) $lockedDeparture->total_slots) {
                    throw ValidationException::withMessages([
                        'number_of_people' => 'Số khách vượt quá số chỗ còn lại của lịch khởi hành.',
                    ]);
                }

                $lockedDeparture->update([
                    'booked_slots' => max(0, $updatedBookedSlots),
                ]);
            }

            $lockedBooking->update($data);

            if ($requestedStatus !== null && $requestedStatus !== $oldStatus) {
                $lockedBooking->statusHistories()->create([
                    'changed_by' => request()->user()?->id,
                    'old_status' => $oldStatus,
                    'new_status' => $requestedStatus,
                    'note' => $data['cancel_reason'] ?? 'Admin cập nhật trạng thái booking.',
                ]);
            }

            if ($shouldReleaseSlots) {
                $this->releaseBookedSlots($lockedBooking);
            }

            if ($contact !== null) {
                $lockedBooking->contact()->updateOrCreate(
                    ['booking_id' => $lockedBooking->id],
                    $contact
                );
            }

            if ($participants !== null && $pricingSummary !== null) {
                $lockedBooking->participants()->delete();
                $lockedBooking->participants()->createMany($pricingSummary['participants']);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật booking thành công.',
            'data' => $booking->fresh(['contact', 'participants', 'payment']),
        ]);
    }

    // ─── Xóa mềm ──────────────────────────────────────────────────
    public function softDelete(Request $request, $id)
    {
        DB::transaction(function () use ($id, $request): void {
            $booking = Booking::query()
                ->with('tourDeparture')
                ->lockForUpdate()
                ->findOrFail($id);

            if (in_array($booking->status, ['departed', 'completed', 'cancelled', 'cancelled_by_tour'], true)) {
                throw ValidationException::withMessages([
                    'status' => 'Booking đang diễn ra, đã hủy hoặc đã hoàn thành chỉ có thể xem chi tiết.',
                ]);
            }

            $oldStatus = $booking->status;
            $paymentStatus = $booking->payment_status === 'paid' ? 'refund_pending' : $booking->payment_status;
            $booking->update([
                'status' => 'cancelled', 'payment_status' => $paymentStatus,
                'cancel_reason' => $request->input('reason', 'Admin hủy booking.'),
                'cancelled_at' => Carbon::now(),
            ]);
            $booking->statusHistories()->create([
                'changed_by' => request()->user()?->id,
                'old_status' => $oldStatus,
                'new_status' => 'cancelled',
                'note' => 'Admin hủy booking.',
            ]);
            $this->releaseBookedSlots($booking);
        });

        return response()->json([
            'success' => true,
            'message' => 'Đã huỷ booking.',
        ]);
    }

    public function moveToTrash($id)
    {
        $booking = Booking::query()->with('payment')->findOrFail($id);
        if (! in_array($booking->status, ['cancelled', 'cancelled_by_tour'], true)) {
            throw ValidationException::withMessages(['status' => 'Cần hủy booking trước khi xóa mềm.']);
        }
        if (in_array($booking->payment_status, ['paid', 'refund_pending'], true)) {
            throw ValidationException::withMessages(['payment_status' => 'Booking đã thanh toán phải hoàn tiền trước khi xóa.']);
        }
        if ($booking->payment_status === 'refunded' && ! $booking->payment?->refund_proof_path) {
            throw ValidationException::withMessages(['refund_proof' => 'Vui lòng tải ảnh chứng minh hoàn tiền trước khi xóa.']);
        }

        $booking->delete();
        return response()->json(['success' => true, 'message' => 'Đã chuyển booking vào thùng rác.']);
    }

    public function restore($id)
    {
        $booking = Booking::onlyTrashed()->findOrFail($id);
        $oldStatus = $booking->status;
        $booking->restore();
        $booking->update(['status' => 'pending', 'cancelled_at' => null]);
        $booking->statusHistories()->create([
            'changed_by' => request()->user()?->id, 'old_status' => $oldStatus,
            'new_status' => 'pending', 'note' => 'Admin hoàn tác booking từ thùng rác; trạng thái tự động về Chờ xác nhận.',
        ]);

        return response()->json(['success' => true, 'message' => 'Đã hoàn tác booking về Chờ xác nhận.', 'data' => $booking->fresh()]);
    }

    // ─── Xóa vĩnh viễn ────────────────────────────────────────────
    public function destroy($id)
    {
        $booking = Booking::onlyTrashed()->with('payment')->findOrFail($id);

        if (in_array($booking->payment_status, ['paid', 'refund_pending'], true)
            || ($booking->payment_status === 'refunded' && ! $booking->payment?->refund_proof_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Booking phải hoàn tiền và có ảnh chứng minh trước khi xóa vĩnh viễn.',
            ], 422);
        }

        DB::transaction(function () use ($booking): void {
            $proofPath = $booking->payment?->refund_proof_path;
            DB::table('tour_refund_outbox')->where('booking_id', $booking->id)->delete();
            DB::table('refund_requests')->where('booking_id', $booking->id)->delete();
            DB::table('payments')->where('booking_id', $booking->id)->delete();
            $booking->forceDelete();
            if ($proofPath) {
                Storage::disk('public')->delete($proofPath);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa booking vĩnh viễn.',
        ]);
    }

    private function resolveDeparture(Tour $tour, ?int $departureId): TourDeparture
    {
        if (! $departureId) {
            throw ValidationException::withMessages([
                'tour_departure_id' => 'Vui lòng chọn lịch khởi hành khi tính giá theo hành khách.',
            ]);
        }

        $departure = TourDeparture::findOrFail($departureId);

        if ((int) $departure->tour_id !== (int) $tour->id) {
            throw ValidationException::withMessages([
                'tour_departure_id' => 'Lịch khởi hành không thuộc tour đã chọn.',
            ]);
        }

        return $departure;
    }

    private function buildParticipantPricing(Tour $tour, TourDeparture $departure, array $participants): array
    {
        $adultPrice = $this->tourPricingService->resolveAdultPrice($tour, $departure);
        $hasActiveAgePricingRules = $tour->agePricingRules
            ->where('is_active', true)
            ->isNotEmpty();
        $rows = [];
        $totalAmount = 0;
        $adultCount = 0;

        foreach ($participants as $index => $participant) {
            $birthDate = Carbon::parse($participant['birth_date']);
            $pricing = $this->tourPricingService->calculateParticipantPrice(
                $tour,
                $departure,
                $birthDate,
                $departure->departure_date
            );
            $rule = $pricing['rule'];

            if (
                $hasActiveAgePricingRules
                && ! $rule
                && ($participant['participant_type'] ?? 'adult') !== 'adult'
            ) {
                throw ValidationException::withMessages([
                    "participants.{$index}.birth_date" => 'Không tìm thấy quy tắc giá phù hợp cho hành khách này.',
                ]);
            }

            if (! $rule) {
                $adultCount += 1;
            }

            $rows[] = [
                'full_name' => $participant['full_name'],
                'phone' => $participant['phone'] ?? null,
                'birth_date' => $birthDate->toDateString(),
                'gender' => $participant['gender'] ?? null,
                'identity_number' => $participant['identity_number'] ?? null,
                'participant_type' => $participant['participant_type'] ?? $this->detectParticipantType($pricing['age']),
                'unit_price' => $pricing['unit_price'],
                'pricing_rule_label' => $rule?->label ?? 'Người lớn mặc định',
                'pricing_type' => $rule?->pricing_type ?? 'percentage',
                'pricing_value' => $rule?->price_value ?? 100,
            ];

            $totalAmount += $pricing['unit_price'];
        }

        if ($adultCount < 1) {
            throw ValidationException::withMessages([
                'participants' => 'Vui lòng nhập ít nhất 1 người lớn trước khi thêm trẻ em hoặc em bé.',
            ]);
        }

        return [
            'adult_price' => $adultPrice,
            'participants' => $rows,
            'total_amount' => $totalAmount,
        ];
    }

    private function detectParticipantType(int $age): string
    {
        if ($age < 6) {
            return 'infant';
        }

        if ($age < 11) {
            return 'child';
        }

        return 'adult';
    }

    private function releaseBookedSlots(Booking $booking): void
    {
        $this->paymentLifecycleService->releaseCommittedSlots($booking);
    }

    private function synchronizeBookingStatusesWithDepartures(): void
    {
        Booking::query()
            ->with(['tourDeparture:id,tour_id,status,departure_date,return_date', 'tour:id,status'])
            ->where('payment_status', 'paid')
            ->whereIn('status', ['pending', 'confirmed', 'departed', 'completed'])
            ->whereHas('tourDeparture')
            ->chunkById(100, function ($bookings): void {
                foreach ($bookings as $booking) {
                    $departureStatus = strtolower((string) $booking->tourDeparture?->status);
                    $departureDate = $booking->tourDeparture?->departure_date?->startOfDay();
                    $returnDate = ($booking->tourDeparture?->return_date ?? $departureDate)?->startOfDay();
                    $today = today();

                    if (in_array($departureStatus, ['cancelled', 'canceled'], true)) {
                        $newStatus = 'cancelled_by_tour';
                    } elseif ($departureStatus === 'completed' || ($returnDate && $returnDate->lt($today))) {
                        $newStatus = 'completed';
                    } elseif ($departureDate && $departureDate->lte($today) && $returnDate?->gte($today)) {
                        $newStatus = 'departed';
                    } elseif ($departureDate?->gt($today)) {
                        $isEligibleForConfirmation = $booking->slot_committed_at !== null
                            && $booking->tour?->status === 'published'
                            && $departureStatus === 'open';
                        $newStatus = $isEligibleForConfirmation ? 'confirmed' : 'pending';
                    } else {
                        $newStatus = null;
                    }

                    if (! $newStatus || $booking->status === $newStatus) {
                        continue;
                    }

                    $oldStatus = $booking->status;
                    $updates = ['status' => $newStatus];

                    if ($newStatus === 'cancelled_by_tour') {
                        $updates += [
                            'payment_status' => 'refund_pending',
                            'cancel_reason' => 'Lịch khởi hành đã bị hủy.',
                            'cancellation_reason' => 'tour_departure_cancelled',
                            'resolution_status' => 'pending_selection',
                            'cancelled_at' => $booking->cancelled_at ?? now(),
                        ];
                    }

                    $booking->update($updates);
                    $booking->statusHistories()->create([
                        'old_status' => $oldStatus,
                        'new_status' => $newStatus,
                        'note' => 'Tự động đồng bộ theo trạng thái lịch khởi hành.',
                    ]);
                }
            });
    }
}
