<?php

namespace App\Services;

use App\Models\Booking;
use Illuminate\Validation\ValidationException;

class BookingPhoneDuplicateGuard
{
    public function ensureAvailable(int $tourId, array $phones, ?int $excludedBookingId = null): void
    {
        collect($phones)
            ->filter()
            ->unique()
            ->each(function (string $phone) use ($tourId, $excludedBookingId): void {
                $query = Booking::query()
                    ->where('tour_id', $tourId)
                    ->when($excludedBookingId, fn ($builder) => $builder->whereKeyNot($excludedBookingId))
                    ->where($this->activeBookingConstraint(...))
                    ->where(function ($builder) use ($phone): void {
                        $builder
                            ->whereHas('contact', fn ($contact) => $contact->where('phone_normalized', $phone))
                            ->orWhereHas('participants', fn ($participant) => $participant->where('phone_normalized', $phone));
                    });

                if ($query->exists()) {
                    throw ValidationException::withMessages([
                        'contact.contact_phone' => 'Số điện thoại này đã có booking đang hoạt động cho tour. Vui lòng liên hệ nhân viên hỗ trợ nếu cần đặt thêm.',
                    ]);
                }
            });
    }

    private function activeBookingConstraint($query): void
    {
        $query->where(function ($builder): void {
            $builder->where('status', 'confirmed')
                ->orWhere(function ($awaitingPayment): void {
                    $awaitingPayment->where('status', 'awaiting_payment')
                        ->where(function ($paymentState): void {
                            $paymentState->where('payment_status', 'paid')
                                ->orWhereHas('payment', fn ($payment) => $payment
                                    ->where('status', 'pending')
                                    ->where('expires_at', '>', now()));
                        });
                });
        });
    }
}
