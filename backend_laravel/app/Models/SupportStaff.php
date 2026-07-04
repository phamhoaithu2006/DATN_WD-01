<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupportStaff extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'support_staff';

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'role',
        'specialization',
        'experience_years',
        'status',
        'performance_rating',
        'hidden_at',
    ];

    protected $casts = [
        'experience_years' => 'integer',
        'performance_rating' => 'decimal:2',
        'hidden_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
