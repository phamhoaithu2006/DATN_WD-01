<?php

use App\Models\Category;
use App\Models\Destination;
use App\Models\Tour;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
