<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    // app/Models/Booking.php

protected $fillable = [
    'booking_code', 'user_id', 'tour_id', 'tour_departure_id', 
    'promotion_id', 'staff_id', 'number_of_people', 'unit_price', 
    'discount_amount', 'total_amount', 'status', 'payment_status', 'note'
];
}
