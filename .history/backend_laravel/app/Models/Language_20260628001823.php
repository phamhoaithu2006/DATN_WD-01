<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Language extends Model
{
    protected $fillable = ['name'];

    public function levels()
    {
        return $this->hasMany(LanguageLevel::class);
    }

    public function guides()
    {
        return $this->belongsToMany(Guide::class, 'guide_languages')
            ->withPivot('level_id')
            ->withTimestamps();
    }

    public function languages()
    {
        return $this->belongsToMany(Language::class, 'guide_languages')
            ->withPivot('level_id')
            ->withTimestamps();
    }
}
