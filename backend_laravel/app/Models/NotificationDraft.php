<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes; // Nhập trait này

class NotificationDraft extends Model
{
    use SoftDeletes; // Sử dụng trait

    protected $fillable = ['title', 'message', 'target_type', 'target_ids', 'status'];
    protected $casts = ['target_ids' => 'array'];
}