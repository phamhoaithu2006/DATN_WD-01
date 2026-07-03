<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BookingParticipant extends Model
{
    protected $fillable = [
        'booking_id',
        'full_name',
        'phone',
        'birth_date',
        'gender',
        'identity_number',
        'participant_type',
    ];

    protected $casts = [
        'birth_date' => 'date',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }
}
