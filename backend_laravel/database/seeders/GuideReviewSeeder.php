<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Guide;
use App\Models\Review;
use App\Models\Role;
use App\Models\TourGuideAssignment;
use App\Models\User;
use App\Services\GuideReviewService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class GuideReviewSeeder extends Seeder
{
    /**
     * @var array<string, array{full_name: string, phone: string}>
     */
    private const REVIEWERS = [
        'thao.nguyen@example.test' => ['full_name' => 'Nguyễn Phương Thảo', 'phone' => '0902000001'],
        'minh.tran@example.test' => ['full_name' => 'Trần Nhật Minh', 'phone' => '0902000002'],
        'linh.le@example.test' => ['full_name' => 'Lê Khánh Linh', 'phone' => '0902000003'],
        'nam.pham@example.test' => ['full_name' => 'Phạm Hoài Nam', 'phone' => '0902000004'],
        'anh.do@example.test' => ['full_name' => 'Đỗ Ngọc Anh', 'phone' => '0902000005'],
        'huy.bui@example.test' => ['full_name' => 'Bùi Quốc Huy', 'phone' => '0902000006'],
    ];

    /**
     * @var list<array{booking_code: string, reviewer_email: string, guide_code: string, rating: int, comment: string, reviewed_after_days: int}>
     */
    private const REVIEWS = [
        [
            'booking_code' => 'BK-RV-001',
            'reviewer_email' => 'thao.nguyen@example.test',
            'guide_code' => 'HDV001',
            'rating' => 5,
            'comment' => 'Hướng dẫn viên nhiệt tình, kiến thức địa phương phong phú và hỗ trợ đoàn rất chu đáo.',
            'reviewed_after_days' => 1,
        ],
        [
            'booking_code' => 'BK-RV-002',
            'reviewer_email' => 'minh.tran@example.test',
            'guide_code' => 'HDV001',
            'rating' => 5,
            'comment' => 'Lịch trình rõ ràng, xử lý tình huống nhanh và luôn tạo không khí vui vẻ cho cả đoàn.',
            'reviewed_after_days' => 2,
        ],
        [
            'booking_code' => 'BK-RV-003',
            'reviewer_email' => 'linh.le@example.test',
            'guide_code' => 'HDV001',
            'rating' => 4,
            'comment' => 'Chuyến đi đáng nhớ, HDV quan tâm đến từng thành viên và giới thiệu điểm đến rất hấp dẫn.',
            'reviewed_after_days' => 3,
        ],
        [
            'booking_code' => 'BK-RV-004',
            'reviewer_email' => 'nam.pham@example.test',
            'guide_code' => 'HDV002',
            'rating' => 5,
            'comment' => 'HDV thân thiện, nhắc lịch đúng giờ và hỗ trợ gia đình có trẻ nhỏ rất tốt.',
            'reviewed_after_days' => 1,
        ],
        [
            'booking_code' => 'BK-RV-005',
            'reviewer_email' => 'anh.do@example.test',
            'guide_code' => 'HDV002',
            'rating' => 4,
            'comment' => 'Thông tin về văn hóa địa phương rất hữu ích. Tôi hài lòng với trải nghiệm của chuyến đi.',
            'reviewed_after_days' => 2,
        ],
        [
            'booking_code' => 'BK-RV-006',
            'reviewer_email' => 'huy.bui@example.test',
            'guide_code' => 'HDV002',
            'rating' => 5,
            'comment' => 'HDV chuyên nghiệp, giao tiếp tốt và luôn chủ động hỗ trợ khi đoàn cần.',
            'reviewed_after_days' => 3,
        ],
        [
            'booking_code' => 'BK-RV-007',
            'reviewer_email' => 'thao.nguyen@example.test',
            'guide_code' => 'HDV003',
            'rating' => 4,
            'comment' => 'Không gian chuyến đi thoải mái, HDV tổ chức các hoạt động hợp lý và thân thiện.',
            'reviewed_after_days' => 1,
        ],
        [
            'booking_code' => 'BK-RV-008',
            'reviewer_email' => 'minh.tran@example.test',
            'guide_code' => 'HDV003',
            'rating' => 5,
            'comment' => 'HDV có kinh nghiệm, giới thiệu nhiều địa điểm thú vị ngoài lịch trình chính.',
            'reviewed_after_days' => 2,
        ],
        [
            'booking_code' => 'BK-RV-009',
            'reviewer_email' => 'linh.le@example.test',
            'guide_code' => 'HDV003',
            'rating' => 4,
            'comment' => 'Phục vụ tận tâm, hướng dẫn dễ hiểu và luôn kiểm tra sự an toàn của cả đoàn.',
            'reviewed_after_days' => 3,
        ],
    ];

    public function run(): void
    {
        $customerRole = Role::query()->where('name', 'customer')->first();

        if (! $customerRole) {
            $this->command->warn('Không tìm thấy vai trò khách hàng để seed đánh giá HDV.');

            return;
        }

        $reviewers = $this->seedReviewers($customerRole->id);
        $guideIds = [];
        $tourIds = [];

        foreach (self::REVIEWS as $fixture) {
            $guide = Guide::query()->where('guide_code', $fixture['guide_code'])->first();
            $assignment = $guide ? $this->completedAssignmentFor($guide) : null;
            $reviewer = $reviewers[$fixture['reviewer_email']] ?? null;

            if (! $guide || ! $assignment || ! $reviewer) {
                $this->command->warn("Bỏ qua {$fixture['booking_code']} vì thiếu HDV, lịch hoàn thành hoặc khách hàng.");

                continue;
            }

            $departure = $assignment->departure;
            $tour = $departure->tour;
            $unitPrice = (float) ($departure->discount_price ?? $departure->base_price ?? $tour->discount_price ?? $tour->base_price ?? 0);
            $reviewedAt = $departure->return_date
                ->copy()
                ->addDays($fixture['reviewed_after_days'])
                ->setTime(10, 0);

            $booking = Booking::query()->updateOrCreate(
                ['booking_code' => $fixture['booking_code']],
                [
                    'user_id' => $reviewer->id,
                    'tour_id' => $tour->id,
                    'tour_departure_id' => $departure->id,
                    'number_of_people' => 1,
                    'unit_price' => $unitPrice,
                    'discount_amount' => 0,
                    'total_amount' => $unitPrice,
                    'status' => 'completed',
                    'payment_status' => 'paid',
                ]
            );

            $review = Review::query()->updateOrCreate(
                [
                    'booking_id' => $booking->id,
                    'guide_id' => $guide->id,
                ],
                [
                    'user_id' => $reviewer->id,
                    'tour_id' => $tour->id,
                    'tour_departure_id' => $departure->id,
                    'rating' => $fixture['rating'],
                    'comment' => $fixture['comment'],
                    'status' => 'visible',
                ]
            );

            $review->forceFill([
                'created_at' => $reviewedAt,
                'updated_at' => $reviewedAt,
            ])->saveQuietly();

            $guideIds[] = $guide->id;
            $tourIds[] = $tour->id;
        }

        $guideReviewService = app(GuideReviewService::class);

        foreach (array_unique($guideIds) as $guideId) {
            $guideReviewService->refreshGuideRating($guideId);
        }

        foreach (array_unique($tourIds) as $tourId) {
            $guideReviewService->refreshTourRating($tourId);
        }

        $this->command->info('Đã seed 9 đánh giá mẫu cho hướng dẫn viên.');
    }

    /**
     * @return array<string, User>
     */
    private function seedReviewers(int $customerRoleId): array
    {
        $reviewers = [];

        foreach (self::REVIEWERS as $email => $reviewer) {
            $reviewers[$email] = User::query()->updateOrCreate(
                ['email' => $email],
                [
                    'role_id' => $customerRoleId,
                    'full_name' => $reviewer['full_name'],
                    'phone' => $reviewer['phone'],
                    'password' => Hash::make('Customer@123'),
                    'status' => 'active',
                ]
            );
        }

        return $reviewers;
    }

    private function completedAssignmentFor(Guide $guide): ?TourGuideAssignment
    {
        return TourGuideAssignment::query()
            ->with(['departure.tour'])
            ->where('guide_id', $guide->id)
            ->where('status', 'completed')
            ->whereHas('departure', function ($query): void {
                $query->where('status', 'completed')
                    ->whereNotNull('return_date')
                    ->whereDate('return_date', '<', today());
            })
            ->latest('id')
            ->first();
    }
}
