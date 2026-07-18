<?php

namespace App\Console\Commands;

use App\Models\Payment;
use App\Services\VnpayPaymentLifecycleService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExpirePendingVnpayPayments extends Command
{
    protected $signature = 'vnpay:expire-pending-payments';

    protected $description = 'Hủy các booking VNPAY chưa thanh toán đã quá hạn giữ chỗ';

    public function handle(VnpayPaymentLifecycleService $paymentLifecycleService): int
    {
        Payment::query()
            ->where('payment_method', 'vnpay')
            ->where('status', 'pending')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->orderBy('id')
            ->select('id')
            ->each(function (Payment $payment) use ($paymentLifecycleService): void {
                DB::transaction(function () use ($payment, $paymentLifecycleService): void {
                    $lockedPayment = Payment::query()->lockForUpdate()->find($payment->id);

                    if (! $lockedPayment || $lockedPayment->status !== 'pending' || ! $lockedPayment->expires_at?->isPast()) {
                        return;
                    }

                    $paymentLifecycleService->failPendingPayment(
                        $lockedPayment,
                        'Booking đã hết hạn thanh toán VNPAY sau 15 phút.'
                    );
                }, 3);
            });

        return self::SUCCESS;
    }
}
