<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Province extends Model
{
    protected $fillable = ['name', 'code'];

    public function districts(): HasMany
    {
        return $this->hasMany(District::class)->orderBy('name');
    }

    public function tours(): HasMany
    {
        return $this->hasMany(Tour::class)->orderBy('title');
    }

    public function places(): HasMany
    {
        return $this->hasMany(DestinationPlace::class)->orderBy('name');
    }

    /**
     * Slug dùng cho các liên kết công khai; tỉnh/thành được đồng bộ nên
     * không cần lưu thêm một cột slug riêng.
     */
    public function getSlugAttribute(): string
    {
        return Str::slug($this->name);
    }
}
