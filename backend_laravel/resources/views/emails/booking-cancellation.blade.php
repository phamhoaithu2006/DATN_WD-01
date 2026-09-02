@php
    $formatCurrency = static fn ($amount): string => number_format((float) ($amount ?? 0), 0, ',', '.') . ' đ';
@endphp
<!doctype html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $cancellation['mail_subject'] ?? 'Thông báo hủy tour' }}</title>
</head>
<body style="margin:0;background:#f1f5f9;color:#0f172a;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:28px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
                    <tr>
                        <td style="background:#9f1239;padding:28px 32px;color:#ffffff;">
                            <div style="font-size:13px;letter-spacing:1.5px;text-transform:uppercase;opacity:.85;">{{ $cancellation['site_name'] ?? 'ViVuGo' }}</div>
                            <div style="font-size:25px;font-weight:700;margin-top:8px;">{{ $cancellation['mail_subject'] ?? 'Thông báo hủy tour' }}</div>
                            <div style="font-size:14px;margin-top:6px;opacity:.9;">Booking {{ $cancellation['booking_code'] ?? '' }}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:30px 32px;">
                            <p style="margin:0 0 16px;">Xin chào <strong>{{ $cancellation['recipient_name'] ?? 'Quý khách' }}</strong>,</p>
                            <p style="margin:0 0 8px;">{{ $cancellation['headline'] ?? 'Thông tin hủy tour của quý khách đã được cập nhật.' }}</p>
                            @if (!empty($cancellation['follow_up_message']))
                                <p style="margin:0 0 22px;">{{ $cancellation['follow_up_message'] }}</p>
                            @else
                                <div style="height:14px;line-height:14px;">&nbsp;</div>
                            @endif

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;margin-bottom:22px;">
                                <tr>
                                    <td colspan="2" style="background:#fff1f2;padding:14px 16px;font-weight:700;color:#9f1239;">Thông tin booking</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 16px;color:#64748b;width:42%;">Tên tour</td>
                                    <td style="padding:10px 16px;font-weight:700;">{{ $cancellation['tour_title'] ?? '—' }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 16px;color:#64748b;">Mã booking</td>
                                    <td style="padding:10px 16px;font-weight:700;">{{ $cancellation['booking_code'] ?? '—' }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 16px;color:#64748b;">Khởi hành</td>
                                    <td style="padding:10px 16px;">{{ $cancellation['departure_date'] ?? 'Chưa xác định' }}</td>
                                </tr>
                                @if (!empty($cancellation['return_date']))
                                    <tr>
                                        <td style="padding:10px 16px;color:#64748b;">Kết thúc</td>
                                        <td style="padding:10px 16px;">{{ $cancellation['return_date'] }}</td>
                                    </tr>
                                @endif
                                @if (!empty($cancellation['departure_location']))
                                    <tr>
                                        <td style="padding:10px 16px;color:#64748b;">Điểm tập trung</td>
                                        <td style="padding:10px 16px;">{{ $cancellation['departure_location'] }}</td>
                                    </tr>
                                @endif
                                <tr>
                                    <td style="padding:10px 16px;color:#64748b;">Số hành khách</td>
                                    <td style="padding:10px 16px;">{{ $cancellation['number_of_people'] ?? 0 }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 16px;color:#64748b;">Tổng giá trị booking</td>
                                    <td style="padding:10px 16px;font-weight:700;">{{ $formatCurrency($cancellation['total_amount'] ?? 0) }}</td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border-radius:12px;margin-bottom:22px;">
                                <tr>
                                    <td style="padding:14px 16px;color:#475569;">Thời điểm hủy</td>
                                    <td align="right" style="padding:14px 16px;">{{ $cancellation['cancelled_at'] ?? 'Chưa xác định' }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:0 16px 14px;color:#475569;">Lý do hủy</td>
                                    <td align="right" style="padding:0 16px 14px;word-break:break-word;">{{ $cancellation['reason'] ?? 'Không có lý do cụ thể.' }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:0 16px 16px;color:#475569;">Trạng thái hoàn tiền</td>
                                    <td align="right" style="padding:0 16px 16px;font-weight:700;color:#9f1239;">{{ $cancellation['refund_status_label'] ?? 'Chưa có thông tin' }}</td>
                                </tr>
                            </table>

                            <p style="margin:0 0 18px;padding:14px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;color:#9a3412;">{{ $cancellation['refund_status_note'] ?? '' }}</p>

                            @if (!empty($cancellation['support_email']) || !empty($cancellation['support_hotline']))
                                <p style="margin:0;color:#475569;">Hỗ trợ: {{ $cancellation['support_email'] ?? '' }}{{ !empty($cancellation['support_email']) && !empty($cancellation['support_hotline']) ? ' | ' : '' }}{{ $cancellation['support_hotline'] ?? '' }}</p>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td style="border-top:1px solid #e2e8f0;padding:18px 32px;color:#64748b;font-size:12px;">Email được gửi tự động từ {{ $cancellation['site_name'] ?? 'ViVuGo' }}. Vui lòng không trả lời trực tiếp email này.</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
