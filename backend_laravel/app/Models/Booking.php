<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Models\Tour;

class Booking extends Model
{
protected $fillable = [
    // Định danh
    'booking_code', 
    'user_id', 
    
    // Thông tin Tour
    'tour_id', 
    'tour_departure_id', 
    
    // Thông tin giảm giá & Nhân viên
    'promotion_id', 
    'staff_id', 
    
    // Chi tiết đơn hàng
    'number_of_people', 
    'unit_price', 
    'discount_amount', 
    'total_amount', 
    
    // Trạng thái đơn hàng
    'status',           // Ví dụ: confirmed, pending, completed
    'payment_status',   // Ví dụ: unpaid, paid, partially_paid
    
    // Ghi chú & Hủy tour
    'note', 
    'cancel_reason', 
    'cancelled_at'
];

// Khai báo các cột ngày tháng để Laravel tự động xử lý
protected $dates = ['cancelled_at', 'created_at', 'updated_at'];

public function user(): BelongsTo
{
    return $this->belongsTo(User::class);
}

public function tour(): BelongsTo
{
    return $this->belongsTo(Tour::class);
}

public function tourDeparture(): BelongsTo
{
    return $this->belongsTo(TourDeparture::class);
}

public function payment(): HasOne
{
    return $this->hasOne(Payment::class);
}
}
