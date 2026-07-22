<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Tour;
use App\Models\TourReview;

class TourReviewService
{
    public function __construct(
        private readonly BookingReviewEligibilityService $eligibilityService
    ) {}

    public function isBookingReviewable(Booking $booking): bool
    {
        return $this->eligibilityService->isReviewable($booking);
    }

    public function refreshTourRating(int $tourId): void
    {
        $tour = Tour::query()->lockForUpdate()->find($tourId);

        if (! $tour) {
            return;
        }

        $summary = TourReview::query()
            ->visible()
            ->where('tour_id', $tourId)
            ->selectRaw('COUNT(*) as review_count, COALESCE(AVG(rating), 0) as average_rating')
            ->first();

        $tour->update([
            'average_rating' => round((float) ($summary?->average_rating ?? 0), 2),
            'review_count' => (int) ($summary?->review_count ?? 0),
        ]);
    }

    /**
     * @return array{average_rating: float, review_count: int, distribution: array<int, int>}
     */
    public function summaryForTour(int $tourId): array
    {
        $counts = TourReview::query()
            ->visible()
            ->where('tour_id', $tourId)
            ->selectRaw('rating, COUNT(*) as aggregate')
            ->groupBy('rating')
            ->pluck('aggregate', 'rating');

        $distribution = [];
        $total = 0;
        $weightedTotal = 0;

        foreach (range(1, 5) as $rating) {
            $count = (int) ($counts[$rating] ?? 0);
            $distribution[$rating] = $count;
            $total += $count;
            $weightedTotal += $rating * $count;
        }

        return [
            'average_rating' => $total > 0 ? round($weightedTotal / $total, 2) : 0.0,
            'review_count' => $total,
            'distribution' => $distribution,
        ];
    }
}
