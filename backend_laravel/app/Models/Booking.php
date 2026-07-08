<?php

namespace App\Models;

use App\Models\BookingContact;
use App\Models\BookingParticipant;
use App\Models\BookingStatusHistory;
use App\Models\Tour;
use App\Models\TourDeparture;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;


class Booking extends Model
{
    protected $fillable = [
        // Định danh
        'booking_code',
        'user_id',

        // Thông tin Tour
        'tour_id',
        'tour_departure_id',

        // Thông tin giảm giá & Nhân viên
        'promotion_id',
        'staff_id',

        // Chi tiết đơn hàng
        'number_of_people',
        'unit_price',
        'discount_amount',
        'total_amount',

        // Trạng thái đơn hàng
        'status',           // Ví dụ: confirmed, pending, completed
        'payment_status',   // Ví dụ: unpaid, paid, partially_paid

        // Ghi chú & Hủy tour
        'note',
        'cancel_reason',
        'cancelled_at'
    ];

    // Khai báo các cột ngày tháng để Laravel tự động xử lý
    // protected $dates = ['cancelled_at', 'created_at', 'updated_at'];
    protected $casts = [
        'number_of_people' => 'integer',
        'unit_price' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'cancelled_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tour(): BelongsTo
    {
        return $this->belongsTo(Tour::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    // ─── Thêm mới bên dưới (không đụng code cũ) ──────────────────
    public function contact(): HasOne
    {
        return $this->hasOne(BookingContact::class);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(BookingParticipant::class);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(BookingStatusHistory::class);
    }


    public function tourDeparture(): BelongsTo
    {
        return $this->belongsTo(TourDeparture::class);
    }

    // ─── Scopes cho filter/search ─────────────────────────────────
    public function scopeSearch($query, $keyword)
    {
        return $query->when(
            $keyword,
            fn($q) =>
            $q->where('booking_code', 'like', "%{$keyword}%")
                ->orWhereHas('user', fn($u) => $u->where('full_name', 'like', "%{$keyword}%"))
                ->orWhereHas(
                    'contact',
                    fn($c) =>
                    $c->where('contact_name', 'like', "%{$keyword}%")
                        ->orWhere('contact_phone', 'like', "%{$keyword}%")
                )
        );
    }

    public function scopeFilterStatus($query, $status)
    {
        return $query->when($status, fn($q) => $q->where('status', $status));
    }

    public function scopeFilterPaymentStatus($query, $paymentStatus)
    {
        return $query->when($paymentStatus, fn($q) => $q->where('payment_status', $paymentStatus));
    }

    public function scopeFilterDate($query, $from, $to)
    {
        return $query
            ->when($from, fn($q) => $q->whereDate('created_at', '>=', $from))
            ->when($to,   fn($q) => $q->whereDate('created_at', '<=', $to));
    }
}
