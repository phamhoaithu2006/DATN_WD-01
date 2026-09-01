<?php

namespace App\Console\Commands;

use App\Services\BookingStatusService;
use Illuminate\Console\Command;

class MarkBookingsDeparted extends Command
{
    protected $signature = 'bookings:mark-departed';

    protected $description = 'Tự động đồng bộ trạng thái booking theo thanh toán, sức chứa và ngày lịch khởi hành';

    public function handle(BookingStatusService $bookingStatusService): int
    {
        $count = $bookingStatusService->synchronizeAll();

        $this->info("Đã đồng bộ {$count} booking theo trạng thái thanh toán, sức chứa và lịch khởi hành.");

        return self::SUCCESS;
    }
}
