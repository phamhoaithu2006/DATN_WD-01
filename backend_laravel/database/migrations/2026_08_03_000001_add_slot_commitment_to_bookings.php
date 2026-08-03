<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table): void {
            $table->timestamp('slot_committed_at')
                ->nullable()
                ->index()
                ->after('payment_status');
        });

        // Các booking đã thanh toán hoặc đã được xác nhận trước đây tiếp tục
        // được coi là đang chiếm chỗ để không làm thay đổi dữ liệu lịch sử.
        DB::table('bookings')
            ->whereNotIn('status', ['cancelled', 'cancelled_by_tour'])
            ->where(function ($query): void {
                $query
                    ->where('payment_status', 'paid')
                    ->orWhereIn('status', ['confirmed', 'departed', 'completed']);
            })
            ->orderBy('id')
            ->chunkById(100, function ($bookings): void {
                foreach ($bookings as $booking) {
                    $paidAt = DB::table('payments')
                        ->where('booking_id', $booking->id)
                        ->where('status', 'success')
                        ->value('paid_at');

                    DB::table('bookings')
                        ->where('id', $booking->id)
                        ->update([
                            'slot_committed_at' => $paidAt ?: ($booking->updated_at ?: now()),
                        ]);
                }
            });

        // Booking VNPAY đang chờ thanh toán từng giữ chỗ theo logic cũ.
        // Giải phóng phần giữ chỗ này một lần khi chuyển sang logic mới.
        $legacyHolds = DB::table('bookings')
            ->join('payments', 'payments.booking_id', '=', 'bookings.id')
            ->select('bookings.tour_departure_id', DB::raw('SUM(bookings.number_of_people) as people'))
            ->where('bookings.status', 'pending')
            ->where('bookings.payment_status', 'unpaid')
            ->where('payments.payment_method', 'vnpay')
            ->where('payments.status', 'pending')
            ->groupBy('bookings.tour_departure_id')
            ->get();

        foreach ($legacyHolds as $legacyHold) {
            $departure = DB::table('tour_departures')
                ->where('id', $legacyHold->tour_departure_id)
                ->first();

            if (! $departure) {
                continue;
            }

            DB::table('tour_departures')
                ->where('id', $departure->id)
                ->update([
                    'booked_slots' => max(0, (int) $departure->booked_slots - (int) $legacyHold->people),
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table): void {
            $table->dropIndex(['slot_committed_at']);
            $table->dropColumn('slot_committed_at');
        });
    }
};
