<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\VnpayPaymentLifecycleService;
use App\Services\VnpayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VnpayPaymentController extends Controller
{
    public function __construct(
        private readonly VnpayService $vnpayService,
        private readonly VnpayPaymentLifecycleService $paymentLifecycleService,
    ) {}

    public function status(Request $request, Payment $payment): JsonResponse
    {
        $payment->loadMissing('booking');

        if (
            $payment->payment_method !== 'vnpay'
            || $payment->booking?->user_id !== $request->user()->id
        ) {
            abort(404);
        }

        return $this->paymentStatusResponse($payment);
    }

    public function returnStatus(Request $request): JsonResponse
    {
        if (! $this->vnpayService->isConfigured()) {
            return response()->json([
                'message' => 'VNPAY Sandbox chưa được cấu hình.',
            ], 503);
        }

        $payload = $request->query();

        if (! $this->vnpayService->verifyResponse($payload)) {
            return response()->json([
                'message' => 'Dữ liệu trả về từ VNPAY không hợp lệ.',
            ], 422);
        }

        $paymentId = $this->paymentIdFromPayload($payload);

        if (! $paymentId) {
            return response()->json([
                'message' => 'Không tìm thấy thanh toán VNPAY.',
            ], 404);
        }

        [$code] = $this->processVnpayResponse($paymentId, $payload);

        if ($code === '02') {
            return response()->json([
                'message' => 'Không tìm thấy thanh toán VNPAY.',
            ], 404);
        }

        if ($code === '04') {
            return response()->json([
                'message' => 'Số tiền thanh toán VNPAY không khớp.',
            ], 422);
        }

        $payment = Payment::query()->with('booking')->find($paymentId);

        if (! $payment || ! $payment->booking) {
            return response()->json([
                'message' => 'Không tìm thấy thanh toán VNPAY.',
            ], 404);
        }

        return $this->paymentStatusResponse($payment);
    }

    private function paymentStatusResponse(Payment $payment): JsonResponse
    {
        $payment->loadMissing(['booking.tour', 'booking.tourDeparture']);
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $payment->id,
                'status' => $payment->status,
                'amount' => $payment->amount,
                'transaction_code' => $payment->transaction_code,
                'expires_at' => $payment->expires_at?->toIso8601String(),
                'booking_code' => $payment->booking->booking_code,
                'booking_status' => $payment->booking->status,
                'payment_status' => $payment->booking->payment_status,
                'tour_title' => $payment->booking->tour?->title,
                'departure_date' => $payment->booking->tourDeparture?->departure_date?->toDateString(),
                'number_of_people' => $payment->booking->number_of_people,
            ],
        ]);
    }

    public function ipn(Request $request): JsonResponse
    {
        if (! $this->vnpayService->isConfigured()) {
            return $this->ipnResponse('99', 'VNPAY is not configured');
        }

        $payload = $request->query();

        if (! $this->vnpayService->verifyResponse($payload)) {
            return $this->ipnResponse('97', 'Invalid signature');
        }

        $paymentId = $this->paymentIdFromPayload($payload);

        if (! $paymentId) {
            return $this->ipnResponse('02', 'Order not found');
        }

        $response = $this->processVnpayResponse($paymentId, $payload);

        return $this->ipnResponse(...$response);
    }

    private function paymentIdFromPayload(array $payload): ?int
    {
        $paymentId = filter_var($payload['vnp_TxnRef'] ?? null, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);

        return $paymentId ?: null;
    }

    /**
     * Xử lý chung cho IPN và Return URL đã được xác thực chữ ký.
     * Callback đến sau chỉ đọc trạng thái đã được cập nhật, không xử lý lại.
     */
    private function processVnpayResponse(int $paymentId, array $payload): array
    {
        return DB::transaction(function () use ($paymentId, $payload) {
            $payment = Payment::query()
                ->with('booking')
                ->lockForUpdate()
                ->find($paymentId);

            if (! $payment || $payment->payment_method !== 'vnpay' || ! $payment->booking) {
                return ['02', 'Order not found'];
            }

            $amount = (int) ($payload['vnp_Amount'] ?? 0);
            $expectedAmount = (int) round((float) $payment->amount * 100);

            if ($amount !== $expectedAmount) {
                return ['04', 'Invalid amount'];
            }

            if ($payment->status !== 'pending') {
                return ['01', 'Order already confirmed'];
            }

            if ($payment->expires_at?->isPast()) {
                $this->paymentLifecycleService->failPendingPayment(
                    $payment,
                    'Link thanh toán VNPAY đã hết hạn.',
                    $payload
                );

                return ['00', 'Confirm Success'];
            }

            $isSuccessful = ($payload['vnp_ResponseCode'] ?? null) === '00'
                && ($payload['vnp_TransactionStatus'] ?? null) === '00';

            if (! $isSuccessful) {
                $this->paymentLifecycleService->failPendingPayment(
                    $payment,
                    'Thanh toán VNPAY không thành công hoặc đã bị hủy.',
                    $payload
                );

                return ['00', 'Confirm Success'];
            }

            $payment->update([
                'status' => 'success',
                'transaction_code' => $payload['vnp_TransactionNo'] ?? null,
                'gateway_response' => $payload,
                'paid_at' => now(),
            ]);

            $payment->booking->update([
                'payment_status' => 'paid',
            ]);

            return ['00', 'Confirm Success'];
        }, 3);
    }

    private function ipnResponse(string $code, string $message): JsonResponse
    {
        return response()->json([
            'RspCode' => $code,
            'Message' => $message,
        ]);
    }
}
