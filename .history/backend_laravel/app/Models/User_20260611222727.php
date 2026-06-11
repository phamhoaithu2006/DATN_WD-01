<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    /**
     * Mảng $guarded xác định các thuộc tính không được phép gán dữ liệu hàng loạt (mass assignment).
     * Bằng cách để trống mảng này ([]), chúng ta cho phép tất cả các cột trong database 
     * đều có thể được gán dữ liệu (thường dùng trong các hàm create, update).
     */
    protected $guarded = [];
    
    /**
     * Mảng $hidden xác định các thuộc tính sẽ bị ẩn đi khi chuyển đổi Model sang dạng 
     * mảng (Array) hoặc JSON (thường dùng khi trả về dữ liệu API).
     * Chúng ta ẩn các thông tin nhạy cảm như 'password' và 'remember_token'.
     */
    protected $hidden = [
        'password', 
        'remember_token',
    ];

    public function bookings()
{
    // Giả sử 1 User có nhiều Booking thông qua cột user_id
    return $this->hasMany(Booking::class, 'user_id');
}
}