<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LanguageLevel extends Model
{
    protected $fillable = ['language_id', 'level_name'];

    public function language()
    {
        return $this->belongsTo(Language::class);
    }
}
