<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    protected $fillable = [
        'attendance_session_id',
        'booking_participant_id',
        'checked_in_at',
        'checked_in_by',
        'checked_out_at',
        'checked_out_by',
        'status',
        'note',
        'note_updated_by',
    ];

    protected $casts = [
        'checked_in_at' => 'datetime',
        'checked_out_at' => 'datetime',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'attendance_session_id');
    }

    public function bookingParticipant(): BelongsTo
    {
        return $this->belongsTo(BookingParticipant::class);
    }

    public function checkedInBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }

    public function checkedOutBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_out_by');
    }

    public function noteUpdatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'note_updated_by');
    }
}
