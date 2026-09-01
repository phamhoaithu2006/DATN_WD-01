<?php

namespace App\Services;

use App\Jobs\DeliverBookingCancellationEmail;
use App\Models\Booking;
use App\Models\BookingCancellationOutbox;
use App\Models\Setting;
use Illuminate\Support\Facades\Log;

class BookingCancellationEmailService
{
    public const SOURCE_CUSTOMER_DIRECT = 'customer_direct';

    public const SOURCE_CUSTOMER_REQUEST_APPROVED = 'customer_request_approved';

    public const SOURCE_ADMIN_DEPARTURE = 'admin_departure';

    public const SOURCE_ADMIN_BOOKING = 'admin_booking';

    public function enqueueForCancelledBooking(Booking $booking, string $source): ?BookingCancellationOutbox
    {
        $booking = $this->loadBooking($booking);

        if (! $this->isEligible($booking, $source)) {
            return null;
        }

        $recipientEmail = $this->resolveRecipientEmail($booking);

        if ($recipientEmail === null) {
            Log::warning('Bỏ qua email hủy booking vì không có email khách hàng hợp lệ.', [
                'booking_id' => $booking->id,
                'source' => $source,
            ]);

            return null;
        }

        $outbox = BookingCancellationOutbox::query()->firstOrCreate(
            ['booking_id' => $booking->id],
            [
                'recipient_email' => $recipientEmail,
                'payload' => $this->buildPayload($booking, $source),
            ],
        );

        if (! $outbox->processed_at) {
            DeliverBookingCancellationEmail::dispatch($outbox->id)->afterCommit();
        }

        return $outbox;
    }

    private function loadBooking(Booking $booking): ?Booking
    {
        return Booking::query()
            ->with([
                'user:id,full_name,email',
                'tour:id,title',
                'tourDeparture:id,tour_id,departure_date,return_date,departure_location',
                'contact:id,booking_id,contact_name,contact_email',
                'payment:id,booking_id,status,paid_at',
            ])
            ->find($booking->id);
    }

    private function isEligible(?Booking $booking, string $source): bool
    {
        if (! $booking) {
            return false;
        }

        return match ($source) {
            self::SOURCE_ADMIN_DEPARTURE => $booking->status === 'cancelled_by_tour',
            self::SOURCE_ADMIN_BOOKING => $booking->status === 'cancelled',
            self::SOURCE_CUSTOMER_DIRECT,
            self::SOURCE_CUSTOMER_REQUEST_APPROVED => $booking->status === 'cancelled',
            default => false,
        };
    }

    private function resolveRecipientEmail(Booking $booking): ?string
    {
        foreach ([$booking->contact?->contact_email, $booking->user?->email] as $candidate) {
            $email = trim((string) $candidate);

            if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $email;
            }
        }

        return null;
    }

    private function buildPayload(Booking $booking, string $source): array
    {
        $departure = $booking->tourDeparture;
        $refundStatus = $this->resolveRefundStatus($booking);
        $sourceContent = $this->sourceContent($source);

        return [
            'site_name' => $this->siteName(),
            'recipient_name' => $booking->contact?->contact_name
                ?: $booking->user?->full_name
                ?: 'Quý khách',
            'mail_subject' => $sourceContent['mail_subject'],
            'headline' => $sourceContent['headline'],
            'cancellation_source' => $source,
            'booking_code' => $booking->booking_code,
            'tour_title' => $booking->tour?->title ?: 'Tour đã đặt',
            'departure_date' => $this->formatDate($departure?->departure_date),
            'return_date' => $this->formatDate($departure?->return_date),
            'departure_location' => $departure?->departure_location,
            'number_of_people' => (int) $booking->number_of_people,
            'total_amount' => (string) $booking->total_amount,
            'cancelled_at' => $this->formatDateTime($booking->cancelled_at),
            'reason' => trim((string) ($booking->cancel_reason ?: $booking->cancellation_reason))
                ?: 'Không có lý do cụ thể.',
            'refund_status' => $refundStatus['code'],
            'refund_status_label' => $refundStatus['label'],
            'refund_status_note' => $refundStatus['note'],
            'payment_status' => $booking->payment_status,
            'resolution_status' => $booking->resolution_status,
            'support_email' => $this->settingValue('contact_email') ?: config('mail.from.address'),
            'support_hotline' => $this->settingValue('hotline'),
        ];
    }

    private function sourceContent(string $source): array
    {
        return match ($source) {
            self::SOURCE_CUSTOMER_REQUEST_APPROVED => [
                'mail_subject' => 'Yêu cầu hủy tour đã được duyệt',
                'headline' => 'Yêu cầu hủy tour của quý khách đã được ViVuGo duyệt.',
            ],
            self::SOURCE_ADMIN_DEPARTURE => [
                'mail_subject' => 'Thông báo tour bị hủy',
                'headline' => 'Lịch khởi hành của tour đã bị hủy bởi quản trị viên.',
            ],
            self::SOURCE_ADMIN_BOOKING => [
                'mail_subject' => 'Thông báo booking bị hủy',
                'headline' => 'Booking của quý khách đã bị hủy bởi quản trị viên.',
            ],
            default => [
                'mail_subject' => 'Xác nhận hủy tour',
                'headline' => 'Yêu cầu hủy tour của quý khách đã được ghi nhận.',
            ],
        };
    }

    private function resolveRefundStatus(Booking $booking): array
    {
        return match (true) {
            $booking->resolution_status === 'pending_selection' => [
                'code' => 'pending_selection',
                'label' => 'Chờ lựa chọn phương án xử lý',
                'note' => 'Vui lòng mở chi tiết booking để lựa chọn phương án xử lý tiếp theo.',
            ],
            $booking->resolution_status === 'retained_manual' => [
                'code' => 'retained_manual',
                'label' => 'Bảo lưu theo xử lý của ViVuGo',
                'note' => 'Booking được ghi nhận theo phương án bảo lưu đã thống nhất.',
            ],
            $booking->payment_status === 'refund_pending' => [
                'code' => 'refund_pending',
                'label' => 'Đang chờ xử lý hoàn tiền',
                'note' => 'Khoản thanh toán đang được ViVuGo tiếp nhận để xử lý hoàn tiền.',
            ],
            $booking->payment_status === 'refunded' => [
                'code' => 'refunded',
                'label' => 'Đã hoàn tiền',
                'note' => 'Khoản thanh toán của booking đã được hoàn tiền.',
            ],
            in_array($booking->payment_status, ['unpaid', 'failed'], true) => [
                'code' => $booking->payment_status,
                'label' => 'Không phát sinh hoàn tiền',
                'note' => 'Booking chưa phát sinh khoản thanh toán cần hoàn lại.',
            ],
            default => [
                'code' => 'no_refund',
                'label' => 'Chưa phát sinh thông tin hoàn tiền',
                'note' => 'Vui lòng liên hệ ViVuGo nếu cần kiểm tra thêm thông tin thanh toán.',
            ],
        };
    }

    private function formatDate(mixed $value): ?string
    {
        return $value?->format('d/m/Y');
    }

    private function formatDateTime(mixed $value): ?string
    {
        return $value?->format('d/m/Y H:i');
    }

    private function siteName(): string
    {
        return $this->settingValue('site_name') ?: 'ViVuGo';
    }

    private function settingValue(string $key): string
    {
        return trim((string) Setting::valueFor($key));
    }
}
