<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TourAgePricingRule extends Model
{
    /**
     * Quy tắc giá chuẩn áp dụng cho mọi tour.
     *
     * Giá trị là tỷ lệ phần trăm trên giá người lớn của lịch khởi hành.
     */
    public const STANDARD_RULES = [
        [
            'label' => 'Em bé dưới 2 tuổi',
            'min_age' => 0,
            'max_age' => 1,
            'pricing_type' => 'percentage',
            'price_value' => 0,
            'sort_order' => 0,
            'is_active' => true,
        ],
        [
            'label' => 'Trẻ em 2-11',
            'min_age' => 2,
            'max_age' => 11,
            'pricing_type' => 'percentage',
            'price_value' => 70,
            'sort_order' => 1,
            'is_active' => true,
        ],
        [
            'label' => 'Người lớn từ 12 tuổi',
            'min_age' => 12,
            'max_age' => 120,
            'pricing_type' => 'percentage',
            'price_value' => 100,
            'sort_order' => 2,
            'is_active' => true,
        ],
    ];

    protected $fillable = [
        'tour_id',
        'label',
        'min_age',
        'max_age',
        'pricing_type',
        'price_value',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'min_age' => 'integer',
        'max_age' => 'integer',
        'price_value' => 'float',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function tour(): BelongsTo
    {
        return $this->belongsTo(Tour::class);
    }

    public static function standardDefinitions(): array
    {
        return self::STANDARD_RULES;
    }
}
