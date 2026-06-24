<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GuideAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'guide_id',
        'tour_departure_id',
        'status',
        'assigned_at',
    ];

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
        ];
    }

    public function guide(): BelongsTo
    {
        return $this->belongsTo(Guide::class);
    }

    public function tourDeparture(): BelongsTo
    {
        return $this->belongsTo(TourDeparture::class);
    }
}
