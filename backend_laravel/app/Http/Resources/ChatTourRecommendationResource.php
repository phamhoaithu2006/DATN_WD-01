<?php

namespace App\Http\Resources;

use App\Services\TourPricingService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatTourRecommendationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $destination = $this->relationLoaded('destination')
            ? $this->destination
            : null;
        $thumbnail = $this->relationLoaded('thumbnail')
            ? $this->thumbnail
            : null;
        $departure = $this->relationLoaded('departures')
            ? $this->departures->first()
            : null;

        $pricingService = new TourPricingService;
        $basePrice = $pricingService->resolveBasePrice($this->resource, $departure);
        $discountPrice = $pricingService->resolveDiscountPrice($this->resource, $departure);

        return [
            'id' => (int) $this->id,
            'slug' => (string) $this->slug,
            'title' => (string) $this->title,
            'thumbnail_url' => $thumbnail?->image_url,
            'thumbnail_alt' => $thumbnail?->alt_text,
            'destination' => $destination?->name,
            'duration_days' => (int) $this->duration_days,
            'duration_nights' => (int) $this->duration_nights,
            'duration' => "{$this->duration_days} ngày {$this->duration_nights} đêm",
            'base_price' => $basePrice,
            'discount_price' => $discountPrice,
            'price' => $discountPrice ?? $basePrice,
            'departure_date' => $departure?->departure_date?->toDateString(),
            'average_rating' => (float) $this->average_rating,
            'review_count' => (int) $this->review_count,
        ];
    }
}
