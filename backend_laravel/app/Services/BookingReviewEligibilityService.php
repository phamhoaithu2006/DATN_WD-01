<?php

namespace App\Services;

use App\Models\Booking;

class BookingReviewEligibilityService
{
    public function isReviewable(Booking $booking): bool
    {
        if ($booking->status === 'cancelled') {
            return false;
        }

        if ($booking->status === 'completed') {
            return true;
        }

        $departure = $booking->relationLoaded('tourDeparture')
            ? $booking->tourDeparture
            : $booking->tourDeparture()->first();

        if (! $departure) {
            return false;
        }

        if ($departure->status === 'completed') {
            return true;
        }

        return $booking->status === 'confirmed'
            && $departure->return_date !== null
            && $departure->return_date->isBefore(today());
    }
}
