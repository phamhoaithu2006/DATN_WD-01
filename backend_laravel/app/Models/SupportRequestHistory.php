<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportRequestHistory extends Model
{
    protected $fillable = [
        'support_request_id',
        'actor_id',
        'action',
        'from_status',
        'to_status',
        'description',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    /**
     * Ticket thuộc lịch sử này.
     */
    public function supportRequest()
    {
        return $this->belongsTo(
            SupportRequest::class,
            'support_request_id'
        );
    }

    /**
     * Người thực hiện hành động.
     *
     * Ví dụ:
     * - NVHT tiếp nhận
     * - NVHT chuyển ticket
     * - NVHT hoàn tất
     */
    public function actor()
    {
        return $this->belongsTo(
            User::class,
            'actor_id'
        );
    }
}