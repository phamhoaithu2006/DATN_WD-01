<?php

use App\Models\Booking;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\User;
use App\TourFinalizationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('customer booking detail includes the administrator who cancelled the tour', function () {
    $provinceId = DB::table('provinces')->value('id');
    $categoryId = DB::table('categories')->insertGetId([
        'name' => 'Customer detail category',
        'slug' => 'customer-detail-category',
        'status' => 'active',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $tour = Tour::query()->create([
        'category_id' => $categoryId,
        'province_id' => $provinceId,
        'title' => 'Customer detail tour',
        'slug' => 'customer-detail-tour',
        'summary' => 'Tour dùng để kiểm tra chi tiết booking.',
        'duration_days' => 3,
        'duration_nights' => 2,
        'base_price' => 1500,
        'max_slots' => 30,
        'available_slots' => 30,
        'status' => 'published',
    ]);

    $departure = TourDeparture::query()->create([
        'tour_id' => $tour->id,
        'departure_date' => now()->addDays(10)->toDateString(),
        'departure_at' => now()->addDays(10)->startOfDay(),
        'return_date' => now()->addDays(12)->toDateString(),
        'departure_location' => 'Hà Nội',
        'price' => 1500,
        'total_slots' => 30,
        'booked_slots' => 2,
        'status' => 'confirmed',
    ]);

    $customer = User::factory()->create();
    $admin = User::factory()->create(['full_name' => 'Nguyễn Quản Trị']);
    $booking = Booking::query()->create([
        'booking_code' => 'BK-CUSTOMER-DETAIL-1',
        'user_id' => $customer->id,
        'tour_id' => $tour->id,
        'tour_departure_id' => $departure->id,
        'number_of_people' => 2,
        'unit_price' => 1500,
        'total_amount' => 3000,
        'status' => 'confirmed',
        'payment_status' => 'paid',
    ]);

    app(TourFinalizationService::class)->cancelConfirmed(
        $departure,
        'weather_disaster',
        $admin->id,
    );

    Sanctum::actingAs($customer);

    $this->getJson('/api/profile/bookings')
        ->assertOk()
        ->assertJsonPath('data.0.id', $booking->id)
        ->assertJsonPath('data.0.status', 'cancelled_by_tour')
        ->assertJsonPath('data.0.status_histories.0.new_status', 'cancelled_by_tour')
        ->assertJsonPath('data.0.status_histories.0.changed_by.id', $admin->id)
        ->assertJsonPath('data.0.status_histories.0.changed_by.full_name', 'Nguyễn Quản Trị');
});
