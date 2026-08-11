<?php

use App\Models\TourDeparture;
use App\Services\TourDepartureMutationGuard;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

uses(TestCase::class);

test('guide assignment remains available while a departure is ongoing', function () {
    $departure = new TourDeparture([
        'departure_date' => now()->subDay()->toDateString(),
        'return_date' => now()->addDay()->toDateString(),
        'status' => 'open',
    ]);

    expect(fn () => app(TourDepartureMutationGuard::class)
        ->assertCanManageGuideAssignment($departure))
        ->not->toThrow(ValidationException::class);
});

test('guide assignment stays locked after a departure is completed', function () {
    $departure = new TourDeparture([
        'departure_date' => now()->subDays(3)->toDateString(),
        'return_date' => now()->subDay()->toDateString(),
        'status' => 'completed',
    ]);

    expect(fn () => app(TourDepartureMutationGuard::class)
        ->assertCanManageGuideAssignment($departure))
        ->toThrow(ValidationException::class);
});
