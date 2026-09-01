<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingCancellationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public array $cancellation,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: sprintf(
                '[%s] %s - %s',
                $this->cancellation['site_name'] ?? 'ViVuGo',
                $this->cancellation['mail_subject'] ?? 'Thông báo hủy tour',
                $this->cancellation['booking_code'] ?? 'booking',
            ),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.booking-cancellation',
            with: [
                'cancellation' => $this->cancellation,
            ],
        );
    }
}
