<?php

namespace App\Models;

use App\Models\ChatMessage;
use Illuminate\Database\Eloquent\Model;

class ChatConversation extends Model
{
    protected $fillable = ['session_id', 'user_id'];

    public function messages()
    {
        return $this->hasMany(ChatMessage::class);
    }
}
