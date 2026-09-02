<?php

// app/Http/Controllers/Api/Admin/BookingController.php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingAuditLog;
use App\Models\Notification;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Services\BookingAuditService;
use App\Services\BookingCancellationEmailService;
use App\Services\BookingStatusService;
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
        private readonly BookingStatusService $bookingStatusService,
        private readonly BookingCancellationEmailService $bookingCancellationEmailService,
        private readonly BookingAuditService $bookingAuditService,
    ) {}

    /**
     * GET /api/admin/bookings
     * Danh sách booking có phân trang + tìm kiếm + lọc
     */
    public function index(Request $request)
    {
        $request->validate([
            'search' => 'nullable|string|max:100',
            'status' => ['nullable', Rule::in(['awaiting_payment', 'confirmed', 'departed', 'completed', 'cancelled', 'cancelled_by_tour', 'cancelled_all'])],
            'display_status' => ['nullable', Rule::in(['awaiting_payment', 'upcoming', 'departed', 'completed', 'cancelled'])],
            'payment_status' => ['nullable', Rule::in(['unpaid', 'paid', 'failed', 'refunded', 'refund_pending'])],
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
            'per_page' => 'nullable|integer|min:5|max:100',
            'sort_by' => ['nullable', Rule::in(['updated_at', 'created_at', 'total_amount', 'booking_code'])],
            'sort_dir' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $this->synchronizeBookingStatusesWithDepartures();

        $bookingQuery = Booking::with([
            'user:id,full_name,email',
            'tour:id,title,status',
            'tourDeparture:id,tour_id,departure_at,departure_date,return_date,status,total_slots,booked_slots',
            'contact:booking_id,contact_name,contact_phone',
            'payment',
            'participants:id,booking_id,full_name,phone,birth_date,gender,participant_type,unit_price',
        ])
            ->withCount('participants')

            ->search($request->search)
            ->filterStatus($request->status)
            ->tap(fn ($query) => $this->bookingStatusService->applyDisplayFilter($query, $request->display_status))
            ->filterPaymentStatus($request->payment_status)
            ->filterDate($request->from_date, $request->to_date);

        // Ở bộ lọc "Tất cả", ưu tiên booking đã hủy đang chờ hoàn tiền để admin xử lý;
        // booking đã hủy và hoàn tiền xong được đưa xuống cuối danh sách.
        if (! $request->filled('display_status') && ! $request->filled('payment_status')) {
            $bookingQuery->orderByRaw(<<<'SQL'
                CASE
                    WHEN status IN ('cancelled', 'cancelled_by_tour') AND payment_status = 'refund_pending' THEN 0
                    WHEN status IN ('cancelled', 'cancelled_by_tour') AND payment_status = 'refunded' THEN 2
                    ELSE 1
                END ASC
            SQL);
        }

        $bookings = $bookingQuery
            ->orderBy($request->sort_by ?? 'updated_at', $request->sort_dir ?? 'desc')
            ->orderByDesc('id')
            ->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => array_map(
                fn (Booking $booking): Booking => $this->bookingStatusService->decorate($booking),
                $bookings->items(),
            ),
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
            SUM(CASE WHEN status = 'awaiting_payment' THEN 1 ELSE 0 END) as awaiting_payment,
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

        $displayCountQuery = Booking::query()
            ->when($year, fn ($builder) => $builder->whereYear('created_at', $year));
        $stats->confirmed = $this->bookingStatusService
            ->applyDisplayFilter(clone $displayCountQuery, BookingStatusService::DISPLAY_CONFIRMED)
            ->count();
        $stats->upcoming = $this->bookingStatusService
            ->applyDisplayFilter(clone $displayCountQuery, BookingStatusService::DISPLAY_UPCOMING)
            ->count();
        $stats->departed = $this->bookingStatusService
            ->applyDisplayFilter(clone $displayCountQuery, BookingStatusService::DISPLAY_DEPARTED)
            ->count();
        $stats->completed = $this->bookingStatusService
            ->applyDisplayFilter(clone $displayCountQuery, BookingStatusService::DISPLAY_COMPLETED)
            ->count();

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    public function timeline()
    {
        $events = BookingAuditLog::query()
            ->with('actor:id,full_name')
            ->latest('created_at')
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn (BookingAuditLog $event) => [
                'id' => $event->id,
                'booking_id' => $event->booking_id,
                'booking_code' => $event->booking_code,
                'action' => $event->action,
                'status_before' => $event->status_before,
                'status_after' => $event->status_after,
                'payment_status_before' => $event->payment_status_before,
                'payment_status_after' => $event->payment_status_after,
                'reason' => $event->reason,
                'actor' => $event->actor?->full_name ?: $event->actor_name ?: 'Hệ thống',
                'created_at' => $event->created_at?->toDateTimeString(),
            ]);

        return response()->json(['success' => true, 'data' => $events]);
    }

    /**
     * GET /api/admin/bookings/{id}
     * Chi tiết booking
     */
    public function show($id)
    {
        $booking = Booking::with($this->bookingDetailRelations())->findOrFail($id);

        $this->bookingStatusService->synchronize($booking);
        $booking = $booking->fresh($this->bookingDetailRelations());
        $this->bookingStatusService->decorate($booking);
        $this->bookingAuditService->record($booking, 'booking_viewed', request()->user()?->id, [
            'status_before' => $booking->status,
            'status_after' => $booking->status,
            'payment_status_before' => $booking->payment_status,
            'payment_status_after' => $booking->payment_status,
            'reason' => 'Quản trị viên xem chi tiết booking.',
        ]);

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
            'user:id,full_name,email,phone', 'tour:id,title,summary,status',
            'tourDeparture:id,departure_date,return_date,status', 'contact', 'participants', 'payment',
            'statusHistories' => fn ($query) => $query->with('changedBy:id,full_name')->latest(),
            'informationChangeHistories' => fn ($query) => $query->with('changedBy:id,full_name')->latest(),
            'auditLogs' => fn ($query) => $query->with('actor:id,full_name')->latest(),
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

        $data['booking_code'] = 'BK'.now()->format('Ymd').strtoupper(Str::random(4));
        $data['discount_amount'] = $data['discount_amount'] ?? 0;
        $data['status'] = 'awaiting_payment';
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

        $this->bookingAuditService->record($booking, 'booking_created', $request->user()?->id, [
            'status_after' => $booking->status,
            'payment_status_after' => $booking->payment_status,
            'reason' => 'Quản trị viên tạo booking.',
        ]);

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
            'status' => ['sometimes', Rule::in(['awaiting_payment', 'confirmed', 'departed', 'completed', 'cancelled', 'retained'])],
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
                ->with(['tour', 'tourDeparture'])
                ->lockForUpdate()
                ->findOrFail($booking->id);
            $requestedStatus = $data['status'] ?? null;
            $originalNumberOfPeople = (int) $lockedBooking->number_of_people;
            $updatedNumberOfPeople = (int) ($data['number_of_people'] ?? $originalNumberOfPeople);

            if ($requestedStatus !== null) {
                $this->bookingStatusService->assertCanChangeStatus($lockedBooking, $requestedStatus);
            } elseif ($this->bookingStatusService->presentation($lockedBooking)['capabilities']['read_only']) {
                throw ValidationException::withMessages([
                    'booking' => ['Booking ở trạng thái hiện tại chỉ có thể xem chi tiết.'],
                ]);
            }

            $shouldReleaseSlots = ($data['status'] ?? null) === 'cancelled'
                && $lockedBooking->status !== 'cancelled';

            $oldStatus = $lockedBooking->status;
            $oldPaymentStatus = $lockedBooking->payment_status;

            if ($requestedStatus === 'confirmed') {
                if (! $this->paymentLifecycleService->commitSlotsForPaidBooking($lockedBooking, false)) {
                    throw ValidationException::withMessages([
                        'status' => ['Booking chưa đủ điều kiện Đã xác nhận vì tour không hoạt động hoặc lịch không còn đủ chỗ.'],
                    ]);
                }
            }

            if ($requestedStatus === 'cancelled' && $lockedBooking->payment_status === 'paid') {
                $data['payment_status'] = 'refund_pending';
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

                if ($requestedStatus === 'cancelled') {
                    $this->bookingAuditService->record($lockedBooking, 'admin_cancelled', request()->user()?->id, [
                        'status_before' => $oldStatus,
                        'status_after' => $requestedStatus,
                        'payment_status_before' => $oldPaymentStatus,
                        'payment_status_after' => $lockedBooking->payment_status,
                        'reason' => $data['cancel_reason'] ?? 'Admin hủy booking.',
                    ]);
                }
            }

            if ($shouldReleaseSlots) {
                $this->releaseBookedSlots($lockedBooking, $oldStatus);
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

            if ($requestedStatus === 'cancelled' && $oldStatus !== 'cancelled') {
                $this->bookingCancellationEmailService->enqueueForCancelledBooking(
                    $lockedBooking,
                    BookingCancellationEmailService::SOURCE_ADMIN_BOOKING,
                );
            }

            if ($requestedStatus !== 'cancelled') {
                $this->bookingAuditService->record(
                    $lockedBooking,
                    $requestedStatus !== null && $requestedStatus !== $oldStatus
                        ? 'booking_status_updated'
                        : 'booking_information_updated',
                    request()->user()?->id,
                    [
                        'status_before' => $oldStatus,
                        'status_after' => $lockedBooking->status,
                        'payment_status_before' => $oldPaymentStatus,
                        'payment_status_after' => $lockedBooking->payment_status,
                        'reason' => $requestedStatus !== null && $requestedStatus !== $oldStatus
                            ? 'Quản trị viên cập nhật trạng thái booking.'
                            : 'Quản trị viên cập nhật thông tin booking.',
                        'metadata' => [
                            'updated_fields' => array_values(array_diff(array_keys($data), ['payment_status'])),
                            'contact_updated' => $contact !== null,
                            'participants_updated' => $participants !== null,
                        ],
                    ],
                );
            }
        });

        $responseBooking = $booking->fresh($this->bookingDetailRelations());
        $this->bookingStatusService->decorate($responseBooking);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật booking thành công.',
            'data' => $responseBooking,
        ]);
    }

    // ─── Xóa mềm ──────────────────────────────────────────────────
    public function softDelete(Request $request, $id)
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $reason = trim((string) ($validated['reason'] ?? '')) ?: 'Quản trị viên hủy booking.';

        DB::transaction(function () use ($id, $request, $reason): void {
            $booking = Booking::query()
                ->with(['tour', 'tourDeparture', 'payment'])
                ->lockForUpdate()
                ->findOrFail($id);

            $this->bookingStatusService->assertCanChangeStatus($booking, 'cancelled');

            $oldStatus = $booking->status;
            $oldPaymentStatus = $booking->payment_status;
            $paymentStatus = $booking->payment_status === 'paid' ? 'refund_pending' : $booking->payment_status;
            $booking->update([
                'status' => 'cancelled', 'payment_status' => $paymentStatus,
                'cancel_reason' => $reason,
                'cancelled_at' => Carbon::now(),
            ]);
            $booking->statusHistories()->create([
                'changed_by' => request()->user()?->id,
                'old_status' => $oldStatus,
                'new_status' => 'cancelled',
                'note' => $reason,
            ]);
            $this->bookingAuditService->record($booking, 'admin_cancelled', $request->user()?->id, [
                'status_before' => $oldStatus,
                'status_after' => 'cancelled',
                'payment_status_before' => $oldPaymentStatus,
                'payment_status_after' => $paymentStatus,
                'reason' => $reason,
            ]);
            $this->releaseBookedSlots($booking, $oldStatus);

            $this->bookingCancellationEmailService->enqueueForCancelledBooking(
                $booking,
                BookingCancellationEmailService::SOURCE_ADMIN_BOOKING,
            );

            Notification::query()->create([
                'user_id' => $booking->user_id,
                'title' => 'Booking đã bị hủy',
                'message' => "Booking {$booking->booking_code} đã bị quản trị viên hủy. Lý do: {$reason}",
                'type' => 'booking',
                'status' => 'unread',
                'data' => json_encode([
                    'booking_id' => $booking->id,
                    'booking_code' => $booking->booking_code,
                    'action' => 'admin_cancelled',
                    'reason' => $reason,
                ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Đã huỷ booking.',
        ]);
    }

    public function moveToTrash($id)
    {
        $adminId = request()->user()?->id;
        DB::transaction(function () use ($id, $adminId): void {
            $booking = Booking::query()->with('payment')->lockForUpdate()->findOrFail($id);
            if (! in_array($booking->status, ['cancelled', 'cancelled_by_tour'], true)) {
                throw ValidationException::withMessages(['status' => 'Cần hủy booking trước khi xóa mềm.']);
            }
            if (in_array($booking->payment_status, ['paid', 'refund_pending'], true)) {
                throw ValidationException::withMessages(['payment_status' => 'Booking đã thanh toán phải hoàn tiền trước khi xóa.']);
            }
            if ($booking->payment_status === 'refunded' && ! $booking->payment?->refund_proof_path) {
                throw ValidationException::withMessages(['refund_proof' => 'Vui lòng tải ảnh chứng minh hoàn tiền trước khi xóa.']);
            }

            $this->bookingAuditService->record($booking, 'moved_to_trash', $adminId, [
                'status_before' => $booking->status,
                'status_after' => $booking->status,
                'payment_status_before' => $booking->payment_status,
                'payment_status_after' => $booking->payment_status,
                'reason' => 'Admin chuyển booking vào thùng rác.',
            ]);
            $booking->delete();
        });

        return response()->json(['success' => true, 'message' => 'Đã chuyển booking vào thùng rác.']);
    }

    public function restore($id)
    {
        $adminId = request()->user()?->id;
        $booking = DB::transaction(function () use ($id, $adminId): Booking {
            $booking = Booking::onlyTrashed()
                ->with(['payment', 'tour', 'tourDeparture'])
                ->lockForUpdate()
                ->findOrFail($id);
            $oldStatus = $booking->status;
            $oldPaymentStatus = $booking->payment_status;
            $booking->restore();
            $booking->statusHistories()->create([
                'changed_by' => $adminId,
                'old_status' => $oldStatus,
                'new_status' => $oldStatus,
                'note' => 'Admin hoàn tác booking từ thùng rác; giữ nguyên trạng thái hủy và trạng thái hoàn tiền.',
            ]);
            $this->bookingAuditService->record($booking, 'restored', $adminId, [
                'status_before' => $oldStatus,
                'status_after' => $oldStatus,
                'payment_status_before' => $oldPaymentStatus,
                'payment_status_after' => $oldPaymentStatus,
                'reason' => 'Admin hoàn tác booking khỏi thùng rác.',
            ]);

            return $booking;
        });

        $booking = $booking->fresh($this->bookingDetailRelations());
        $this->bookingStatusService->decorate($booking);

        return response()->json([
            'success' => true,
            'message' => 'Đã hoàn tác booking; trạng thái hủy và trạng thái hoàn tiền được giữ nguyên.',
            'data' => $booking,
        ]);
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

        $adminId = request()->user()?->id;
        DB::transaction(function () use ($booking, $adminId): void {
            $proofPath = $booking->payment?->refund_proof_path;
            $this->bookingAuditService->record($booking, 'hard_deleted', $adminId, [
                'status_before' => $booking->status,
                'status_after' => null,
                'payment_status_before' => $booking->payment_status,
                'payment_status_after' => null,
                'reason' => 'Admin xóa cứng booking khỏi thùng rác.',
                'metadata' => ['deleted_at' => $booking->deleted_at?->toIso8601String()],
            ]);
            DB::table('booking_confirmation_outbox')->where('booking_id', $booking->id)->delete();
            DB::table('booking_cancellation_outbox')->where('booking_id', $booking->id)->delete();
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

    private function bookingDetailRelations(): array
    {
        return [
            'user:id,full_name,email,phone',
            'tour:id,title,slug,summary,status,duration_days,duration_nights,province_id,category_id',
            'tour.category:id,name,slug',
            'tour.province:id,name',
            'tour.thumbnail:id,tour_id,image_url,alt_text,sort_order,is_thumbnail',
            'tour.itineraries.destinationPlace:id,province_id,district_id,name,district_name,address',
            'tourDeparture:id,tour_id,departure_at,departure_date,return_date,departure_location,status,total_slots,booked_slots',
            'tourDeparture.stages.itinerary.destinationPlace:id,province_id,district_id,name,district_name,address',
            'contact',
            'participants',
            'payment',
            'statusHistories' => fn ($query) => $query->with('changedBy:id,full_name')->latest(),
            'informationChangeHistories' => fn ($query) => $query->with('changedBy:id,full_name')->latest(),
            'auditLogs' => fn ($query) => $query->with('actor:id,full_name')->latest(),
            'disruptionRequests' => fn ($query) => $query
                ->with(['requestedDeparture:id,departure_date,return_date', 'processedBy:id,full_name'])
                ->latest(),
        ];
    }

    private function releaseBookedSlots(Booking $booking, ?string $statusBefore = null): void
    {
        $this->paymentLifecycleService->releaseCommittedSlots($booking, $statusBefore);
    }

    private function synchronizeBookingStatusesWithDepartures(): void
    {
        $this->bookingStatusService->synchronizeAll();
    }
}
