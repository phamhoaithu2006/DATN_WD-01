<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class SupportRequestMessageAttachment extends Model
{
    protected $fillable = [
        'support_request_message_id',
        'original_name',
        'file_path',
        'mime_type',
        'size',
    ];

    protected $appends = [
        'url',
    ];

    /**
     * Tin nhắn chứa file này.
     */
    public function message()
    {
        return $this->belongsTo(
            SupportRequestMessage::class,
            'support_request_message_id'
        );
    }

    /**
     * URL public để frontend mở file.
     */
    public function getUrlAttribute(): string
    {
        return asset(
            Storage::disk('public')->url(
                $this->file_path
            )
        );
    }
}