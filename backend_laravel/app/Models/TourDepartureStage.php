<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TourDepartureStage extends Model
{
    protected $fillable = [
        'tour_departure_id',
        'tour_itinerary_id',
        'day_number',
        'sort_order',
        'type',
        'title',
        'start_time',
        'end_time',
        'status',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'day_number' => 'integer',
        'sort_order' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function tourDeparture(): BelongsTo
    {
        return $this->belongsTo(TourDeparture::class);
    }

    public function itinerary(): BelongsTo
    {
        return $this->belongsTo(TourItinerary::class, 'tour_itinerary_id');
    }
}
