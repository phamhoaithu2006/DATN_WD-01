<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DestinationPlace extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'destination_id',
        'name',
        'slug',
        'district_name',
        'district_id',
        'address',
        'description',
        'thumbnail_url',
        'status',
    ];

    public function destination(): BelongsTo
    {
        return $this->belongsTo(Destination::class);
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function itineraries(): HasMany
    {
        return $this->hasMany(TourItinerary::class);
    }
}
