<?php

namespace App;

use App\Models\Booking;
use App\Models\BookingStatusHistory;
use App\Models\TourDeparture;
use App\Models\TourDepartureStatusHistory;
use App\Models\TourFinalizationOutbox;
use App\Models\TourGuideAssignment;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TourFinalizationService
{
    public const MINIMUM_PARTICIPANTS = 10;

    /**
     * Finalize a departure exactly once. The caller may safely retry this method.
     */
    public function finalize(TourDeparture $departure): ?TourFinalizationOutbox
    {
        return DB::transaction(function () use ($departure): ?TourFinalizationOutbox {
            $lockedDeparture = TourDeparture::query()
                ->with('tour:id,title')
                ->lockForUpdate()
                ->findOrFail($departure->id);

            if ($lockedDeparture->status !== 'open') {
                return null;
            }

            $eligibleBookings = Booking::query()
                ->where('tour_departure_id', $lockedDeparture->id)
                ->where('status', 'confirmed')
                ->where('payment_status', 'paid')
                ->lockForUpdate()
                ->get();
            $participantCount = (int) $eligibleBookings->sum('number_of_people');
            $isConfirmed = $participantCount >= self::MINIMUM_PARTICIPANTS;

            if (! $isConfirmed) {
                $lockedDeparture->update(['status' => 'closed']);
                TourDepartureStatusHistory::query()->create([
                    'tour_departure_id' => $lockedDeparture->id,
                    'old_status' => 'open',
                    'new_status' => 'closed',
                    'reason' => 'awaiting_admin_decision_insufficient_participants',
                ]);

                User::query()
                    ->whereHas('role', fn ($query) => $query->where('name', 'admin'))
                    ->each(function (User $admin) use ($lockedDeparture, $participantCount): void {
                        Notification::query()->create([
                            'user_id' => $admin->id,
                            'title' => 'Lịch khởi hành cần quyết định',
                            'message' => "Tour \"{$lockedDeparture->tour->title}\" chỉ có {$participantCount}/".self::MINIMUM_PARTICIPANTS.' khách tối thiểu. Lịch đã đóng nhận khách và đang chờ admin quyết định.',
                            'type' => 'system',
                            'status' => 'unread',
                            'data' => json_encode([
                                'source' => 'tour_departure',
                                'action' => 'awaiting_admin_decision',
                                'tour_departure_id' => $lockedDeparture->id,
                                'tour_id' => $lockedDeparture->tour_id,
                                'participant_count' => $participantCount,
                            ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                        ]);
                    });

                return null;
            }

            $newStatus = 'confirmed';

            $lockedDeparture->update([
                'status' => $newStatus,
                'cancellation_reason' => $isConfirmed ? null : 'insufficient_participants',
            ]);
            TourDepartureStatusHistory::query()->create([
                'tour_departure_id' => $lockedDeparture->id,
                'old_status' => 'open',
                'new_status' => $newStatus,
                'reason' => $isConfirmed ? 'minimum_participants_met' : 'insufficient_participants',
            ]);

            $affectedBookings = collect();
            $affectedGuideAssignmentIds = collect();
            if (! $isConfirmed) {
                $affectedBookings = Booking::query()
                    ->where('tour_departure_id', $lockedDeparture->id)
                    ->whereNotIn('status', ['cancelled', 'cancelled_by_tour'])
                    ->lockForUpdate()
                    ->get();

                foreach ($affectedBookings as $booking) {
                    $oldStatus = $booking->status;
                    $booking->update([
                        'status' => 'cancelled_by_tour',
                        'cancel_reason' => 'Tour cancelled because there are insufficient participants.',
                        'cancellation_reason' => 'tour_cancelled_insufficient_participants',
                        'resolution_status' => 'pending_selection',
                        'cancelled_at' => now(),
                    ]);
                    BookingStatusHistory::query()->create([
                        'booking_id' => $booking->id,
                        'old_status' => $oldStatus,
                        'new_status' => 'cancelled_by_tour',
                        'note' => 'Tour cancelled: insufficient participants. No customer cancellation fee applies.',
                    ]);
                }

                $affectedGuideAssignmentIds = TourGuideAssignment::query()
                    ->where('tour_departure_id', $lockedDeparture->id)
                    ->whereIn('status', ['assigned', 'confirmed'])
                    ->lockForUpdate()
                    ->pluck('id');

                TourGuideAssignment::query()
                    ->whereKey($affectedGuideAssignmentIds)
                    ->update(['status' => 'cancelled']);
            }

            return TourFinalizationOutbox::query()->create([
                'tour_departure_id' => $lockedDeparture->id,
                'event_type' => $isConfirmed ? 'tour_confirmed' : 'tour_cancelled_insufficient_participants',
                'payload' => [
                    'participant_count' => $participantCount,
                    'affected_booking_count' => $affectedBookings->count(),
                    'affected_guide_assignment_ids' => $affectedGuideAssignmentIds->all(),
                ],
            ]);
        }, 3);
    }

    /** Cancel a confirmed departure only when an administrator explicitly requests it. */
    public function cancelConfirmed(
    TourDeparture $departure,
    string $reason,
    ?int $changedBy = null,
    ?string $customerMessage = null,
    ?string $guideMessage = null
): TourFinalizationOutbox {
    return DB::transaction(function () use (
        $departure,
        $reason,
        $changedBy,
        $customerMessage,
        $guideMessage
    ): TourFinalizationOutbox {

        $lockedDeparture = TourDeparture::query()
            ->with('tour:id,title')
            ->lockForUpdate()
            ->findOrFail($departure->id);

        $currentStatus = strtolower(
            (string) $lockedDeparture->status
        );

        /*
         * Không cho hủy lại lịch đã hủy.
         */
        if (in_array(
            $currentStatus,
            ['cancelled', 'canceled'],
            true
        )) {
            throw ValidationException::withMessages([
                'status' => [
                    'Lịch khởi hành này đã được hủy.'
                ],
            ]);
        }

        /*
         * Không cho hủy lịch đã hoàn thành.
         */
        if ($currentStatus === 'completed') {
            throw ValidationException::withMessages([
                'status' => [
                    'Lịch khởi hành đã hoàn thành nên không thể hủy.'
                ],
            ]);
        }

        /*
         * Chỉ cho phép hủy lịch đang ở trạng thái:
         *
         * open      = Sắp tới
         * confirmed = Đã xác nhận đủ điều kiện khởi hành
         *
         * "confirmed" là trạng thái nội bộ do finalize() tạo ra.
         */
        if (! in_array(
            $currentStatus,
            ['open', 'confirmed'],
            true
        )) {
            throw ValidationException::withMessages([
                'status' => [
                    'Chỉ có thể hủy lịch khởi hành chưa bắt đầu.'
                ],
            ]);
        }

        /*
         * Kiểm tra thời gian thực tế.
         * Không cho hủy khi tour đã đến thời điểm khởi hành.
         */
        $departureTime =
            $lockedDeparture->departure_at
            ?: $lockedDeparture->departure_date;

        if ($departureTime) {
            $startTime = \Carbon\Carbon::parse(
                $departureTime
            );

            if ($startTime->lte(now())) {
                throw ValidationException::withMessages([
                    'status' => [
                        'Tour đã bắt đầu nên không thể hủy lịch.'
                    ],
                ]);
            }
        }

        /*
         * Cập nhật lịch sang Đã hủy.
         */
        $lockedDeparture->update([
            'status' => 'cancelled',
            'cancellation_reason' => $reason,
        ]);

        /*
         * Lưu lịch sử thay đổi trạng thái.
         */
        TourDepartureStatusHistory::query()->create([
            'tour_departure_id' => $lockedDeparture->id,
            'old_status' => $currentStatus,
            'new_status' => 'cancelled',
            'reason' => $reason,
        ]);

        /*
         * Lấy toàn bộ booking còn hiệu lực của lịch.
         */
        $bookings = Booking::query()
            ->where(
                'tour_departure_id',
                $lockedDeparture->id
            )
            ->whereNotIn('status', [
                'cancelled',
                'canceled',
                'cancelled_by_tour',
            ])
            ->lockForUpdate()
            ->get();

        /*
         * Hủy booking của khách.
         */
        foreach ($bookings as $booking) {
            $oldStatus = $booking->status;

            $booking->update([
                'status' => 'cancelled_by_tour',

                'cancel_reason' =>
                    $customerMessage ?: ($reason === 'insufficient_participants'
                        ? 'Tour bị hủy do không đủ số lượng khách tối thiểu.'
                        : (
                            $reason === 'weather_disaster'
                                ? 'Tour bị hủy do điều kiện thời tiết hoặc thiên tai.'
                                : 'Tour bị hủy bởi quản trị viên.'
                        )),

                'cancellation_reason' =>
                    $reason === 'insufficient_participants'
                        ? 'tour_cancelled_insufficient_participants'
                        : 'tour_cancelled_by_administrator',

                /*
                 * Hệ thống hiện tại đang dùng pending_selection.
                 * Khách sẽ xử lý phương án sau khi tour bị hủy.
                 */
                'resolution_status' => 'pending_selection',

                'cancelled_at' => now(),
            ]);

            BookingStatusHistory::query()->create([
                'booking_id' => $booking->id,
                'old_status' => $oldStatus,
                'new_status' => 'cancelled_by_tour',
                'changed_by' => $changedBy,
                'note' => $customerMessage
                    ?: 'Tour bị hủy bởi hệ thống/Admin. Khách không chịu phí hủy.',
            ]);
        }

        /* Giải phóng toàn bộ HDV đang được phân công khỏi lịch đã hủy. */
        $affectedGuideAssignmentIds = TourGuideAssignment::query()
            ->where('tour_departure_id', $lockedDeparture->id)
            ->whereIn('status', ['assigned', 'confirmed'])
            ->lockForUpdate()
            ->pluck('id');

        TourGuideAssignment::query()
            ->whereKey($affectedGuideAssignmentIds)
            ->update(['status' => 'cancelled']);

        /*
         * Tạo Outbox.
         * Job DeliverTourFinalizationOutbox sẽ xử lý
         * thông báo và các tác vụ tiếp theo.
         */
        return TourFinalizationOutbox::query()->create([
            'tour_departure_id' => $lockedDeparture->id,

            'event_type' =>
                $reason === 'insufficient_participants'
                    ? 'tour_cancelled_insufficient_participants'
                    : 'tour_cancelled_admin',

            'payload' => [
                'participant_count' =>
                    (int) $bookings->sum(
                        'number_of_people'
                    ),

                'affected_booking_count' =>
                    $bookings->count(),

                'cancellation_reason' =>
                    $reason,

                'changed_by' =>
                    $changedBy,

                'customer_message' =>
                    $customerMessage,

                'guide_message' =>
                    $guideMessage,

                'tour_title' =>
                    $lockedDeparture->tour?->title,

                'affected_guide_assignment_ids' =>
                    $affectedGuideAssignmentIds->all(),
            ],
        ]);
    }, 3);
}
}
