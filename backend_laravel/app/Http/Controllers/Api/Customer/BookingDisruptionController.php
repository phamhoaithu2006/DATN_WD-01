<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingDisruptionRequest extends Model
{
    public const TYPES = ['refund', 'retain', 'transfer'];

    public const STATUSES = ['pending', 'approved', 'rejected'];

    protected $fillable = [
        'booking_id',
        'type',
        'status',
        'reason',
        'requested_tour_departure_id',
        'admin_note',
        'processed_by',
        'processed_at',
    ];

    protected $casts = [
        'processed_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function requestedDeparture(): BelongsTo
    {
        return $this->belongsTo(TourDeparture::class, 'requested_tour_departure_id');
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
