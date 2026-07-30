<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminGuideReviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $this->relationLoaded('user') ? $this->user : null;
        $guide = $this->relationLoaded('guide') ? $this->guide : null;
        $guideUser = $guide?->relationLoaded('user') ? $guide->user : null;
        $tour = $this->relationLoaded('tour') ? $this->tour : null;
        $booking = $this->relationLoaded('booking') ? $this->booking : null;
        $departure = $this->relationLoaded('tourDeparture') ? $this->tourDeparture : null;

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
            'guide' => $guide ? [
                'id' => $guide->id,
                'guide_code' => $guide->guide_code,
                'full_name' => $guideUser?->full_name,
                'email' => $guideUser?->email,
                'phone' => $guideUser?->phone,
                'avatar_url' => $guide->avatar_url ?? $guideUser?->avatar_url,
                'average_rating' => (float) ($guide->average_rating ?? 0),
                'review_count' => (int) ($guide->review_count ?? 0),
                'status' => $guide->status,
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
                'status' => $departure->status,
            ] : null,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
