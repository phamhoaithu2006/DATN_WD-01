<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingAuditLog;
use App\Services\BookingRefundService;
use App\Services\BookingStatusService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BookingRefundController extends Controller
{
    private const CANCELLED_STATUSES = ['cancelled', 'cancelled_by_tour'];

    private const REFUND_STATUSES = ['refund_pending', 'refunded'];

    private const AUDIT_ACTIONS = [
        'admin_cancelled',
        'admin_disruption_approved',
        'customer_cancelled',
        'payment_failed',
        'payment_refund_pending',
        'refund_completed',
        'refund_proof_replaced',
        'refund_proof_removed',
        'moved_to_trash',
        'restored',
        'hard_deleted',
    ];

    public function __construct(
        private readonly BookingRefundService $refundService,
        private readonly BookingStatusService $bookingStatusService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(self::REFUND_STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date', 'after_or_equal:from_date'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $status = $filters['status'] ?? 'refund_pending';
        $paginator = $this->refundBookingQuery()
            ->where('bookings.payment_status', $status)
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $like = '%'.trim($search).'%';
                $query->where(function (Builder $searchQuery) use ($like): void {
                    $searchQuery
                        ->where('bookings.booking_code', 'like', $like)
                        ->orWhereHas('user', fn (Builder $user) => $user
                            ->where('full_name', 'like', $like)
                            ->orWhere('email', 'like', $like)
                            ->orWhere('phone', 'like', $like))
                        ->orWhereHas('contact', fn (Builder $contact) => $contact
                            ->where('contact_name', 'like', $like)
                            ->orWhere('contact_email', 'like', $like)
                            ->orWhere('contact_phone', 'like', $like))
                        ->orWhereHas('tour', fn (Builder $tour) => $tour->where('title', 'like', $like));
                });
            })
            ->when($filters['from_date'] ?? null, fn (Builder $query, string $date) => $query->whereDate('bookings.created_at', '>=', $date))
            ->when($filters['to_date'] ?? null, fn (Builder $query, string $date) => $query->whereDate('bookings.created_at', '<=', $date))
            ->orderByDesc('bookings.updated_at')
            ->orderByDesc('bookings.id')
            ->paginate($filters['per_page'] ?? 15);

        return response()->json([
            'success' => true,
            'data' => array_map(fn (Booking $booking): array => $this->present($booking), $paginator->items()),
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

    public function timeline(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_id' => ['nullable', 'integer'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->timelineData(
                isset($data['booking_id']) ? (int) $data['booking_id'] : null,
                (int) ($data['limit'] ?? 80),
            ),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $booking = $this->refundBookingQuery()
            ->with([
                'participants:id,booking_id,full_name,phone,birth_date,gender,participant_type,unit_price',
                'statusHistories' => fn ($query) => $query->with('changedBy:id,full_name')->latest(),
                'auditLogs' => fn ($query) => $query->with('actor:id,full_name')->latest(),
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $this->present($booking),
            'timeline' => $this->timelineData($booking->id),
        ]);
    }

    public function refund(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'refund_proof' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $this->refundService->refundCancelledBooking(
            $id,
            $data['refund_proof'],
            $request->user()?->id,
        );

        $booking = $this->refundBookingQuery()
            ->with(['participants:id,booking_id,full_name,phone,birth_date,gender,participant_type,unit_price'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Đã xác nhận hoàn tiền cho booking.',
            'data' => $this->present($booking),
            'timeline' => $this->timelineData($booking->id),
        ]);
    }

    private function refundBookingQuery(): Builder
    {
        return Booking::query()
            ->with([
                'user:id,full_name,email,phone',
                'tour:id,title,slug,status',
                'tourDeparture:id,tour_id,departure_date,return_date,status,total_slots,booked_slots',
                'contact',
                'payment',
            ])
            ->whereIn('bookings.status', self::CANCELLED_STATUSES)
            ->whereIn('bookings.payment_status', self::REFUND_STATUSES);
    }

    private function summaryData(): array
    {
        $counts = $this->refundBookingQuery()
            ->selectRaw("SUM(CASE WHEN bookings.payment_status = 'refund_pending' THEN 1 ELSE 0 END) as refund_pending_count")
            ->selectRaw("SUM(CASE WHEN bookings.payment_status = 'refunded' THEN 1 ELSE 0 END) as refunded_count")
            ->selectRaw('COUNT(*) as total_count')
            ->first();

        return [
            'total_count' => (int) ($counts?->total_count ?? 0),
            'refund_pending_count' => (int) ($counts?->refund_pending_count ?? 0),
            'refunded_count' => (int) ($counts?->refunded_count ?? 0),
        ];
    }

    private function present(Booking $booking): array
    {
        $this->bookingStatusService->decorate($booking);
        $payment = $booking->payment;

        return [
            'id' => $booking->id,
            'booking_code' => $booking->booking_code,
            'status' => $booking->status,
            'status_label' => $booking->status === 'cancelled_by_tour' ? 'Đã hủy bởi tour' : 'Đã hủy',
            'display_status' => 'cancelled',
            'display_status_label' => 'Đã hủy',
            'payment_status' => $booking->payment_status,
            'payment_status_label' => $booking->payment_status === 'refunded' ? 'Đã hoàn tiền' : 'Chờ hoàn tiền',
            'number_of_people' => (int) $booking->number_of_people,
            'unit_price' => (float) $booking->unit_price,
            'discount_amount' => (float) $booking->discount_amount,
            'total_amount' => (float) $booking->total_amount,
            'cancel_reason' => $booking->cancel_reason,
            'cancellation_reason' => $booking->cancellation_reason,
            'cancelled_at' => $booking->cancelled_at?->toIso8601String(),
            'created_at' => $booking->created_at?->toIso8601String(),
            'updated_at' => $booking->updated_at?->toIso8601String(),
            'user' => $booking->user,
            'contact' => $booking->contact,
            'tour' => $booking->tour,
            'tour_departure' => $booking->tourDeparture,
            'payment' => $payment,
            'participants' => $booking->participants,
            'status_histories' => $booking->relationLoaded('statusHistories') ? $booking->statusHistories : [],
            'audit_logs' => $booking->relationLoaded('auditLogs') ? $booking->auditLogs : [],
            'can_refund' => in_array($booking->payment_status, self::REFUND_STATUSES, true),
        ];
    }

    private function timelineData(?int $bookingId = null, int $limit = 80): array
    {
        $logs = BookingAuditLog::query()
            ->with('actor:id,full_name')
            ->whereIn('action', self::AUDIT_ACTIONS)
            ->when($bookingId !== null, fn (Builder $query) => $query->where('booking_id', $bookingId))
            ->latest('created_at')
            ->latest('id')
            ->limit($limit)
            ->get();

        return $logs->map(function (BookingAuditLog $log): array {
            $beforeStatus = $log->status_before ? $this->statusLabel($log->status_before) : null;
            $afterStatus = $log->status_after ? $this->statusLabel($log->status_after) : null;
            $beforePayment = $log->payment_status_before ? $this->paymentStatusLabel($log->payment_status_before) : null;
            $afterPayment = $log->payment_status_after ? $this->paymentStatusLabel($log->payment_status_after) : null;

            return [
                'id' => $log->id,
                'booking_id' => $log->booking_id,
                'booking_code' => $log->booking_code,
                'action' => $log->action,
                'title' => $this->actionTitle($log->action),
                'detail' => $log->reason ?: $this->transitionText($beforeStatus, $afterStatus, $beforePayment, $afterPayment),
                'status_before' => $log->status_before,
                'status_after' => $log->status_after,
                'status_before_label' => $beforeStatus,
                'status_after_label' => $afterStatus,
                'payment_status_before' => $log->payment_status_before,
                'payment_status_after' => $log->payment_status_after,
                'payment_status_before_label' => $beforePayment,
                'payment_status_after_label' => $afterPayment,
                'actor' => $log->actor_name ?: $log->actor?->full_name ?: 'Hệ thống',
                'metadata' => $log->metadata,
                'created_at' => $log->created_at?->toIso8601String(),
            ];
        })->values()->all();
    }

    private function actionTitle(string $action): string
    {
        return match ($action) {
            'admin_cancelled' => 'Admin hủy booking',
            'admin_disruption_approved' => 'Duyệt phương án hủy booking',
            'customer_cancelled' => 'Khách hủy booking',
            'payment_failed' => 'Thanh toán thất bại',
            'payment_refund_pending' => 'Thanh toán thành công nhưng booking chờ hoàn tiền',
            'refund_completed' => 'Đã hoàn tiền',
            'refund_proof_replaced' => 'Thay ảnh chứng minh hoàn tiền',
            'refund_proof_removed' => 'Xóa ảnh chứng minh hoàn tiền',
            'moved_to_trash' => 'Chuyển booking vào thùng rác',
            'restored' => 'Hoàn tác booking khỏi thùng rác',
            'hard_deleted' => 'Xóa cứng booking',
            default => $action,
        };
    }

    private function transitionText(?string $beforeStatus, ?string $afterStatus, ?string $beforePayment, ?string $afterPayment): string
    {
        $parts = [];
        if ($beforeStatus || $afterStatus) {
            $parts[] = 'Booking: '.($beforeStatus ?: '—').' → '.($afterStatus ?: 'đã xóa');
        }
        if ($beforePayment || $afterPayment) {
            $parts[] = 'Thanh toán: '.($beforePayment ?: '—').' → '.($afterPayment ?: 'đã xóa');
        }

        return $parts ? implode(' · ', $parts) : 'Không có ghi chú chi tiết.';
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'awaiting_payment' => 'Chờ thanh toán',
            'confirmed' => 'Đã xác nhận',
            'departed' => 'Đang diễn ra',
            'completed' => 'Đã kết thúc',
            'cancelled' => 'Đã hủy',
            'cancelled_by_tour' => 'Đã hủy bởi tour',
            default => $status,
        };
    }

    private function paymentStatusLabel(string $status): string
    {
        return match ($status) {
            'unpaid' => 'Chưa thanh toán',
            'paid' => 'Đã thanh toán',
            'failed' => 'Thanh toán thất bại',
            'refund_pending' => 'Chờ hoàn tiền',
            'refunded' => 'Đã hoàn tiền',
            default => $status,
        };
    }
}
