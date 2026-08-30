<?php

namespace App\Jobs;

use App\Mail\BookingConfirmationMail;
use App\Models\BookingConfirmationOutbox;
use App\Services\BookingInvoicePdfService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class DeliverBookingConfirmationEmail implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    public function __construct(public int $outboxId) {}

    public function handle(BookingInvoicePdfService $pdfService): void
    {
        DB::transaction(function () use ($pdfService): void {
            $outbox = BookingConfirmationOutbox::query()
                ->lockForUpdate()
                ->find($this->outboxId);

            if (! $outbox || $outbox->processed_at) {
                return;
            }

            $pdfContent = $pdfService->render($outbox->payload);

            Mail::to($outbox->recipient_email)->send(new BookingConfirmationMail(
                $outbox->payload,
                $pdfContent,
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
