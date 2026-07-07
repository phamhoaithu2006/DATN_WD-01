<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TourGuideAssignment extends Model
{
    protected $fillable = [
        'tour_departure_id',
        'guide_id',
        'role',
        'status',
        'assigned_by',
        'assigned_at',
        'notes',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
    ];

    /**
     * Lịch khởi hành mà HDV được phân công.
     * Service GuideAssignmentService đang dùng relation này.
     */
    public function departure(): BelongsTo
    {
        return $this->belongsTo(
            TourDeparture::class,
            'tour_departure_id'
        );
    }

    /**
     * Alias giữ tương thích nếu code cũ gọi tourDeparture().
     */
    public function tourDeparture(): BelongsTo
    {
        return $this->departure();
    }

    /**
     * HDV được phân công.
     */
    public function guide(): BelongsTo
    {
        return $this->belongsTo(
            Guide::class,
            'guide_id'
        );
    }

    /**
     * Admin/người đã thực hiện phân công.
     */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'assigned_by'
        );
    }
}