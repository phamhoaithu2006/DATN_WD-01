<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Tour;
use App\Models\TourDeparture;

class VnpayPaymentLifecycleService
{
    public const SOLD_OUT_AFTER_PAYMENT_REASON = 'Đã thanh toán nhưng lịch khởi hành không còn đủ chỗ. Nhân viên sẽ liên hệ hỗ trợ hoàn tiền.';

    public function __construct(
        private readonly BookingAuditService $bookingAuditService,
    ) {}

    /**
     * Chỉ cộng chỗ sau khi payment đã được gateway xác nhận thành công.
     * Caller phải thực hiện trong transaction đang khóa payment.
     */
    public function commitSlotsForPaidBooking(Booking $booking, bool $respectCustomerCutoff = true): bool
    {
        $lockedBooking = Booking::query()
            ->lockForUpdate()
            ->find($booking->id);

        if (! $lockedBooking) {
            return false;
        }

        $departure = TourDeparture::query()
            ->lockForUpdate()
            ->find($lockedBooking->tour_departure_id);

        $tourIsBookable = $departure
            ? Tour::query()->whereKey($departure->tour_id)->where('status', 'published')->exists()
            : false;

        if (
            ! $departure
            || ! $tourIsBookable
            || ! in_array($departure->status, ['open', 'confirmed'], true)
            || ($respectCustomerCutoff
                && $departure->departure_date->lte(TourDeparture::customerBookingCutoffDate()))
            || (! $lockedBooking->slot_committed_at
                && ((int) $departure->total_slots - (int) $departure->booked_slots) < (int) $lockedBooking->number_of_people)
        ) {
            return false;
        }

        if ($lockedBooking->slot_committed_at) {
            return true;
        }

        $departure->booked_slots = (int) $departure->booked_slots + (int) $lockedBooking->number_of_people;
        $departure->save();

        $lockedBooking->update([
            'slot_committed_at' => now(),
        ]);

        return true;
    }

    /**
     * Hoàn chỗ đúng một lần cho booking đã từng commit slot.
     *
     * $statusBefore giữ tương thích với dữ liệu booking confirmed cũ được tạo
     * trước khi cột slot_committed_at được áp dụng.
     */
    public function releaseCommittedSlots(Booking $booking, ?string $statusBefore = null): void
    {
        $lockedBooking = Booking::query()
            ->lockForUpdate()
            ->find($booking->id);

        $isLegacyConfirmedHold = $lockedBooking
            && ! $lockedBooking->slot_committed_at
            && $statusBefore === 'confirmed';

        if (! $lockedBooking || (! $lockedBooking->slot_committed_at && ! $isLegacyConfirmedHold)) {
            return;
        }

        $departure = TourDeparture::query()
            ->lockForUpdate()
            ->find($lockedBooking->tour_departure_id);

        if ($departure) {
            $departure->booked_slots = max(
                0,
                (int) $departure->booked_slots - (int) $lockedBooking->number_of_people
            );
            $departure->save();
        }

        $lockedBooking->update([
            'slot_committed_at' => null,
        ]);
    }

    /**
     * Đưa booking sang hàng chờ hoàn tiền khi cổng thanh toán đã báo thành công
     * nhưng hệ thống không thể giữ chỗ cho booking.
     */
    public function markPaidBookingRefundPending(
        Booking $booking,
        string $reason,
        ?int $changedBy = null,
    ): void {
        $oldStatus = $booking->status;
        $oldPaymentStatus = $booking->payment_status;

        if ($booking->slot_committed_at) {
            $this->releaseCommittedSlots($booking);
        }

        $booking->update([
            'status' => 'cancelled',
            'payment_status' => 'refund_pending',
            'cancel_reason' => $reason,
            'cancelled_at' => $booking->cancelled_at ?? now(),
        ]);

        if ($oldStatus !== 'cancelled') {
            $booking->statusHistories()->create([
                'changed_by' => $changedBy,
                'old_status' => $oldStatus,
                'new_status' => 'cancelled',
                'note' => $reason,
            ]);
        }

        $this->bookingAuditService->record($booking, 'payment_refund_pending', $changedBy, [
            'status_before' => $oldStatus,
            'status_after' => 'cancelled',
            'payment_status_before' => $oldPaymentStatus,
            'payment_status_after' => 'refund_pending',
            'reason' => $reason,
        ]);
    }

    public function failPendingPayment(
        Payment $payment,
        string $reason,
        ?array $gatewayResponse = null,
        ?int $changedBy = null,
    ): void {
        if ($payment->status !== 'pending') {
            return;
        }

        $booking = Booking::query()
            ->with('tourDeparture')
            ->lockForUpdate()
            ->find($payment->booking_id);

        if (! $booking) {
            return;
        }

        $payment->update([
            'status' => 'failed',
            'gateway_response' => $gatewayResponse ?? $payment->gateway_response,
            'paid_at' => null,
        ]);

        if ($booking->status === 'cancelled') {
            return;
        }

        if ($booking->status !== 'awaiting_payment') {
            return;
        }

        if ($booking->slot_committed_at) {
            $this->releaseCommittedSlots($booking);
        }

        $oldBookingStatus = $booking->status;
        $oldPaymentStatus = $booking->payment_status;
        $booking->update([
            'status' => 'cancelled',
            'payment_status' => 'failed',
            'cancel_reason' => $reason,
            'cancelled_at' => now(),
        ]);

        $booking->statusHistories()->create([
            'changed_by' => $changedBy,
            'old_status' => $oldBookingStatus,
            'new_status' => 'cancelled',
            'note' => $reason,
        ]);
        $this->bookingAuditService->record($booking, 'payment_failed', $changedBy, [
            'status_before' => $oldBookingStatus,
            'status_after' => 'cancelled',
            'payment_status_before' => $oldPaymentStatus,
            'payment_status_after' => 'failed',
            'reason' => $reason,
        ]);
    }
}
