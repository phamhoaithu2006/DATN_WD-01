<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuideTourCustomerResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $booking = $this->relationLoaded('booking') ? $this->booking : null;
        $contact = $booking?->relationLoaded('contact') ? $booking->contact : null;
        $user = $booking?->relationLoaded('user') ? $booking->user : null;
        $attendance = $this->relationLoaded('attendances') ? $this->attendances->first() : null;

        return [
            'id' => $this->id,
            'booking_code' => $booking?->booking_code,
            'full_name' => $this->full_name,
            'phone' => $this->phone ?? $contact?->contact_phone ?? $user?->phone,
            'email' => $contact?->contact_email ?? $user?->email,
            'identity_number' => $this->identity_number,
            'participant_type' => $this->participant_type,
            'attendance_status' => $attendance?->status ?? 'not_checked_in',
            'attendance' => [
                'id' => $attendance?->id,
                'checked_in_at' => $attendance?->checked_in_at?->toDateTimeString(),
                'checked_out_at' => $attendance?->checked_out_at?->toDateTimeString(),
                'note' => $attendance?->note,
            ],
        ];
    }
}
