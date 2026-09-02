@php
    $formatCurrency = static fn ($amount): string => number_format((float) ($amount ?? 0), 0, ',', '.') . ' đ';
@endphp
<!doctype html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hoàn tiền thành công</title></head>
<body style="margin:0;background:#f1f5f9;color:#0f172a;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
<tr><td style="background:#047857;padding:28px 32px;color:#fff;"><div style="font-size:13px;letter-spacing:1.5px;text-transform:uppercase;opacity:.85;">{{ $refund['site_name'] ?? 'ViVuGo' }}</div><div style="font-size:25px;font-weight:700;margin-top:8px;">Hoàn tiền thành công</div><div style="font-size:14px;margin-top:6px;opacity:.9;">Booking {{ $refund['booking_code'] ?? '' }}</div></td></tr>
<tr><td style="padding:30px 32px;">
<p style="margin:0 0 16px;">Xin chào <strong>{{ $refund['recipient_name'] ?? 'Quý khách' }}</strong>,</p>
<p style="margin:0 0 22px;">ViVuGo xác nhận đã thực hiện hoàn lại số tiền quý khách đã thanh toán cho booking này.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;margin-bottom:22px;">
<tr><td style="padding:11px 16px;color:#64748b;width:42%;">Tên tour</td><td style="padding:11px 16px;font-weight:700;">{{ $refund['tour_title'] ?? '—' }}</td></tr>
<tr><td style="padding:11px 16px;color:#64748b;">Mã booking</td><td style="padding:11px 16px;font-weight:700;">{{ $refund['booking_code'] ?? '—' }}</td></tr>
<tr><td style="padding:11px 16px;color:#64748b;">Số tiền hoàn</td><td style="padding:11px 16px;font-weight:700;color:#047857;">{{ $formatCurrency($refund['amount'] ?? 0) }}</td></tr>
<tr><td style="padding:11px 16px;color:#64748b;">Thời gian hoàn</td><td style="padding:11px 16px;">{{ $refund['refunded_at'] ?? '—' }}</td></tr>
@if (!empty($refund['transaction_code']))<tr><td style="padding:11px 16px;color:#64748b;">Mã giao dịch</td><td style="padding:11px 16px;">{{ $refund['transaction_code'] }}</td></tr>@endif
</table>
<p style="margin:0 0 18px;padding:14px 16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;color:#065f46;">Vui lòng kiểm tra tài khoản thanh toán. Thời gian tiền hiển thị có thể phụ thuộc vào ngân hàng hoặc đơn vị trung gian thanh toán.</p>
@if (!empty($refund['support_email']) || !empty($refund['support_hotline']))<p style="margin:0;color:#475569;">Hỗ trợ: {{ $refund['support_email'] ?? '' }}{{ !empty($refund['support_email']) && !empty($refund['support_hotline']) ? ' | ' : '' }}{{ $refund['support_hotline'] ?? '' }}</p>@endif
</td></tr>
<tr><td style="border-top:1px solid #e2e8f0;padding:18px 32px;color:#64748b;font-size:12px;">Email được gửi tự động từ {{ $refund['site_name'] ?? 'ViVuGo' }}. Vui lòng không trả lời trực tiếp email này.</td></tr>
</table></td></tr></table></body></html>
