<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GuideLanguage extends Model
{
    protected $fillable = [
        'guide_id',
        'language',
        'level',
    ];

    public function guide()
    {
        return $this->belongsTo(Guide::class);
    }
}
