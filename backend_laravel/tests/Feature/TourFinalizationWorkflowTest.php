<?php

use App\Jobs\DeliverTourFinalizationOutbox;
use App\Models\Booking;
use App\Models\Guide;
use App\Models\Notification;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\TourGuideAssignment;
use App\Models\User;
use App\TourFinalizationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function finalizationDeparture(): TourDeparture
{
    DB::table('categories')->insert(['id' => 1, 'name' => 'Category', 'slug' => 'category', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
    $provinceId = DB::table('provinces')->value('id');
    $tour = Tour::query()->create(['category_id' => 1, 'province_id' => $provinceId, 'title' => 'Minimum guest tour', 'slug' => 'minimum-guest-tour', 'base_price' => 100, 'max_slots' => 30, 'available_slots' => 30, 'duration_days' => 1, 'status' => 'published']);

    return TourDeparture::query()->create(['tour_id' => $tour->id, 'departure_date' => now()->addDays(3)->toDateString(), 'departure_at' => now()->addHours(71), 'price' => 100, 'total_slots' => 30, 'booked_slots' => 9, 'status' => 'open']);
}

test('due departure with insufficient passengers waits for admin without notifying customer', function () {
    $departure = finalizationDeparture();
    $customer = User::factory()->create();
    $booking = Booking::query()->create(['booking_code' => 'BK-FINALIZE-1', 'user_id' => $customer->id, 'tour_id' => $departure->tour_id, 'tour_departure_id' => $departure->id, 'number_of_people' => 9, 'unit_price' => 100, 'total_amount' => 900, 'status' => 'confirmed', 'payment_status' => 'paid']);

    $this->artisan('tours:finalize-departures')->assertSuccessful();
    $this->artisan('tours:finalize-departures')->assertSuccessful();

    expect($departure->fresh()->status)->toBe('closed')
        ->and($departure->fresh()->cancellation_reason)->toBeNull()
        ->and($booking->fresh()->status)->toBe('confirmed')
        ->and(Notification::query()->where('user_id', $customer->id)->count())->toBe(0)
        ->and(DB::table('booking_status_histories')->where('booking_id', $booking->id)->count())->toBe(0)
        ->and(DB::table('tour_departure_status_histories')->where('tour_departure_id', $departure->id)->count())->toBe(1)
        ->and(DB::table('tour_finalization_outbox')->where('tour_departure_id', $departure->id)->count())->toBe(0);
});

test('due departure with ten eligible passengers is confirmed', function () {
    $departure = finalizationDeparture();
    $customer = User::factory()->create();
    Booking::query()->create(['booking_code' => 'BK-FINALIZE-2', 'user_id' => $customer->id, 'tour_id' => $departure->tour_id, 'tour_departure_id' => $departure->id, 'number_of_people' => 10, 'unit_price' => 100, 'total_amount' => 1000, 'status' => 'confirmed', 'payment_status' => 'paid']);

    $this->artisan('tours:finalize-departures')->assertSuccessful();

    expect($departure->fresh()->status)->toBe('confirmed')
        ->and(DB::table('tour_finalization_outbox')->where('event_type', 'tour_confirmed')->count())->toBe(1);
});

test('admin cancellation cancels customer booking and notifies customer and assigned guide', function () {
    $departure = finalizationDeparture();
    $customer = User::factory()->create();
    $guideUser = User::factory()->create([
        'role_id' => DB::table('roles')->where('name', 'tour guide')->value('id'),
    ]);
    $guide = Guide::query()->create([
        'user_id' => $guideUser->id,
        'guide_code' => 'HDV-CANCEL-1',
        'experience_years' => 1,
        'status' => 'active',
    ]);
    TourGuideAssignment::query()->create([
        'tour_departure_id' => $departure->id,
        'guide_id' => $guide->id,
        'role' => 'lead',
        'status' => 'assigned',
        'assigned_at' => now(),
    ]);
    $booking = Booking::query()->create([
        'booking_code' => 'BK-ADMIN-CANCEL-1',
        'user_id' => $customer->id,
        'tour_id' => $departure->tour_id,
        'tour_departure_id' => $departure->id,
        'number_of_people' => 2,
        'unit_price' => 100,
        'total_amount' => 200,
        'status' => 'confirmed',
        'payment_status' => 'paid',
    ]);

    $outbox = app(TourFinalizationService::class)->cancelConfirmed(
        $departure,
        'weather_disaster'
    );
    DeliverTourFinalizationOutbox::dispatchSync($outbox->id);

    expect($departure->fresh()->status)->toBe('cancelled')
        ->and($booking->fresh()->status)->toBe('cancelled_by_tour')
        ->and($booking->fresh()->resolution_status)->toBe('pending_selection')
        ->and(TourGuideAssignment::query()->whereKey($guide->assignments()->value('id'))->value('status'))->toBe('cancelled')
        ->and(Notification::query()->where('user_id', $customer->id)->where('status', 'unread')->exists())->toBeTrue()
        ->and(Notification::query()->where('user_id', $guideUser->id)->where('status', 'unread')->exists())->toBeTrue()
        ->and($outbox->fresh()->processed_at)->not->toBeNull();
});
