<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TourActivityLog extends Model
{
    public static function record(
        ?int $actorId,
        string $action,
        string $title,
        string $description,
        string $entityType,
        int $entityId,
        array $metadata = []
    ): self {
        return self::query()->create([
            'actor_id' => $actorId,
            'action' => $action,
            'tour_title' => $title,
            'description' => $description,
            'metadata' => array_merge($metadata, [
                'entity_type' => $entityType,
                'entity_id' => $entityId,
            ]),
        ]);
    }

    protected $fillable = [
        'tour_id',
        'actor_id',
        'action',
        'tour_title',
        'description',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function tour(): BelongsTo
    {
        return $this->belongsTo(Tour::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
