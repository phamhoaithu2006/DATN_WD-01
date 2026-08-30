<?php

namespace App\Services;

use App\Jobs\DeliverBookingConfirmationEmail;
use App\Models\Booking;
use App\Models\BookingConfirmationOutbox;
use App\Models\BookingParticipant;
use App\Models\Setting;
use Illuminate\Support\Facades\Log;

class BookingConfirmationService
{
    public function enqueueForConfirmedBooking(Booking $booking): ?BookingConfirmationOutbox
    {
        $booking = $this->loadBooking($booking);

        if (! $this->isEligible($booking)) {
            return null;
        }

        $recipientEmail = $this->resolveRecipientEmail($booking);

        if ($recipientEmail === null) {
            Log::warning('Bỏ qua email xác nhận booking vì không có email hợp lệ.', [
                'booking_id' => $booking->id,
            ]);

            return null;
        }

        $outbox = BookingConfirmationOutbox::query()->firstOrCreate(
            ['booking_id' => $booking->id],
            [
                'recipient_email' => $recipientEmail,
                'payload' => $this->buildPayload($booking),
            ],
        );

        if (! $outbox->processed_at) {
            DeliverBookingConfirmationEmail::dispatch($outbox->id)->afterCommit();
        }

        return $outbox;
    }

    private function loadBooking(Booking $booking): ?Booking
    {
        return Booking::query()
            ->with([
                'user:id,full_name,email',
                'tour:id,title',
                'tourDeparture:id,tour_id,departure_date,return_date,departure_location',
                'contact:id,booking_id,contact_name,contact_email,contact_phone',
                'participants:id,booking_id,full_name,participant_type,unit_price,pricing_rule_label',
                'payment:id,booking_id,payment_method,transaction_code,paid_at',
            ])
            ->find($booking->id);
    }

    private function isEligible(?Booking $booking): bool
    {
        return $booking !== null
            && $booking->status === 'confirmed'
            && $booking->payment_status === 'paid'
            && $booking->slot_committed_at !== null;
    }

    private function resolveRecipientEmail(Booking $booking): ?string
    {
        foreach ([$booking->contact?->contact_email, $booking->user?->email] as $candidate) {
            $email = trim((string) $candidate);

            if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $email;
            }
        }

        return null;
    }

    private function buildPayload(Booking $booking): array
    {
        $departure = $booking->tourDeparture;
        $payment = $booking->payment;

        return [
            'site_name' => $this->siteName(),
            'recipient_name' => $booking->contact?->contact_name
                ?: $booking->user?->full_name
                ?: 'Quý khách',
            'booking_code' => $booking->booking_code,
            'tour_title' => $booking->tour?->title ?: 'Tour đã đặt',
            'departure_date' => $departure?->departure_date?->format('d/m/Y'),
            'return_date' => $departure?->return_date?->format('d/m/Y'),
            'departure_location' => $departure?->departure_location,
            'number_of_people' => (int) $booking->number_of_people,
            'total_amount' => (string) $booking->total_amount,
            'payment_method' => $payment?->payment_method ?: 'vnpay',
            'transaction_code' => $payment?->transaction_code,
            'paid_at' => $payment?->paid_at?->format('d/m/Y H:i'),
            'contact_phone' => $booking->contact?->contact_phone,
            'support_email' => $this->settingValue('contact_email') ?: config('mail.from.address'),
            'support_hotline' => $this->settingValue('hotline'),
            'participants' => $booking->participants
                ->map(fn (BookingParticipant $participant): array => [
                    'full_name' => $participant->full_name,
                    'participant_type' => $participant->participant_type,
                    'pricing_rule_label' => $participant->pricing_rule_label,
                    'unit_price' => (string) $participant->unit_price,
                ])
                ->values()
                ->all(),
        ];
    }

    private function siteName(): string
    {
        return $this->settingValue('site_name') ?: 'ViVuGo';
    }

    private function settingValue(string $key): string
    {
        return trim((string) Setting::valueFor($key));
    }
}
