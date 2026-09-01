<?php

namespace App\Http\Resources;

use App\Models\TourAgePricingRule;
use App\Services\TourPricingService;
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

        $province = $this->relationLoaded('province')
            ? $this->province
            : ($this->relationLoaded('destination') ? $this->destination : null);

        $thumbnail = $this->relationLoaded('thumbnail')
            ? $this->thumbnail
            : null;

        $tourImages = $this->relationLoaded('images')
            ? $this->images
            : collect();

        $departures = $this->relationLoaded('departures')
            ? $this->departures
            : collect();

        $standardPricingRules = collect(TourAgePricingRule::standardDefinitions());
        $pricingRules = $this->relationLoaded('agePricingRules')
            ? $this->agePricingRules
                ->filter(function ($rule) use ($standardPricingRules): bool {
                    if (! $rule->is_active) {
                        return false;
                    }

                    return $standardPricingRules->contains(function (array $definition) use ($rule): bool {
                        return $rule->label === $definition['label']
                            && (int) $rule->min_age === (int) $definition['min_age']
                            && (int) $rule->max_age === (int) $definition['max_age']
                            && $rule->pricing_type === $definition['pricing_type']
                            && abs((float) $rule->price_value - (float) $definition['price_value']) < 0.00001;
                    });
                })
                ->sortBy('sort_order')
                ->values()
            : collect();
        $pricingService = new TourPricingService;

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

                $destinationPlace = $itinerary->relationLoaded('destinationPlace')
                    ? $itinerary->destinationPlace
                    : null;
                $destinationPlaceProvince = $destinationPlace?->relationLoaded('province')
                    ? $destinationPlace->province
                    : null;
                $destinationPlaceDistrict = $destinationPlace?->relationLoaded('district')
                    ? $destinationPlace->district
                    : null;
                return [
                    'id' => $itinerary->id,
                    'day_number' => (int) $itinerary->day_number,
                    'sort_order' => (int) $itinerary->sort_order,
                    'type' => $itinerary->type,
                    'destination_place_id' => $itinerary->destination_place_id,
                    'destination_place' => $destinationPlace ? [
                        'id' => $destinationPlace->id,
                        'destination_id' => $destinationPlace->province_id,
                        'province_id' => $destinationPlace->province_id
                            ?? $destinationPlaceDistrict?->province_id,
                        'province' => $destinationPlaceProvince ? [
                            'id' => $destinationPlaceProvince->id,
                            'name' => $destinationPlaceProvince->name,
                        ] : ($destinationPlaceDistrict?->province ? [
                            'id' => $destinationPlaceDistrict->province->id,
                            'name' => $destinationPlaceDistrict->province->name,
                        ] : null),
                        'activity_types' => $destinationPlace->activity_types,
                        'name' => $destinationPlace->name,
                        'district_name' => $destinationPlaceDistrict?->name ?? $destinationPlace->district_name,
                        'province_city' => $destinationPlaceProvince?->name
                            ?? $destinationPlaceDistrict?->province?->name
                            ?? null,
                        'district' => $destinationPlaceDistrict ? [
                            'id' => $destinationPlaceDistrict->id,
                            'name' => $destinationPlaceDistrict->name,
                            'province' => $destinationPlaceDistrict->province ? ['id' => $destinationPlaceDistrict->province->id, 'name' => $destinationPlaceDistrict->province->name] : null,
                        ] : null,
                        'address' => $destinationPlace->address,
                        'description' => $destinationPlace->description,
                        'thumbnail_url' => $destinationPlace->thumbnail_url,
                    ] : null,
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

            'province_id' => $this->province_id,
            'province' => $province ? [
                'id' => $province->id,
                'name' => $province->name,
                'slug' => $province->slug,
                'code' => $province->code,
            ] : null,

            // Alias response cũ để các consumer đang hiển thị "điểm đến"
            // vẫn hoạt động trong giai đoạn chuyển sang tỉnh/thành.
            'destination_id' => $this->province_id,
            'destination' => $province?->name,
            'destination_name' => $province?->name,
            'destination_info' => $province ? [
                'id' => $province->id,
                'name' => $province->name,
                'slug' => $province->slug,
                'province_city' => $province->name,
                'country' => 'Việt Nam',
                'description' => null,
                'thumbnail_url' => null,
                'status' => 'active',
            ] : null,

            // Alias mảng cũ; tour hiện chỉ gắn một tỉnh/thành.
            'destinations' => $province ? [[
                'id' => $province->id,
                'name' => $province->name,
                'slug' => $province->slug,
                'province_city' => $province->name,
                'country' => 'Việt Nam',
                'thumbnail_url' => null,
                'sort_order' => 0,
            ]] : [],

            'thumbnail_url' => $thumbnailUrl,
            'image' => $thumbnailUrl,
            'images' => $images,

            'min_departure_price' => $this->resource->getAttribute('min_departure_price') !== null
                ? (float) $this->resource->getAttribute('min_departure_price')
                : (float) ($this->discount_price ?? $this->base_price ?? 0),

            'next_departure_date' => $this->formatDate(
                $this->resource->getAttribute('next_departure_date')
            ),

            'available_departures_count' => (int) (
                $this->resource->getAttribute('available_departures_count') ?? 0
            ),

            'departures' => $departures
                ->map(function ($departure) use ($pricingService) {
                    $basePrice = $pricingService->resolveBasePrice($this->resource, $departure);
                    $discountPrice = $pricingService->resolveDiscountPrice($this->resource, $departure);

                    return [
                        'id' => $departure->id,
                        'tour_id' => $departure->tour_id,
                        'departure_date' => $this->formatDate($departure->departure_date),
                        'return_date' => $this->formatDate($departure->return_date),
                        'departure_location' => $departure->departure_location,
                        'base_price' => $basePrice,
                        'discount_price' => $discountPrice,
                        'price' => $discountPrice ?? $basePrice,
                        'departure_base_price' => $departure->base_price !== null ? (float) $departure->base_price : null,
                        'departure_discount_price' => $departure->discount_price !== null ? (float) $departure->discount_price : null,
                        'legacy_price' => $departure->price !== null ? (float) $departure->price : null,
                        'uses_tour_price' => $departure->base_price === null && $departure->price === null,
                        'total_slots' => (int) $departure->total_slots,
                        'booked_slots' => (int) $departure->booked_slots,
                        'available_slots' => max(
                            0,
                            (int) $departure->total_slots - (int) $departure->booked_slots
                        ),
                        'status' => $departure->status,
                        'current_stage_id' => $departure->current_stage_id,
                    ];
                })
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
            'active_bookings_count' => (int) (
                $this->resource->getAttribute('active_bookings_count') ?? 0
            ),

            'created_at' => $this->formatDateTime($this->created_at),
            'updated_at' => $this->formatDateTime($this->updated_at),
            'deleted_at' => $this->formatDateTime($this->deleted_at),
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
