<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartnerService extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'partner_id',
        'service_name',
        'service_code',
        'service_type',
        'depart_time',
        'arrive_time',
        'origin',
        'destination',
        'vehicle_type',
        'seat_class',
        'operate_days',
        'domestic_booking_hours',
        'international_booking_hours',
        'confirmation_time',
        'amenities',
        'status',
    ];

    protected $casts = [
        'operate_days' => 'array',
        'amenities'    => 'array',
    ];

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }
}
