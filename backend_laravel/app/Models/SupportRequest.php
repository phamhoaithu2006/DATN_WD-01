<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupportRequest extends Model
{
    protected $fillable = [
        'ticket_code',
        'user_id',
        'full_name',
        'email',
        'phone',
        'category',
        'priority',
        'subject',
        'description',
        'status',

        'assigned_to',
        'started_at',
        'resolved_at',

        /*
        |--------------------------------------------------------------------------
        | WORKFLOW: YÊU CẦU KHÁCH BỔ SUNG
        |--------------------------------------------------------------------------
        */
        'needs_more_info',
        'info_request_message',
        'info_requested_at',

        /*
        |--------------------------------------------------------------------------
        | WORKFLOW: NVHT GỬI ADMIN XỬ LÝ
        |--------------------------------------------------------------------------
        */
        'admin_request_status',
        'admin_request_content',
        'admin_requested_by',
        'admin_requested_at',

        /*
        |--------------------------------------------------------------------------
        | WORKFLOW: ADMIN XÁC NHẬN XỬ LÝ XONG
        |--------------------------------------------------------------------------
        */
        'admin_processed_by',
        'admin_processed_at',

        /*
        |--------------------------------------------------------------------------
        | BADGE CẬP NHẬT CHO KHÁCH
        |--------------------------------------------------------------------------
        */
        'customer_has_unread_update',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'resolved_at' => 'datetime',

        'needs_more_info' => 'boolean',
        'info_requested_at' => 'datetime',

        'admin_requested_at' => 'datetime',
        'admin_processed_at' => 'datetime',

        'customer_has_unread_update' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /*
    |--------------------------------------------------------------------------
    | NHÂN VIÊN HỖ TRỢ ĐANG / ĐÃ PHỤ TRÁCH
    |--------------------------------------------------------------------------
    |
    | Giữ cả 2 tên relation để tương thích với code cũ và code mới.
    |
    */
    public function assignedStaff(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'assigned_to'
        );
    }

    public function assignedTo(): BelongsTo
    {
        return $this->assignedStaff();
    }

    public function adminRequester(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'admin_requested_by'
        );
    }

    public function adminProcessor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'admin_processed_by'
        );
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(
            SupportRequestAttachment::class
        );
    }

    public function messages(): HasMany
    {
        return $this->hasMany(
            SupportRequestMessage::class
        )->orderBy('created_at');
    }

    public function histories(): HasMany
    {
        return $this->hasMany(
            SupportRequestHistory::class
        )->orderBy('created_at');
    }
}