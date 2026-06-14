<?php

namespace App\Models;

use App\Models\Booking;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;


class User extends Authenticatable
{

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes, HasApiTokens;

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
    // Bảng bookings có cột user_id làm khóa ngoại
    return $this->hasMany(Booking::class, 'user_id', 'id');
}
}