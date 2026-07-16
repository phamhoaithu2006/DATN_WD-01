<?php

namespace App\Http\Resources;

use App\Services\TourPricingService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TourDepartureResource extends JsonResource
{
    /**
     * Chuyển đổi resource thành mảng (để trả về JSON).
     *
     * @param  Request  $request
     * @return array
     */
    public function toArray($request)
    {
        $tour = $this->relationLoaded('tour') ? $this->tour : null;
        $assignedGuides = $this->getAttribute('assigned_guides');
        $pricingService = new TourPricingService;
        $basePrice = $tour ? $pricingService->resolveBasePrice($tour, $this->resource) : (float) ($this->base_price ?? $this->price ?? 0);
        $discountPrice = $tour ? $pricingService->resolveDiscountPrice($tour, $this->resource) : ($this->discount_price !== null ? (float) $this->discount_price : null);
        $salePrice = $discountPrice ?? $basePrice;
        $usesTourPrice = $this->base_price === null && $this->price === null;

        return [
            'id' => $this->id,
            'tour_id' => $this->tour_id,
            'departure_date' => $this->departure_date?->toDateString(),
            'return_date' => $this->return_date?->toDateString(),
            'base_price' => $basePrice,
            'discount_price' => $discountPrice,
            'price' => $salePrice,
            'departure_base_price' => $this->base_price !== null ? (float) $this->base_price : null,
            'departure_discount_price' => $this->discount_price !== null ? (float) $this->discount_price : null,
            'legacy_price' => $this->price !== null ? (float) $this->price : null,
            'uses_tour_price' => $usesTourPrice,
            'total_slots' => $this->total_slots,
            'booked_slots' => $this->booked_slots,
            'available_slots' => max(0, $this->total_slots - $this->booked_slots),
            'status' => $this->status,
            'assigned_guides' => $assignedGuides ?? [],
            'assignment_state' => $this->getAttribute('assignment_state'),
            'schedule_group' => $this->getAttribute('schedule_group'),
            'is_locked' => $this->getAttribute('is_locked'),
            'has_bookings' => $this->getAttribute('has_bookings'),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),

            // Chỉ trả về thông tin cơ bản của tour nếu quan hệ đã được load
            'tour' => $this->whenLoaded('tour', fn () => [
                'id' => $tour->id,
                'title' => $tour->title,
                'slug' => $tour->slug,
                'duration_days' => (int) $tour->duration_days,
                'duration_nights' => (int) $tour->duration_nights,
                'duration' => "{$tour->duration_days} ngày {$tour->duration_nights} đêm",
            ]),
        ];
    }
}
