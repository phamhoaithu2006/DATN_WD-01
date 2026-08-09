<?php

use App\Http\Controllers\Api\Admin\TourManagerController;
use Illuminate\Http\Request;

test('empty destination place is normalized to null before saving an itinerary', function () {
    $request = Request::create('/api/admin/tours/16', 'PUT', [
        'itinerary' => json_encode([
            [
                'day_number' => 2,
                'type' => 'sightseeing',
                'destination_place_id' => '',
                'title' => 'Tham quan Sa Pa',
            ],
        ]),
    ]);

    $method = new ReflectionMethod(TourManagerController::class, 'normalizeItineraryRequest');
    $method->invoke(new TourManagerController, $request);

    expect($request->input('itinerary.0.destination_place_id'))->toBeNull();
});
