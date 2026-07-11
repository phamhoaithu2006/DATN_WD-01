<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Guide;
use App\Models\Review;
use App\Models\Tour;
use App\Models\TourGuideAssignment;
use Illuminate\Database\Eloquent\Builder;

class GuideReviewService
{
    public function isBookingReviewable(Booking $booking): bool
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

        return in_array($booking->status, ['confirmed', 'completed'], true)
            && $departure->return_date !== null
            && $departure->return_date->isBefore(today());
    }

    public function completedAssignmentsQuery(Guide $guide): Builder
    {
        $today = today()->toDateString();

        return TourGuideAssignment::query()
            ->where('tour_guide_assignments.guide_id', $guide->id)
            ->where('tour_guide_assignments.status', '!=', 'cancelled')
            ->whereHas('departure', function (Builder $query) use ($today): void {
                $query->where('tour_departures.status', 'completed')
                    ->orWhere(function (Builder $subQuery) use ($today): void {
                        $subQuery->whereNotNull('tour_departures.return_date')
                            ->whereDate('tour_departures.return_date', '<', $today);
                    });
            });
    }

    public function refreshGuideRating(int $guideId): void
    {
        $summary = Review::query()
            ->visible()
            ->where('guide_id', $guideId)
            ->selectRaw('COUNT(*) as review_count, COALESCE(AVG(rating), 0) as average_rating')
            ->first();

        Guide::query()
            ->whereKey($guideId)
            ->update([
                'average_rating' => round((float) ($summary?->average_rating ?? 0), 2),
                'review_count' => (int) ($summary?->review_count ?? 0),
            ]);
    }

    public function refreshTourRating(int $tourId): void
    {
        $summary = Review::query()
            ->visible()
            ->where('tour_id', $tourId)
            ->selectRaw('COUNT(*) as review_count, COALESCE(AVG(rating), 0) as average_rating')
            ->first();

        Tour::query()
            ->whereKey($tourId)
            ->update([
                'average_rating' => round((float) ($summary?->average_rating ?? 0), 2),
                'review_count' => (int) ($summary?->review_count ?? 0),
            ]);
    }

    /**
     * @return array{average_rating: float, review_count: int}
     */
    public function guideRatingSummary(Guide $guide): array
    {
        return [
            'average_rating' => round((float) ($guide->average_rating ?? 0), 2),
            'review_count' => (int) ($guide->review_count ?? 0),
        ];
    }
}
