<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    protected $fillable = ['chat_conversation_id', 'role', 'content', 'is_fallback', 'attachment_url'];

    public function conversation()
    {
        return $this->belongsTo(ChatConversation::class);
    }
}
