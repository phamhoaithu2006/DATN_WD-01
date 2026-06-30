<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TourGuideAssignmentSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        DB::table('tour_guide_assignments')->insertOrIgnore([
            [
                'guide_id'          => 1,
                'tour_departure_id' => 1,
                'status'            => 'assigned',
                'note'              => null,
                'created_at'        => $now,
                'updated_at'        => $now,
            ],
            [
                'guide_id'          => 1,
                'tour_departure_id' => 2,
                'status'            => 'confirmed',
                'note'              => 'Đoàn khách VIP, lưu ý phục vụ chu đáo.',
                'created_at'        => $now,
                'updated_at'        => $now,
            ],
            [
                'guide_id'          => 2,
                'tour_departure_id' => 3,
                'status'            => 'assigned',
                'note'              => null,
                'created_at'        => $now,
                'updated_at'        => $now,
            ],
            [
                'guide_id'          => 3,
                'tour_departure_id' => 4,
                'status'            => 'confirmed',
                'note'              => null,
                'created_at'        => $now,
                'updated_at'        => $now,
            ],
        ]);
    }
}
