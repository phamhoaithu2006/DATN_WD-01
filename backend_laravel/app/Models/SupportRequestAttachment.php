<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportRequestAttachment extends Model
{
    protected $fillable = [
        'support_request_id',
        'original_name',
        'file_path',
        'mime_type',
        'size',
    ];

    protected $appends = ['url'];

    public function supportRequest()
    {
        return $this->belongsTo(SupportRequest::class);
    }

    public function getUrlAttribute(): string
    {
        return asset('storage/' . $this->file_path);
    }
}