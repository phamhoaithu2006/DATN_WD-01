<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    protected $fillable = [
        'user_id',
        'tour_id',
        'booking_id',
        'guide_id',
        'tour_departure_id',
        'rating',
        'comment',
        'status',
    ];

    protected $attributes = [
        'status' => 'visible',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tour(): BelongsTo
    {
        return $this->belongsTo(Tour::class);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function guide(): BelongsTo
    {
        return $this->belongsTo(Guide::class);
    }

    public function tourDeparture(): BelongsTo
    {
        return $this->belongsTo(TourDeparture::class);
    }

    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('status', 'visible');
    }
}
