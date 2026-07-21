<?php

use App\Models\Booking;
use App\Models\Role;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\TourReview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function tourReviewUser(string $roleName): User
{
    $role = Role::query()->firstOrCreate(
        ['name' => $roleName],
        ['description' => $roleName]
    );

    return User::factory()->create([
        'role_id' => $role->id,
        'status' => 'active',
    ]);
}

function tourReviewTour(): Tour
{
    $now = now();

    DB::table('categories')->updateOrInsert(
        ['id' => 91],
        [
            'name' => 'Danh mục đánh giá tour',
            'slug' => 'danh-muc-danh-gia-tour',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]
    );

    DB::table('destinations')->updateOrInsert(
        ['id' => 91],
        [
            'name' => 'Điểm đến đánh giá tour',
            'slug' => 'diem-den-danh-gia-tour',
            'province_city' => 'Hà Nội',
            'country' => 'Việt Nam',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]
    );

    return Tour::query()->create([
        'category_id' => 91,
        'destination_id' => 91,
        'title' => 'Tour kiểm thử đánh giá',
        'slug' => 'tour-kiem-thu-danh-gia-'.fake()->unique()->numberBetween(1000, 9999),
        'summary' => 'Tour dùng cho kiểm thử đánh giá của khách hàng.',
        'duration_days' => 3,
        'duration_nights' => 2,
        'base_price' => 3000000,
        'max_slots' => 20,
        'available_slots' => 20,
        'status' => 'published',
    ]);
}

function tourReviewScenario(array $overrides = []): array
{
    $customer = tourReviewUser('customer');
    $tour = tourReviewTour();
    $departure = TourDeparture::query()->create(array_merge([
        'tour_id' => $tour->id,
        'departure_date' => now()->subDays(5)->toDateString(),
        'return_date' => now()->subDays(3)->toDateString(),
        'total_slots' => 10,
        'booked_slots' => 2,
        'status' => 'completed',
    ], $overrides['departure'] ?? []));

    $booking = Booking::query()->create(array_merge([
        'booking_code' => 'BK-TR-'.fake()->unique()->numberBetween(1000, 9999),
        'user_id' => $customer->id,
        'tour_id' => $tour->id,
        'tour_departure_id' => $departure->id,
        'number_of_people' => 2,
        'unit_price' => 3000000,
        'discount_amount' => 0,
        'total_amount' => 6000000,
        'status' => 'completed',
        'payment_status' => 'paid',
    ], $overrides['booking'] ?? []));

    return compact('customer', 'tour', 'departure', 'booking');
}

test('khách hàng tạo và cập nhật đánh giá cho booking đã hoàn tất', function () {
    $scenario = tourReviewScenario();
    Sanctum::actingAs($scenario['customer']);

    $created = $this->postJson('/api/customer/tour-reviews', [
        'booking_id' => $scenario['booking']->id,
        'rating' => 5,
        'comment' => 'Lịch trình hợp lý và dịch vụ chu đáo.',
    ])
        ->assertCreated()
        ->assertJsonPath('data.rating', 5)
        ->assertJsonPath('data.status', 'visible');

    $reviewId = $created->json('data.id');

    expect((float) $scenario['tour']->refresh()->average_rating)->toBe(5.0)
        ->and((int) $scenario['tour']->review_count)->toBe(1);

    $this->postJson('/api/customer/tour-reviews', [
        'booking_id' => $scenario['booking']->id,
        'rating' => 4,
    ])->assertConflict();

    $this->putJson("/api/customer/tour-reviews/{$reviewId}", [
        'rating' => 4,
        'comment' => 'Trải nghiệm tốt, thời gian chờ hơi lâu.',
    ])
        ->assertOk()
        ->assertJsonPath('data.rating', 4);

    expect((float) $scenario['tour']->refresh()->average_rating)->toBe(4.0)
        ->and((int) $scenario['tour']->review_count)->toBe(1);
});

test('khách hàng chỉ đánh giá booking của mình sau khi tour hoàn tất', function () {
    $scenario = tourReviewScenario([
        'departure' => [
            'departure_date' => now()->addDays(3)->toDateString(),
            'return_date' => now()->addDays(5)->toDateString(),
            'status' => 'open',
        ],
        'booking' => ['status' => 'confirmed'],
    ]);
    Sanctum::actingAs($scenario['customer']);

    $this->postJson('/api/customer/tour-reviews', [
        'booking_id' => $scenario['booking']->id,
        'rating' => 5,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('booking_id');

    $scenario['booking']->update(['status' => 'cancelled']);

    $this->postJson('/api/customer/tour-reviews', [
        'booking_id' => $scenario['booking']->id,
        'rating' => 5,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('booking_id');

    $otherCustomer = tourReviewUser('customer');
    Sanctum::actingAs($otherCustomer);

    $this->postJson('/api/customer/tour-reviews', [
        'booking_id' => $scenario['booking']->id,
        'rating' => 5,
    ])->assertNotFound();

    $review = TourReview::query()->create([
        'user_id' => $scenario['customer']->id,
        'tour_id' => $scenario['tour']->id,
        'booking_id' => $scenario['booking']->id,
        'tour_departure_id' => $scenario['departure']->id,
        'rating' => 4,
        'status' => 'visible',
    ]);

    $this->putJson("/api/customer/tour-reviews/{$review->id}", [
        'rating' => 5,
    ])->assertNotFound();
});

test('api công khai chỉ trả đánh giá đang hiển thị và che tên khách hàng', function () {
    $scenario = tourReviewScenario();
    TourReview::query()->create([
        'user_id' => $scenario['customer']->id,
        'tour_id' => $scenario['tour']->id,
        'booking_id' => $scenario['booking']->id,
        'tour_departure_id' => $scenario['departure']->id,
        'rating' => 5,
        'comment' => 'Một chuyến đi đáng nhớ.',
        'status' => 'visible',
    ]);

    TourReview::query()->create([
        'user_id' => tourReviewUser('customer')->id,
        'tour_id' => $scenario['tour']->id,
        'rating' => 1,
        'comment' => 'Nội dung đã bị ẩn.',
        'status' => 'hidden',
    ]);

    $this->getJson("/api/tours/{$scenario['tour']->slug}/reviews?rating=5&sort=newest")
        ->assertOk()
        ->assertJsonPath('summary.average_rating', 5)
        ->assertJsonPath('summary.review_count', 1)
        ->assertJsonPath('summary.distribution.5', 1)
        ->assertJsonCount(1, 'data.data')
        ->assertJsonPath('data.data.0.reviewer_name', function ($name): bool {
            return is_string($name) && ! str_contains($name, '@');
        });
});

test('admin kiểm duyệt đánh giá và điểm tour được tính lại', function () {
    $scenario = tourReviewScenario();
    $review = TourReview::query()->create([
        'user_id' => $scenario['customer']->id,
        'tour_id' => $scenario['tour']->id,
        'booking_id' => $scenario['booking']->id,
        'tour_departure_id' => $scenario['departure']->id,
        'rating' => 5,
        'comment' => 'Đánh giá cần kiểm duyệt.',
        'status' => 'visible',
    ]);
    $scenario['tour']->update(['average_rating' => 5, 'review_count' => 1]);

    $admin = tourReviewUser('admin');
    Sanctum::actingAs($admin);

    $this->getJson('/api/admin/tour-reviews?status=visible&rating=5')
        ->assertOk()
        ->assertJsonPath('data.data.0.id', $review->id)
        ->assertJsonPath('summary.visible', 1);

    $this->getJson("/api/admin/tour-reviews/{$review->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $review->id)
        ->assertJsonPath('data.reviewer.id', $scenario['customer']->id);

    $this->patchJson("/api/admin/tour-reviews/{$review->id}/status", [
        'status' => 'spam',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'spam')
        ->assertJsonPath('data.moderated_by.id', $admin->id);

    expect((float) $scenario['tour']->refresh()->average_rating)->toBe(0.0)
        ->and((int) $scenario['tour']->review_count)->toBe(0);

    Sanctum::actingAs($scenario['customer']);
    $this->putJson("/api/customer/tour-reviews/{$review->id}", [
        'rating' => 4,
        'comment' => 'Đã sửa nội dung nhưng vẫn cần kiểm duyệt.',
    ])
        ->assertOk()
        ->assertJsonPath('data.rating', 4)
        ->assertJsonPath('data.status', 'spam');

    expect((float) $scenario['tour']->refresh()->average_rating)->toBe(0.0)
        ->and((int) $scenario['tour']->review_count)->toBe(0);

    $this->getJson('/api/admin/tour-reviews')->assertForbidden();

    Sanctum::actingAs(tourReviewUser('tour guide'));
    $this->getJson('/api/admin/tour-reviews')->assertForbidden();

    Sanctum::actingAs(tourReviewUser('support staff'));
    $this->getJson('/api/admin/tour-reviews')->assertForbidden();
});

test('lịch sử booking trả trạng thái và đánh giá tour hiện tại', function () {
    $scenario = tourReviewScenario();
    $review = TourReview::query()->create([
        'user_id' => $scenario['customer']->id,
        'tour_id' => $scenario['tour']->id,
        'booking_id' => $scenario['booking']->id,
        'tour_departure_id' => $scenario['departure']->id,
        'rating' => 4,
        'comment' => 'Đã lưu đánh giá.',
        'status' => 'visible',
    ]);
    Sanctum::actingAs($scenario['customer']);

    $this->getJson('/api/profile/bookings')
        ->assertOk()
        ->assertJsonPath('data.0.id', $scenario['booking']->id)
        ->assertJsonPath('data.0.can_review_tour', true)
        ->assertJsonPath('data.0.tour_review.id', $review->id)
        ->assertJsonPath('data.0.tour_review.rating', 4);
});

test('dữ liệu đánh giá tour được kiểm tra hợp lệ', function () {
    $scenario = tourReviewScenario();
    Sanctum::actingAs($scenario['customer']);

    $this->postJson('/api/customer/tour-reviews', [
        'booking_id' => $scenario['booking']->id,
        'rating' => 6,
        'comment' => str_repeat('a', 2001),
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['rating', 'comment']);
});

test('migration chuyển và khôi phục đánh giá tour cũ mà không mất dữ liệu', function () {
    $scenario = tourReviewScenario();
    $migration = require database_path('migrations/2026_07_21_000000_create_tour_reviews_table.php');

    $migration->down();

    try {
        foreach ([5, 4] as $rating) {
            DB::table('reviews')->insert([
                'user_id' => $scenario['customer']->id,
                'tour_id' => $scenario['tour']->id,
                'booking_id' => $scenario['booking']->id,
                'guide_id' => null,
                'tour_departure_id' => $scenario['departure']->id,
                'rating' => $rating,
                'comment' => "Đánh giá cũ {$rating} sao.",
                'status' => 'visible',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $migration->up();

        expect(DB::table('reviews')->whereNull('guide_id')->count())->toBe(0)
            ->and(DB::table('tour_reviews')->count())->toBe(2)
            ->and(DB::table('tour_reviews')->whereNotNull('booking_id')->count())->toBe(1)
            ->and((float) $scenario['tour']->refresh()->average_rating)->toBe(4.5)
            ->and((int) $scenario['tour']->review_count)->toBe(2);

        $migration->down();

        expect(DB::table('reviews')->whereNull('guide_id')->count())->toBe(2)
            ->and(Schema::hasTable('tour_reviews'))->toBeFalse();
    } finally {
        if (! Schema::hasTable('tour_reviews')) {
            $migration->up();
        }
    }
});
