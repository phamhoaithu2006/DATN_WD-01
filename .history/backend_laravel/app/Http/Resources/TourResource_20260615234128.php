<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
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
        'title'       => $this->title,
        'slug'        => $this->slug,
        'summary'     => $this->summary,
        'description' => $this->description,
        'itinerary'   => $this->itinerary,
        
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
    ];
}
}
