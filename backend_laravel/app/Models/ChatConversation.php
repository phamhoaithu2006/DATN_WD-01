<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatConversation extends Model
{
    protected $fillable = [
        'session_id',
        'user_id',
        'mode',
        'assigned_staff_id',
        'handoff_requested_at',
        'handoff_closed_at',
        'consecutive_fallback_count',
    ];

    protected $casts = [
        'handoff_requested_at' => 'datetime',
        'handoff_closed_at'    => 'datetime',
    ];

    public function messages()
    {
        return $this->hasMany(ChatMessage::class);
    }

    public function assignedStaff()
    {
        return $this->belongsTo(\App\Models\User::class, 'assigned_staff_id');
    }
}
