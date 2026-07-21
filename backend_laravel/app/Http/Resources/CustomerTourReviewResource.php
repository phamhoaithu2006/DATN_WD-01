<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerTourReviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $tour = $this->relationLoaded('tour') ? $this->tour : null;
        $departure = $this->relationLoaded('tourDeparture') ? $this->tourDeparture : null;
        $booking = $this->relationLoaded('booking') ? $this->booking : null;

        return [
            'id' => $this->id,
            'rating' => (int) $this->rating,
            'comment' => $this->comment,
            'status' => $this->status,
            'tour' => $tour ? [
                'id' => $tour->id,
                'title' => $tour->title,
                'slug' => $tour->slug,
            ] : null,
            'tour_departure' => $departure ? [
                'id' => $departure->id,
                'departure_date' => $departure->departure_date?->toDateString(),
                'return_date' => $departure->return_date?->toDateString(),
            ] : null,
            'booking' => $booking ? [
                'id' => $booking->id,
                'booking_code' => $booking->booking_code,
            ] : null,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
