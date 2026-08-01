<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TourRefundOutbox extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'tour_refund_outbox';

    protected $fillable = ['booking_id', 'refund_request_id', 'payload', 'processed_at'];

    protected function casts(): array
    {
        return ['payload' => 'array', 'processed_at' => 'datetime'];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}
