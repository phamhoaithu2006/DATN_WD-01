<?php

namespace App\Console\Commands;

use App\Models\Booking;
use Illuminate\Console\Command;

class MarkBookingsDeparted extends Command
{
    protected $signature = 'bookings:mark-departed';

    protected $description = 'Tự động chuyển các booking đã xác nhận sang trạng thái "đã khởi hành" khi đến ngày departure_date';

    public function handle(): int
    {
        $count = 0;

        Booking::query()
            ->where('status', 'confirmed')
            ->whereHas('tourDeparture', function ($query) {
                $query->whereDate('departure_date', '<=', now()->toDateString());
            })
            ->chunkById(200, function ($bookings) use (&$count) {
                foreach ($bookings as $booking) {
                    $booking->status = 'departed';
                    $booking->save();

                    $booking->statusHistories()->create([
                        // changed_by để null vì đây là tác vụ hệ thống tự động.
                        // Nếu cột changed_by trong booking_status_histories không cho phép NULL,
                        // cần sửa migration bảng đó để cho phép NULL trước khi chạy command này.
                        'changed_by' => null,
                        'old_status' => 'confirmed',
                        'new_status' => 'departed',
                        'note' => 'Tự động cập nhật: tour đã đến ngày khởi hành.',
                    ]);

                    $count++;
                }
            });

        $this->info("Đã cập nhật {$count} booking sang trạng thái đã khởi hành.");

        return self::SUCCESS;
    }
}
