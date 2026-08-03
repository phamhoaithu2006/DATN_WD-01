<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingDisruptionRequest;
use App\Models\Notification;
use App\Models\TourDeparture;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingDisruptionResolutionService
{
    public function approve(
        BookingDisruptionRequest $request,
        int $adminId,
        ?string $adminNote = null,
        ?int $targetDepartureId = null,
    ): BookingDisruptionRequest {
        return DB::transaction(function () use ($request, $adminId, $adminNote, $targetDepartureId): BookingDisruptionRequest {
            $lockedRequest = BookingDisruptionRequest::query()
                ->lockForUpdate()
                ->findOrFail($request->id);

            $this->ensurePending($lockedRequest);

            $booking = Booking::query()
                ->lockForUpdate()
                ->findOrFail($lockedRequest->booking_id);

            if (! $booking->canBeManagedByCustomer()) {
                throw ValidationException::withMessages([
                    'booking' => ['Booking không còn ở trạng thái có thể xử lý yêu cầu này.'],
                ]);
            }

            $targetId = $targetDepartureId ?: $lockedRequest->requested_tour_departure_id;

            if ($lockedRequest->type === 'transfer') {
                if (! $targetId) {
                    throw ValidationException::withMessages([
                        'target_tour_departure_id' => ['Vui lòng chọn lịch khởi hành mới khi duyệt đổi lịch.'],
                    ]);
                }

                $this->transferBooking($booking, (int) $targetId, $adminId);
                $lockedRequest->requested_tour_departure_id = $targetId;
                $successMessage = "Đơn {$booking->booking_code} đã được chuyển sang lịch khởi hành mới.";
            } else {
                $resolution = $lockedRequest->type === 'refund'
                    ? 'refund_pending'
                    : 'retained_manual';
                $this->cancelBooking($booking, $adminId, $lockedRequest->type, $resolution);
                $successMessage = $lockedRequest->type === 'refund'
                    ? "Đơn {$booking->booking_code} đã được hủy và chuyển sang chờ hoàn tiền."
                    : "Đơn {$booking->booking_code} đã được hủy và ghi nhận bảo lưu thủ công.";
            }

            $lockedRequest->fill([
                'status' => 'approved',
                'admin_note' => $adminNote,
                'processed_by' => $adminId,
                'processed_at' => now(),
            ])->save();

            $this->notifyCustomer($booking, $lockedRequest, 'approved', $successMessage);

            return $lockedRequest->fresh($this->requestRelations());
        }, 3);
    }

    public function reject(
        BookingDisruptionRequest $request,
        int $adminId,
        string $adminNote,
    ): BookingDisruptionRequest {
        return DB::transaction(function () use ($request, $adminId, $adminNote): BookingDisruptionRequest {
            $lockedRequest = BookingDisruptionRequest::query()
                ->lockForUpdate()
                ->findOrFail($request->id);

            $this->ensurePending($lockedRequest);

            $booking = Booking::query()->findOrFail($lockedRequest->booking_id);
            $lockedRequest->fill([
                'status' => 'rejected',
                'admin_note' => $adminNote,
                'processed_by' => $adminId,
                'processed_at' => now(),
            ])->save();

            $this->notifyCustomer(
                $booking,
                $lockedRequest,
                'rejected',
                "Yêu cầu {$this->typeLabel($lockedRequest->type)} của đơn {$booking->booking_code} chưa được chấp thuận.",
            );

            return $lockedRequest->fresh($this->requestRelations());
        }, 3);
    }

    private function cancelBooking(
        Booking $booking,
        int $adminId,
        string $type,
        string $resolution,
    ): void {
        $oldStatus = $booking->status;
        $sourceDeparture = TourDeparture::query()
            ->lockForUpdate()
            ->find($booking->tour_departure_id);

        if ($booking->slot_committed_at && $sourceDeparture) {
            $sourceDeparture->booked_slots = max(
                0,
                (int) $sourceDeparture->booked_slots - (int) $booking->number_of_people,
            );
            $sourceDeparture->save();
        }

        $reason = $type === 'refund'
            ? 'Admin duyệt yêu cầu hủy booking và hoàn tiền.'
            : 'Admin duyệt yêu cầu hủy booking và ghi nhận bảo lưu thủ công.';

        $booking->fill([
            'status' => 'cancelled',
            'payment_status' => $type === 'refund' && $booking->payment_status === 'paid'
                ? 'refund_pending'
                : $booking->payment_status,
            'cancel_reason' => $reason,
            'cancellation_reason' => $reason,
            'resolution_status' => $resolution,
            'cancelled_at' => now(),
            'slot_committed_at' => null,
        ])->save();

        $booking->statusHistories()->create([
            'changed_by' => $adminId,
            'old_status' => $oldStatus,
            'new_status' => 'cancelled',
            'note' => $reason,
        ]);
    }

    private function transferBooking(Booking $booking, int $targetDepartureId, int $adminId): void
    {
        $sourceDepartureId = (int) $booking->tour_departure_id;

        if ($sourceDepartureId === $targetDepartureId) {
            throw ValidationException::withMessages([
                'target_tour_departure_id' => ['Lịch khởi hành mới phải khác lịch hiện tại.'],
            ]);
        }

        $departureIds = [$sourceDepartureId, $targetDepartureId];
        sort($departureIds);

        $departures = TourDeparture::query()
            ->whereIn('id', $departureIds)
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        $sourceDeparture = $departures->get($sourceDepartureId);
        $targetDeparture = $departures->get($targetDepartureId);

        if (! $sourceDeparture || ! $targetDeparture) {
            throw ValidationException::withMessages([
                'target_tour_departure_id' => ['Không tìm thấy lịch khởi hành được chọn.'],
            ]);
        }

        if ((int) $targetDeparture->tour_id !== (int) $booking->tour_id) {
            throw ValidationException::withMessages([
                'target_tour_departure_id' => ['Chỉ được chuyển booking sang lịch của cùng tour.'],
            ]);
        }

        if ($targetDeparture->status !== 'open' || ! $targetDeparture->departure_date->isFuture()) {
            throw ValidationException::withMessages([
                'target_tour_departure_id' => ['Lịch khởi hành mới phải đang mở và chưa đến ngày khởi hành.'],
            ]);
        }

        $people = (int) $booking->number_of_people;
        $availableSlots = (int) $targetDeparture->total_slots - (int) $targetDeparture->booked_slots;

        if ($availableSlots < $people) {
            throw ValidationException::withMessages([
                'target_tour_departure_id' => ["Lịch khởi hành mới chỉ còn {$availableSlots} chỗ trống."],
            ]);
        }

        if ($booking->slot_committed_at) {
            $sourceDeparture->booked_slots = max(
                0,
                (int) $sourceDeparture->booked_slots - $people,
            );
            $targetDeparture->booked_slots = (int) $targetDeparture->booked_slots + $people;
            $sourceDeparture->save();
            $targetDeparture->save();
        }

        $booking->update([
            'tour_departure_id' => $targetDeparture->id,
            'resolution_status' => 'transferred',
        ]);

        $booking->statusHistories()->create([
            'changed_by' => $adminId,
            'old_status' => $booking->status,
            'new_status' => $booking->status,
            'note' => "Đã chuyển lịch khởi hành từ #{$sourceDeparture->id} sang #{$targetDeparture->id}.",
        ]);
    }

    private function ensurePending(BookingDisruptionRequest $request): void
    {
        if ($request->status !== 'pending') {
            throw ValidationException::withMessages([
                'request' => ['Yêu cầu này đã được xử lý trước đó.'],
            ]);
        }
    }

    private function notifyCustomer(
        Booking $booking,
        BookingDisruptionRequest $request,
        string $decision,
        string $message,
    ): void {
        $title = $decision === 'approved'
            ? 'Yêu cầu booking đã được chấp thuận'
            : 'Yêu cầu booking chưa được chấp thuận';

        Notification::query()->create([
            'user_id' => $booking->user_id,
            'title' => $title,
            'message' => $message,
            'type' => 'booking',
            'status' => 'unread',
            'data' => json_encode([
                'booking_id' => $booking->id,
                'booking_code' => $booking->booking_code,
                'disruption_request_id' => $request->id,
                'decision' => $decision,
            ], JSON_UNESCAPED_UNICODE),
        ]);
    }

    private function requestRelations(): array
    {
        return [
            'booking.user:id,full_name,email,phone',
            'booking.tour:id,title,slug',
            'booking.tourDeparture:id,tour_id,departure_date,return_date,status,total_slots,booked_slots',
            'booking.payment',
            'requestedDeparture:id,tour_id,departure_date,return_date,status,total_slots,booked_slots',
            'processedBy:id,full_name,email',
        ];
    }

    private function typeLabel(string $type): string
    {
        return match ($type) {
            'refund' => 'hoàn tiền',
            'retain' => 'bảo lưu',
            'transfer' => 'đổi lịch khởi hành',
            default => 'xử lý booking',
        };
    }
}
