<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TourDepartureResource extends JsonResource
{
    /**
     * Chuyển đổi resource thành mảng (để trả về JSON).
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        // Logic Price Fallback: Nếu giá đợt đi (price) là null,
        // hệ thống sẽ trả về giá trị mặc định được lấy từ base_price
        // (hoặc discount_price nếu có) của Tour liên kết.
        $tour = $this->relationLoaded('tour') ? $this->tour : null;

        $price = $this->price;
        if ($price === null && $tour) {
            $price = $tour->discount_price ?? $tour->base_price;
        }

        return [
            'id'             => $this->id,
            'tour_id'        => $this->tour_id,
            'departure_date' => $this->departure_date?->toDateString(),
            'return_date'    => $this->return_date?->toDateString(),
            'price'          => (float) $price,
            'total_slots'    => $this->total_slots,
            'booked_slots'   => $this->booked_slots,
            'available_slots' => $this->total_slots - $this->booked_slots,
            'status'         => $this->status,
            'created_at'     => $this->created_at?->toDateTimeString(),
            'updated_at'     => $this->updated_at?->toDateTimeString(),

            // Chỉ trả về thông tin cơ bản của tour nếu quan hệ đã được load
            'tour' => $this->whenLoaded('tour', fn() => [
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
