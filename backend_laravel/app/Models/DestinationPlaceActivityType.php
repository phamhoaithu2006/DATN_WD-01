<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DestinationPlaceActivityType extends Model
{
    protected $fillable = [
        'destination_place_id',
        'activity_type',
    ];

    public function destinationPlace(): BelongsTo
    {
        return $this->belongsTo(DestinationPlace::class);
    }
}
