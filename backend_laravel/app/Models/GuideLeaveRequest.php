<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class GuideLeaveRequest extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'guide_id',
        'user_id',
        'start_date',
        'end_date',
        'reason',
        'status',
        'admin_note',
        'admin_id',
        'reviewed_at',
        'cancel_reason',
        'cancelled_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'reviewed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function guide()
    {
        return $this->belongsTo(Guide::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function attachments()
    {
        return $this->hasMany(GuideLeaveRequestAttachment::class);
    }

    public function scopeBusy($query)
    {
        return $query->whereIn('status', ['pending', 'approved']);
    }

    public function scopeOverlapping($query, string $from, string $to)
    {
        return $query
            ->whereDate('start_date', '<=', $to)
            ->whereDate('end_date', '>=', $from);
    }
}