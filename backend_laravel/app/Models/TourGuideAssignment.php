<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TourGuideAssignment extends Model
{
    protected $fillable = [
        'guide_id',
        'tour_departure_id',
        'status',
        'note',
    ];

    public function guide()
    {
        return $this->belongsTo(Guide::class);
    }

    public function tourDeparture()
    {
        return $this->belongsTo(TourDeparture::class);
    }
}
