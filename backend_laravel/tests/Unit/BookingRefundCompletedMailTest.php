<?php

use App\Mail\BookingRefundCompletedMail;
use App\Models\Booking;
use App\Models\BookingContact;
use App\Models\User;
use App\Services\BookingRefundEmailService;
use Tests\TestCase;

uses(TestCase::class);

test('email hoàn tiền hiển thị đầy đủ thông tin giao dịch', function () {
    $mail = new BookingRefundCompletedMail([
        'site_name' => 'ViVuGo',
        'recipient_name' => 'Nguyễn Văn A',
        'booking_code' => 'BK-REFUND-001',
        'tour_title' => 'Đà Lạt thành phố ngàn hoa',
        'amount' => '3590000',
        'refunded_at' => '02/09/2026 16:30',
        'transaction_code' => 'VNPAY-123',
    ]);

    $html = $mail->render();

    expect($html)
        ->toContain('Hoàn tiền thành công')
        ->toContain('BK-REFUND-001')
        ->toContain('3.590.000 đ')
        ->toContain('VNPAY-123')
        ->toContain('đã thực hiện hoàn lại số tiền');
});

test('email hoàn tiền ưu tiên email hiện tại của tài khoản thay vì email cũ trong booking', function () {
    $booking = new Booking;
    $booking->setRelation('user', new User(['email' => 'email-moi@example.com']));
    $booking->setRelation('contact', new BookingContact(['contact_email' => 'email-cu@example.com']));

    $recipient = app(BookingRefundEmailService::class)->resolveRecipientEmail($booking);

    expect($recipient)->toBe('email-moi@example.com');
});
