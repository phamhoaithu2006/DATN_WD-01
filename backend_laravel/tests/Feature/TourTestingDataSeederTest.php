<?php

use App\Models\Booking;
use App\Models\Tour;
use Database\Seeders\CategorySeeder;
use Database\Seeders\CertificateSeeder;
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

    $this->seed(TourTestingDataSeeder::class);

    expect([
        'tours' => Tour::query()->where('slug', 'like', '%-test')->count(),
        'bookings' => Booking::query()->where('booking_code', 'like', 'BK-TST-%')->count(),
    ])->toMatchArray(['tours' => 4, 'bookings' => 5]);
});
