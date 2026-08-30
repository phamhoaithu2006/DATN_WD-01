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
    <style>
        @page { margin: 30px 34px; }
        body { color: #172033; font-family: 'DejaVu Sans', sans-serif; font-size: 11px; line-height: 1.5; }
        .header { border-bottom: 2px solid #0f766e; padding-bottom: 16px; }
        .brand { color: #0f766e; font-size: 18px; font-weight: bold; }
        .document-title { color: #172033; font-size: 22px; font-weight: bold; margin-top: 14px; }
        .muted { color: #64748b; }
        .status { background: #dcfce7; color: #166534; font-size: 10px; font-weight: bold; padding: 5px 9px; }
        .section { margin-top: 20px; }
        .section-title { background: #f0fdfa; border-left: 4px solid #0f766e; color: #0f766e; font-size: 12px; font-weight: bold; padding: 8px 10px; }
        table { border-collapse: collapse; width: 100%; }
        .details td { border-bottom: 1px solid #e2e8f0; padding: 7px 9px; vertical-align: top; }
        .details td:first-child { color: #64748b; width: 35%; }
        .participants th { background: #f8fafc; border-bottom: 1px solid #cbd5e1; color: #475569; font-size: 10px; padding: 8px 7px; text-align: left; }
        .participants td { border-bottom: 1px solid #e2e8f0; padding: 8px 7px; }
        .participants th:last-child, .participants td:last-child { text-align: right; }
        .total { background: #0f766e; color: #ffffff; font-size: 14px; font-weight: bold; }
        .total td { padding: 11px 9px; }
        .footer { border-top: 1px solid #cbd5e1; color: #64748b; font-size: 9px; margin-top: 28px; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <table>
            <tr>
                <td>
                    <div class="brand">{{ $invoice['site_name'] ?? 'ViVuGo' }}</div>
                    <div class="document-title">HÓA ĐƠN ĐẶT TOUR</div>
                    <div class="muted">Mã booking: {{ $invoice['booking_code'] ?? '—' }}</div>
                </td>
                <td style="text-align:right;vertical-align:top;"><span class="status">ĐÃ THANH TOÁN</span></td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Thông tin khách hàng</div>
        <table class="details">
            <tr><td>Người liên hệ</td><td>{{ $invoice['recipient_name'] ?? 'Quý khách' }}</td></tr>
            @if (!empty($invoice['contact_phone']))
                <tr><td>Số điện thoại</td><td>{{ $invoice['contact_phone'] }}</td></tr>
            @endif
        </table>
    </div>

    <div class="section">
        <div class="section-title">Thông tin tour</div>
        <table class="details">
            <tr><td>Tên tour</td><td><strong>{{ $invoice['tour_title'] ?? '—' }}</strong></td></tr>
            <tr><td>Ngày khởi hành</td><td>{{ $invoice['departure_date'] ?? 'Chưa xác định' }}</td></tr>
            @if (!empty($invoice['return_date']))
                <tr><td>Ngày kết thúc</td><td>{{ $invoice['return_date'] }}</td></tr>
            @endif
            @if (!empty($invoice['departure_location']))
                <tr><td>Điểm tập trung</td><td>{{ $invoice['departure_location'] }}</td></tr>
            @endif
            <tr><td>Số hành khách</td><td>{{ $invoice['number_of_people'] ?? 0 }}</td></tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Chi tiết hành khách</div>
        <table class="participants">
            <thead>
                <tr><th>#</th><th>Họ và tên</th><th>Nhóm giá</th><th>Thành tiền</th></tr>
            </thead>
            <tbody>
                @forelse ($invoice['participants'] ?? [] as $index => $participant)
                    <tr>
                        <td>{{ $index + 1 }}</td>
                        <td>{{ $participant['full_name'] ?? '—' }}</td>
                        <td>{{ $participant['pricing_rule_label'] ?? $participant['participant_type'] ?? '—' }}</td>
                        <td>{{ $formatCurrency($participant['unit_price'] ?? 0) }}</td>
                    </tr>
                @empty
                    <tr><td colspan="4" style="text-align:center;">Không có dữ liệu hành khách.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="section">
        <table class="details">
            <tr><td>Phương thức thanh toán</td><td>{{ $paymentMethodLabels[$invoice['payment_method'] ?? ''] ?? strtoupper((string) ($invoice['payment_method'] ?? '')) }}</td></tr>
            @if (!empty($invoice['transaction_code']))
                <tr><td>Mã giao dịch</td><td>{{ $invoice['transaction_code'] }}</td></tr>
            @endif
            @if (!empty($invoice['paid_at']))
                <tr><td>Thời gian thanh toán</td><td>{{ $invoice['paid_at'] }}</td></tr>
            @endif
        </table>
        <table class="total">
            <tr><td>TỔNG THANH TOÁN</td><td style="text-align:right;">{{ $formatCurrency($invoice['total_amount'] ?? 0) }}</td></tr>
        </table>
    </div>

    <div class="footer">
        Tài liệu điện tử xác nhận giao dịch đặt tour. Vui lòng giữ lại mã booking để được hỗ trợ.
        @if (!empty($invoice['support_email']) || !empty($invoice['support_hotline']))
            Liên hệ: {{ $invoice['support_email'] ?? '' }}{{ !empty($invoice['support_email']) && !empty($invoice['support_hotline']) ? ' | ' : '' }}{{ $invoice['support_hotline'] ?? '' }}.
        @endif
    </div>
</body>
</html>
