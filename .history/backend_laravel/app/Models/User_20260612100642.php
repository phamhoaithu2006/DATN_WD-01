<?php

namespace App\Models;

use App\Models\Booking;
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
    // Bảng bookings có cột user_id làm khóa ngoại
    return $this->hasMany(Booking::class, 'user_id', 'id');
}
}

<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;


class User extends Authenticatable
{

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'role_id',
        'name',
        'full_name',
        'email',
        'password',
        'phone',
        'avatar_url',
        'status',
    ];
    
    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password', 
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
}
}