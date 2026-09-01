<?php

namespace App\Jobs;

use App\Mail\BookingCancellationMail;
use App\Models\BookingCancellationOutbox;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class DeliverBookingCancellationEmail implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(public int $outboxId) {}

    public function handle(): void
    {
        DB::transaction(function (): void {
            $outbox = BookingCancellationOutbox::query()
                ->lockForUpdate()
                ->find($this->outboxId);

            if (! $outbox || $outbox->processed_at) {
                return;
            }

            Mail::to($outbox->recipient_email)->send(new BookingCancellationMail(
                $outbox->payload,
            ));

            $outbox->update([
                'processed_at' => now(),
            ]);
        });
    }

    public function backoff(): array
    {
        return [60, 300];
    }
}
