<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

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
        'contract_end' => 'date',
        'is_visible' => 'boolean',
        'average_rating' => 'float',
    ];

    protected static function booted(): void
    {
        static::created(function (Partner $partner): void {
            if (filled($partner->partner_code)) {
                return;
            }

            $partner->forceFill([
                'partner_code' => 'PTN'.str_pad((string) $partner->id, 4, '0', STR_PAD_LEFT),
            ])->saveQuietly();
        });
    }

    public function serviceType(): BelongsTo
    {
        return $this->belongsTo(ServiceCategory::class, 'service_type_id')->withTrashed();
    }

    public function services(): HasMany
    {
        return $this->hasMany(PartnerService::class);
    }
}
