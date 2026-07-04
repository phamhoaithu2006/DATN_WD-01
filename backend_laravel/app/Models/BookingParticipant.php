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
        'unit_price',
        'pricing_rule_label',
        'pricing_type',
        'pricing_value',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'unit_price' => 'float',
        'pricing_value' => 'float',
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
