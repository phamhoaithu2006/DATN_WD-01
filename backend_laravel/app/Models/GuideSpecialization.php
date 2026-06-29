<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GuideSpecialization extends Model
{
    protected $fillable = ['name', 'description'];

    public function guides()
    {
        return $this->belongsToMany(
            Guide::class,
            'guide_specialization',  // tên bảng pivot
            'specialization_id',     // FK của GuideSpecialization
            'guide_id'               // FK của Guide
        )->withTimestamps();
    }
}
