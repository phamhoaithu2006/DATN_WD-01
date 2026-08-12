<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class District extends Model
{
    protected $fillable = ['province_id', 'name', 'code'];

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    public function destinationPlaces(): HasMany
    {
        return $this->hasMany(DestinationPlace::class);
    }
}
