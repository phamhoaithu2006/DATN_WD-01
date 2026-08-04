<?php

use App\Models\Booking;
use App\Models\Guide;
use App\Models\Notification;
use App\Models\Review;
use App\Models\Role;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\TourGuideAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function guideReviewRole(string $name): Role
{
    return Role::query()->firstOrCreate(
        ['name' => $name],
        ['description' => $name]
    );
}

function guideReviewUser(string $roleName): User
{
    $role = guideReviewRole($roleName);

    return User::factory()->create([
        'role_id' => $role->id,
        'status' => 'active',
    ]);
}

function guideReviewTour(): Tour
{
    $now = now();

    DB::table('categories')->updateOrInsert(
        ['id' => 1],
        [
            'name' => 'Guide review category',
            'slug' => 'guide-review-category',
            'description' => 'Category for guide review tests.',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]
    );

    DB::table('destinations')->updateOrInsert(
        ['id' => 1],
        [
            'name' => 'Guide review destination',
            'slug' => 'guide-review-destination',
            'province_city' => 'Ha Noi',
            'country' => 'Viet Nam',
            'description' => 'Destination for guide review tests.',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]
    );

    return Tour::query()->create([
        'category_id' => 1,
        'destination_id' => 1,
        'title' => 'Tour danh gia HDV',
        'slug' => 'tour-danh-gia-hdv-'.fake()->unique()->numberBetween(1000, 9999),
        'summary' => 'Tour dung cho feature test danh gia HDV.',
        'duration_days' => 3,
        'duration_nights' => 2,
        'base_price' => 3000000,
        'discount_price' => 2500000,
        'max_slots' => 20,
        'available_slots' => 20,
        'status' => 'published',
    ]);
}

function guideReviewScenario(array $overrides = []): array
{
    $customer = guideReviewUser('customer');
    $guideUser = guideReviewUser('tour guide');
    $guide = Guide::query()->create([
        'user_id' => $guideUser->id,
        'guide_code' => 'HDV'.fake()->unique()->numberBetween(100, 999),
        'experience_years' => 4,
        'status' => 'active',
    ]);

    $tour = guideReviewTour();
    $departure = TourDeparture::query()->create(array_merge([
        'tour_id' => $tour->id,
        'departure_date' => now()->subDays(5)->toDateString(),
        'return_date' => now()->subDays(3)->toDateString(),
        'total_slots' => 10,
        'booked_slots' => 2,
        'status' => 'completed',
    ], $overrides['departure'] ?? []));

    $booking = Booking::query()->create(array_merge([
        'booking_code' => 'BK-GR-'.fake()->unique()->numberBetween(1000, 9999),
        'user_id' => $customer->id,
        'tour_id' => $tour->id,
        'tour_departure_id' => $departure->id,
        'number_of_people' => 2,
        'unit_price' => 2500000,
        'discount_amount' => 0,
        'total_amount' => 5000000,
        'status' => 'completed',
        'payment_status' => 'paid',
    ], $overrides['booking'] ?? []));

    $assignment = TourGuideAssignment::query()->create([
        'guide_id' => $guide->id,
        'tour_departure_id' => $departure->id,
        'status' => 'completed',
    ]);

    return compact('customer', 'guideUser', 'guide', 'tour', 'departure', 'booking', 'assignment');
}

test('tour guide reads only their notifications through guide endpoints', function () {
    $guideUser = guideReviewUser('tour guide');
    $otherUser = guideReviewUser('tour guide');

    $ownNotification = Notification::query()->create([
        'user_id' => $guideUser->id,
        'title' => 'Lịch tour mới',
        'message' => 'Bạn vừa được phân công một tour mới.',
        'type' => 'guide_assignment',
        'status' => 'unread',
    ]);

    Notification::query()->create([
        'user_id' => $otherUser->id,
        'title' => 'Thông báo của HDV khác',
        'message' => 'Nội dung không được phép xem.',
        'type' => 'guide_assignment',
        'status' => 'unread',
    ]);

    Sanctum::actingAs($guideUser);

    $this->getJson('/api/notifications/guides')
        ->assertOk()
        ->assertJsonCount(1, 'data.data')
        ->assertJsonPath('data.data.0.id', $ownNotification->id);

    $this->getJson('/api/notifications/guides/unread-count')
        ->assertOk()
        ->assertJsonPath('unread_count', 1);

    $this->getJson("/api/notifications/guides/{$ownNotification->id}")
        ->assertOk()
        ->assertJsonPath('data.status', 'read');

    $this->getJson('/api/notifications/guides/unread-count')
        ->assertOk()
        ->assertJsonPath('unread_count', 0);
});

test('customer can create and update a guide review after a completed tour', function () {
    $scenario = guideReviewScenario();
    Sanctum::actingAs($scenario['customer']);

    $this->postJson('/api/customer/guide-reviews', [
        'booking_id' => $scenario['booking']->id,
        'guide_id' => $scenario['guide']->id,
        'rating' => 5,
        'comment' => 'HDV ho tro rat tot.',
    ])
        ->assertCreated()
        ->assertJsonPath('data.rating', 5)
        ->assertJsonPath('data.guide.id', $scenario['guide']->id)
        ->assertJsonPath('data.tour.id', $scenario['tour']->id);

    expect((float) $scenario['guide']->refresh()->average_rating)->toBe(5.0)
        ->and((int) $scenario['guide']->review_count)->toBe(1)
        ->and((float) $scenario['tour']->refresh()->average_rating)->toBe(0.0)
        ->and((int) $scenario['tour']->review_count)->toBe(0);

    $this->postJson('/api/customer/guide-reviews', [
        'booking_id' => $scenario['booking']->id,
        'guide_id' => $scenario['guide']->id,
        'rating' => 4,
        'comment' => 'Cap nhat danh gia.',
    ])
        ->assertOk()
        ->assertJsonPath('data.rating', 4);

    expect((float) $scenario['guide']->refresh()->average_rating)->toBe(4.0)
        ->and((int) $scenario['guide']->review_count)->toBe(1);
});

test('customer notification hides a guide review request after the guide is reviewed', function () {
    $scenario = guideReviewScenario();
    Sanctum::actingAs($scenario['customer']);

    $otherNotification = Notification::query()->create([
        'user_id' => $scenario['customer']->id,
        'title' => 'Cập nhật đơn hàng',
        'message' => 'Đơn hàng của bạn đã được cập nhật.',
        'type' => 'booking',
        'status' => 'unread',
    ]);

    $initialResponse = $this->getJson('/api/notifications/customers')->assertOk();
    $initialIds = collect($initialResponse->json('data.data'))->pluck('id')->all();
    $guideNotification = Notification::query()
        ->where('user_id', $scenario['customer']->id)
        ->where('data->kind', 'guide_review_request')
        ->firstOrFail();

    expect($initialIds)->toContain($otherNotification->id)
        ->and($initialIds)->toContain($guideNotification->id);

    $this->getJson('/api/notifications/customers/unread-count')
        ->assertOk()
        ->assertJsonPath('unread_count', collect($initialResponse->json('data.data'))
            ->where('status', 'unread')
            ->count());

    $this->postJson('/api/customer/guide-reviews', [
        'booking_id' => $scenario['booking']->id,
        'guide_id' => $scenario['guide']->id,
        'rating' => 5,
        'comment' => 'Đánh giá sau khi hoàn thành tour.',
    ])->assertCreated();

    $afterReviewResponse = $this->getJson('/api/notifications/customers')->assertOk();
    $afterReviewIds = collect($afterReviewResponse->json('data.data'))->pluck('id')->all();

    expect($afterReviewIds)->not->toContain($guideNotification->id)
        ->and($afterReviewIds)->toContain($otherNotification->id);

    $this->getJson('/api/notifications/customers/unread-count')
        ->assertOk()
        ->assertJsonPath('unread_count', collect($afterReviewResponse->json('data.data'))
            ->where('status', 'unread')
            ->count());
});

test('customer notification hides a guide review request after it is opened', function () {
    $scenario = guideReviewScenario();
    Sanctum::actingAs($scenario['customer']);

    $otherNotification = Notification::query()->create([
        'user_id' => $scenario['customer']->id,
        'title' => 'Cập nhật đơn hàng',
        'message' => 'Thông báo khác vẫn hiển thị.',
        'type' => 'booking',
        'status' => 'unread',
    ]);

    $initialResponse = $this->getJson('/api/notifications/customers')->assertOk();
    $reviewNotification = Notification::query()
        ->where('user_id', $scenario['customer']->id)
        ->where('data->kind', 'guide_review_request')
        ->firstOrFail();

    expect(collect($initialResponse->json('data.data'))->pluck('id')->all())
        ->toContain($reviewNotification->id)
        ->toContain($otherNotification->id);

    $this->patchJson("/api/notifications/customers/{$reviewNotification->id}/read")
        ->assertOk();

    expect($reviewNotification->refresh()->status)->toBe('read')
        ->and($reviewNotification->read_at)->not->toBeNull();

    $afterOpenResponse = $this->getJson('/api/notifications/customers')->assertOk();
    $afterOpenIds = collect($afterOpenResponse->json('data.data'))->pluck('id')->all();

    expect($afterOpenIds)->not->toContain($reviewNotification->id)
        ->and($afterOpenIds)->toContain($otherNotification->id);

    $this->getJson('/api/notifications/customers/unread-count')
        ->assertOk()
        ->assertJsonPath('unread_count', collect($afterOpenResponse->json('data.data'))
            ->where('status', 'unread')
            ->count());
});

test('customer can hide all visible notifications without deleting them', function () {
    $customer = guideReviewUser('customer');
    $otherCustomer = guideReviewUser('customer');

    $unreadNotification = Notification::query()->create([
        'user_id' => $customer->id,
        'title' => 'Thông báo chưa đọc',
        'message' => 'Thông báo cần được đánh dấu đã đọc.',
        'type' => 'system',
        'status' => 'unread',
    ]);
    $readNotification = Notification::query()->create([
        'user_id' => $customer->id,
        'title' => 'Thông báo đã đọc',
        'message' => 'Thông báo vẫn phải hiển thị.',
        'type' => 'system',
        'status' => 'read',
        'read_at' => now(),
    ]);
    $otherUserNotification = Notification::query()->create([
        'user_id' => $otherCustomer->id,
        'title' => 'Thông báo của khách khác',
        'message' => 'Không được cập nhật.',
        'type' => 'system',
        'status' => 'unread',
    ]);

    Sanctum::actingAs($customer);

    $this->patchJson('/api/notifications/customers/clear-all')
        ->assertOk()
        ->assertJsonPath('cleared_count', 2);

    expect(Notification::query()->findOrFail($unreadNotification->id)->status)->toBe('read')
        ->and(Notification::query()->findOrFail($unreadNotification->id)->cleared_at)->not->toBeNull()
        ->and(Notification::query()->findOrFail($readNotification->id)->status)->toBe('read')
        ->and(Notification::query()->findOrFail($readNotification->id)->cleared_at)->not->toBeNull()
        ->and(Notification::query()->findOrFail($otherUserNotification->id)->status)->toBe('unread')
        ->and(Notification::query()->findOrFail($otherUserNotification->id)->cleared_at)->toBeNull();

    $this->getJson('/api/notifications/customers')
        ->assertOk()
        ->assertJsonPath('data.total', 0);

    $this->getJson('/api/notifications/customers/unread-count')
        ->assertOk()
        ->assertJsonPath('unread_count', 0);

    $newNotification = Notification::query()->create([
        'user_id' => $customer->id,
        'title' => 'Thông báo mới',
        'message' => 'Thông báo tạo sau khi ẩn tất cả.',
        'type' => 'system',
        'status' => 'unread',
    ]);

    $this->getJson('/api/notifications/customers')
        ->assertOk()
        ->assertJsonPath('data.total', 1)
        ->assertJsonPath('data.data.0.id', $newNotification->id);
});

test('hide all ignores completed guide review notifications hidden from the list', function () {
    $scenario = guideReviewScenario();

    Review::query()->create([
        'user_id' => $scenario['customer']->id,
        'tour_id' => $scenario['tour']->id,
        'booking_id' => $scenario['booking']->id,
        'guide_id' => $scenario['guide']->id,
        'tour_departure_id' => $scenario['departure']->id,
        'rating' => 5,
        'comment' => 'Đã hoàn thành đánh giá.',
        'status' => 'visible',
    ]);

    $hiddenReviewNotification = Notification::query()->create([
        'user_id' => $scenario['customer']->id,
        'title' => 'Đánh giá hướng dẫn viên',
        'message' => 'Thông báo đánh giá đã hoàn thành.',
        'type' => 'booking',
        'status' => 'unread',
        'data' => json_encode([
            'kind' => 'guide_review_request',
            'booking_id' => $scenario['booking']->id,
            'guide_id' => $scenario['guide']->id,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
    $visibleNotification = Notification::query()->create([
        'user_id' => $scenario['customer']->id,
        'title' => 'Thông báo khác',
        'message' => 'Thông báo này vẫn hiển thị.',
        'type' => 'system',
        'status' => 'unread',
    ]);

    Sanctum::actingAs($scenario['customer']);

    $visibleBeforeClear = $this->getJson('/api/notifications/customers')->assertOk();

    expect(collect($visibleBeforeClear->json('data.data'))->pluck('id')->all())
        ->toContain($visibleNotification->id);

    $this->patchJson('/api/notifications/customers/clear-all')
        ->assertOk()
        ->assertJsonPath('cleared_count', 2);

    expect(Notification::query()->findOrFail($hiddenReviewNotification->id)->status)->toBe('read')
        ->and(Notification::query()->findOrFail($hiddenReviewNotification->id)->cleared_at)->toBeNull()
        ->and(Notification::query()->findOrFail($visibleNotification->id)->status)->toBe('read')
        ->and(Notification::query()->findOrFail($visibleNotification->id)->cleared_at)->not->toBeNull();

    $this->getJson('/api/notifications/customers')
        ->assertOk()
        ->assertJsonPath('data.total', 0);
});

test('customer can view reviewable bookings guide reviews and guide tour history', function () {
    $scenario = guideReviewScenario();
    Sanctum::actingAs($scenario['customer']);

    $this->postJson('/api/customer/guide-reviews', [
        'booking_id' => $scenario['booking']->id,
        'guide_id' => $scenario['guide']->id,
        'rating' => 5,
        'comment' => 'Dang tin cay.',
    ])->assertCreated();

    $this->getJson('/api/customer/guide-reviewable-bookings')
        ->assertOk()
        ->assertJsonPath('data.data.0.id', $scenario['booking']->id)
        ->assertJsonPath('data.data.0.guides.0.id', $scenario['guide']->id)
        ->assertJsonPath('data.data.0.guides.0.reviewed', true)
        ->assertJsonPath('data.data.0.guides.0.review.rating', 5);

    $this->getJson("/api/customer/guides/{$scenario['guide']->id}/reviews")
        ->assertOk()
        ->assertJsonPath('summary.review_count', 1)
        ->assertJsonPath('data.data.0.rating', 5);

    $this->getJson("/api/customer/guides/{$scenario['guide']->id}/tour-history")
        ->assertOk()
        ->assertJsonPath('guide.id', $scenario['guide']->id)
        ->assertJsonPath('data.data.0.tour.id', $scenario['tour']->id)
        ->assertJsonPath('data.data.0.guide_review_summary.review_count', 1);
});

test('guide can view own reviews and completed tour history', function () {
    $scenario = guideReviewScenario();
    Sanctum::actingAs($scenario['customer']);

    $this->postJson('/api/customer/guide-reviews', [
        'booking_id' => $scenario['booking']->id,
        'guide_id' => $scenario['guide']->id,
        'rating' => 5,
    ])->assertCreated();

    Sanctum::actingAs($scenario['guideUser']);

    $this->getJson('/api/guide/reviews')
        ->assertOk()
        ->assertJsonPath('summary.review_count', 1)
        ->assertJsonPath('data.data.0.guide.id', $scenario['guide']->id);

    $this->getJson('/api/guide/tour-history')
        ->assertOk()
        ->assertJsonPath('guide.id', $scenario['guide']->id)
        ->assertJsonPath('data.data.0.tour_departure.id', $scenario['departure']->id);
});

test('admin quản lý đánh giá HDV và điểm HDV được tính lại', function () {
    $scenario = guideReviewScenario();
    $review = Review::query()->create([
        'user_id' => $scenario['customer']->id,
        'tour_id' => $scenario['tour']->id,
        'booking_id' => $scenario['booking']->id,
        'guide_id' => $scenario['guide']->id,
        'tour_departure_id' => $scenario['departure']->id,
        'rating' => 5,
        'comment' => 'Đánh giá HDV cần kiểm duyệt.',
        'status' => 'visible',
    ]);
    $scenario['guide']->update(['average_rating' => 5, 'review_count' => 1]);

    $admin = guideReviewUser('admin');
    Sanctum::actingAs($admin);

    $this->getJson("/api/admin/guide-reviews?status=visible&rating=5&guide_id={$scenario['guide']->id}")
        ->assertOk()
        ->assertJsonPath('data.data.0.id', $review->id)
        ->assertJsonPath('data.data.0.guide.id', $scenario['guide']->id)
        ->assertJsonPath('summary.visible', 1)
        ->assertJsonPath('summary.average_rating', 5);

    $this->getJson("/api/admin/guide-reviews/{$review->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $review->id)
        ->assertJsonPath('data.reviewer.id', $scenario['customer']->id)
        ->assertJsonPath('data.guide.id', $scenario['guide']->id);

    $this->patchJson("/api/admin/guide-reviews/{$review->id}/status", [
        'status' => 'hidden',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'hidden');

    expect((float) $scenario['guide']->refresh()->average_rating)->toBe(0.0)
        ->and((int) $scenario['guide']->review_count)->toBe(0);

    $this->patchJson("/api/admin/guide-reviews/{$review->id}/status", [
        'status' => 'visible',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'visible');

    expect((float) $scenario['guide']->refresh()->average_rating)->toBe(5.0)
        ->and((int) $scenario['guide']->review_count)->toBe(1);

    Sanctum::actingAs($scenario['customer']);
    $this->getJson('/api/admin/guide-reviews')->assertForbidden();
});

test('customer cannot review a guide before the tour is completed', function () {
    $scenario = guideReviewScenario([
        'departure' => [
            'departure_date' => now()->addDays(3)->toDateString(),
            'return_date' => now()->addDays(5)->toDateString(),
            'status' => 'open',
        ],
        'booking' => [
            'status' => 'confirmed',
        ],
    ]);
    Sanctum::actingAs($scenario['customer']);

    $this->postJson('/api/customer/guide-reviews', [
        'booking_id' => $scenario['booking']->id,
        'guide_id' => $scenario['guide']->id,
        'rating' => 5,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('booking_id');
});
