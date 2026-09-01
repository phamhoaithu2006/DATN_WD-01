<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingAuditLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'booking_id',
        'booking_code',
        'actor_id',
        'actor_name',
        'action',
        'status_before',
        'status_after',
        'payment_status_before',
        'payment_status_after',
        'reason',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
