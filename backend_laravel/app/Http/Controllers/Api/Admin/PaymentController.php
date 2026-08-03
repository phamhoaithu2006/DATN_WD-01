<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\VnpayPaymentLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    public function __construct(
        private readonly VnpayPaymentLifecycleService $paymentLifecycleService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $payments = Payment::query()
            ->with(['booking.user'])
            ->when($request->status, fn ($query) => $query->where('status', $request->status))
            ->when($request->payment_method, fn ($query) => $query->where('payment_method', $request->payment_method))
            ->when($request->booking_code, function ($query) use ($request) {
                $query->whereHas('booking', fn ($bookingQuery) => $bookingQuery->where('booking_code', $request->booking_code));
            })
            ->latest('id')
            ->get();

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách thanh toán thành công',
            'data' => $payments,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $payment = Payment::with(['booking.user'])->find($id);

        if (! $payment) {
            return $this->notFound();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy chi tiết thanh toán thành công',
            'data' => $payment,
        ]);
    }

    public function confirm(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'transaction_code' => ['sometimes', 'nullable', 'string', 'max:100'],
            'gateway_response' => ['sometimes', 'nullable', 'array'],
        ]);

        return $this->updateStatus($id, 'success', 'paid', [
            'transaction_code' => $validated['transaction_code'] ?? null,
            'gateway_response' => $validated['gateway_response'] ?? null,
            'paid_at' => now(),
        ], 'Xác nhận thanh toán thành công');
    }

    public function fail(int $id): JsonResponse
    {
        return $this->updateStatus($id, 'failed', 'failed', [
            'paid_at' => null,
        ], 'Cập nhật thanh toán thất bại thành công');
    }

    public function refund(int $id): JsonResponse
    {
        return $this->updateStatus($id, 'refunded', 'refunded', [], 'Cập nhật hoàn tiền thành công');
    }

    private function updateStatus(int $id, string $paymentStatus, string $bookingPaymentStatus, array $extraData, string $message): JsonResponse
    {
        $payment = DB::transaction(function () use ($id, $paymentStatus, $bookingPaymentStatus, $extraData) {
            $payment = Payment::query()
                ->with('booking')
                ->lockForUpdate()
                ->find($id);

            if (! $payment) {
                return null;
            }

            $allowedTransitions = [
                'pending' => ['success', 'failed'],
                'failed' => ['success'],
                'success' => ['refunded'],
            ];

            if (! in_array($paymentStatus, $allowedTransitions[$payment->status] ?? [], true)) {
                throw ValidationException::withMessages([
                    'status' => [
                        "Không thể chuyển trạng thái thanh toán từ {$payment->status} sang {$paymentStatus}.",
                    ],
                ]);
            }

            $paymentData = array_filter([
                'status' => $paymentStatus,
                'transaction_code' => $extraData['transaction_code'] ?? $payment->transaction_code,
                'gateway_response' => $extraData['gateway_response'] ?? $payment->gateway_response,
                'paid_at' => array_key_exists('paid_at', $extraData) ? $extraData['paid_at'] : $payment->paid_at,
            ], fn ($value) => $value !== null);

            if (array_key_exists('paid_at', $extraData) && $extraData['paid_at'] === null) {
                $paymentData['paid_at'] = null;
            }

            $payment->update($paymentData);

            if ($payment->booking && $paymentStatus === 'success') {
                $oldBookingStatus = $payment->booking->status;
                $hasCommittedSlots = $this->paymentLifecycleService
                    ->commitSlotsForPaidBooking($payment->booking);

                if ($hasCommittedSlots) {
                    $payment->booking->update([
                        'payment_status' => $bookingPaymentStatus,
                    ]);
                } else {
                    $payment->booking->update([
                        'status' => 'cancelled',
                        'payment_status' => 'refund_pending',
                        'cancel_reason' => VnpayPaymentLifecycleService::SOLD_OUT_AFTER_PAYMENT_REASON,
                        'cancelled_at' => now(),
                    ]);

                    $payment->booking->statusHistories()->create([
                        'changed_by' => null,
                        'old_status' => $oldBookingStatus,
                        'new_status' => 'cancelled',
                        'note' => VnpayPaymentLifecycleService::SOLD_OUT_AFTER_PAYMENT_REASON,
                    ]);
                }
            } elseif ($payment->booking) {
                $payment->booking->update([
                    'payment_status' => $bookingPaymentStatus,
                ]);

                if ($paymentStatus === 'refunded') {
                    $this->paymentLifecycleService->releaseCommittedSlots($payment->booking);
                }
            }

            return $payment->fresh(['booking.user']);
        });

        if (! $payment) {
            return $this->notFound();
        }

        return response()->json([
            'status' => 'success',
            'message' => $message,
            'data' => $payment,
        ]);
    }

    private function notFound(): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => 'Không tìm thấy thanh toán',
        ], 404);
    }
}
