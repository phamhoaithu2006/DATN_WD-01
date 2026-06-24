<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = ['user_id', 'title', 'message', 'type', 'status', 'data'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}