@php
    $formatCurrency = static fn ($amount): string => number_format((float) ($amount ?? 0), 0, ',', '.') . ' đ';
    $paymentMethodLabels = [
        'vnpay' => 'VNPAY',
        'momo' => 'MoMo',
        'cod' => 'Thanh toán tại quầy',
    ];
@endphp
<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Xác nhận đặt tour</title>
</head>
<body style="margin:0;background:#f1f5f9;color:#0f172a;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:28px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
                    <tr>
                        <td style="background:#0f766e;padding:28px 32px;color:#ffffff;">
                            <div style="font-size:13px;letter-spacing:1.5px;text-transform:uppercase;opacity:.85;">{{ $invoice['site_name'] ?? 'ViVuGo' }}</div>
                            <div style="font-size:25px;font-weight:700;margin-top:8px;">Đặt tour thành công</div>
                            <div style="font-size:14px;margin-top:6px;opacity:.9;">Booking {{ $invoice['booking_code'] ?? '' }} đã được xác nhận.</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:30px 32px;">
                            <p style="margin:0 0 16px;">Xin chào <strong>{{ $invoice['recipient_name'] ?? 'Quý khách' }}</strong>,</p>
                            <p style="margin:0 0 22px;">Cảm ơn quý khách đã đặt tour. Thanh toán của quý khách đã được ghi nhận thành công. Phiếu xác nhận và hóa đơn PDF được đính kèm trong email này.</p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;margin-bottom:22px;">
                                <tr>
                                    <td colspan="2" style="background:#f8fafc;padding:14px 16px;font-weight:700;color:#0f766e;">Thông tin tour</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 16px;color:#64748b;width:42%;">Tên tour</td>
                                    <td style="padding:10px 16px;font-weight:700;">{{ $invoice['tour_title'] ?? '—' }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 16px;color:#64748b;">Khởi hành</td>
                                    <td style="padding:10px 16px;">{{ $invoice['departure_date'] ?? 'Chưa xác định' }}</td>
                                </tr>
                                @if (!empty($invoice['return_date']))
                                    <tr>
                                        <td style="padding:10px 16px;color:#64748b;">Kết thúc</td>
                                        <td style="padding:10px 16px;">{{ $invoice['return_date'] }}</td>
                                    </tr>
                                @endif
                                @if (!empty($invoice['departure_location']))
                                    <tr>
                                        <td style="padding:10px 16px;color:#64748b;">Điểm tập trung</td>
                                        <td style="padding:10px 16px;">{{ $invoice['departure_location'] }}</td>
                                    </tr>
                                @endif
                                <tr>
                                    <td style="padding:10px 16px;color:#64748b;">Số hành khách</td>
                                    <td style="padding:10px 16px;">{{ $invoice['number_of_people'] ?? 0 }}</td>
                                </tr>
                            </table>

                            @if (!empty($invoice['participants']))
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:22px;">
                                    <tr>
                                        <td colspan="2" style="padding:0 0 10px;font-weight:700;">Hành khách</td>
                                    </tr>
                                    @foreach ($invoice['participants'] as $participant)
                                        <tr>
                                            <td style="border-top:1px solid #e2e8f0;padding:9px 0;">{{ $participant['full_name'] ?? '—' }}</td>
                                            <td align="right" style="border-top:1px solid #e2e8f0;padding:9px 0;color:#475569;">{{ $formatCurrency($participant['unit_price'] ?? 0) }}</td>
                                        </tr>
                                    @endforeach
                                </table>
                            @endif

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0fdfa;border-radius:12px;margin-bottom:22px;">
                                <tr>
                                    <td style="padding:14px 16px;color:#475569;">Phương thức thanh toán</td>
                                    <td align="right" style="padding:14px 16px;font-weight:700;">{{ $paymentMethodLabels[$invoice['payment_method'] ?? ''] ?? strtoupper((string) ($invoice['payment_method'] ?? '')) }}</td>
                                </tr>
                                @if (!empty($invoice['transaction_code']))
                                    <tr>
                                        <td style="padding:0 16px 14px;color:#475569;">Mã giao dịch</td>
                                        <td align="right" style="padding:0 16px 14px;">{{ $invoice['transaction_code'] }}</td>
                                    </tr>
                                @endif
                                <tr>
                                    <td style="padding:0 16px 16px;color:#475569;">Tổng thanh toán</td>
                                    <td align="right" style="padding:0 16px 16px;font-size:20px;font-weight:700;color:#0f766e;">{{ $formatCurrency($invoice['total_amount'] ?? 0) }}</td>
                                </tr>
                            </table>

                            <p style="margin:0 0 10px;">Vui lòng giữ lại mã booking <strong>{{ $invoice['booking_code'] ?? '' }}</strong> để được hỗ trợ khi cần.</p>
                            @if (!empty($invoice['contact_phone']))
                                <p style="margin:0 0 4px;color:#475569;">Số điện thoại liên hệ: {{ $invoice['contact_phone'] }}</p>
                            @endif
                            @if (!empty($invoice['support_email']) || !empty($invoice['support_hotline']))
                                <p style="margin:0;color:#475569;">Hỗ trợ: {{ $invoice['support_email'] ?? '' }}{{ !empty($invoice['support_email']) && !empty($invoice['support_hotline']) ? ' | ' : '' }}{{ $invoice['support_hotline'] ?? '' }}</p>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td style="border-top:1px solid #e2e8f0;padding:18px 32px;color:#64748b;font-size:12px;">Email được gửi tự động từ {{ $invoice['site_name'] ?? 'ViVuGo' }}. Vui lòng không trả lời trực tiếp email này.</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
