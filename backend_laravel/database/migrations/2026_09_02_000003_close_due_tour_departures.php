<?php

use App\Models\TourDeparture;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('tour_departures')
            ->whereNotIn('status', ['cancelled', 'canceled'])
            ->whereDate('departure_date', '<=', TourDeparture::customerBookingCutoffDate()->toDateString())
            ->update([
                'status' => 'closed',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Không tự mở lại các lịch đã qua mốc đóng nhận booking.
    }
};
