<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TourDepartureStatusHistory extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['tour_departure_id', 'old_status', 'new_status', 'reason'];
}
