<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TourFinalizationOutbox extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'tour_finalization_outbox';

    protected $fillable = ['tour_departure_id', 'event_type', 'payload', 'processed_at'];

    protected function casts(): array
    {
        return ['payload' => 'array', 'processed_at' => 'datetime'];
    }

    public function departure(): BelongsTo
    {
        return $this->belongsTo(TourDeparture::class, 'tour_departure_id');
    }
}
