<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingContact extends Model
{
    protected $fillable = [
        'booking_id',
        'contact_name',
        'contact_email',
        'contact_phone',
        'address',
        'special_request',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}
