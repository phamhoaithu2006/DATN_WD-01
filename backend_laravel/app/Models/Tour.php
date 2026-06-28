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

    /**
     * Quan hệ với User (Nhiều Tour được yêu thích bởi Nhiều User).
     * Sử dụng bảng trung gian là 'wishlists'.
     * * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function usersWhoLiked() {
        // belongsToMany(Model_liên_kết, tên_bảng_trung_gian, khóa_ngoại_của_model_này, khóa_ngoại_của_model_liên_kết)
        return $this->belongsToMany(User::class, 'wishlists', 'tour_id', 'user_id');
    }

    /**
     * Quan hệ 1-N: Một Tour có nhiều TourDeparture (lịch khởi hành).
     */
    public function departures()
    {
        return $this->hasMany(TourDeparture::class);
    }

    /**
     * Quan hệ 1-N: Một Tour có nhiều hoạt động lịch trình.
     */
    public function itineraries()
    {
        return $this->hasMany(TourItinerary::class)
            ->orderBy('day_number')
            ->orderBy('sort_order')
            ->orderBy('id');
    }
}
