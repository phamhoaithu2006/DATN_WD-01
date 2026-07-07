<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TourDeparture extends Model
{
    protected $table = 'tour_departures';

    protected $fillable = [
        'tour_id',
        'departure_date',
        'return_date',
        'price',
        'total_slots',
        'booked_slots',
        'status',
        'current_stage_id',
    ];

    /**
     * Các thuộc tính cần được cast sang kiểu dữ liệu tương ứng.
     */
    protected $casts = [
        'departure_date' => 'date',
        'return_date' => 'date',
        'price' => 'decimal:2',
        'total_slots' => 'integer',
        'booked_slots' => 'integer',
    ];

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
}
