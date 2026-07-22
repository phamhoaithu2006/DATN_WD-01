<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Notification;
use App\Models\TourGuideAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class GuideReviewNotificationService
{
    public function syncForUser(User $user): int
    {
        $user->loadMissing('role');

        if (! $this->isCustomer($user)) {
            return 0;
        }

        return DB::transaction(function () use ($user): int {
            User::query()
                ->whereKey($user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $createdCount = 0;

            $bookings = $this->eligibleBookingsQuery($user->id)
                ->with([
                    'tour:id,title',
                    'tourDeparture:id,tour_id,departure_date,return_date,status',
                    'tourDeparture.guideAssignments' => function (HasMany $query): void {
                        $query->whereNotIn('status', ['cancelled', 'canceled'])
                            ->with(['guide.user:id,full_name']);
                    },
                    'reviews' => function (HasMany $query) use ($user): void {
                        $query->where('user_id', $user->id)
                            ->select('id', 'booking_id', 'guide_id');
                    },
                ])
                ->get();

            foreach ($bookings as $booking) {
                $assignments = $booking->tourDeparture?->guideAssignments ?? collect();

                foreach ($assignments as $assignment) {
                    if (! $assignment instanceof TourGuideAssignment || ! $assignment->guide) {
                        continue;
                    }

                    $guideId = (int) $assignment->guide_id;
                    $alreadyReviewed = $booking->reviews
                        ->contains(fn($review): bool => (int) $review->guide_id === $guideId);

                    if ($alreadyReviewed) {
                        $this->markAsCompleted((int) $user->id, (int) $booking->id, $guideId);

                        continue;
                    }

                    $exists = Notification::query()
                        ->where('user_id', $user->id)
                        ->where('data->kind', 'guide_review_request')
                        ->where('data->booking_id', $booking->id)
                        ->where('data->guide_id', $guideId)
                        ->exists();

                    if ($exists) {
                        continue;
                    }

                    $tourTitle = $booking->tour?->title ?? "Tour #{$booking->tour_id}";
                    $guideName = $assignment->guide->user?->full_name
                        ?? $assignment->guide->guide_code
                        ?? "HDV #{$guideId}";

                    Notification::query()->create([
                        'user_id' => $user->id,
                        'title' => 'Đánh giá hướng dẫn viên',
                        'message' => "Tour \"{$tourTitle}\" đã kết thúc. Vui lòng đánh giá hướng dẫn viên {$guideName}.",
                        'type' => 'booking',
                        'status' => 'unread',
                        'data' => json_encode([
                            'kind' => 'guide_review_request',
                            'action' => 'open_guide_review',
                            'booking_id' => (int) $booking->id,
                            'guide_id' => $guideId,
                            'tour_id' => (int) $booking->tour_id,
                            'tour_departure_id' => (int) $booking->tour_departure_id,
                        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ]);

                    $createdCount++;
                }
            }

            return $createdCount;
        });
    }

    public function syncAllEligibleCustomers(): int
    {
        $createdCount = 0;

        $userIds = $this->eligibleBookingsQuery()
            ->whereNotNull('user_id')
            ->distinct()
            ->pluck('user_id');

        User::query()
            ->whereIn('id', $userIds)
            ->whereHas('role', function (Builder $query): void {
                $query->whereRaw('LOWER(TRIM(name)) = ?', ['customer']);
            })
            ->each(function (User $user) use (&$createdCount): void {
                $createdCount += $this->syncForUser($user);
            });

        return $createdCount;
    }

    public function markAsCompleted(int $userId, int $bookingId, int $guideId): void
    {
        Notification::query()
            ->where('user_id', $userId)
            ->where('data->kind', 'guide_review_request')
            ->where('data->booking_id', $bookingId)
            ->where('data->guide_id', $guideId)
            ->update([
                'status' => 'read',
                'read_at' => now(),
            ]);
    }

    private function eligibleBookingsQuery(?int $userId = null): Builder
    {
        $today = today()->toDateString();

        return Booking::query()
            ->when($userId !== null, fn(Builder $query): Builder => $query->where('user_id', $userId))
            ->whereNotIn('status', ['cancelled', 'canceled'])
            ->where(function (Builder $query) use ($today): void {
                $query->where('status', 'completed')
                    ->orWhere(function (Builder $subQuery) use ($today): void {
                        $subQuery->whereIn('status', ['confirmed', 'completed'])
                            ->whereHas('tourDeparture', function (Builder $departureQuery) use ($today): void {
                                $departureQuery->where('status', 'completed')
                                    ->orWhere(function (Builder $departureSubQuery) use ($today): void {
                                        $departureSubQuery->whereNotNull('return_date')
                                            ->whereDate('return_date', '<', $today);
                                    });
                            });
                    });
            });
    }

    private function isCustomer(User $user): bool
    {
        return mb_strtolower(trim((string) $user->role?->name)) === 'customer';
    }
}
