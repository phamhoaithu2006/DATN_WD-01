<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'thumbnail_url',
        'thumbnail_alt_text',
        'status',
    ];

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

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
