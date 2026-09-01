<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingAuditLog;
use App\Models\User;

class BookingAuditService
{
    public function record(
        Booking $booking,
        string $action,
        ?int $actorId = null,
        array $attributes = [],
    ): BookingAuditLog {
        $actorId ??= auth()->id();
        $actorName = $attributes['actor_name'] ?? null;

        if ($actorName === null && $actorId !== null) {
            $actorName = User::query()->whereKey($actorId)->value('full_name');
        }

        return BookingAuditLog::query()->create([
            'booking_id' => $booking->getKey(),
            'booking_code' => (string) ($attributes['booking_code'] ?? $booking->booking_code ?? "#{$booking->getKey()}"),
            'actor_id' => $actorId,
            'actor_name' => $actorName,
            'action' => $action,
            'status_before' => $attributes['status_before'] ?? null,
            'status_after' => $attributes['status_after'] ?? null,
            'payment_status_before' => $attributes['payment_status_before'] ?? null,
            'payment_status_after' => $attributes['payment_status_after'] ?? null,
            'reason' => $attributes['reason'] ?? null,
            'metadata' => $attributes['metadata'] ?? null,
        ]);
    }
}
