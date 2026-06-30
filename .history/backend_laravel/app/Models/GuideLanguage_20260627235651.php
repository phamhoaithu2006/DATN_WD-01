<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GuideLanguage extends Model
{
    protected $table = 'guide_languages';

    protected $fillable = [
        'guide_id',
        'language_id',
        'level_id',
    ];

    public function guide()
    {
        return $this->belongsTo(Guide::class);
    }

    public function language()
    {
        return $this->belongsTo(Language::class);
    }

    public function level()
    {
        return $this->belongsTo(LanguageLevel::class, 'level_id');
    }
}