<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\TourDeparture;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingStatusService
{
    public const DISPLAY_AWAITING_PAYMENT = 'awaiting_payment';

    public const DISPLAY_CONFIRMED = 'confirmed';

    public const DISPLAY_UPCOMING = 'upcoming';

    public const DISPLAY_DEPARTED = 'departed';

    public const DISPLAY_COMPLETED = 'completed';

    public const DISPLAY_CANCELLED = 'cancelled';

    public function __construct(
        private readonly VnpayPaymentLifecycleService $paymentLifecycleService,
    ) {}

    /**
     * Đồng bộ trạng thái gốc cho toàn bộ booking đã thanh toán nhưng chưa ở trạng thái kết thúc.
     */
    public function synchronizeAll(?int $userId = null): int
    {
        $query = Booking::query()
            ->with([
                'tour:id,status',
                'tourDeparture:id,tour_id,status,departure_date,return_date,total_slots,booked_slots',
            ])
            ->where('payment_status', 'paid')
            ->whereIn('status', ['awaiting_payment', 'confirmed', 'departed'])
            ->whereHas('tourDeparture');

        if ($userId !== null) {
            $query->where('user_id', $userId);
        }

        $changed = 0;
        $query->chunkById(100, function ($bookings) use (&$changed): void {
            foreach ($bookings as $booking) {
                if ($this->synchronize($booking)) {
                    $changed++;
                }
            }
        });

        return $changed;
    }

    /**
     * Đồng bộ một booking trong transaction có khóa bản ghi.
     *
     * Trả về true khi trạng thái gốc hoặc thông tin hủy được thay đổi.
     */
    public function synchronize(Booking $booking, ?int $changedBy = null): bool
    {
        return DB::transaction(function () use ($booking, $changedBy): bool {
            $lockedBooking = Booking::query()
                ->with([
                    'tour:id,status',
                    'tourDeparture:id,tour_id,status,departure_date,return_date,total_slots,booked_slots',
                ])
                ->lockForUpdate()
                ->find($booking->id);

            if (! $lockedBooking || in_array($lockedBooking->status, ['cancelled', 'cancelled_by_tour', 'completed'], true)) {
                return false;
            }

            $oldStatus = $lockedBooking->status;
            $newStatus = $this->resolvePersistedStatus($lockedBooking);

            if (
                $newStatus === 'confirmed'
                && ! $this->paymentLifecycleService->commitSlotsForPaidBooking($lockedBooking, false)
            ) {
                $newStatus = 'awaiting_payment';
            }

            if ($newStatus === null || $newStatus === $oldStatus) {
                return false;
            }

            $updates = ['status' => $newStatus];

            if ($newStatus === 'cancelled_by_tour') {
                $updates += [
                    'payment_status' => $lockedBooking->payment_status === 'paid'
                        ? 'refund_pending'
                        : $lockedBooking->payment_status,
                    'cancel_reason' => 'Lịch khởi hành đã bị hủy.',
                    'cancellation_reason' => 'tour_departure_cancelled',
                    'resolution_status' => 'pending_selection',
                    'cancelled_at' => $lockedBooking->cancelled_at ?? now(),
                ];
            }

            $lockedBooking->update($updates);
            $lockedBooking->statusHistories()->create([
                'changed_by' => $changedBy,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'note' => $this->historyNote($newStatus),
            ]);

            return true;
        }, 3);
    }

    /**
     * Gắn trạng thái hiển thị và quyền thao tác vào model trước khi serialize JSON.
     */
    public function decorate(Booking $booking): Booking
    {
        $presentation = $this->presentation($booking);

        foreach ($presentation as $key => $value) {
            $booking->setAttribute($key, $value);
        }

        return $booking;
    }

    /**
     * Tính trạng thái hiển thị hiện tại mà không tự ghi database.
     *
     * @return array{
     *     display_status: string,
     *     status_label: string,
     *     display_status_label: string,
     *     status_reason: ?string,
     *     status_reasons: list<string>,
     *     eligibility: array{is_paid: bool, has_capacity: bool, tour_active: bool, departure_active: bool},
     *     capabilities: array{read_only: bool, can_confirm: bool, can_cancel: bool, can_refund: bool, can_set_awaiting_payment: bool}
     * }
     */
    public function presentation(Booking $booking): array
    {
        $evaluation = $this->evaluate($booking);
        $displayStatus = $evaluation['display_status'];

        return [
            'display_status' => $displayStatus,
            'status_label' => $this->statusLabel($displayStatus),
            'display_status_label' => $this->statusLabel($displayStatus),
            'status_reason' => $evaluation['reasons'][0] ?? null,
            'status_reasons' => $evaluation['reasons'],
            'eligibility' => [
                'is_paid' => $evaluation['is_paid'],
                'has_capacity' => $evaluation['has_capacity'],
                'tour_active' => $evaluation['tour_active'],
                'departure_active' => $evaluation['departure_active'],
            ],
            'capabilities' => $this->capabilities($booking, $evaluation),
        ];
    }

    /**
     * Dùng cho bộ lọc admin theo trạng thái hiển thị, không thêm trạng thái vào database.
     */
    public function applyDisplayFilter(Builder $query, ?string $displayStatus): Builder
    {
        if (! $displayStatus) {
            return $query;
        }

        $today = today()->toDateString();
        $upcomingEnd = today()->addDays(TourDeparture::CUSTOMER_BOOKING_CUTOFF_DAYS)->toDateString();

        return match ($displayStatus) {
            self::DISPLAY_CONFIRMED => $query
                ->whereNotIn('status', ['cancelled', 'cancelled_by_tour', 'completed'])
                ->where('payment_status', 'paid')
                ->whereHas('tour', fn (Builder $tour) => $tour->where('status', 'published'))
                ->whereHas('tourDeparture', fn (Builder $departure) => $departure
                    ->whereNotIn('status', ['cancelled', 'canceled', 'completed'])
                    ->whereDate('departure_date', '>', $upcomingEnd)),
            self::DISPLAY_UPCOMING => $query
                ->whereNotIn('status', ['cancelled', 'cancelled_by_tour', 'completed'])
                ->where('payment_status', 'paid')
                ->whereHas('tour', fn (Builder $tour) => $tour->where('status', 'published'))
                ->whereHas('tourDeparture', fn (Builder $departure) => $departure
                    ->whereNotIn('status', ['cancelled', 'canceled', 'completed'])
                    ->whereDate('departure_date', '>', $today)),
            self::DISPLAY_DEPARTED => $query
                ->whereNotIn('status', ['cancelled', 'cancelled_by_tour', 'completed'])
                ->where(function (Builder $booking): void {
                    $booking->where('status', '!=', 'awaiting_payment')
                        ->orWhereNotNull('slot_committed_at');
                })
                ->whereHas('tourDeparture', fn (Builder $departure) => $departure
                    ->where('status', '!=', 'completed')
                    ->whereNotIn('status', ['cancelled', 'canceled'])
                    ->whereDate('departure_date', '<=', $today)
                    ->whereDate('return_date', '>=', $today)),
            self::DISPLAY_COMPLETED => $query
                ->whereNotIn('status', ['cancelled', 'cancelled_by_tour'])
                ->where(function (Builder $booking) use ($today): void {
                    $booking->where('status', 'completed')
                        ->orWhereHas('tourDeparture', fn (Builder $departure) => $departure
                            ->where('status', 'completed')
                            ->orWhere(function (Builder $datedDeparture) use ($today): void {
                                $datedDeparture->whereDate('return_date', '<', $today);
                            }));
                }),
            self::DISPLAY_CANCELLED => $query->whereIn('status', ['cancelled', 'cancelled_by_tour']),
            default => $query->where('status', $displayStatus),
        };
    }

    /**
     * Chặn hoàn tiền trực tiếp nếu booking không ở Đã xác nhận thực sự.
     */
    public function assertCanRefund(Booking $booking): void
    {
        $evaluation = $this->evaluate($booking);

        if (
            $booking->status !== 'confirmed'
            || $evaluation['display_status'] !== self::DISPLAY_CONFIRMED
        ) {
            throw ValidationException::withMessages([
                'status' => ['Chỉ booking ở trạng thái Đã xác nhận mới được hoàn tiền trực tiếp; booking sắp diễn ra, đang diễn ra hoặc đã kết thúc chỉ được xem chi tiết.'],
            ]);
        }
    }

    /**
     * Kiểm tra chuyển trạng thái theo action của admin.
     */
    public function assertCanChangeStatus(Booking $booking, string $targetStatus): void
    {
        $evaluation = $this->evaluate($booking);
        $displayStatus = $evaluation['display_status'];

        if ($targetStatus === 'cancelled') {
            $canAdminCancelBeforeDeparture = in_array($booking->status, ['awaiting_payment', 'confirmed'], true)
                && ! in_array($displayStatus, [self::DISPLAY_DEPARTED, self::DISPLAY_COMPLETED, self::DISPLAY_CANCELLED], true);

            if ($canAdminCancelBeforeDeparture) {
                return;
            }
        }

        if (in_array($displayStatus, [self::DISPLAY_UPCOMING, self::DISPLAY_DEPARTED, self::DISPLAY_COMPLETED, self::DISPLAY_CANCELLED], true)) {
            throw ValidationException::withMessages([
                'status' => ['Booking ở trạng thái hiện tại chỉ có thể xem chi tiết.'],
            ]);
        }

        if ($targetStatus === 'awaiting_payment') {
            if ($booking->status !== 'confirmed' || $displayStatus !== self::DISPLAY_CONFIRMED) {
                throw ValidationException::withMessages([
                    'status' => ['Chỉ booking Đã xác nhận mới được chuyển về Chờ thanh toán.'],
                ]);
            }

            if ($evaluation['is_paid'] && $evaluation['has_capacity'] && $evaluation['tour_active']) {
                throw ValidationException::withMessages([
                    'status' => ['Booking vẫn đủ điều kiện Đã xác nhận nên không cần chuyển về Chờ thanh toán.'],
                ]);
            }

            return;
        }

        if ($targetStatus === 'confirmed') {
            if ($booking->status !== 'awaiting_payment') {
                throw ValidationException::withMessages([
                    'status' => ['Chỉ booking Chờ thanh toán mới được xác nhận bằng dấu tích.'],
                ]);
            }

            if (! $evaluation['is_paid']) {
                throw ValidationException::withMessages([
                    'status' => ['Booking chỉ được xác nhận sau khi đã thanh toán.'],
                ]);
            }

            if (! $evaluation['has_capacity']) {
                throw ValidationException::withMessages([
                    'status' => ['Lịch khởi hành không còn đủ chỗ để xác nhận booking.'],
                ]);
            }

            if (! $evaluation['tour_active']) {
                throw ValidationException::withMessages([
                    'status' => ['Tour hiện không hoạt động nên chưa thể xác nhận booking.'],
                ]);
            }

            return;
        }

        if ($targetStatus === 'cancelled') {
            if (
                ! in_array($booking->status, ['awaiting_payment', 'confirmed'], true)
                || ($booking->status === 'confirmed' && $displayStatus !== self::DISPLAY_CONFIRMED)
            ) {
                throw ValidationException::withMessages([
                    'status' => ['Booking sắp diễn ra, đang diễn ra hoặc đã kết thúc chỉ có thể xem chi tiết.'],
                ]);
            }

            return;
        }

        if (in_array($targetStatus, ['departed', 'completed'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Trạng thái Đang diễn ra và Đã kết thúc được hệ thống tự động cập nhật theo ngày tour.'],
            ]);
        }

        throw ValidationException::withMessages([
            'status' => ['Chỉ có thể chuyển booking giữa Chờ thanh toán và Đã xác nhận theo điều kiện hệ thống.'],
        ]);
    }

    /**
     * @return array{
     *     display_status: string,
     *     is_paid: bool,
     *     has_capacity: bool,
     *     tour_active: bool,
     *     departure_active: bool,
     *     reasons: list<string>
     * }
     */
    private function evaluate(Booking $booking): array
    {
        $departure = $booking->relationLoaded('tourDeparture')
            ? $booking->tourDeparture
            : $booking->loadMissing('tourDeparture')->tourDeparture;
        $tour = $booking->relationLoaded('tour')
            ? $booking->tour
            : $booking->loadMissing('tour')->tour;

        $isPaid = $booking->payment_status === 'paid';
        $tourActive = $tour?->status === 'published';
        $departureActive = (bool) ($departure
            && ! in_array(strtolower((string) $departure->status), ['cancelled', 'canceled', 'completed'], true));
        $hasCapacity = $departure
            ? $booking->slot_committed_at !== null
                || ((int) $departure->total_slots - (int) $departure->booked_slots) >= (int) $booking->number_of_people
            : false;
        $reasons = [];

        if (! $isPaid) {
            $reasons[] = 'Booking chưa được thanh toán.';
        }
        if (! $hasCapacity) {
            $reasons[] = 'Lịch khởi hành không còn đủ chỗ.';
        }
        if (! $tourActive) {
            $reasons[] = 'Tour hiện không hoạt động.';
        }
        if (! $departureActive) {
            $reasons[] = 'Lịch khởi hành không còn hoạt động.';
        }

        $displayStatus = $this->resolveDisplayStatus(
            $booking,
            $departure,
            $isPaid && $hasCapacity && $tourActive && $departureActive,
        );

        return [
            'display_status' => $displayStatus,
            'is_paid' => $isPaid,
            'has_capacity' => $hasCapacity,
            'tour_active' => $tourActive,
            'departure_active' => $departureActive,
            'reasons' => array_values(array_unique($reasons)),
        ];
    }

    private function resolvePersistedStatus(Booking $booking): ?string
    {
        $departure = $booking->tourDeparture;

        if (! $departure || $booking->payment_status !== 'paid') {
            return null;
        }

        $departureStatus = strtolower((string) $departure->status);
        if (in_array($departureStatus, ['cancelled', 'canceled'], true)) {
            return 'cancelled_by_tour';
        }

        $departureDate = $departure->departure_date?->copy()->startOfDay();
        $returnDate = ($departure->return_date ?? $departureDate)?->copy()->startOfDay();
        $today = today();
        $isTripCandidate = $booking->status !== 'awaiting_payment' || $booking->slot_committed_at !== null;

        if ($departureStatus === 'completed' || ($isTripCandidate && $returnDate?->lt($today))) {
            return 'completed';
        }

        if ($isTripCandidate && $departureDate?->lte($today) && $returnDate?->gte($today)) {
            return 'departed';
        }

        if ($departureDate?->gt($today)) {
            return $this->isEligibleForConfirmation($booking) ? 'confirmed' : 'awaiting_payment';
        }

        return null;
    }

    private function resolveDisplayStatus(Booking $booking, ?TourDeparture $departure, bool $eligible): string
    {
        if (in_array($booking->status, ['cancelled', 'cancelled_by_tour'], true)) {
            return self::DISPLAY_CANCELLED;
        }

        if ($booking->status === 'completed' || strtolower((string) $departure?->status) === 'completed') {
            return self::DISPLAY_COMPLETED;
        }

        $departureDate = $departure?->departure_date?->copy()->startOfDay();
        $returnDate = ($departure?->return_date ?? $departureDate)?->copy()->startOfDay();
        $today = today();
        $isTripCandidate = $booking->status !== 'awaiting_payment' || $booking->slot_committed_at !== null;

        if ($isTripCandidate && $returnDate?->lt($today)) {
            return self::DISPLAY_COMPLETED;
        }

        if ($isTripCandidate && $departureDate?->lte($today) && $returnDate?->gte($today)) {
            return self::DISPLAY_DEPARTED;
        }

        if ($departureDate?->gt($today) && $eligible) {
            return self::DISPLAY_UPCOMING;
        }

        return self::DISPLAY_AWAITING_PAYMENT;
    }

    /**
     * @param array{
     *     display_status: string,
     *     is_paid: bool,
     *     has_capacity: bool,
     *     tour_active: bool,
     *     departure_active: bool,
     *     reasons: list<string>
     * } $evaluation
     * @return array{read_only: bool, can_confirm: bool, can_cancel: bool, can_refund: bool, can_set_awaiting_payment: bool}
     */
    private function capabilities(Booking $booking, array $evaluation): array
    {
        $displayStatus = $evaluation['display_status'];
        $readOnly = in_array($displayStatus, [self::DISPLAY_UPCOMING, self::DISPLAY_DEPARTED, self::DISPLAY_COMPLETED, self::DISPLAY_CANCELLED], true);
        $isEligible = $evaluation['is_paid']
            && $evaluation['has_capacity']
            && $evaluation['tour_active']
            && $evaluation['departure_active'];

        return [
            'read_only' => $readOnly,
            'can_confirm' => $booking->status === 'awaiting_payment' && $isEligible,
            'can_cancel' => $booking->status === 'awaiting_payment'
                || ($booking->status === 'confirmed'
                    && ($displayStatus === self::DISPLAY_CONFIRMED
                        || (! $evaluation['is_paid'] && $displayStatus === self::DISPLAY_AWAITING_PAYMENT))),
            'can_refund' => $booking->status === 'confirmed' && $displayStatus === self::DISPLAY_CONFIRMED,
            'can_set_awaiting_payment' => $booking->status === 'confirmed'
                && $displayStatus === self::DISPLAY_CONFIRMED
                && ! $isEligible,
        ];
    }

    private function isEligibleForConfirmation(Booking $booking): bool
    {
        $departure = $booking->tourDeparture;
        $tour = $booking->tour;

        return $booking->payment_status === 'paid'
            && $tour?->status === 'published'
            && $departure
            && in_array(strtolower((string) $departure->status), ['open', 'confirmed'], true)
            && ($booking->slot_committed_at !== null
                || ((int) $departure->total_slots - (int) $departure->booked_slots) >= (int) $booking->number_of_people);
    }

    private function historyNote(string $newStatus): string
    {
        return match ($newStatus) {
            'confirmed' => 'Tự động xác nhận: booking đã thanh toán, lịch còn chỗ và tour đang hoạt động.',
            'awaiting_payment' => 'Tự động chuyển về Chờ thanh toán vì thanh toán, sức chứa hoặc trạng thái hoạt động chưa đủ điều kiện.',
            'departed' => 'Tự động cập nhật: tour đã đến ngày khởi hành.',
            'completed' => 'Tự động cập nhật: tour đã qua ngày kết thúc.',
            'cancelled_by_tour' => 'Tự động cập nhật: lịch khởi hành đã bị hủy.',
            default => 'Tự động đồng bộ trạng thái booking.',
        };
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            self::DISPLAY_AWAITING_PAYMENT => 'Chờ thanh toán',
            self::DISPLAY_CONFIRMED => 'Đã xác nhận',
            self::DISPLAY_UPCOMING => 'Sắp diễn ra',
            self::DISPLAY_DEPARTED => 'Đang diễn ra',
            self::DISPLAY_COMPLETED => 'Đã kết thúc',
            self::DISPLAY_CANCELLED => 'Đã hủy',
            default => $status,
        };
    }
}
