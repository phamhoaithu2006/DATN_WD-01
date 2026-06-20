<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes; // Nếu có dùng xóa mềm

class Destination extends Model
{
    use SoftDeletes; // Kích hoạt xóa mềm (nếu bạn có cột deleted_at)

    // 1. Chỉ định bảng (Nếu tên bảng không phải là dạng số nhiều của model)
    protected $table = 'destinations';
    protected $guarded = ['id']; // Mọi cột trừ 'id' đều được phép gán

    // 2. Định nghĩa các cột được phép gán dữ liệu (Mass Assignment)
    // Cực kỳ quan trọng để tránh lỗi bảo mật Mass Assignment
    protected $fillable = [
        'name',
        'slug',
        'province_city',
        'country',
        'description',
        'thumbnail_url',
        'status'
    ];

    // 3. Khai báo các cột ngày tháng (nếu cần xử lý định dạng)
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Lấy danh sách các tour thuộc về danh mục/địa điểm này.
     * Quan hệ: 1-N (1 Category/Destination có nhiều Tour)
     */
    public function tours()
    {
        // hasMany(Model_liên_kết, khóa_ngoại, khóa_chính)
        // Mặc định Laravel sẽ tự hiểu khóa ngoại là category_id hoặc destination_id
        return $this->hasMany(Tour::class);
    }
}
