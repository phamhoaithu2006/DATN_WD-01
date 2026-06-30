<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LanguageLevel extends Model
{
    protected $fillable = ['language_id', 'level_name', 'name', 'level',];

    public function language()
    {
        return $this->belongsTo(Language::class);
    }


    public function guideLanguages()
    {
        return $this->hasMany(GuideLanguage::class, 'level_id');
    }
}
