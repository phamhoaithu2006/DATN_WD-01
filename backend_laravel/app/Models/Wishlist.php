<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Model Wishlist đại diện cho bảng 'wishlists'.
 * Việc dùng Model thay vì dùng bảng trung gian thuần túy (Pivot Table)
 * giúp bạn có thể thêm các logic riêng hoặc các cột bổ sung (như ghi chú, ngày thêm).
 */
class Wishlist extends Model
{
    // Chỉ định các cột được phép gán dữ liệu hàng loạt (Mass Assignment)
    protected $fillable = ['user_id', 'tour_id'];

    /**
     * Mối quan hệ ngược lại với Tour.
     * Cho phép truy cập vào thông tin chi tiết của tour từ bản ghi wishlist.
     */
    public function tour() {
        return $this->belongsTo(Tour::class);
    }
    
    /**
     * Mối quan hệ với User.
     * Bạn cũng có thể thêm hàm này để lấy thông tin người dùng sở hữu wishlist này.
     */
    public function user() {
        return $this->belongsTo(User::class);
    }
}