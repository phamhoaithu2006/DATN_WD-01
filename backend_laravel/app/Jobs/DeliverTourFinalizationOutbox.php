<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\TourFinalizationOutbox;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class DeliverTourFinalizationOutbox implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(public int $outboxId) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        DB::transaction(function (): void {
            $outbox = TourFinalizationOutbox::query()->lockForUpdate()->find($this->outboxId);
            if (! $outbox || $outbox->processed_at) {
                return;
            }

            $departure = $outbox->departure()->with(['tour:id,title', 'guideAssignments.guide.user'])->firstOrFail();
            $departureAt = ($departure->departure_at ?? $departure->departure_date)?->format('d/m/Y H:i');
            $isCancelled = str_starts_with($outbox->event_type, 'tour_cancelled');
            $bookingIds = DB::table('bookings')->where('tour_departure_id', $departure->id)
                ->when($isCancelled, fn ($query) => $query->where('status', 'cancelled_by_tour'))
                ->pluck('id');

            $customerRows = DB::table('bookings')->whereIn('id', $bookingIds)->get(['id', 'user_id', 'booking_code']);
            foreach ($customerRows as $booking) {
                $message = $isCancelled
                    ? "Tour {$departure->tour->title} dự kiến khởi hành vào {$departureAt} đã bị hủy do không đủ tối thiểu 10 khách.\n\nMã booking: {$booking->booking_code}\n\nQuý khách có thể lựa chọn:\n1. Chuyển sang ngày khởi hành khác;\n2. Chuyển sang tour khác;\n3. Nhận hoàn tiền;\n4. Chuyển thành số dư hoặc voucher nếu hệ thống hỗ trợ.\n\nVui lòng truy cập chi tiết booking để lựa chọn phương án xử lý."
                    : "Tour {$departure->tour->title} dự kiến khởi hành vào {$departureAt} đã được xác nhận.";
                $this->notify((int) $booking->user_id, $isCancelled ? 'Tour đã bị hủy' : 'Tour đã được xác nhận', $message, [
                    'tour_departure_id' => $departure->id,
                    'booking_id' => $booking->id,
                    'action' => $isCancelled ? 'tour_cancelled' : 'tour_confirmed',
                ]);
            }

            $adminMessage = $isCancelled
                ? "Tour {$departure->id} – {$departure->tour->title} đã bị hủy do không đủ số lượng khách tối thiểu.\n\nThời gian khởi hành: {$departureAt}\nSố khách tối thiểu: 10\nSố khách hợp lệ: {$outbox->payload['participant_count']}\nSố booking bị ảnh hưởng: {$outbox->payload['affected_booking_count']}"
                : "Tour {$departure->id} – {$departure->tour->title} đã được xác nhận với {$outbox->payload['participant_count']} khách hợp lệ.";
            User::query()->whereHas('role', fn ($query) => $query->where('name', 'admin'))->each(function (User $admin) use ($adminMessage, $departure, $outbox): void {
                $this->notify($admin->id, $outbox->event_type === 'tour_cancelled_insufficient_participants' ? 'Tour đã bị hủy' : 'Tour đã được xác nhận', $adminMessage, [
                    'tour_departure_id' => $departure->id,
                    'booking_list_url' => "/admin/tours/departures/{$departure->id}/bookings",
                ]);
            });

            foreach ($departure->guideAssignments->whereIn('status', ['assigned', 'confirmed']) as $assignment) {
                if (! $assignment->guide?->user_id) {
                    continue;
                }
                $message = $isCancelled
                    ? "Tour {$departure->id} – {$departure->tour->title}, dự kiến khởi hành vào {$departureAt}, đã bị hủy.\n\nLý do: Không đủ tối thiểu 10 khách để khởi hành.\n\nBạn không cần thực hiện tour này."
                    : "Tour {$departure->id} – {$departure->tour->title}, dự kiến khởi hành vào {$departureAt}, đã được xác nhận.";
                $this->notify($assignment->guide->user_id, $isCancelled ? 'Tour đã bị hủy' : 'Tour đã được xác nhận', $message, ['tour_departure_id' => $departure->id]);
            }

            $outbox->update(['processed_at' => now()]);
        });
    }

    private function notify(int $userId, string $title, string $message, array $data): void
    {
        Notification::query()->create([
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => 'system',
            'status' => 'unread',
            'data' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
        ]);
    }
}
