<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class GuideLeaveRequestAttachment extends Model
{
    protected $fillable = [
        'guide_leave_request_id',
        'file_path',
        'original_name',
        'mime_type',
        'size_bytes',
    ];

    public function leaveRequest()
    {
        return $this->belongsTo(GuideLeaveRequest::class, 'guide_leave_request_id');
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->file_path);
    }
}