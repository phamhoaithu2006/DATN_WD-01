<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingDisruptionRequest;
use App\Models\Payment;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class BookingRefundService
{
    public function __construct(
        private readonly BookingStatusService $bookingStatusService,
        private readonly VnpayPaymentLifecycleService $paymentLifecycleService,
        private readonly BookingAuditService $bookingAuditService,
        private readonly BookingRefundEmailService $bookingRefundEmailService,
    ) {}

    public function refundDirect(int $paymentId, UploadedFile $proof): Payment
    {
        $storedPath = null;
        $oldPath = null;
        $wasAlreadyRefunded = false;

        try {
            [$payment, $oldPath] = DB::transaction(function () use ($paymentId, $proof, &$storedPath, &$wasAlreadyRefunded): array {
                $payment = Payment::query()
                    ->with(['booking.tour', 'booking.tourDeparture'])
                    ->lockForUpdate()
                    ->findOrFail($paymentId);
                $booking = $payment->booking;

                if (! $booking) {
                    throw ValidationException::withMessages([
                        'booking' => ['Thanh toán này không còn booking liên kết.'],
                    ]);
                }

                $this->bookingStatusService->assertCanRefund($booking);
                $oldBookingStatus = $booking->status;
                $oldPaymentStatus = $booking->payment_status;

                if ($payment->status === 'refunded') {
                    $wasAlreadyRefunded = true;
                    $storedPath = $proof->store('refund-proofs', 'public');
                    $oldPath = $payment->refund_proof_path;
                    $payment->update([
                        'refund_proof_path' => $storedPath,
                        'refunded_at' => $payment->refunded_at ?? now(),
                    ]);
                    $this->bookingAuditService->record($booking, 'refund_proof_replaced', null, [
                        'status_before' => $oldBookingStatus,
                        'status_after' => $booking->status,
                        'payment_status_before' => $oldPaymentStatus,
                        'payment_status_after' => $booking->payment_status,
                    ]);

                    return [$payment->fresh(['booking.user']), $oldPath];
                }

                if ($payment->status !== 'success') {
                    throw ValidationException::withMessages([
                        'status' => ["Không thể hoàn tiền khi giao dịch đang ở trạng thái {$payment->status}."],
                    ]);
                }

                $storedPath = $proof->store('refund-proofs', 'public');
                $payment->update([
                    'status' => 'refunded',
                    'refund_proof_path' => $storedPath,
                    'refunded_at' => now(),
                ]);
                $booking->update(['payment_status' => 'refunded']);
                $this->paymentLifecycleService->releaseCommittedSlots($booking);
                $this->bookingAuditService->record($booking, 'refund_completed', null, [
                    'status_before' => $oldBookingStatus,
                    'status_after' => $booking->status,
                    'payment_status_before' => $oldPaymentStatus,
                    'payment_status_after' => $booking->payment_status,
                ]);

                return [$payment->fresh(['booking.user']), null];
            }, 3);
        } catch (Throwable $exception) {
            if ($storedPath) {
                Storage::disk('public')->delete($storedPath);
            }

            throw $exception;
        }

        if ($oldPath && $oldPath !== $payment->refund_proof_path) {
            Storage::disk('public')->delete($oldPath);
        }

        if (! $wasAlreadyRefunded) {
            $this->bookingRefundEmailService->enqueue($payment);
        }

        return $payment;
    }

    public function refundApprovedRequest(int $requestId, UploadedFile $proof): Payment
    {
        $storedPath = null;

        try {
            $payment = DB::transaction(function () use ($requestId, $proof, &$storedPath): Payment {
                $refundRequest = BookingDisruptionRequest::query()
                    ->lockForUpdate()
                    ->findOrFail($requestId);

                if ($refundRequest->type !== 'refund' || $refundRequest->status !== 'approved') {
                    throw ValidationException::withMessages([
                        'request' => ['Yêu cầu này chưa được duyệt hoàn tiền.'],
                    ]);
                }

                $booking = Booking::query()
                    ->with('payment')
                    ->lockForUpdate()
                    ->findOrFail($refundRequest->booking_id);
                $oldBookingStatus = $booking->status;
                $oldPaymentStatus = $booking->payment_status;
                $payment = Payment::query()
                    ->with('booking.user')
                    ->lockForUpdate()
                    ->where('booking_id', $booking->id)
                    ->first();

                if (! $payment
                    || ! in_array($booking->status, ['cancelled', 'cancelled_by_tour'], true)
                    || $booking->payment_status !== 'refund_pending'
                    || $payment->status !== 'success'
                ) {
                    throw ValidationException::withMessages([
                        'status' => ['Booking này chưa ở trạng thái chờ hoàn tiền hợp lệ.'],
                    ]);
                }

                $storedPath = $proof->store('refund-proofs', 'public');
                $payment->update([
                    'status' => 'refunded',
                    'refund_proof_path' => $storedPath,
                    'refunded_at' => now(),
                ]);
                $booking->update(['payment_status' => 'refunded']);
                $this->paymentLifecycleService->releaseCommittedSlots($booking);
                $this->bookingAuditService->record($booking, 'refund_completed', null, [
                    'status_before' => $oldBookingStatus,
                    'status_after' => $booking->status,
                    'payment_status_before' => $oldPaymentStatus,
                    'payment_status_after' => $booking->payment_status,
                    'metadata' => ['source' => 'approved_disruption_request', 'request_id' => $refundRequest->id],
                ]);

                return $payment->fresh(['booking.user']);
            }, 3);
        } catch (Throwable $exception) {
            if ($storedPath) {
                Storage::disk('public')->delete($storedPath);
            }

            throw $exception;
        }

        $this->bookingRefundEmailService->enqueue($payment);

        return $payment;
    }

    /**
     * Hoàn tiền trực tiếp cho booking đã hủy từ trung tâm hoàn tiền của admin.
     * Luồng này không phụ thuộc vào yêu cầu hủy booking của khách.
     */
    public function refundCancelledBooking(int $bookingId, UploadedFile $proof, ?int $actorId = null): Payment
    {
        $storedPath = null;
        $oldPath = null;
        $wasAlreadyRefunded = false;

        try {
            [$payment, $oldPath] = DB::transaction(function () use ($bookingId, $proof, $actorId, &$storedPath, &$wasAlreadyRefunded): array {
                $booking = Booking::query()
                    ->with(['tour', 'tourDeparture'])
                    ->lockForUpdate()
                    ->findOrFail($bookingId);
                $payment = Payment::query()
                    ->with('booking.user')
                    ->lockForUpdate()
                    ->where('booking_id', $booking->id)
                    ->first();

                if (! $payment || ! in_array($booking->status, ['cancelled', 'cancelled_by_tour'], true)) {
                    throw ValidationException::withMessages([
                        'booking' => ['Chỉ booking đã hủy mới được xử lý tại trung tâm hoàn tiền.'],
                    ]);
                }

                if (! in_array($booking->payment_status, ['refund_pending', 'refunded'], true)
                    || ! in_array($payment->status, ['success', 'refunded'], true)
                ) {
                    throw ValidationException::withMessages([
                        'status' => ['Booking này chưa ở trạng thái chờ hoàn tiền hợp lệ.'],
                    ]);
                }

                $oldBookingStatus = $booking->status;
                $oldPaymentStatus = $booking->payment_status;
                $wasAlreadyRefunded = $payment->status === 'refunded';

                $storedPath = $proof->store('refund-proofs', 'public');
                $oldPath = $payment->refund_proof_path;
                $payment->update([
                    'status' => 'refunded',
                    'refund_proof_path' => $storedPath,
                    'refunded_at' => $payment->refunded_at ?? now(),
                ]);
                $booking->update(['payment_status' => 'refunded']);
                $this->paymentLifecycleService->releaseCommittedSlots($booking);
                $this->bookingAuditService->record(
                    $booking,
                    $wasAlreadyRefunded ? 'refund_proof_replaced' : 'refund_completed',
                    $actorId,
                    [
                        'status_before' => $oldBookingStatus,
                        'status_after' => $booking->status,
                        'payment_status_before' => $oldPaymentStatus,
                        'payment_status_after' => $booking->payment_status,
                    ],
                );

                return [$payment->fresh(['booking.user']), $oldPath];
            }, 3);
        } catch (Throwable $exception) {
            if ($storedPath) {
                Storage::disk('public')->delete($storedPath);
            }

            throw $exception;
        }

        if ($oldPath && $oldPath !== $payment->refund_proof_path) {
            Storage::disk('public')->delete($oldPath);
        }

        if (! $wasAlreadyRefunded) {
            $this->bookingRefundEmailService->enqueue($payment);
        }

        return $payment;
    }

    public function deleteDirectProof(int $paymentId): Payment
    {
        [$payment, $oldPath] = DB::transaction(function () use ($paymentId): array {
            $payment = Payment::query()
                ->with(['booking.tour', 'booking.tourDeparture'])
                ->lockForUpdate()
                ->findOrFail($paymentId);

            if (! $payment->booking) {
                throw ValidationException::withMessages([
                    'booking' => ['Thanh toán này không còn booking liên kết.'],
                ]);
            }

            $this->bookingStatusService->assertCanRefund($payment->booking);
            $booking = $payment->booking;
            $oldBookingStatus = $booking->status;
            $oldPaymentStatus = $booking->payment_status;
            $oldPath = $payment->refund_proof_path;
            $payment->update(['refund_proof_path' => null]);
            $this->bookingAuditService->record($booking, 'refund_proof_removed', null, [
                'status_before' => $oldBookingStatus,
                'status_after' => $booking->status,
                'payment_status_before' => $oldPaymentStatus,
                'payment_status_after' => $booking->payment_status,
            ]);

            return [$payment->fresh(), $oldPath];
        }, 3);

        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return $payment;
    }
}
