<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GuideExperience extends Model
{
    protected $fillable = [
        'guide_id',
        'certificate_id',
        'issued_year',
    ];

    public function guide()
    {
        return $this->belongsTo(Guide::class);
    }

    public function certificate()
    {
        return $this->belongsTo(Certificate::class);
    }
}