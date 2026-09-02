<?php

namespace App\Services;

use App\Mail\BookingRefundCompletedMail;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Setting;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class BookingRefundEmailService
{
    public function enqueue(Payment $payment): void
    {
        $payment->loadMissing(['booking.user', 'booking.contact', 'booking.tour']);
        $booking = $payment->booking;
        $email = $booking ? $this->resolveRecipientEmail($booking) : null;

        if (! $booking || $email === null) {
            Log::warning('Bỏ qua email hoàn tiền vì booking không có email khách hàng hợp lệ.', [
                'payment_id' => $payment->id,
                'booking_id' => $booking?->id,
            ]);

            return;
        }

        Mail::to($email)->queue(new BookingRefundCompletedMail([
            'site_name' => trim((string) Setting::valueFor('site_name')) ?: 'ViVuGo',
            'recipient_name' => $booking->contact?->contact_name ?: $booking->user?->full_name ?: 'Quý khách',
            'booking_code' => $booking->booking_code,
            'tour_title' => $booking->tour?->title ?: 'Tour đã đặt',
            'amount' => (string) $payment->amount,
            'refunded_at' => $payment->refunded_at?->format('d/m/Y H:i'),
            'transaction_code' => $payment->transaction_code,
            'support_email' => trim((string) Setting::valueFor('contact_email')) ?: config('mail.from.address'),
            'support_hotline' => trim((string) Setting::valueFor('hotline')),
        ]));
    }

    public function resolveRecipientEmail(Booking $booking): ?string
    {
        foreach ([$booking->user?->email, $booking->contact?->contact_email] as $candidate) {
            $email = trim((string) $candidate);

            if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $email;
            }
        }

        return null;
    }
}
