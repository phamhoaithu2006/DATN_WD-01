<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TourItinerary extends Model
{
    protected $fillable = [
        'tour_id',
        'day_number',
        'sort_order',
        'type',
        'title',
        'start_time',
        'end_time',
        'duration',
        'transport',
        'description',
    ];

    protected $casts = [
        'day_number' => 'integer',
        'sort_order' => 'integer',
    ];

    public function tour(): BelongsTo
    {
        return $this->belongsTo(Tour::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(TourItineraryImage::class)->orderBy('sort_order');
    }
}
