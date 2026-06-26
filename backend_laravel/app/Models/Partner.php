<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Partner extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'service_type_id',
        'partner_code',
        'name',
        'contact_person',
        'phone',
        'email',
        'address',
        'website',
        'description',
        'logo_url',
        'average_rating',
        'contract_start',
        'contract_end',
        'is_visible',
        'status',
    ];

    protected $casts = [
        'contract_start' => 'date',
        'contract_end'   => 'date',
        'is_visible'     => 'boolean',
        'average_rating' => 'float',
    ];

    public function serviceType(): BelongsTo
    {
        return $this->belongsTo(PartnerServiceType::class, 'service_type_id');
    }

    public function services(): HasMany
    {
        return $this->hasMany(PartnerService::class);
    }
}
