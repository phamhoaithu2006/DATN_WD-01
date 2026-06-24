<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationDraft extends Model
{
    protected $fillable = [
        'title', 
        'message', 
        'target_type', 
        'target_ids', 
        'status'
    ];

    // Cấu hình để Laravel tự động giải mã JSON thành mảng
    protected $casts = [
        'target_ids' => 'array',
    ];
}
