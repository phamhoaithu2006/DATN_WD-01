<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\TourReview;
use App\Services\BookingReviewEligibilityService;
use App\Services\TourReviewService;
use Illuminate\Database\Seeder;

class TourReviewSeeder extends Seeder
{
    public function run(): void
    {
        $eligibilityService = app(BookingReviewEligibilityService::class);
        $tourReviewService = app(TourReviewService::class);
        $tourIds = [];

        Booking::query()
            ->with('tourDeparture')
            ->whereDoesntHave('tourReview')
            ->latest('id')
            ->limit(6)
            ->get()
            ->filter(fn (Booking $booking): bool => $eligibilityService->isReviewable($booking))
            ->each(function (Booking $booking) use (&$tourIds): void {
                TourReview::query()->create([
                    'user_id' => $booking->user_id,
                    'tour_id' => $booking->tour_id,
                    'booking_id' => $booking->id,
                    'tour_departure_id' => $booking->tour_departure_id,
                    'rating' => fake()->numberBetween(4, 5),
                    'comment' => fake()->randomElement([
                        'Lịch trình hợp lý, nhân viên hỗ trợ chu đáo.',
                        'Dịch vụ đúng mô tả và chuyến đi được tổ chức tốt.',
                        'Trải nghiệm đáng nhớ, tôi sẽ tiếp tục chọn ViVuGo.',
                    ]),
                    'status' => 'visible',
                ]);

                $tourIds[] = $booking->tour_id;
            });

        foreach (array_unique($tourIds) as $tourId) {
            $tourReviewService->refreshTourRating((int) $tourId);
        }

        $this->command->info('Đã seed đánh giá mẫu cho tour.');
    }
}
