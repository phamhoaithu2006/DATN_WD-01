<?php

namespace Database\Seeders;

use App\Models\Guide;
use App\Models\GuideAssignment;
use App\Models\TourDeparture;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class GuideAssignmentSeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::hasTable('guide_assignments')) {
            return;
        }

        $guide1 = Guide::where('guide_code', 'HDV001')->first();
        $guide2 = Guide::where('guide_code', 'HDV002')->first();
        $guide3 = Guide::where('guide_code', 'HDV003')->first();

        $departureDaNangSoon = TourDeparture::whereDate('departure_date', now()->addDays(14)->toDateString())->first();
        $departureDaNangLater = TourDeparture::whereDate('departure_date', now()->addDays(30)->toDateString())->first();
        $departurePhuQuoc = TourDeparture::whereDate('departure_date', now()->addDays(20)->toDateString())->first();
        $departureSaPa = TourDeparture::whereDate('departure_date', now()->addDays(10)->toDateString())->first();

        $assignments = array_filter([
            [$guide1, $departureDaNangSoon, 'accepted', now()->subDays(2)],
            [$guide1, $departureDaNangLater, 'assigned', now()->subDay()],
            [$guide2, $departurePhuQuoc, 'assigned', now()->subDay()],
            [$guide3, $departureSaPa, 'accepted', now()->subDays(4)],
        ], fn ($item) => $item[0] && $item[1]);

        foreach ($assignments as [$guide, $departure, $status, $assignedAt]) {
            GuideAssignment::query()->updateOrCreate(
                [
                    'guide_id' => $guide->id,
                    'tour_departure_id' => $departure->id,
                ],
                [
                    'status' => $status,
                    'assigned_at' => $assignedAt,
                ]
            );
        }
    }
}
