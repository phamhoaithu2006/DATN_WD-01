<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $bookingIds = DB::table('bookings')
            ->join('tour_departures', 'tour_departures.id', '=', 'bookings.tour_departure_id')
            ->whereIn('tour_departures.status', ['cancelled', 'canceled'])
            ->pluck('bookings.id');

        if ($bookingIds->isEmpty()) {
            return;
        }

        DB::table('bookings')
            ->whereIn('id', $bookingIds)
            ->update([
                'status' => 'cancelled_by_tour',
                'payment_status' => 'refunded',
                'resolution_status' => 'refunded',
                'cancelled_at' => now(),
                'updated_at' => now(),
            ]);

        DB::table('payments')
            ->whereIn('booking_id', $bookingIds)
            ->whereIn('status', ['success', 'refunded'])
            ->update([
                'status' => 'refunded',
                'refunded_at' => now(),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Đồng bộ hoàn tiền là thay đổi nghiệp vụ không nên tự động đảo ngược.
    }
};
