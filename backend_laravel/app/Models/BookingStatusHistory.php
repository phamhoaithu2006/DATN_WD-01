<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingStatusHistory extends Model
{
    // Bảng có created_at nhưng không có updated_at
    public const UPDATED_AT = null;

    protected $fillable = [
        'booking_id',
        'changed_by',
        'old_status',
        'new_status',
        'note',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}