<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BookingDisruptionRequest;
use App\Services\BookingDisruptionResolutionService;
use App\Services\BookingRefundService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BookingDisruptionController extends Controller
{
    public function __construct(
        private readonly BookingDisruptionResolutionService $resolutionService,
        private readonly BookingRefundService $refundService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in([
                ...BookingDisruptionRequest::STATUSES,
                'refund_pending',
                'refunded',
            ])],
            'type' => ['nullable', Rule::in(BookingDisruptionRequest::TYPES)],
            'search' => ['nullable', 'string', 'max:100'],
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date', 'after_or_equal:from_date'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $query = BookingDisruptionRequest::query()
            ->with($this->relations())
            ->when($data['status'] ?? null, function ($q, $status): void {
                if ($status === 'refund_pending' || $status === 'refunded') {
                    $q->where('status', 'approved')
                        ->where('type', 'refund')
                        ->whereHas('booking', fn ($booking) => $booking->where('payment_status', $status));

                    return;
                }

                $q->where('status', $status);
            })
            ->when($data['type'] ?? null, fn ($q, $type) => $q->where('type', $type))
            ->when($data['from_date'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '>=', $date))
            ->when($data['to_date'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '<=', $date))
            ->when($data['search'] ?? null, function ($q, $search): void {
                $q->where(function ($searchQuery) use ($search): void {
                    $searchQuery
                        ->whereHas('booking', fn ($booking) => $booking->where('booking_code', 'like', "%{$search}%"))
                        ->orWhereHas('booking.user', function ($user) use ($search): void {
                            $user->where('full_name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        })
                        ->orWhereHas('booking.tour', fn ($tour) => $tour->where('title', 'like', "%{$search}%"));
                });
            })
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 ELSE 1 END")
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        $paginator = $query->paginate($data['per_page'] ?? 15);

        return response()->json([
            'success' => true,
            'data' => array_map([$this, 'present'], $paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'summary' => $this->summaryData(),
            'timeline' => $this->timelineData(),
        ]);
    }

    public function summary(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->summaryData(),
        ]);
    }

    public function show(BookingDisruptionRequest $bookingDisruptionRequest): JsonResponse
    {
        $bookingDisruptionRequest->load($this->relations());

        return response()->json([
            'success' => true,
            'data' => $this->present($bookingDisruptionRequest),
        ]);
    }

    public function refund(Request $request, BookingDisruptionRequest $bookingDisruptionRequest): JsonResponse
    {
        $data = $request->validate([
            'refund_proof' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $this->refundService->refundApprovedRequest(
            $bookingDisruptionRequest->id,
            $data['refund_proof'],
        );

        $bookingDisruptionRequest->load($this->relations());

        return response()->json([
            'success' => true,
            'message' => 'Đã xác nhận hoàn tiền cho booking.',
            'data' => $this->present($bookingDisruptionRequest),
        ]);
    }

    public function approve(Request $request, BookingDisruptionRequest $bookingDisruptionRequest): JsonResponse
    {
        $data = $request->validate([
            'admin_note' => ['nullable', 'string', 'max:2000'],
            'target_tour_departure_id' => ['nullable', 'integer', 'exists:tour_departures,id'],
        ]);

        $processed = $this->resolutionService->approve(
            $bookingDisruptionRequest,
            (int) $request->user()->id,
            $data['admin_note'] ?? null,
            isset($data['target_tour_departure_id']) ? (int) $data['target_tour_departure_id'] : null,
        );

        return response()->json([
            'success' => true,
            'message' => 'Đã duyệt yêu cầu booking thành công.',
            'data' => $this->present($processed),
        ]);
    }

    public function reject(Request $request, BookingDisruptionRequest $bookingDisruptionRequest): JsonResponse
    {
        $data = $request->validate([
            'admin_note' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $processed = $this->resolutionService->reject(
            $bookingDisruptionRequest,
            (int) $request->user()->id,
            trim($data['admin_note']),
        );

        return response()->json([
            'success' => true,
            'message' => 'Đã từ chối yêu cầu booking.',
            'data' => $this->present($processed),
        ]);
    }

    private function summaryData(): array
    {
        $counts = BookingDisruptionRequest::query()
            ->selectRaw('COUNT(*) as total_count')
            ->selectRaw("SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count")
            ->selectRaw("SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count")
            ->selectRaw("SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count")
            ->first();

        $byType = BookingDisruptionRequest::query()
            ->where('status', 'pending')
            ->selectRaw('type, COUNT(*) as count')
            ->groupBy('type')
            ->pluck('count', 'type');

        $refundPendingCount = (int) BookingDisruptionRequest::query()
            ->where('status', 'approved')
            ->where('type', 'refund')
            ->whereHas('booking', fn ($booking) => $booking->where('payment_status', 'refund_pending'))
            ->count();

        $pendingCount = (int) ($counts->pending_count ?? 0);
        $actionableCount = $pendingCount + $refundPendingCount;

        return [
            'total_count' => (int) ($counts->total_count ?? 0),
            'pending_count' => $pendingCount,
            'refund_pending_count' => $refundPendingCount,
            'actionable_count' => $actionableCount,
            'approved_count' => (int) ($counts->approved_count ?? 0),
            'rejected_count' => (int) ($counts->rejected_count ?? 0),
            'pending_by_type' => [
                'refund' => (int) ($byType['refund'] ?? 0),
                'retain' => (int) ($byType['retain'] ?? 0),
                'transfer' => (int) ($byType['transfer'] ?? 0),
            ],
        ];
    }

    private function timelineData(): array
    {
        $customerEvents = DB::table('booking_status_histories as history')
            ->join('bookings', 'bookings.id', '=', 'history.booking_id')
            ->leftJoin('users', 'users.id', '=', 'history.changed_by')
            ->where(function ($query): void {
                $query->where('history.note', 'like', '[customer_cancellation_requested]%')
                    ->orWhere('history.note', 'like', '[customer_cancellation_withdrawn]%');
            })
            ->select('history.id', 'history.note', 'history.created_at', 'bookings.booking_code', 'users.full_name')
            ->latest('history.created_at')
            ->limit(50)
            ->get()
            ->map(function ($item): array {
                $withdrawn = str_starts_with($item->note, '[customer_cancellation_withdrawn]');

                return [
                    'id' => "customer-{$item->id}",
                    'disruption_request_id' => null,
                    'action' => $withdrawn ? 'withdrawn' : 'requested',
                    'title' => $withdrawn ? 'Khách rút yêu cầu hủy' : 'Khách gửi yêu cầu hủy',
                    'detail' => trim((string) preg_replace('/^\[[^]]+\]\s*/', '', $item->note)),
                    'booking_code' => $item->booking_code,
                    'actor' => $item->full_name ?: 'Khách hàng',
                    'created_at' => Carbon::parse($item->created_at)->toIso8601String(),
                ];
            });

        $adminEvents = DB::table('booking_disruption_requests as requests')
            ->join('bookings', 'bookings.id', '=', 'requests.booking_id')
            ->leftJoin('users', 'users.id', '=', 'requests.processed_by')
            ->whereIn('requests.status', ['approved', 'rejected'])
            ->whereNotNull('requests.processed_at')
            ->select('requests.id', 'requests.status', 'requests.admin_note', 'requests.processed_at', 'bookings.booking_code', 'users.full_name')
            ->latest('requests.processed_at')
            ->limit(50)
            ->get()
            ->map(fn ($item): array => [
                'id' => "admin-{$item->id}",
                'disruption_request_id' => (int) $item->id,
                'action' => $item->status,
                'title' => $item->status === 'approved' ? 'Admin duyệt yêu cầu hủy' : 'Admin từ chối yêu cầu hủy',
                'detail' => $item->admin_note ?: 'Không có ghi chú xử lý.',
                'booking_code' => $item->booking_code,
                'actor' => $item->full_name ?: 'Quản trị viên',
                'created_at' => Carbon::parse($item->processed_at)->toIso8601String(),
            ]);

        return $customerEvents
            ->merge($adminEvents)
            ->sortByDesc('created_at')
            ->take(50)
            ->values()
            ->all();
    }

    private function relations(): array
    {
        return [
            'booking.user:id,full_name,email,phone',
            'booking.tour:id,title,slug',
            'booking.tourDeparture:id,tour_id,departure_date,return_date,status,total_slots,booked_slots',
            'booking.payment',
            'booking.contact',
            'booking.participants:id,booking_id,full_name,phone,birth_date,gender,identity_number,participant_type,unit_price',
            'requestedDeparture:id,tour_id,departure_date,return_date,status,total_slots,booked_slots',
            'processedBy:id,full_name,email',
        ];
    }

    private function present(BookingDisruptionRequest $item): array
    {
        $item->loadMissing($this->relations());
        $booking = $item->booking;

        return [
            'id' => $item->id,
            'type' => $item->type,
            'type_label' => $this->typeLabel($item->type),
            'status' => $item->status,
            'status_label' => $this->statusLabel($this->displayStatus($item)),
            'display_status' => $this->displayStatus($item),
            'display_status_label' => $this->statusLabel($this->displayStatus($item)),
            'reason' => $item->reason,
            'admin_note' => $item->admin_note,
            'requested_tour_departure_id' => $item->requested_tour_departure_id,
            'processed_at' => $item->processed_at?->toIso8601String(),
            'created_at' => $item->created_at?->toIso8601String(),
            'booking' => $booking ? [
                'id' => $booking->id,
                'booking_code' => $booking->booking_code,
                'status' => $booking->status,
                'payment_status' => $booking->payment_status,
                'number_of_people' => (int) $booking->number_of_people,
                'total_amount' => (float) $booking->total_amount,
                'user' => $booking->user,
                'tour' => $booking->tour,
                'tour_departure' => $booking->tourDeparture,
                'payment' => $booking->payment,
                'contact' => $booking->contact,
                'participants' => $booking->participants,
            ] : null,
            'requested_departure' => $item->requestedDeparture,
            'processed_by' => $item->processedBy,
        ];
    }

    private function typeLabel(string $type): string
    {
        return match ($type) {
            'refund' => 'Hoàn tiền',
            'retain' => 'Bảo lưu',
            'transfer' => 'Đổi lịch khởi hành',
            default => 'Yêu cầu booking',
        };
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'pending' => 'Chờ xử lý',
            'approved' => 'Đã duyệt',
            'refund_pending' => 'Chưa hoàn tiền',
            'refunded' => 'Đã hoàn tiền',
            'rejected' => 'Đã từ chối',
            default => $status,
        };
    }

    private function displayStatus(BookingDisruptionRequest $item): string
    {
        if ($item->type !== 'refund' || $item->status !== 'approved') {
            return $item->status;
        }

        return match ($item->booking?->payment_status) {
            'refund_pending' => 'refund_pending',
            'refunded' => 'refunded',
            default => 'approved',
        };
    }
}
