<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use RuntimeException;

class VnpayService
{
    private const VERSION = '2.1.0';

    public function isConfigured(): bool
    {
        return $this->merchantCode() !== ''
            && $this->hashSecret() !== ''
            && $this->paymentUrl() !== ''
            && $this->returnUrl() !== '';
    }

    public function createPaymentUrl(Payment $payment, Request $request): string
    {
        $this->ensureConfigured();

        if ($payment->payment_method !== 'vnpay' || ! $payment->expires_at) {
            throw new RuntimeException('Dữ liệu thanh toán VNPAY không hợp lệ.');
        }

        $params = [
            'vnp_Amount' => (string) ((int) round((float) $payment->amount * 100)),
            'vnp_Command' => 'pay',
            'vnp_CreateDate' => now('Asia/Ho_Chi_Minh')->format('YmdHis'),
            'vnp_CurrCode' => 'VND',
            'vnp_ExpireDate' => $payment->expires_at->copy()->setTimezone('Asia/Ho_Chi_Minh')->format('YmdHis'),
            'vnp_IpAddr' => $request->ip() ?: '127.0.0.1',
            'vnp_Locale' => 'vn',
            'vnp_OrderInfo' => "Thanh toan booking {$payment->booking_id}",
            'vnp_OrderType' => 'other',
            'vnp_ReturnUrl' => $this->returnUrl(),
            'vnp_TmnCode' => $this->merchantCode(),
            'vnp_TxnRef' => $this->newTransactionReference($payment),
            'vnp_Version' => self::VERSION,
        ];

        ksort($params);
        $query = $this->buildQuery($params);
        $signature = hash_hmac('sha512', $query, $this->hashSecret());

        return $this->paymentUrl().'?'.$query.'&vnp_SecureHash='.$signature;
    }

    public function verifyResponse(array $params): bool
    {
        $signature = (string) Arr::pull($params, 'vnp_SecureHash', '');
        Arr::forget($params, 'vnp_SecureHashType');

        if ($signature === '' || ($params['vnp_TmnCode'] ?? null) !== $this->merchantCode()) {
            return false;
        }

        $signedParams = collect($params)
            ->filter(fn ($value, string $key) => str_starts_with($key, 'vnp_') && $value !== null && $value !== '')
            ->map(fn ($value) => (string) $value)
            ->all();

        ksort($signedParams);
        $expectedSignature = hash_hmac('sha512', $this->buildQuery($signedParams), $this->hashSecret());

        return hash_equals($expectedSignature, $signature);
    }

    private function buildQuery(array $params): string
    {
        return collect($params)
            ->map(fn ($value, string $key) => urlencode($key).'='.urlencode((string) $value))
            ->implode('&');
    }

    private function newTransactionReference(Payment $payment): string
    {
        return 'P'.$payment->id.'A'.Str::upper(Str::random(20));
    }

    private function ensureConfigured(): void
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('VNPAY Sandbox chưa được cấu hình.');
        }
    }

    private function merchantCode(): string
    {
        return trim((string) env('VNPAY_TMN_CODE'));
    }

    private function hashSecret(): string
    {
        return trim((string) env('VNPAY_HASH_SECRET'));
    }

    private function paymentUrl(): string
    {
        return trim((string) env('VNPAY_PAYMENT_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'));
    }

    private function returnUrl(): string
    {
        return trim((string) env('VNPAY_RETURN_URL'));
    }
}
