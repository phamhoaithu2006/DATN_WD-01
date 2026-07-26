<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mã xác nhận đặt lại mật khẩu</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);">
                    <tr>
                        <td style="background-color: #0f172a; padding: 24px 32px; text-align: center;">
                            <span style="color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">{{ $siteName }}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px;">
                            <h1 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 700;">Đặt lại mật khẩu</h1>
                            <p style="margin: 0 0 16px; color: #334155; font-size: 15px; line-height: 1.6;">
                                Xin chào <strong>{{ $userName }}</strong>,
                            </p>
                            <p style="margin: 0 0 24px; color: #334155; font-size: 15px; line-height: 1.6;">
                                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã xác nhận dưới đây:
                            </p>
                            <div style="background-color: #f0fdfa; border: 1px solid #0d9488; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
                                <span style="color: #0d9488; font-size: 32px; font-weight: 800; letter-spacing: 10px;">{{ $otp }}</span>
                            </div>
                            <p style="margin: 0 0 8px; color: #64748b; font-size: 14px; line-height: 1.6;">
                                Mã có hiệu lực trong <strong>10 phút</strong>.
                            </p>
                            <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8fafc; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <span style="color: #94a3b8; font-size: 12px;">&copy; {{ date('Y') }} {{ $siteName }}. Email được gửi tự động, vui lòng không trả lời.</span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
