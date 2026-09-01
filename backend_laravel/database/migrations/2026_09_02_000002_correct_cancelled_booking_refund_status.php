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
                'payment_status' => 'refund_pending',
                'resolution_status' => 'refund_pending',
                'updated_at' => now(),
            ]);

        // Chờ hoàn tiền: giao dịch vẫn là giao dịch thành công cho tới khi
        // nghiệp vụ hoàn tiền thực tế được admin xác nhận hoàn tất.
        DB::table('payments')
            ->whereIn('booking_id', $bookingIds)
            ->where('status', 'refunded')
            ->update([
                'status' => 'success',
                'refunded_at' => null,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Không tự động đánh dấu đã hoàn tiền khi rollback.
    }
};
