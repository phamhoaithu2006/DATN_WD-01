<?php

use App\Models\Booking;
use App\Models\Guide;
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
