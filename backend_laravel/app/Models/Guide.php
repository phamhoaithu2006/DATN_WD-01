<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Guide extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'guide_code',
        'avatar_url', // ← thêm
        'experience_years',
        'average_rating',
        'review_count',
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function specializations()
    {
        return $this->belongsToMany(
            GuideSpecialization::class,
            'guide_specialization',  // tên bảng pivot
            'guide_id',              // FK của Guide
            'specialization_id'      // FK của GuideSpecialization
        )->withTimestamps();
    }

    public function languages()
    {
        return $this->hasMany(GuideLanguage::class);
    }

    public function guideLanguages()
    {
        return $this->belongsToMany(Language::class, 'guide_languages')
            ->withPivot('level_id')
            ->withTimestamps();
    }

    public function experiences()
    {
        return $this->hasMany(GuideExperience::class);
    }

    public function tourGuideAssignments()
    {
        return $this->hasMany(TourGuideAssignment::class);
    }

    public function assignedDepartures()
    {
        return $this->belongsToMany(
            TourDeparture::class,
            'tour_guide_assignments',
            'guide_id',
            'tour_departure_id'
        )->withPivot('status', 'note')->withTimestamps();
    }

    public function destinations(): BelongsToMany
    {
        return $this->belongsToMany(
            Destination::class,
            'guide_destinations',
            'guide_id',
            'destination_id'
        )->withTimestamps();
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TourGuideAssignment::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
