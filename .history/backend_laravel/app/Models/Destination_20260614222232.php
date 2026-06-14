<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes; // Nếu có dùng xóa mềm

class Destination extends Model
{
    use SoftDeletes; // Kích hoạt xóa mềm (nếu bạn có cột deleted_at)

    // 1. Chỉ định bảng (Nếu tên bảng không phải là dạng số nhiều của model)
    protected $table = 'destinations';

    // 2. Định nghĩa các cột được phép gán dữ liệu (Mass Assignment)
    // Cực kỳ quan trọng để tránh lỗi bảo mật Mass Assignment
    protected $fillable = [
        'name', 
        'slug', 
        'province_city', 
        'country'
    ];

    // 3. Khai báo các cột ngày tháng (nếu cần xử lý định dạng)
    protected $dates = ['deleted_at'];


    protected $fillable = ['name', 'slug', 'province_city', 'country', 'description', 'status'];
}