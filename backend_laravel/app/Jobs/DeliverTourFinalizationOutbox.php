<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\TourFinalizationOutbox;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class DeliverTourFinalizationOutbox implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    public function __construct(
        public int $outboxId
    ) {
    }

    public function handle(): void
    {
        DB::transaction(function (): void {

            $outbox = TourFinalizationOutbox::query()
                ->lockForUpdate()
                ->find($this->outboxId);

            /*
             * Job đã chạy rồi hoặc outbox không tồn tại
             * thì không xử lý lại.
             */
            if (! $outbox || $outbox->processed_at) {
                return;
            }

            $departure = $outbox
                ->departure()
                ->with([
                    'tour:id,title',

                    'guideAssignments.guide.user',
                ])
                ->firstOrFail();

            $departureAt = $this->formatDepartureDate(
                $departure->departure_at
                    ?? $departure->departure_date
            );

            /*
             * Các event bắt đầu bằng tour_cancelled
             * đều được xem là hủy tour.
             */
            $isCancelled = str_starts_with(
                (string) $outbox->event_type,
                'tour_cancelled'
            );

            $payload = is_array($outbox->payload)
                ? $outbox->payload
                : [];

            $cancellationReason =
                $payload['cancellation_reason']
                ?? $departure->cancellation_reason
                ?? null;

            $reasonLabel = $this->getCancellationReasonLabel(
                $cancellationReason
            );

            /*
             * ==========================================================
             * BOOKING BỊ ẢNH HƯỞNG
             * ==========================================================
             */

            $bookingQuery = DB::table('bookings')
                ->where(
                    'tour_departure_id',
                    $departure->id
                );

            /*
             * Khi tour bị hủy, TourFinalizationService
             * đã chuyển booking sang cancelled_by_tour.
             */
            if ($isCancelled) {
                $bookingQuery->where(
                    'status',
                    'cancelled_by_tour'
                );
            }

            $customerRows = $bookingQuery
                ->get([
                    'id',
                    'user_id',
                    'booking_code',
                ]);

            /*
             * ==========================================================
             * THÔNG BÁO KHÁCH HÀNG
             * ==========================================================
             */

            foreach ($customerRows as $booking) {

                if (! $booking->user_id) {
                    continue;
                }

                if ($isCancelled) {

                    $customCustomerMessage = trim((string) ($payload['customer_message'] ?? ''));

                    $message = $customCustomerMessage !== ''
                        ? $customCustomerMessage
                        :
                        "Chúng tôi rất tiếc, tour "
                        . "\"{$departure->tour->title}\" "
                        . "dự kiến khởi hành vào {$departureAt} "
                        . "đã bị hủy.\n\n"
                        . "Lý do: {$reasonLabel}.\n\n"
                        . "Mã booking: {$booking->booking_code}\n\n";

                    /*
                     * Trường hợp không đủ khách.
                     */
                    if (
                        $cancellationReason
                        === 'insufficient_participants'
                    ) {
                        $message .=
                            "Số lượng khách đăng ký không đủ "
                            . "mức tối thiểu 10 khách để triển khai tour.\n\n";
                    }

                    $message .=
                        "Booking của quý khách đã được chuyển "
                        . "sang trạng thái Đã hủy.\n\n"
                        . "Vui lòng truy cập chi tiết booking "
                        . "để lựa chọn phương án xử lý.";

                    $this->notify(
                        (int) $booking->user_id,

                        'Tour đã bị hủy',

                        $message,

                        [
                            'source' => 'tour_departure',

                            'action' => 'tour_cancelled',

                            'tour_departure_id' =>
                                $departure->id,

                            'tour_id' =>
                                $departure->tour_id,

                            'tour_title' =>
                                $departure->tour->title,

                            'booking_id' =>
                                $booking->id,

                            'booking_code' =>
                                $booking->booking_code,

                            'cancellation_reason' =>
                                $cancellationReason,

                            'resolution_status' =>
                                'pending_selection',
                        ]
                    );

                    continue;
                }

                $message =
                    "Tour \"{$departure->tour->title}\" sắp đến ngày khởi hành {$departureAt}. "
                    . "Lịch đã đủ điều kiện vận hành, quý khách vui lòng chuẩn bị cho chuyến đi.";

                $this->notify(
                    (int) $booking->user_id,

                    'Tour sắp đến ngày khởi hành',

                    $message,

                    [
                        'source' => 'tour_departure',

                        'action' => 'tour_departure_upcoming',

                        'tour_departure_id' =>
                            $departure->id,

                        'tour_id' =>
                            $departure->tour_id,

                        'booking_id' =>
                            $booking->id,
                    ]
                );
            }

            /*
             * ==========================================================
             * THÔNG BÁO ADMIN
             * Đồng thời dùng làm LỊCH SỬ THAO TÁC
             * ==========================================================
             */

            if ($isCancelled) {

                $participantCount = (int) (
                    $payload['participant_count']
                    ?? 0
                );

                $affectedBookingCount = (int) (
                    $payload['affected_booking_count']
                    ?? $customerRows->count()
                );

                $adminMessage =
                    "Lịch khởi hành của tour "
                    . "\"{$departure->tour->title}\" "
                    . "đã bị hủy.\n\n"
                    . "Ngày khởi hành: {$departureAt}\n"
                    . "Lý do: {$reasonLabel}\n"
                    . "Số khách hiện tại: {$participantCount}\n"
                    . "Số booking bị ảnh hưởng: "
                    . "{$affectedBookingCount}.";

                $adminTitle =
                    'Đã hủy lịch khởi hành';

            } else {

                $participantCount = (int) (
                    $payload['participant_count']
                    ?? 0
                );

                $adminMessage =
                    "Tour \"{$departure->tour->title}\" "
                    . "khởi hành vào {$departureAt} "
                    . "đã được xác nhận với "
                    . "{$participantCount} khách hợp lệ.";

                $adminTitle =
                    'Tour đã được xác nhận';
            }

            User::query()
                ->whereHas(
                    'role',
                    fn ($query) =>
                        $query->where('name', 'admin')
                )
                ->each(
                    function (User $admin) use (
                        $adminMessage,
                        $adminTitle,
                        $departure,
                        $outbox,
                        $isCancelled,
                        $cancellationReason
                    ): void {

                        $this->notify(
                            $admin->id,

                            $adminTitle,

                            $adminMessage,

                            [
                                /*
                                 * QUAN TRỌNG:
                                 * frontend Lịch sử thao tác đang
                                 * lọc source = tour_departure.
                                 */
                                'source' =>
                                    'tour_departure',

                                'action' =>
                                    $isCancelled
                                        ? 'cancelled'
                                        : 'confirmed',

                                'event_type' =>
                                    $outbox->event_type,

                                'tour_departure_id' =>
                                    $departure->id,

                                'tour_id' =>
                                    $departure->tour_id,

                                'tour_title' =>
                                    $departure->tour->title,

                                'cancellation_reason' =>
                                    $cancellationReason,

                                'tour_detail_url' =>
                                    "/admin/tours/departures/"
                                    . $departure->id,

                                'booking_list_url' =>
                                    "/admin/tours/departures/"
                                    . $departure->id
                                    . "/bookings",
                            ]
                        );
                    }
                );

            /*
             * ==========================================================
             * THÔNG BÁO HƯỚNG DẪN VIÊN
             * ==========================================================
             */

            $affectedGuideAssignmentIds = collect(
                $payload['affected_guide_assignment_ids'] ?? []
            )->map(fn ($id) => (int) $id);

            $guideAssignments = $departure->guideAssignments
                ->filter(function ($assignment) use (
                    $isCancelled,
                    $affectedGuideAssignmentIds
                ): bool {
                    if ($isCancelled && $affectedGuideAssignmentIds->isNotEmpty()) {
                        return $affectedGuideAssignmentIds->contains((int) $assignment->id);
                    }

                    return in_array($assignment->status, ['assigned', 'confirmed'], true);
                });

            foreach ($guideAssignments as $assignment) {

                $guideUserId =
                    $assignment->guide?->user_id;

                if (! $guideUserId) {
                    continue;
                }

                if ($isCancelled) {

                    $customGuideMessage = trim((string) ($payload['guide_message'] ?? ''));

                    $message = $customGuideMessage !== ''
                        ? $customGuideMessage
                        :
                        "Lịch tour "
                        . "\"{$departure->tour->title}\" "
                        . "dự kiến khởi hành vào "
                        . "{$departureAt} đã bị hủy.\n\n"
                        . "Lý do: {$reasonLabel}.\n\n"
                        . "Bạn không cần thực hiện "
                        . "lịch trình này.";

                    $title =
                        'Lịch khởi hành đã bị hủy';

                    $action =
                        'tour_cancelled';

                } else {

                    $message =
                        "Tour "
                        . "\"{$departure->tour->title}\" "
                        . "dự kiến khởi hành vào "
                        . "{$departureAt} "
                        . "đã được xác nhận.";

                    $title =
                        'Tour đã được xác nhận';

                    $action =
                        'tour_confirmed';
                }

                $this->notify(
                    (int) $guideUserId,

                    $title,

                    $message,

                    [
                        'source' =>
                            'tour_departure',

                        'action' =>
                            $action,

                        'tour_departure_id' =>
                            $departure->id,

                        'tour_id' =>
                            $departure->tour_id,

                        'tour_title' =>
                            $departure->tour->title,

                        'cancellation_reason' =>
                            $cancellationReason,
                    ]
                );
            }

            /*
             * Đánh dấu Outbox đã xử lý.
             */
            $outbox->update([
                'processed_at' => now(),
            ]);
        });
    }

    /**
     * Chuyển mã lý do thành nội dung tiếng Việt.
     */
    private function getCancellationReasonLabel(
        ?string $reason
    ): string {
        return match ($reason) {

            'insufficient_participants' =>
                'Không đủ số lượng khách tối thiểu',

            'weather_disaster' =>
                'Thời tiết xấu hoặc thiên tai',

            'other' =>
                'Lý do khác theo quyết định của quản trị viên',

            default =>
                'Lịch khởi hành không thể tiếp tục',
        };
    }

    /**
     * Format ngày khởi hành.
     */
    private function formatDepartureDate(
        mixed $value
    ): string {
        if (! $value) {
            return 'chưa xác định';
        }

        try {
            return Carbon::parse($value)
                ->format('d/m/Y H:i');
        } catch (\Throwable) {
            return (string) $value;
        }
    }

    /**
     * Tạo notification.
     */
    private function notify(
        int $userId,
        string $title,
        string $message,
        array $data
    ): void {
        Notification::query()->create([
            'user_id' => $userId,

            'title' => $title,

            'message' => $message,

            'type' => 'system',

            'status' => 'unread',

            'data' => json_encode(
                $data,
                JSON_UNESCAPED_UNICODE
                | JSON_THROW_ON_ERROR
            ),
        ]);
    }
}
