<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    // Số lần hủy tối đa được phép cho MỖI TOUR (không phân biệt lịch khởi hành).
    public const CUSTOMER_CANCELLATION_LIMIT = 2;

    /**
     * Đếm số booking đã hủy của 1 khách hàng cho MỘT tour cụ thể
     * (gộp mọi lịch khởi hành của tour đó lại với nhau).
     */
    public static function customerCancellationCountForTour(int $userId, int $tourId): int
    {
        return static::query()
            ->where('user_id', $userId)
            ->where('tour_id', $tourId)
            ->where('status', 'cancelled')
            ->count();
    }

    protected $fillable = [
        // Định danh
        'booking_code',
        'user_id',

        // Thông tin Tour
        'tour_id',
        'tour_departure_id',
        'source_booking_id',

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
        'cancellation_reason',
        'resolution_status',
        'cancelled_at',
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

    // ─── Bảo vệ state machine (lớp phòng vệ thứ 2, độc lập với check ở Admin\BookingController) ──
    // Admin\BookingController::update() đã chặn completed/paid -> pending ở tầng controller.
    // Guard này đảm bảo dù có endpoint/khu vực nào khác lỡ set status trực tiếp
    // qua Eloquent thì cũng không thể đưa 1 booking completed quay lại pending.
    protected static function booted(): void
    {
        static::updating(function (Booking $booking): void {
            if (
                $booking->isDirty('status')
                && $booking->getOriginal('status') === 'completed'
                && $booking->status === 'pending'
            ) {
                throw new \RuntimeException(
                    'Booking đã hoàn thành (completed) không được phép quay lại trạng thái chờ xác nhận (pending).'
                );
            }
        });
    }

    // Các trạng thái khách hàng còn được phép tự thao tác (hủy / sửa thông tin)
    public function canBeManagedByCustomer(): bool
    {
        return in_array($this->status, ['pending', 'confirmed'], true);
    }

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

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function tourReview(): HasOne
    {
        return $this->hasOne(TourReview::class);
    }

    public function tourDeparture(): BelongsTo
    {
        return $this->belongsTo(TourDeparture::class);
    }

    public function disruptionRequests(): HasMany
    {
        return $this->hasMany(BookingDisruptionRequest::class);
    }
    public function sourceBooking(): BelongsTo
    {
        return $this->belongsTo(self::class, 'source_booking_id');
    }

    public function replacementBookings(): HasMany
    {
        return $this->hasMany(self::class, 'source_booking_id');
    }

    // ─── Scopes cho filter/search ─────────────────────────────────
    public function scopeSearch($query, $keyword)
    {
        return $query->when(
            $keyword,
            fn($q) => $q->where(function ($searchQuery) use ($keyword) {
                $searchQuery
                    ->whereHas('tour', fn($tour) => $tour->where('title', 'like', "%{$keyword}%"))
                    ->orWhereHas('user', fn($user) => $user->where('full_name', 'like', "%{$keyword}%"))
                    ->orWhereHas('contact', fn($contact) => $contact->where('contact_name', 'like', "%{$keyword}%"));
            })
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
            ->when($to, fn($q) => $q->whereDate('created_at', '<=', $to));
    }
}
