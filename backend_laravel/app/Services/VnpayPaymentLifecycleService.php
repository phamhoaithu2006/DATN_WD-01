<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\TourDeparture;

class VnpayPaymentLifecycleService
{
    public function failPendingPayment(Payment $payment, string $reason, ?array $gatewayResponse = null): void
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

        $departure = TourDeparture::query()
            ->lockForUpdate()
            ->find($booking->tour_departure_id);

        if ($departure) {
            $departure->booked_slots = max(0, (int) $departure->booked_slots - (int) $booking->number_of_people);
            $departure->save();
        }

        $booking->update([
            'status' => 'cancelled',
            'payment_status' => 'failed',
            'cancel_reason' => $reason,
            'cancelled_at' => now(),
        ]);

        $booking->statusHistories()->create([
            'changed_by' => null,
            'old_status' => 'pending',
            'new_status' => 'cancelled',
            'note' => $reason,
        ]);
    }
}
