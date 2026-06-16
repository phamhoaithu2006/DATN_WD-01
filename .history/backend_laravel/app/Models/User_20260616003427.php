<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes, HasApiTokens;

    /**
     * Các thuộc tính được phép gán dữ liệu hàng loạt (Mass Assignment).
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
        'otp',
        'otp_expires_at'
    ];

    /**
     * Các thuộc tính bị ẩn khi trả về JSON.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Định nghĩa kiểu dữ liệu cho các cột.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // --- Relationships ---

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'user_id', 'id');
    }

    public function wishlists() {
    return $this->belongsToMany(Tour::class, 'wishlists', 'user_id', 'tour_id')->withTimestamps();
}
}