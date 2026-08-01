<?php

use App\Models\Booking;
use App\Models\Category;
use App\Models\Destination;
use App\Models\Guide;
use App\Models\Notification;
use App\Models\Role;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\TourGuideAssignment;
use App\Models\User;
use Database\Seeders\TourFinalizationDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('finalization demo seeder adds cancelled departures to existing managed tours', function () {
    $customerRole = Role::query()->firstOrCreate(['name' => 'customer']);
    $guideRole = Role::query()->firstOrCreate(['name' => 'tour guide']);
    User::factory()->create(['role_id' => $customerRole->id, 'email' => 'customer@vivugo.vn']);
    $guideUser = User::factory()->create(['role_id' => $guideRole->id, 'email' => 'hung.tv@vivugo.vn']);
    Guide::query()->create(['user_id' => $guideUser->id, 'guide_code' => 'HDV001', 'status' => 'active']);
    $category = Category::query()->create(['name' => 'Danh mục', 'slug' => 'danh-muc', 'status' => 'active']);
    $destination = Destination::query()->create(['name' => 'Hà Nội', 'slug' => 'ha-noi', 'province_city' => 'Hà Nội', 'country' => 'Việt Nam', 'status' => 'active']);
    foreach (['ha-long-5-sao-2n1d', 'sa-pa-ban-lang-4n3d'] as $slug) {
        Tour::query()->create([
            'category_id' => $category->id,
            'destination_id' => $destination->id,
            'title' => $slug,
            'slug' => $slug,
            'base_price' => 1000000,
            'max_slots' => 30,
            'available_slots' => 30,
            'duration_days' => 2,
            'status' => 'published',
        ]);
    }

    $this->seed(TourFinalizationDemoSeeder::class);

    expect(TourDeparture::query()->where('status', 'cancelled')->count())->toBe(2)
        ->and(Booking::query()->where('booking_code', 'BK-SEED-CANCEL-INSUFFICIENT')->value('number_of_people'))->toBe(8)
        ->and(Booking::query()->where('booking_code', 'BK-SEED-CANCEL-WEATHER')->value('number_of_people'))->toBe(6)
        ->and(TourGuideAssignment::query()->whereHas('guide', fn ($query) => $query->where('guide_code', 'HDV001'))->count())->toBe(3)
        ->and(Booking::query()->whereHas('user', fn ($query) => $query->where('email', 'customer@vivugo.vn'))->count())->toBe(3)
        ->and(TourDeparture::query()->where('cancellation_reason', 'weather_disaster')->where('status', 'cancelled')->count())->toBe(1)
        ->and(Notification::query()->where('user_id', $guideUser->id)->where('status', 'unread')->count())->toBe(2);

    Sanctum::actingAs($guideUser);
    $this->getJson('/api/guide/tours/cancelled')
        ->assertOk()
        ->assertJsonCount(2, 'data.data');
});
