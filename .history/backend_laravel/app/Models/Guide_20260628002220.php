<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Guide extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'guide_code',
        'certificate_type',
        'experience_years',
        'average_rating',
        'review_count',
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function languages()
    {
        return $this->hasMany(GuideLanguage::class);
    }

        public function languages()
    {
        return $this->belongsToMany(Language::class, 'guide_languages')
            ->withPivot('level_id')
            ->withTimestamps();
    }

    public function experiences()
    {
        return $this->hasMany(GuideExperience::class);
    }
}