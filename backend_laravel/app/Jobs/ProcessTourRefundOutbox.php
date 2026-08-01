<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\TourRefundOutbox;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class ProcessTourRefundOutbox implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(public int $outboxId) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        DB::transaction(function (): void {
            $outbox = TourRefundOutbox::query()->lockForUpdate()->find($this->outboxId);
            if (! $outbox || $outbox->processed_at) {
                return;
            }

            $booking = $outbox->booking()->firstOrFail();
            Notification::query()->create([
                'user_id' => $booking->user_id,
                'title' => 'Yêu cầu hoàn tiền đã được tiếp nhận',
                'message' => "Yêu cầu hoàn tiền cho booking {$booking->booking_code} đã được chuyển tới bộ phận thanh toán.",
                'type' => 'system',
                'status' => 'unread',
                'data' => json_encode(['booking_id' => $booking->id, 'refund_request_id' => $outbox->refund_request_id], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            ]);
            $outbox->update(['processed_at' => now()]);
        });
    }
}
