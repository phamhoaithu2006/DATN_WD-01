<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('bookings')
            ->leftJoin('payments', 'payments.booking_id', '=', 'bookings.id')
            ->whereNull('payments.id')
            ->select([
                'bookings.id',
                'bookings.total_amount',
                'bookings.payment_status',
                'bookings.created_at',
                'bookings.updated_at',
            ])
            ->orderBy('bookings.id')
            ->chunkById(200, function ($bookings): void {
                $payments = $bookings->map(function ($booking): array {
                    return [
                        'booking_id' => $booking->id,
                        'payment_method' => 'cod',
                        'amount' => $booking->total_amount,
                        'transaction_code' => null,
                        'gateway_response' => null,
                        'status' => match ($booking->payment_status) {
                            'paid' => 'success',
                            'failed' => 'failed',
                            'refunded' => 'refunded',
                            default => 'pending',
                        },
                        'paid_at' => null,
                        'created_at' => $booking->created_at,
                        'updated_at' => $booking->updated_at,
                    ];
                })->all();

                if ($payments !== []) {
                    DB::table('payments')->insert($payments);
                }
            }, 'bookings.id', 'id');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Không xóa dữ liệu thanh toán đã backfill để tránh mất lịch sử giao dịch.
    }
};
