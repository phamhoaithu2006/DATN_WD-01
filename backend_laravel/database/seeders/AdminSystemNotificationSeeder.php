<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Guide;
use App\Models\SupportRequest;
use App\Models\TourGuideAssignment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class AdminSystemNotificationSeeder extends Seeder
{
    private const SEED_SOURCE = 'admin_system_notification_seeder';

    public function run(): void
    {
        DB::transaction(function (): void {
            $admins = $this->resolveAdmins();
            $booking = $this->resolveRefundBooking();
            $replacementRequest = $this->resolveReplacementRequest();
            $supportRequest = $this->resolveSupportRequest();
            $guideAssignment = $this->resolveGuideAssignment(
                (int) $replacementRequest->tour_departure_id,
                (int) $replacementRequest->current_guide_id
            );
            $now = now();

            $bookingTitle = 'Booking đang chờ hoàn tiền';
            $bookingMessage = "Booking {$booking->booking_code} đã bị hủy và đang chờ Admin xác nhận hoàn tiền.";
            $bookingData = [
                'source' => 'booking_refund',
                'action' => 'open_booking_refund',
                'booking_id' => (int) $booking->id,
                'booking_code' => $booking->booking_code,
                'status' => $booking->status,
                'payment_status' => $booking->payment_status,
            ];

            $departureDate = Carbon::parse($replacementRequest->departure_date);
            $returnDate = Carbon::parse(
                $replacementRequest->return_date ?: $replacementRequest->departure_date
            );
            $guideName = $guideAssignment['guide_name'];
            $guideId = $guideAssignment['guide_id'];
            $tourTitle = $replacementRequest->tour_title;
            $formattedDepartureDate = $departureDate->format('d/m/Y');

            $replacementTitle = 'Có yêu cầu đổi HDV mới';
            $replacementMessage = "Yêu cầu đổi HDV cho tour {$tourTitle}, ngày đi {$formattedDepartureDate} đang chờ Admin xử lý.";
            $replacementData = [
                'source' => 'guide_replacement_request',
                'type' => 'guide_replacement_request',
                'action' => 'pending',
                'replacement_request_id' => (int) $replacementRequest->id,
                'tour_id' => (int) $replacementRequest->tour_id,
                'tour_departure_id' => (int) $replacementRequest->tour_departure_id,
                'departure_id' => (int) $replacementRequest->tour_departure_id,
                'current_guide_id' => (int) $replacementRequest->current_guide_id,
                'departure_date' => $departureDate->toDateString(),
                'return_date' => $returnDate->toDateString(),
            ];

            $supportTitle = 'Yêu cầu hỗ trợ đang chờ Admin xử lý';
            $supportMessage = "Ticket {$supportRequest->ticket_code} cần Admin kiểm tra giao dịch bị trùng và xác nhận phương án hoàn tiền cho khách.";
            $supportData = [
                'source' => 'support_request',
                'kind' => 'support_admin_request',
                'action' => 'open_support_request',
                'support_request_id' => (int) $supportRequest->id,
                'ticket_code' => $supportRequest->ticket_code,
            ];

            $departureTitle = 'Lịch khởi hành mẫu cần theo dõi';
            $departureMessage = "Lịch {$tourTitle} ngày đi {$formattedDepartureDate} đang mở và đã có HDV phụ trách.";
            $departureData = [
                'source' => 'tour_departure',
                'action' => 'created',
                'tour_id' => (int) $replacementRequest->tour_id,
                'tour_departure_id' => (int) $replacementRequest->tour_departure_id,
                'departure_date' => $departureDate->toDateString(),
            ];

            $assignmentTitle = 'HDV đã được phân công cho lịch mẫu';
            $assignmentMessage = "HDV {$guideName} đang phụ trách tour {$tourTitle} ngày {$formattedDepartureDate}.";
            $assignmentData = [
                'source' => 'guide_assignment',
                'action' => 'guide_direct_assigned',
                'tour_id' => (int) $replacementRequest->tour_id,
                'tour_departure_id' => (int) $replacementRequest->tour_departure_id,
                'guide_id' => $guideId,
            ];

            foreach ($admins as $admin) {
                $this->upsertNotification(
                    recipient: $admin,
                    seedKey: 'booking-refund-pending',
                    title: $bookingTitle,
                    message: $bookingMessage,
                    data: $bookingData,
                    createdAt: $now->copy()->subMinutes(5)
                );

                $this->upsertNotification(
                    recipient: $admin,
                    seedKey: GuideReplacementRequestSeeder::SEED_KEY,
                    title: $replacementTitle,
                    message: $replacementMessage,
                    data: $replacementData,
                    createdAt: $now->copy()->subMinutes(10)
                );

                $this->upsertNotification(
                    recipient: $admin,
                    seedKey: 'support-admin-request-pending',
                    title: $supportTitle,
                    message: $supportMessage,
                    data: $supportData,
                    createdAt: $now->copy()->subMinutes(15),
                    supportRequestId: (int) $supportRequest->id,
                    kind: 'support_admin_request'
                );

                $this->upsertNotification(
                    recipient: $admin,
                    seedKey: 'tour-departure-created',
                    title: $departureTitle,
                    message: $departureMessage,
                    data: $departureData,
                    createdAt: $now->copy()->subMinutes(20)
                );

                $this->upsertNotification(
                    recipient: $admin,
                    seedKey: 'guide-assignment-created',
                    title: $assignmentTitle,
                    message: $assignmentMessage,
                    data: $assignmentData,
                    createdAt: $now->copy()->subMinutes(25)
                );
            }
        });
    }

    /**
     * @return Collection<int, User>
     */
    private function resolveAdmins(): Collection
    {
        $admins = User::query()
            ->where('status', 'active')
            ->whereHas('role', fn ($query) => $query->where('name', 'admin'))
            ->orderBy('id')
            ->get();

        if ($admins->isEmpty()) {
            throw new RuntimeException(
                'Không thể seed thông báo Admin vì chưa có tài khoản Admin đang hoạt động.'
            );
        }

        return $admins;
    }

    private function resolveRefundBooking(): Booking
    {
        $booking = Booking::query()
            ->where('booking_code', BookingRefundSeeder::BOOKING_CODE)
            ->first();

        if (! $booking) {
            throw new RuntimeException(
                'Không thể seed thông báo Admin vì chưa có booking chờ hoàn tiền mẫu.'
            );
        }

        return $booking;
    }

    private function resolveReplacementRequest(): object
    {
        $request = DB::table('guide_replacement_requests as grr')
            ->join('tour_departures as td', 'td.id', '=', 'grr.tour_departure_id')
            ->join('tours as t', 't.id', '=', 'td.tour_id')
            ->select([
                'grr.id',
                'grr.tour_departure_id',
                'grr.current_guide_id',
                'td.tour_id',
                'td.departure_date',
                'td.return_date',
                't.title as tour_title',
            ])
            ->where('grr.reason', GuideReplacementRequestSeeder::SEED_REASON)
            ->orderByDesc('grr.id')
            ->first();

        if (! $request) {
            throw new RuntimeException(
                'Không thể seed thông báo Admin vì chưa có yêu cầu đổi HDV mẫu.'
            );
        }

        return $request;
    }

    private function resolveSupportRequest(): SupportRequest
    {
        $request = SupportRequest::query()
            ->where('ticket_code', 'SUP-VV-09')
            ->first();

        if (! $request) {
            throw new RuntimeException(
                'Không thể seed thông báo Admin vì chưa có ticket SUP-VV-09.'
            );
        }

        return $request;
    }

    /**
     * @return array{guide_id: int, guide_name: string}
     */
    private function resolveGuideAssignment(int $departureId, int $currentGuideId): array
    {
        $assignment = TourGuideAssignment::query()
            ->where('tour_departure_id', $departureId)
            ->where('status', 'assigned')
            ->with('guide.user')
            ->orderBy('id')
            ->first();

        if ($assignment?->guide?->user) {
            return [
                'guide_id' => (int) $assignment->guide->id,
                'guide_name' => $assignment->guide->user->full_name,
            ];
        }

        $guide = Guide::query()->with('user')->find($currentGuideId);

        if (! $guide?->user) {
            throw new RuntimeException(
                "Không thể seed thông báo Admin vì lịch {$departureId} chưa có HDV hợp lệ."
            );
        }

        return [
            'guide_id' => (int) $guide->id,
            'guide_name' => $guide->user->full_name,
        ];
    }

    private function upsertNotification(
        User $recipient,
        string $seedKey,
        string $title,
        string $message,
        array $data,
        Carbon $createdAt,
        ?int $supportRequestId = null,
        ?string $kind = null
    ): void {
        $notificationData = [
            'seed_source' => self::SEED_SOURCE,
            'seed_key' => $seedKey,
            ...$data,
        ];

        $payload = [
            'draft_id' => null,
            'user_id' => $recipient->id,
            'title' => $title,
            'message' => $message,
            'type' => 'system',
            'status' => 'unread',
            'data' => json_encode(
                $notificationData,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
            ),
            'kind' => $kind,
            'support_request_id' => $supportRequestId,
            'read_at' => null,
            'cleared_at' => null,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ];

        $notificationId = DB::table('notifications')
            ->where('user_id', $recipient->id)
            ->where('data->seed_key', $seedKey)
            ->value('id');

        if ($notificationId) {
            DB::table('notifications')
                ->where('id', $notificationId)
                ->update($payload);

            return;
        }

        DB::table('notifications')->insert($payload);
    }
}
