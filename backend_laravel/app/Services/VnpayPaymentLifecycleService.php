<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Tour;
use App\Models\TourDeparture;

class VnpayPaymentLifecycleService
{
    public const SOLD_OUT_AFTER_PAYMENT_REASON = 'Đã thanh toán nhưng lịch khởi hành không còn đủ chỗ. Nhân viên sẽ liên hệ hỗ trợ hoàn tiền.';

    /**
     * Chỉ cộng chỗ sau khi payment đã được gateway xác nhận thành công.
     * Caller phải thực hiện trong transaction đang khóa payment.
     */
    public function commitSlotsForPaidBooking(Booking $booking): bool
    {
        $lockedBooking = Booking::query()
            ->lockForUpdate()
            ->find($booking->id);

        if (! $lockedBooking) {
            return false;
        }

        if ($lockedBooking->slot_committed_at) {
            return true;
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
            || $departure->departure_date->isBefore(today())
            || ((int) $departure->total_slots - (int) $departure->booked_slots) < (int) $lockedBooking->number_of_people
        ) {
            return false;
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
     */
    public function releaseCommittedSlots(Booking $booking): void
    {
        $lockedBooking = Booking::query()
            ->lockForUpdate()
            ->find($booking->id);

        if (! $lockedBooking || ! $lockedBooking->slot_committed_at) {
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

    public function failPendingPayment(
        Payment $payment,
        string $reason,
        ?array $gatewayResponse = null,
        ?int $changedBy = null,
    ): void
    {
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

        if ($booking->slot_committed_at) {
            $this->releaseCommittedSlots($booking);
        }

        $booking->update([
            'status' => 'cancelled',
            'payment_status' => 'failed',
            'cancel_reason' => $reason,
            'cancelled_at' => now(),
        ]);

        $booking->statusHistories()->create([
            'changed_by' => $changedBy,
            'old_status' => 'pending',
            'new_status' => 'cancelled',
            'note' => $reason,
        ]);
    }
}
