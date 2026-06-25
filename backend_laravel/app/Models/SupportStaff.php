<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupportStaff extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'support_staff';

    protected $fillable = [
        'name',
        'email',
        'role',
        'status',
        'performance_rating',
        'hidden_at',
    ];

    protected $casts = [
        'performance_rating' => 'decimal:2',
        'hidden_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];
}