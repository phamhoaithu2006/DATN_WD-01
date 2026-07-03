<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuideTourCustomerDetailResource extends JsonResource
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

        return [
            'id' => $this->id,
            'personal_info' => [
                'full_name' => $this->full_name,
                'phone' => $this->phone ?? $contact?->contact_phone ?? $user?->phone,
                'email' => $contact?->contact_email ?? $user?->email,
                'birth_date' => $this->birth_date?->toDateString(),
                'gender' => $this->gender,
                'identity_number' => $this->identity_number,
                'participant_type' => $this->participant_type,
            ],
            'booking_info' => [
                'id' => $booking?->id,
                'booking_code' => $booking?->booking_code,
                'status' => $booking?->status,
                'payment_status' => $booking?->payment_status,
                'number_of_people' => $booking?->number_of_people,
                'tour_id' => $booking?->tour_id,
                'tour_departure_id' => $booking?->tour_departure_id,
                'note' => $booking?->note,
            ],
            'contact_info' => [
                'contact_name' => $contact?->contact_name,
                'contact_email' => $contact?->contact_email,
                'contact_phone' => $contact?->contact_phone,
                'address' => $contact?->address,
                'special_request' => $contact?->special_request,
            ],
            'attendance_history' => $this->whenLoaded('attendances', fn () => $this->attendances->map(fn ($attendance) => [
                'id' => $attendance->id,
                'session_id' => $attendance->attendance_session_id,
                'session_name' => $attendance->session?->name,
                'status' => $attendance->status,
                'checked_in_at' => $attendance->checked_in_at?->toDateTimeString(),
                'checked_out_at' => $attendance->checked_out_at?->toDateTimeString(),
                'note' => $attendance->note,
                'created_at' => $attendance->created_at?->toDateTimeString(),
            ])),
            'check_in_history' => $this->whenLoaded('attendances', fn () => $this->attendances
                ->filter(fn ($attendance) => $attendance->checked_in_at !== null)
                ->values()
                ->map(fn ($attendance) => [
                    'session_id' => $attendance->attendance_session_id,
                    'session_name' => $attendance->session?->name,
                    'checked_in_at' => $attendance->checked_in_at?->toDateTimeString(),
                    'checked_by' => $attendance->checkedInBy?->only(['id', 'full_name', 'email']),
                ])),
            'check_out_history' => $this->whenLoaded('attendances', fn () => $this->attendances
                ->filter(fn ($attendance) => $attendance->checked_out_at !== null)
                ->values()
                ->map(fn ($attendance) => [
                    'session_id' => $attendance->attendance_session_id,
                    'session_name' => $attendance->session?->name,
                    'checked_out_at' => $attendance->checked_out_at?->toDateTimeString(),
                    'checked_by' => $attendance->checkedOutBy?->only(['id', 'full_name', 'email']),
                ])),
            'notes' => $this->whenLoaded('attendances', fn () => $this->attendances
                ->filter(fn ($attendance) => filled($attendance->note))
                ->values()
                ->map(fn ($attendance) => [
                    'session_id' => $attendance->attendance_session_id,
                    'session_name' => $attendance->session?->name,
                    'note' => $attendance->note,
                    'updated_by' => $attendance->noteUpdatedBy?->only(['id', 'full_name', 'email']),
                    'updated_at' => $attendance->updated_at?->toDateTimeString(),
                ])),
        ];
    }
}
