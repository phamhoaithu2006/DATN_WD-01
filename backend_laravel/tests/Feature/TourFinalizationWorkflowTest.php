<?php

use App\Models\Booking;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function finalizationDeparture(): TourDeparture
{
    DB::table('categories')->insert(['id' => 1, 'name' => 'Category', 'slug' => 'category', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
    DB::table('destinations')->insert(['id' => 1, 'name' => 'Destination', 'slug' => 'destination', 'province_city' => 'Ha Noi', 'country' => 'VN', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
    $tour = Tour::query()->create(['category_id' => 1, 'destination_id' => 1, 'title' => 'Minimum guest tour', 'slug' => 'minimum-guest-tour', 'base_price' => 100, 'max_slots' => 30, 'available_slots' => 30, 'duration_days' => 1, 'status' => 'published']);

    return TourDeparture::query()->create(['tour_id' => $tour->id, 'departure_date' => now()->addDays(3)->toDateString(), 'departure_at' => now()->addHours(71), 'price' => 100, 'total_slots' => 30, 'booked_slots' => 9, 'status' => 'open']);
}

test('due departure with fewer than ten eligible passengers is cancelled once and preserves booking records', function () {
    $departure = finalizationDeparture();
    $customer = User::factory()->create();
    $booking = Booking::query()->create(['booking_code' => 'BK-FINALIZE-1', 'user_id' => $customer->id, 'tour_id' => $departure->tour_id, 'tour_departure_id' => $departure->id, 'number_of_people' => 9, 'unit_price' => 100, 'total_amount' => 900, 'status' => 'confirmed', 'payment_status' => 'paid']);

    $this->artisan('tours:finalize-departures')->assertSuccessful();
    $this->artisan('tours:finalize-departures')->assertSuccessful();

    expect($departure->fresh()->status)->toBe('cancelled')
        ->and($departure->fresh()->cancellation_reason)->toBe('insufficient_participants')
        ->and($booking->fresh()->status)->toBe('cancelled_by_tour')
        ->and($booking->fresh()->cancellation_reason)->toBe('tour_cancelled_insufficient_participants')
        ->and($booking->fresh()->resolution_status)->toBe('pending_selection')
        ->and(DB::table('booking_status_histories')->where('booking_id', $booking->id)->count())->toBe(1)
        ->and(DB::table('tour_departure_status_histories')->where('tour_departure_id', $departure->id)->count())->toBe(1)
        ->and(DB::table('tour_finalization_outbox')->where('tour_departure_id', $departure->id)->count())->toBe(1);
});

test('due departure with ten eligible passengers is confirmed', function () {
    $departure = finalizationDeparture();
    $customer = User::factory()->create();
    Booking::query()->create(['booking_code' => 'BK-FINALIZE-2', 'user_id' => $customer->id, 'tour_id' => $departure->tour_id, 'tour_departure_id' => $departure->id, 'number_of_people' => 10, 'unit_price' => 100, 'total_amount' => 1000, 'status' => 'confirmed', 'payment_status' => 'paid']);

    $this->artisan('tours:finalize-departures')->assertSuccessful();

    expect($departure->fresh()->status)->toBe('confirmed')
        ->and(DB::table('tour_finalization_outbox')->where('event_type', 'tour_confirmed')->count())->toBe(1);
});
