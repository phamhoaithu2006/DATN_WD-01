<?php

use App\Models\Category;
use App\Models\Destination;
use App\Models\Tour;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

test('travel assistant returns real tour identifiers in a normalized recommendation payload', function () {
    Http::fake([
        '*' => Http::response([
            'candidates' => [[
                'content' => [
                    'parts' => [['text' => 'Mình đề xuất tour phù hợp trong hệ thống.']],
                ],
            ]],
        ]),
    ]);

    $category = Category::query()->create([
        'name' => 'Biển đảo',
        'slug' => 'bien-dao-chat',
        'status' => 'active',
    ]);

    $destination = Destination::query()->create([
        'name' => 'Phú Quốc',
        'slug' => 'phu-quoc-chat',
        'country' => 'Việt Nam',
        'status' => 'active',
    ]);

    $tour = Tour::query()->create([
        'category_id' => $category->id,
        'destination_id' => $destination->id,
        'title' => 'Khám phá Phú Quốc',
        'slug' => 'kham-pha-phu-quoc-chat',
        'duration_days' => 3,
        'duration_nights' => 2,
        'base_price' => 4500000,
        'max_slots' => 20,
        'available_slots' => 20,
        'status' => 'published',
    ]);

    DB::table('tour_departures')->insert([
        'tour_id' => $tour->id,
        'departure_date' => now()->addWeek()->toDateString(),
        'total_slots' => 20,
        'booked_slots' => 0,
        'status' => 'open',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->postJson('/api/travel-assistant', [
        'message' => 'Gợi ý tour biển',
        'session_id' => 'chat-recommendation-test',
    ])
        ->assertOk()
        ->assertJsonCount(1, 'recommended_tours')
        ->assertJsonPath('recommended_tours.0.id', $tour->id)
        ->assertJsonPath('recommended_tours.0.slug', $tour->slug)
        ->assertJsonPath('recommended_tours.0.title', $tour->title);
});

test('travel assistant defaults to six unique active tours and caps requests at ten', function () {
    Http::fake([
        '*' => Http::response([
            'candidates' => [[
                'content' => [
                    'parts' => [['text' => 'Danh sách tour đang hoạt động.']],
                ],
            ]],
        ]),
    ]);

    $category = Category::query()->create([
        'name' => 'Khám phá',
        'slug' => 'kham-pha-chat-limit',
        'status' => 'active',
    ]);

    $destination = Destination::query()->create([
        'name' => 'Việt Nam',
        'slug' => 'viet-nam-chat-limit',
        'country' => 'Việt Nam',
        'status' => 'active',
    ]);

    $inactiveTour = Tour::query()->create([
        'category_id' => $category->id,
        'destination_id' => $destination->id,
        'title' => 'Tour đã ẩn',
        'slug' => 'tour-da-an-chat-limit',
        'duration_days' => 2,
        'duration_nights' => 1,
        'base_price' => 2000000,
        'max_slots' => 20,
        'available_slots' => 20,
        'status' => 'hidden',
    ]);

    DB::table('tour_departures')->insert([
        'tour_id' => $inactiveTour->id,
        'departure_date' => now()->addWeek()->toDateString(),
        'total_slots' => 20,
        'booked_slots' => 0,
        'status' => 'open',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $fullTour = Tour::query()->create([
        'category_id' => $category->id,
        'destination_id' => $destination->id,
        'title' => 'Tour đã hết chỗ',
        'slug' => 'tour-da-het-cho-chat-limit',
        'duration_days' => 2,
        'duration_nights' => 1,
        'base_price' => 2100000,
        'max_slots' => 20,
        'available_slots' => 0,
        'status' => 'published',
    ]);

    DB::table('tour_departures')->insert([
        'tour_id' => $fullTour->id,
        'departure_date' => now()->addWeek()->toDateString(),
        'total_slots' => 20,
        'booked_slots' => 20,
        'status' => 'open',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $expiredTour = Tour::query()->create([
        'category_id' => $category->id,
        'destination_id' => $destination->id,
        'title' => 'Tour đã khởi hành',
        'slug' => 'tour-da-khoi-hanh-chat-limit',
        'duration_days' => 2,
        'duration_nights' => 1,
        'base_price' => 2200000,
        'max_slots' => 20,
        'available_slots' => 20,
        'status' => 'published',
    ]);

    DB::table('tour_departures')->insert([
        'tour_id' => $expiredTour->id,
        'departure_date' => now()->subDay()->toDateString(),
        'total_slots' => 20,
        'booked_slots' => 0,
        'status' => 'open',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    foreach (range(1, 12) as $index) {
        $tour = Tour::query()->create([
            'category_id' => $category->id,
            'destination_id' => $destination->id,
            'title' => "Tour đang mở {$index}",
            'slug' => "tour-dang-mo-{$index}",
            'duration_days' => 3,
            'duration_nights' => 2,
            'base_price' => 3000000 + $index,
            'max_slots' => 20,
            'available_slots' => 20,
            'status' => 'published',
        ]);

        DB::table('tour_departures')->insert([
            'tour_id' => $tour->id,
            'departure_date' => now()->addDays($index)->toDateString(),
            'total_slots' => 20,
            'booked_slots' => 0,
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    $defaultResponse = $this->postJson('/api/travel-assistant', [
        'message' => 'Gợi ý tour',
        'session_id' => 'chat-default-limit-test',
    ])->assertOk()->assertJsonCount(6, 'recommended_tours');

    $defaultTours = collect($defaultResponse->json('recommended_tours'));
    expect($defaultTours->pluck('id')->unique()->count())->toBe(6)
        ->and($defaultTours->pluck('slug')->unique()->count())->toBe(6)
        ->and($defaultTours->pluck('id'))->not->toContain($inactiveTour->id)
        ->not->toContain($fullTour->id)
        ->not->toContain($expiredTour->id);

    $maximumResponse = $this->postJson('/api/travel-assistant', [
        'message' => 'Gợi ý thêm tour',
        'session_id' => 'chat-maximum-limit-test',
        'recommendation_limit' => 10,
    ])
        ->assertOk()
        ->assertJsonCount(10, 'recommended_tours');

    expect(collect($maximumResponse->json('recommended_tours'))->pluck('id'))
        ->not->toContain($inactiveTour->id)
        ->not->toContain($fullTour->id)
        ->not->toContain($expiredTour->id);

    $this->postJson('/api/travel-assistant', [
        'message' => 'Gợi ý quá nhiều tour',
        'session_id' => 'chat-invalid-limit-test',
        'recommendation_limit' => 11,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('recommendation_limit');
});
