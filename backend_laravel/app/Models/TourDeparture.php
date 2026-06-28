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
    ];

    /**
     * Các thuộc tính cần được cast sang kiểu dữ liệu tương ứng.
     */
    protected $casts = [
        'departure_date' => 'date',
        'return_date'    => 'date',
        'price'          => 'float',
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
}
