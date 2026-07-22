<?php

use App\Models\Booking;
use App\Models\Tour;
use Database\Seeders\BookingSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\CertificateSeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DestinationSeeder;
use Database\Seeders\GuideReviewSeeder;
use Database\Seeders\GuideSeeder;
use Database\Seeders\GuideSpecializationSeeder;
use Database\Seeders\LanguageSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\TourGuideAssignmentSeeder;
use Database\Seeders\TourSeeder;
use Database\Seeders\TourTestingDataSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('database seeder can run twice without duplicate key failures', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    expect(DB::table('promotions')->whereIn('code', [
        'SUMMER2026',
        'WELCOME50',
        'FAMILY2026',
        'EARLYBIRD',
        'EXPIRED2025',
    ])->count())->toBe(5);
});

test('booking seeder can run repeatedly without duplicate contacts', function () {
    $this->seed([
        RoleSeeder::class,
        CategorySeeder::class,
        DestinationSeeder::class,
        UserSeeder::class,
        GuideSpecializationSeeder::class,
        LanguageSeeder::class,
        CertificateSeeder::class,
        GuideSeeder::class,
        TourSeeder::class,
        TourGuideAssignmentSeeder::class,
    ]);

    $this->seed(BookingSeeder::class);
    $this->seed(BookingSeeder::class);

    $bookingIds = Booking::query()
        ->where('booking_code', 'like', 'BK-SEED-%')
        ->pluck('id');

    expect($bookingIds)->toHaveCount(50)
        ->and(DB::table('booking_contacts')->whereIn('booking_id', $bookingIds)->count())->toBe(50)
        ->and(DB::table('payments')->whereIn('booking_id', $bookingIds)->count())->toBe(50);
});

test('tour testing data seeder creates a complete and repeatable tour lifecycle', function () {
    $this->seed([
        RoleSeeder::class,
        CategorySeeder::class,
        DestinationSeeder::class,
        UserSeeder::class,
        GuideSpecializationSeeder::class,
        LanguageSeeder::class,
        CertificateSeeder::class,
        GuideSeeder::class,
        TourSeeder::class,
        TourGuideAssignmentSeeder::class,
        GuideReviewSeeder::class,
        TourTestingDataSeeder::class,
    ]);

    $tourIds = Tour::query()->where('slug', 'like', '%-test')->pluck('id');
    $counts = [
        'tours' => $tourIds->count(),
        'images' => DB::table('tour_images')->whereIn('tour_id', $tourIds)->count(),
        'itineraries' => DB::table('tour_itineraries')->whereIn('tour_id', $tourIds)->count(),
        'departures' => DB::table('tour_departures')->whereIn('tour_id', $tourIds)->count(),
        'bookings' => Booking::query()->where('booking_code', 'like', 'BK-TST-%')->count(),
        'payments' => DB::table('payments')->whereIn('booking_id', Booking::query()->where('booking_code', 'like', 'BK-TST-%')->pluck('id'))->count(),
    ];

    expect($counts)->toMatchArray([
        'tours' => 4,
        'images' => 8,
        'itineraries' => 16,
        'departures' => 16,
        'bookings' => 5,
        'payments' => 5,
    ]);

    $activeBooking = Booking::query()->where('booking_code', 'BK-TST-CONFIRMED')->firstOrFail();
    $activeGuideCode = DB::table('tour_guide_assignments')
        ->join('guides', 'guides.id', '=', 'tour_guide_assignments.guide_id')
        ->where('tour_guide_assignments.tour_departure_id', $activeBooking->tour_departure_id)
        ->value('guides.guide_code');

    expect($activeGuideCode)->toBe('HDV001')
        ->and(DB::table('booking_participants')->where('booking_id', $activeBooking->id)->count())->toBe(3)
        ->and(DB::table('attendance_sessions')->where('tour_departure_id', $activeBooking->tour_departure_id)->count())->toBe(4)
        ->and(DB::table('attendance_sessions')
            ->where('tour_departure_id', $activeBooking->tour_departure_id)
            ->whereDate('scheduled_date', today())
            ->count())->toBeGreaterThan(1);

    $guideId = DB::table('guides')->where('guide_code', 'HDV001')->value('id');
    $activeAssignments = DB::table('tour_guide_assignments')
        ->join('tour_departures', 'tour_departures.id', '=', 'tour_guide_assignments.tour_departure_id')
        ->where('tour_guide_assignments.guide_id', $guideId)
        ->whereIn('tour_guide_assignments.status', ['assigned', 'confirmed'])
        ->whereDate('tour_departures.return_date', '>=', today())
        ->orderBy('tour_departures.departure_date')
        ->pluck('tour_departures.departure_date')
        ->map(fn ($date) => now()->parse($date)->toDateString())
        ->all();

    expect($activeAssignments)->toBe([
        today()->toDateString(),
        today()->addDays(3)->toDateString(),
        today()->addDays(8)->toDateString(),
    ])->and(DB::table('tour_guide_assignments')
        ->where('guide_id', $guideId)
        ->where('status', 'completed')
        ->count())->toBeGreaterThanOrEqual(4);

    $this->seed(TourTestingDataSeeder::class);

    expect([
        'tours' => Tour::query()->where('slug', 'like', '%-test')->count(),
        'bookings' => Booking::query()->where('booking_code', 'like', 'BK-TST-%')->count(),
    ])->toMatchArray(['tours' => 4, 'bookings' => 5]);
});
