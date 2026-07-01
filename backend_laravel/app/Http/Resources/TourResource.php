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
            // Giữ nguyên dữ liệu cũ
            'category'    => $this->whenLoaded('category', fn() => optional($this->category)->name),
            'destination' => $this->whenLoaded('destination', fn() => optional($this->destination)->name),

            // Bổ sung thêm field mới để frontend dễ hiển thị tên
            'category_name' => $this->whenLoaded('category', fn() => optional($this->category)->name),
            'destination_name' => $this->whenLoaded('destination', fn() => optional($this->destination)->name),

            // Bổ sung object đầy đủ nếu sau này cần dùng id + name
            'category_info' => $this->whenLoaded('category', function () {
                return $this->category ? [
                    'id' => $this->category->id,
                    'name' => $this->category->name,
                ] : null;
            }),

            'destination_info' => $this->whenLoaded('destination', function () {
                return $this->destination ? [
                    'id' => $this->destination->id,
                    'name' => $this->destination->name,
                ] : null;
            }),
            'departures'  => $this->whenLoaded(
                'departures',
                fn() =>
                TourDepartureResource::collection($this->departures)
            ),
            'thumbnail_url' => $this->thumbnail?->image_url,

            'thumbnail' => $this->thumbnail ? [
                'id' => $this->thumbnail->id,
                'image_url' => $this->thumbnail->image_url,
                'alt_text' => $this->thumbnail->alt_text,
                'sort_order' => $this->thumbnail->sort_order,
                'is_thumbnail' => $this->thumbnail->is_thumbnail,
            ] : null,

            'images' => $this->images?->map(function ($image) {
                return [
                    'id' => $image->id,
                    'image_url' => $image->image_url,
                    'alt_text' => $image->alt_text,
                    'sort_order' => $image->sort_order,
                    'is_thumbnail' => $image->is_thumbnail,
                ];
            })->values(),
        ];
    }
}
