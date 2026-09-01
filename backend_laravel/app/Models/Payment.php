<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Payment extends Model
{
    protected $appends = ['refund_proof_url'];
    protected $fillable = [
        'booking_id',
        'frontend_origin',
        'payment_method',
        'amount',
        'transaction_code',
        'gateway_response',
        'status',
        'paid_at',
        'refund_proof_path',
        'refunded_at',
        'expires_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'gateway_response' => 'array',
        'paid_at' => 'datetime',
        'refunded_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function getRefundProofUrlAttribute(): ?string
    {
        return $this->refund_proof_path
            ? Storage::disk('public')->url($this->refund_proof_path)
            : null;
    }
}
