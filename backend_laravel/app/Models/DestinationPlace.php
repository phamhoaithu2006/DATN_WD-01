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
        'province_id',
        // Alias tạm thời cho dữ liệu cũ; mutator chuyển sang province_id.
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

    protected $appends = ['activity_types'];

    public function destination(): BelongsTo
    {
        return $this->province();
    }

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function itineraries(): HasMany
    {
        return $this->hasMany(TourItinerary::class);
    }

    public function activityTypeLinks(): HasMany
    {
        return $this->hasMany(DestinationPlaceActivityType::class);
    }

    public function getActivityTypesAttribute(): array
    {
        if (! $this->relationLoaded('activityTypeLinks')) {
            return $this->activityTypeLinks()
                ->pluck('activity_type')
                ->values()
                ->all();
        }

        return $this->activityTypeLinks
            ->pluck('activity_type')
            ->values()
            ->all();
    }

    public function setDestinationIdAttribute($value): void
    {
        $this->attributes['province_id'] = $value;
    }

    public function getDestinationIdAttribute(): ?int
    {
        return $this->province_id === null ? null : (int) $this->province_id;
    }
}
