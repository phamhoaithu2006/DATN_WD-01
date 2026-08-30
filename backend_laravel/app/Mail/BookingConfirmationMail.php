<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public array $invoice,
        public string $pdfContent,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: sprintf(
                '[%s] Xác nhận đặt tour - %s',
                $this->invoice['site_name'] ?? 'ViVuGo',
                $this->invoice['booking_code'] ?? 'booking',
            ),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.booking-confirmation',
            with: [
                'invoice' => $this->invoice,
            ],
        );
    }

    public function attachments(): array
    {
        $bookingCode = $this->invoice['booking_code'] ?? 'booking';

        return [
            Attachment::fromData(
                fn (): string => $this->pdfContent,
                "hoa-don-{$bookingCode}.pdf",
            )->withMime('application/pdf'),
        ];
    }
}
