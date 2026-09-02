<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingRefundCompletedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public array $refund) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: sprintf(
            '[%s] Hoàn tiền thành công - %s',
            $this->refund['site_name'] ?? 'ViVuGo',
            $this->refund['booking_code'] ?? 'booking',
        ));
    }

    public function content(): Content
    {
        return new Content(view: 'emails.booking-refund-completed', with: ['refund' => $this->refund]);
    }
}
