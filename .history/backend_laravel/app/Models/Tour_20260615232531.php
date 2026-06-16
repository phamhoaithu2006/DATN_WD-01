<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tour extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'tours';

    protected $fillable = [
        'category_id',
        'destination_id',
        'created_by',
        'title',
        'slug',
        'summary',
        'description',
        'itinerary',
        'duration_days',
        'duration_nights',
        'base_price',
        'discount_price',
        'max_slots',
        'available_slots',
        'status',
        'average_rating',
        'review_count',
    ];

    
}