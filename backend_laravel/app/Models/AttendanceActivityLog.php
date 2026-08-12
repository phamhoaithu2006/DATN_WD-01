<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceActivityLog extends Model
{
    protected $fillable = [
        'attendance_session_id',
        'booking_participant_id',
        'actor_id',
        'action',
        'description',
        'metadata',
    ];

    protected $casts = ['metadata' => 'array'];

    public function session(): BelongsTo { return $this->belongsTo(AttendanceSession::class, 'attendance_session_id'); }
    public function participant(): BelongsTo { return $this->belongsTo(BookingParticipant::class, 'booking_participant_id'); }
    public function actor(): BelongsTo { return $this->belongsTo(User::class, 'actor_id'); }
}
