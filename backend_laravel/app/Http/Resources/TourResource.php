<?php

namespace App\Http\Resources;

use DateTimeInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TourResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /*
         * Không dùng whenLoaded() để gán vào biến.
         * whenLoaded() có thể trả MissingValue, sau đó truy cập ->name sẽ gây lỗi 500.
         */
        $category = $this->relationLoaded('category')
            ? $this->category
            : null;

        $destination = $this->relationLoaded('destination')
            ? $this->destination
            : null;

        $multiDestinations = $this->relationLoaded('destinations')
            ? $this->destinations
            : collect();

        $thumbnail = $this->relationLoaded('thumbnail')
            ? $this->thumbnail
            : null;

        $tourImages = $this->relationLoaded('images')
            ? $this->images
            : collect();

        $departures = $this->relationLoaded('departures')
            ? $this->departures
            : collect();

        $pricingRules = $this->relationLoaded('agePricingRules')
            ? $this->agePricingRules
            : collect();

        $itineraries = $this->relationLoaded('itineraries')
            ? $this->itineraries
            : collect();

        $images = $tourImages
            ->map(fn ($image) => [
                'id' => $image->id,
                'image_url' => $image->image_url,
                'alt_text' => $image->alt_text,
                'sort_order' => (int) $image->sort_order,
                'is_thumbnail' => (bool) $image->is_thumbnail,
            ])
            ->values()
            ->all();

        $thumbnailUrl = $thumbnail?->image_url
            ?? ($images[0]['image_url'] ?? null);

        $itineraryData = $itineraries
            ->map(function ($itinerary) {
                $itineraryImages = $itinerary->relationLoaded('images')
                    ? $itinerary->images
                    : collect();

                return [
                    'id' => $itinerary->id,
                    'day_number' => (int) $itinerary->day_number,
                    'sort_order' => (int) $itinerary->sort_order,
                    'type' => $itinerary->type,
                    'title' => $itinerary->title,
                    'start_time' => $itinerary->start_time,
                    'end_time' => $itinerary->end_time,
                    'duration' => $itinerary->duration,
                    'transport' => $itinerary->transport,
                    'description' => $itinerary->description,

                    'images' => $itineraryImages
                        ->map(fn ($image) => [
                            'id' => $image->id,
                            'image_url' => $image->image_url,
                            'alt_text' => $image->alt_text,
                            'sort_order' => (int) $image->sort_order,
                        ])
                        ->values()
                        ->all(),
                ];
            })
            ->values()
            ->all();

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'summary' => $this->summary,
            'description' => $this->description,

            'duration_days' => (int) $this->duration_days,
            'duration_nights' => (int) $this->duration_nights,
            'duration' => "{$this->duration_days} ngày {$this->duration_nights} đêm",

            'base_price' => (float) $this->base_price,
            'discount_price' => $this->discount_price !== null
                ? (float) $this->discount_price
                : null,

            'max_slots' => (int) $this->max_slots,
            'available_slots' => (int) $this->available_slots,

            'status' => $this->status,
            'average_rating' => (float) $this->average_rating,
            'review_count' => (int) $this->review_count,

            'category' => $category?->name,
            'category_name' => $category?->name,
            'category_info' => $category ? [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
            ] : null,

            'destination' => $destination?->name,
            'destination_name' => $destination?->name,
            'destination_info' => $destination ? [
                'id' => $destination->id,
                'name' => $destination->name,
                'slug' => $destination->slug,
                'province_city' => $destination->province_city,
                'country' => $destination->country,
                'description' => $destination->description,
                'thumbnail_url' => $destination->thumbnail_url,
                'status' => $destination->status,
            ] : null,

            'destinations' => $multiDestinations
                ->map(fn ($item) => [
                    'id' => $item->id,
                    'name' => $item->name,
                    'slug' => $item->slug,
                    'province_city' => $item->province_city,
                    'country' => $item->country,
                    'thumbnail_url' => $item->thumbnail_url,
                    'sort_order' => (int) ($item->pivot?->sort_order ?? 0),
                ])
                ->values()
                ->all(),

            'thumbnail_url' => $thumbnailUrl,
            'image' => $thumbnailUrl,
            'images' => $images,

            'min_departure_price' => $this->resource->getAttribute('min_departure_price') !== null
                ? (float) $this->resource->getAttribute('min_departure_price')
                : null,

            'next_departure_date' => $this->formatDate(
                $this->resource->getAttribute('next_departure_date')
            ),

            'available_departures_count' => (int) (
                $this->resource->getAttribute('available_departures_count') ?? 0
            ),

            'departures' => $departures
                ->map(fn ($departure) => [
                    'id' => $departure->id,
                    'tour_id' => $departure->tour_id,
                    'departure_date' => $this->formatDate($departure->departure_date),
                    'return_date' => $this->formatDate($departure->return_date),
                    'price' => (float) $departure->price,
                    'total_slots' => (int) $departure->total_slots,
                    'booked_slots' => (int) $departure->booked_slots,
                    'available_slots' => max(
                        0,
                        (int) $departure->total_slots - (int) $departure->booked_slots
                    ),
                    'status' => $departure->status,
                    'current_stage_id' => $departure->current_stage_id,
                ])
                ->values()
                ->all(),

            'age_pricing_rules' => $pricingRules
                ->map(fn ($rule) => [
                    'id' => $rule->id,
                    'label' => $rule->label,
                    'min_age' => $rule->min_age,
                    'max_age' => $rule->max_age,
                    'pricing_type' => $rule->pricing_type,
                    'price_value' => (float) $rule->price_value,
                    'sort_order' => (int) $rule->sort_order,
                    'is_active' => (bool) $rule->is_active,
                ])
                ->values()
                ->all(),

            /*
             * Trả cả itinerary và itineraries
             * để tương thích các component frontend cũ/mới.
             */
            'itineraries' => $itineraryData,
            'itinerary' => $itineraryData,

            'bookings_count' => (int) (
                $this->resource->getAttribute('bookings_count') ?? 0
            ),

            'created_at' => $this->formatDateTime($this->created_at),
            'updated_at' => $this->formatDateTime($this->updated_at),
        ];
    }

    private function formatDate(mixed $value): ?string
    {
        if (! $value) {
            return null;
        }

        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return (string) $value;
    }

    private function formatDateTime(mixed $value): ?string
    {
        if (! $value) {
            return null;
        }

        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m-d H:i:s');
        }

        return (string) $value;
    }
}