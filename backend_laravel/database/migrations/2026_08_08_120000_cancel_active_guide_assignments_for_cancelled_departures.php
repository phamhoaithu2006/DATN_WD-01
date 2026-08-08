<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('tour_guide_assignments')
            ->whereIn('status', ['assigned', 'confirmed'])
            ->whereIn('tour_departure_id', function ($query): void {
                $query->select('id')
                    ->from('tour_departures')
                    ->whereIn('status', ['cancelled', 'canceled']);
            })
            ->update([
                'status' => 'cancelled',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Không thể xác định an toàn trạng thái assigned/confirmed cũ để khôi phục.
    }
};
