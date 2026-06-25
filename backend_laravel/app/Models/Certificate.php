<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Certificate extends Model
{
    protected $fillable = ['name', 'issued_by'];

    public function guides()
    {
        return $this->belongsToMany(Guide::class, 'guide_experiences')
            ->withPivot('issued_year')
            ->withTimestamps();
    }
}
