<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TourAgePricingRule extends Model
{
    protected $fillable = [
        'tour_id',
        'label',
        'min_age',
        'max_age',
        'pricing_type',
        'price_value',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'min_age' => 'integer',
        'max_age' => 'integer',
        'price_value' => 'float',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function tour(): BelongsTo
    {
        return $this->belongsTo(Tour::class);
    }
}
