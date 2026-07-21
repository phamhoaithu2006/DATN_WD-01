<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tour extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'tours';

    protected $fillable = [
        'category_id',
        'destination_id',
        'created_by',
        'title',
        'slug',
        'summary',
        'description',
        'itinerary',
        'duration_days',
        'duration_nights',
        'base_price',
        'discount_price',
        'max_slots',
        'available_slots',
        'status',
        'average_rating',
        'review_count',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'discount_price' => 'decimal:2',
        'max_slots' => 'integer',
        'available_slots' => 'integer',
        'average_rating' => 'decimal:2',
        'review_count' => 'integer',
    ];

    /**
     * Một tour thuộc một danh mục.
     */
    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    /**
     * Điểm đến chính cũ của tour.
     * Dùng cột destination_id trong bảng tours.
     */
    public function destination(): BelongsTo
    {
        return $this->belongsTo(Destination::class, 'destination_id');
    }
    /**
     * Nhiều điểm đến mới của tour.
     * Dùng bảng trung gian tour_destinations.
     */
    // public function destinations(): BelongsToMany
    // {
    //     return $this->belongsToMany(
    //         Destination::class,
    //         'tour_destinations',
    //         'tour_id',
    //         'destination_id',
    //     )
    //         ->withPivot('sort_order')
    //         ->orderBy('tour_destinations.sort_order');
    // }

    public function destinations(): BelongsToMany
    {
        return $this->belongsToMany(
            Destination::class,
            'tour_destinations',
            'tour_id',
            'destination_id'
        )
            ->withPivot('sort_order')
            ->withTimestamps()
            ->orderBy('tour_destinations.sort_order');
    }

    /**
     * Người dùng đã yêu thích tour.
     */
    public function usersWhoLiked(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'wishlists',
            'tour_id',
            'user_id',
        );
    }

    /**
     * Các lịch khởi hành của tour.
     */
    public function departures(): HasMany
    {
        return $this->hasMany(TourDeparture::class, 'tour_id');
    }

    /**
     * Các đơn đặt tour.
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'tour_id');
    }

    /**
     * Quy tắc giá theo độ tuổi.
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'tour_id');
    }

    public function tourReviews(): HasMany
    {
        return $this->hasMany(TourReview::class, 'tour_id');
    }

    public function agePricingRules(): HasMany
    {
        return $this->hasMany(TourAgePricingRule::class, 'tour_id')
            ->orderBy('sort_order')
            ->orderBy('min_age')
            ->orderBy('id');
    }

    /**
     * Lịch trình tour.
     */
    public function itineraries(): HasMany
    {
        return $this->hasMany(TourItinerary::class, 'tour_id')
            ->orderBy('day_number')
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /**
     * Toàn bộ ảnh của tour.
     */
    public function images(): HasMany
    {
        return $this->hasMany(TourImage::class, 'tour_id')
            ->orderByDesc('is_thumbnail')
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /**
     * Ảnh đại diện tour.
     */
    public function thumbnail()
    {
        return $this->hasOne(TourImage::class, 'tour_id')
            ->where('is_thumbnail', 1)
            ->orderBy('sort_order')
            ->orderBy('id');
    }
}
