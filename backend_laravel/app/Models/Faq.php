<?php

namespace App\Models;

use Database\Factories\FaqFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Faq extends Model
{
    /** @use HasFactory<FaqFactory> */
    use HasFactory;

    public const CATEGORY_BOOKING = 'booking';

    public const CATEGORY_PAYMENT = 'payment';

    public const CATEGORY_CANCELLATION_REFUND = 'cancellation-refund';

    public const CATEGORY_BOOKING_CHANGES = 'booking-changes';

    public const CATEGORY_DEPARTURES = 'departures';

    public const CATEGORY_TRANSPORTATION = 'transportation';

    public const CATEGORY_ACCOMMODATION_MEALS = 'accommodation-meals';

    public const CATEGORY_CHILDREN_SENIORS = 'children-seniors';

    public const CATEGORY_DOCUMENTS_LUGGAGE = 'documents-luggage';

    public const CATEGORY_CUSTOMER_SUPPORT = 'customer-support';

    public const CATEGORY_LABELS = [
        self::CATEGORY_BOOKING => 'Đặt tour',
        self::CATEGORY_PAYMENT => 'Thanh toán',
        self::CATEGORY_CANCELLATION_REFUND => 'Hủy tour và hoàn tiền',
        self::CATEGORY_BOOKING_CHANGES => 'Thay đổi thông tin đặt tour',
        self::CATEGORY_DEPARTURES => 'Lịch khởi hành',
        self::CATEGORY_TRANSPORTATION => 'Phương tiện di chuyển',
        self::CATEGORY_ACCOMMODATION_MEALS => 'Khách sạn và ăn uống',
        self::CATEGORY_CHILDREN_SENIORS => 'Trẻ em và người cao tuổi',
        self::CATEGORY_DOCUMENTS_LUGGAGE => 'Giấy tờ và hành lý',
        self::CATEGORY_CUSTOMER_SUPPORT => 'Hỗ trợ khách hàng',
    ];

    protected $fillable = [
        'category',
        'question',
        'answer',
        'keywords',
        'sort_order',
        'is_active',
    ];

    protected $attributes = [
        'sort_order' => 0,
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'keywords' => 'array',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeForCategory(Builder $query, ?string $category): Builder
    {
        return $query->when(
            $category,
            fn (Builder $categoryQuery, string $value): Builder => $categoryQuery->where('category', $value),
        );
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }
}
