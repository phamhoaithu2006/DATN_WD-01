<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PartnerServiceType extends Model
{
    protected $fillable = ['name', 'slug'];

    public function partners(): HasMany
    {
        return $this->hasMany(Partner::class, 'service_type_id');
    }
}
