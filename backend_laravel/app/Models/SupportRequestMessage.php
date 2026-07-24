<?php

namespace App\Models;

use App\Models\SupportRequestMessageAttachment;
use Illuminate\Database\Eloquent\Model;

class SupportRequestMessage extends Model
{
    protected $fillable = [
        'support_request_id',
        'sender_id',
        'sender_type',
        'message',
    ];

    /**
     * Ticket chứa tin nhắn này.
     */
    public function supportRequest()
    {
        return $this->belongsTo(
            SupportRequest::class,
            'support_request_id'
        );
    }

    /**
     * Người gửi tin nhắn.
     *
     * Có thể là:
     * - customer
     * - support_staff
     */
    public function sender()
    {
        return $this->belongsTo(
            User::class,
            'sender_id'
        );
    }

    /**
     * File đính kèm trong tin nhắn.
     */
    public function attachments()
    {
        return $this->hasMany(
            SupportRequestMessageAttachment::class,
            'support_request_message_id'
        );
    }
}