<?php

use App\Models\Booking;
use App\Models\Tour;
use App\Models\TourDeparture;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\InternationalTourSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('seeds an open departure with at least twenty guests for every day of september', function () {
    $this->seed(DatabaseSeeder::class);

    $departures = TourDeparture::query()
        ->whereBetween('departure_date', ['2026-09-01', '2026-09-30'])
        ->where('status', 'open')
        ->orderBy('departure_date')
        ->get();

    $publishedTourCount = Tour::query()->where('status', 'published')->count();

    expect($departures)->toHaveCount($publishedTourCount * 30)
        ->and($departures->pluck('departure_date')->map->toDateString()->unique())->toHaveCount(30);

    foreach ($departures->groupBy(fn (TourDeparture $departure) => $departure->departure_date->toDateString()) as $dailyDepartures) {
        expect($dailyDepartures)->toHaveCount($publishedTourCount);
    }

    foreach ($departures as $departure) {
        $guests = Booking::query()
            ->where('tour_departure_id', $departure->id)
            ->whereNotIn('status', ['cancelled', 'cancelled_by_tour'])
            ->sum('number_of_people');

        expect($guests)->toBeGreaterThanOrEqual(20);
    }
});

test('does not assign a guide to overlapping september departures', function () {
    $this->seed(DatabaseSeeder::class);

    $assignments = DB::table('tour_guide_assignments as assignment')
        ->join('tour_departures as departure', 'departure.id', '=', 'assignment.tour_departure_id')
        ->whereBetween('departure.departure_date', ['2026-09-01', '2026-09-30'])
        ->whereIn('assignment.status', ['assigned', 'confirmed'])
        ->select('assignment.guide_id', 'departure.id', 'departure.departure_date', 'departure.return_date')
        ->get()
        ->groupBy('guide_id');

    foreach ($assignments as $guideAssignments) {
        $ordered = $guideAssignments->sortBy('departure_date')->values();

        for ($index = 1; $index < $ordered->count(); $index++) {
            expect($ordered[$index]->departure_date)->toBeGreaterThan($ordered[$index - 1]->return_date);
        }
    }
});

test('creates international tours with complete september schedules', function () {
    $this->seed(DatabaseSeeder::class);

    $internationalTours = Tour::query()
        ->whereHas('category', fn ($query) => $query->where('slug', 'tour-quoc-te'))
        ->get();

    expect($internationalTours)->toHaveCount(5);

    foreach ($internationalTours as $tour) {
        expect($tour->itineraries()->count())->toBe($tour->duration_days)
            ->and($tour->departures()
                ->whereBetween('departure_date', ['2026-09-01', '2026-09-30'])
                ->where('status', 'open')
                ->count())->toBe(30);
    }

    $nonInternationalGuideAssignments = DB::table('tour_guide_assignments as assignment')
        ->join('tour_departures as departure', 'departure.id', '=', 'assignment.tour_departure_id')
        ->join('guides as guide', 'guide.id', '=', 'assignment.guide_id')
        ->whereIn('departure.tour_id', $internationalTours->pluck('id'))
        ->whereBetween('departure.departure_date', ['2026-09-01', '2026-09-30'])
        ->where('guide.certificate_type', '!=', 'Quốc tế')
        ->count();

    expect($nonInternationalGuideAssignments)->toBe(0);

    $countsBefore = [
        'tours' => Tour::query()->count(),
        'departures' => TourDeparture::query()->count(),
        'bookings' => Booking::query()->count(),
    ];

    $this->seed(InternationalTourSeeder::class);

    expect([
        'tours' => Tour::query()->count(),
        'departures' => TourDeparture::query()->count(),
        'bookings' => Booking::query()->count(),
    ])->toBe($countsBefore);
});
