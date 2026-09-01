<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TourItinerary extends Model
{
    protected $with = ['province'];

    public const ACTIVITY_DEPARTURE = 'departure';

    public const ACTIVITY_TRANSPORT = 'transport';

    public const ACTIVITY_SIGHTSEEING = 'sightseeing';

    public const ACTIVITY_MEAL = 'meal';

    public const ACTIVITY_FREE_TIME = 'free_time';

    public const ACTIVITY_RETURN = 'return';

    public const ACTIVITY_TYPES = [
        self::ACTIVITY_DEPARTURE,
        self::ACTIVITY_TRANSPORT,
        self::ACTIVITY_SIGHTSEEING,
        self::ACTIVITY_MEAL,
        self::ACTIVITY_FREE_TIME,
        self::ACTIVITY_RETURN,
    ];

    protected $fillable = [
        'tour_id',
        'day_number',
        'sort_order',
        'type',
        'province_id',
        'destination_place_id',
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
        'province_id' => 'integer',
        'destination_place_id' => 'integer',
    ];

    public function tour(): BelongsTo
    {
        return $this->belongsTo(Tour::class);
    }

    public function destinationPlace(): BelongsTo
    {
        return $this->belongsTo(DestinationPlace::class);
    }

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(TourItineraryImage::class)->orderBy('sort_order');
    }
}
