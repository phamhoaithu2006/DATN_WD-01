<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;

class TourDeparture extends Model
{
    public const CUSTOMER_BOOKING_CUTOFF_DAYS = 3;

    protected $table = 'tour_departures';

    protected $fillable = [
        'tour_id',
        'departure_date',
        'departure_at',
        'return_date',
        'departure_location',
        'price',
        'base_price',
        'discount_price',
        'total_slots',
        'booked_slots',
        'status',
        'cancellation_reason',
        'current_stage_id',
    ];

    /**
     * Các thuộc tính cần được cast sang kiểu dữ liệu tương ứng.
     */
    protected $casts = [
        'departure_date' => 'date',
        'departure_at' => 'datetime',
        'return_date' => 'date',
        'price' => 'decimal:2',
        'base_price' => 'decimal:2',
        'discount_price' => 'decimal:2',
        'total_slots' => 'integer',
        'booked_slots' => 'integer',
    ];

    protected static function booted(): void
    {
        $clearFilterOptionsCache = static fn () => Cache::forget(Tour::FILTER_OPTIONS_CACHE_KEY);

        static::creating(function (self $departure): void {
            if (! $departure->departure_at && $departure->departure_date) {
                $departure->departure_at = $departure->departure_date->copy()->startOfDay();
            }
        });

        static::saved($clearFilterOptionsCache);
        static::deleted($clearFilterOptionsCache);
    }

    /** Ngày cuối cùng không còn được phép nhận booking mới. */
    public static function customerBookingCutoffDate(): \Carbon\Carbon
    {
        return today()->addDays(self::CUSTOMER_BOOKING_CUTOFF_DAYS);
    }

    /**
     * Quan hệ N-1: Một TourDeparture thuộc về một Tour.
     */
    public function tour(): BelongsTo
    {
        return $this->belongsTo(Tour::class);
    }

    /**
     * Quan hệ 1-N: Một TourDeparture có nhiều Booking.
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function tourReviews(): HasMany
    {
        return $this->hasMany(TourReview::class);
    }

    // public function guideAssignments(): HasMany
    // {
    //     return $this->hasMany(TourGuideAssignment::class);
    // }

    public function attendanceSessions(): HasMany
    {
        return $this->hasMany(AttendanceSession::class);
    }

    public function stages(): HasMany
    {
        return $this->hasMany(TourDepartureStage::class)
            ->orderBy('day_number')
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    public function currentStage(): BelongsTo
    {
        return $this->belongsTo(TourDepartureStage::class, 'current_stage_id');
    }

    public function guideAssignments(): HasMany
    {
        return $this->hasMany(
            TourGuideAssignment::class,
            'tour_departure_id'
        );
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(TourDepartureStatusHistory::class);
    }
}
