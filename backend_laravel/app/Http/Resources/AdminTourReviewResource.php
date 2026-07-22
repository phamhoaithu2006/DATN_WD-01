<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminTourReviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $this->relationLoaded('user') ? $this->user : null;
        $tour = $this->relationLoaded('tour') ? $this->tour : null;
        $booking = $this->relationLoaded('booking') ? $this->booking : null;
        $departure = $this->relationLoaded('tourDeparture') ? $this->tourDeparture : null;
        $moderator = $this->relationLoaded('moderator') ? $this->moderator : null;

        return [
            'id' => $this->id,
            'rating' => (int) $this->rating,
            'comment' => $this->comment,
            'status' => $this->status,
            'reviewer' => $user ? [
                'id' => $user->id,
                'full_name' => $user->full_name,
                'email' => $user->email,
            ] : null,
            'tour' => $tour ? [
                'id' => $tour->id,
                'title' => $tour->title,
                'slug' => $tour->slug,
            ] : null,
            'booking' => $booking ? [
                'id' => $booking->id,
                'booking_code' => $booking->booking_code,
                'status' => $booking->status,
            ] : null,
            'tour_departure' => $departure ? [
                'id' => $departure->id,
                'departure_date' => $departure->departure_date?->toDateString(),
                'return_date' => $departure->return_date?->toDateString(),
            ] : null,
            'moderated_by' => $moderator ? [
                'id' => $moderator->id,
                'full_name' => $moderator->full_name,
            ] : null,
            'moderated_at' => $this->moderated_at?->toDateTimeString(),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
