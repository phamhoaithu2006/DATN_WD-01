<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Notification;
use App\Models\User;

class TourReviewNotificationService
{
    public function __construct(
        private readonly BookingReviewEligibilityService $eligibilityService
    ) {}

    public function syncForUser(User $user): int
    {
        $user->loadMissing('role');

        if (mb_strtolower(trim((string) $user->role?->name)) !== 'customer') {
            return 0;
        }

        $created = 0;
        $bookings = Booking::query()
            ->where('user_id', $user->id)
            ->whereNotIn('status', ['cancelled', 'cancelled_by_tour'])
            ->with(['tour:id,title', 'tourDeparture', 'tourReview'])
            ->get();

        foreach ($bookings as $booking) {
            if (! $this->eligibilityService->isReviewable($booking)) {
                continue;
            }

            $query = Notification::query()
                ->where('user_id', $user->id)
                ->where('data->kind', 'tour_review_request')
                ->where('data->booking_id', $booking->id);

            if ($booking->tourReview) {
                $query->update(['status' => 'read', 'read_at' => now()]);
                continue;
            }

            if ($query->exists()) {
                continue;
            }

            $tourTitle = $booking->tour?->title ?? "Tour #{$booking->tour_id}";

            Notification::query()->create([
                'user_id' => $user->id,
                'title' => 'Đánh giá tour',
                'message' => "Tour \"{$tourTitle}\" đã kết thúc. Hãy chia sẻ đánh giá của bạn.",
                'type' => 'booking',
                'status' => 'unread',
                'data' => json_encode([
                    'kind' => 'tour_review_request',
                    'action' => 'open_tour_review',
                    'booking_id' => (int) $booking->id,
                    'booking_code' => $booking->booking_code,
                    'tour_id' => (int) $booking->tour_id,
                    'tour_departure_id' => (int) $booking->tour_departure_id,
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);

            $created++;
        }

        return $created;
    }
}
