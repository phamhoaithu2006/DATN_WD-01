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

    /**
 * Lấy danh mục mà đối tượng này thuộc về.
 * Quan hệ: N-1 (N đối tượng thuộc về 1 Category)
 * Mặc định sử dụng khóa ngoại: category_id
 */
public function category() {
    return $this->belongsTo(Category::class);
}

/**
 * Lấy địa điểm (destination) mà đối tượng này thuộc về.
 * Quan hệ: N-1 (N đối tượng thuộc về 1 Destination)
 * Mặc định sử dụng khóa ngoại: destination_id
 */
public function destination() {
    return $this->belongsTo(Destination::class);
}
}