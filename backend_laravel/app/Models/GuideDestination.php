<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GuideDestination extends Model
{
    protected $table = 'guide_destinations';

    protected $fillable = [
        'guide_id',
        'destination_id',
    ];

    public function destination(): BelongsTo
    {
        return $this->belongsTo(Destination::class);
    }

    public function guide(): BelongsTo
    {
        return $this->belongsTo(Guide::class);
    }
}
