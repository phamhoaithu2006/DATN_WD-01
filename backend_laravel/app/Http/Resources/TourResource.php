<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TourResource extends JsonResource
{
    /**
     * Chuyển đổi resource thành mảng (để trả về JSON).
     * * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        return [
            'id'          => $this->id,
            'category_id' => $this->category_id,
            'destination_id' => $this->destination_id,
            'created_by'  => $this->created_by,
            'title'       => $this->title,
            'slug'        => $this->slug,
            'summary'     => $this->summary,
            'description' => $this->description,
            'itinerary'   => TourItineraryResource::collection($this->whenLoaded('itineraries')),
            'duration_days' => $this->duration_days,
            'duration_nights' => $this->duration_nights,
            'base_price' => (float) $this->base_price,
            'discount_price' => $this->discount_price !== null ? (float) $this->discount_price : null,
            'max_slots' => $this->max_slots,
            'available_slots' => $this->available_slots,
            'status' => $this->status,
            'average_rating' => $this->average_rating,
            'review_count' => $this->review_count,
            
            // Kết hợp 2 trường dữ liệu thành một chuỗi hiển thị
            'duration'    => "{$this->duration_days} ngày {$this->duration_nights} đêm",
            
            // Gom nhóm các dữ liệu liên quan để API phản hồi gọn gàng hơn
            'price' => [
                'base'     => (float)$this->base_price,
                'discount' => (float)$this->discount_price,
            ],
            'slots' => [
                'max'       => $this->max_slots,
                'available' => $this->available_slots,
            ],
            'rating' => [
                'average' => $this->average_rating,
                'count'   => $this->review_count,
            ],

            /**
             * Sử dụng whenLoaded:
             * Giúp tránh lỗi "Property access on null" và tối ưu hiệu năng.
             * Chỉ lấy tên (name) nếu quan hệ đã được eager load (thông qua with() ở Controller).
             */
            'category'    => $this->whenLoaded('category', fn() => $this->category->name),
            'destination' => $this->whenLoaded('destination', fn() => $this->destination->name),
            'departures'  => $this->whenLoaded('departures', fn() =>
                TourDepartureResource::collection($this->departures)
            ),
        ];
    }
}
