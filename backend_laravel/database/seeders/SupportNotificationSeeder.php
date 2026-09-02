<?php

namespace Database\Seeders;

use App\Models\SupportRequest;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SupportNotificationSeeder extends Seeder
{
    private const NEW_REQUEST_CODES = [
        'SUP-VV-01',
        'SUP-VV-02',
        'SUP-VV-03',
        'SUP-VV-04',
    ];

    private const ADMIN_PROCESSED_REQUEST_CODE = 'SUP-VV-10';

    private const CATEGORY_LABELS = [
        'technical' => 'Lỗi kỹ thuật',
        'payment' => 'Thanh toán',
        'account' => 'Tài khoản',
        'feedback' => 'Góp ý',
        'general' => 'Câu hỏi chung',
    ];

    public function run(): void
    {
        $supportUsers = $this->resolveSupportUsers();
        $tickets = $this->resolveTickets();
        $now = now();

        foreach (self::NEW_REQUEST_CODES as $index => $ticketCode) {
            $ticket = $tickets->get($ticketCode);
            $categoryLabel = self::CATEGORY_LABELS[$ticket->category]
                ?? $ticket->category;
            $message = "{$ticket->full_name} vừa gửi yêu cầu hỗ trợ mới.\n"
                ."Mã: {$ticket->ticket_code}\n"
                ."Chủ đề: {$ticket->subject}\n"
                ."Danh mục: {$categoryLabel}";

            foreach ($supportUsers as $supportUser) {
                $this->upsertNotification(
                    $supportUser,
                    $ticket,
                    'support_request_new',
                    'Có yêu cầu hỗ trợ mới',
                    $message,
                    $now->copy()->subHours(($index + 1) * 2),
                    "new-request-{$ticketCode}"
                );
            }
        }

        $processedTicket = $tickets->get(self::ADMIN_PROCESSED_REQUEST_CODE);
        $assignedSupportUser = $supportUsers->firstWhere('id', $processedTicket->assigned_to);

        if (! $assignedSupportUser) {
            throw new RuntimeException(
                "Không thể seed thông báo vì ticket {$processedTicket->ticket_code} chưa có nhân viên hỗ trợ đang hoạt động phụ trách."
            );
        }

        $this->upsertNotification(
            $assignedSupportUser,
            $processedTicket,
            'support_request_admin_processed',
            'Yêu cầu hỗ trợ đã được Admin xử lý',
            "Yêu cầu {$processedTicket->ticket_code} đã được Admin xác nhận xử lý xong.",
            $now->copy()->subMinutes(30),
            'admin-processed-'.$processedTicket->ticket_code
        );
    }

    /**
     * @return Collection<int, User>
     */
    private function resolveSupportUsers(): Collection
    {
        $users = User::query()
            ->where('status', 'active')
            ->whereHas('role', fn ($query) => $query->where('name', 'support staff'))
            ->whereHas('supportStaff', fn ($query) => $query->where('status', 'active'))
            ->orderBy('id')
            ->get();

        if ($users->isEmpty()) {
            throw new RuntimeException(
                'Không thể seed thông báo vì chưa có nhân viên hỗ trợ đang hoạt động.'
            );
        }

        return $users;
    }

    /**
     * @return Collection<string, SupportRequest>
     */
    private function resolveTickets(): Collection
    {
        $ticketCodes = collect(self::NEW_REQUEST_CODES)
            ->push(self::ADMIN_PROCESSED_REQUEST_CODE);
        $tickets = SupportRequest::query()
            ->whereIn('ticket_code', $ticketCodes)
            ->get()
            ->keyBy('ticket_code');
        $missingCodes = $ticketCodes->diff($tickets->keys())->values();

        if ($missingCodes->isNotEmpty()) {
            throw new RuntimeException(
                'Không thể seed thông báo vì thiếu ticket: '.$missingCodes->implode(', ')
            );
        }

        return $tickets;
    }

    private function upsertNotification(
        User $recipient,
        SupportRequest $ticket,
        string $kind,
        string $title,
        string $message,
        CarbonInterface $createdAt,
        string $seedKey
    ): void {
        $payload = [
            'user_id' => $recipient->id,
            'title' => $title,
            'message' => $message,
            'type' => 'system',
            'status' => 'unread',
            'data' => json_encode([
                'seed_source' => 'support_notification_seeder',
                'seed_key' => $seedKey,
                'kind' => $kind,
                'action' => 'open_support_request',
                'support_request_id' => (int) $ticket->id,
                'ticket_code' => $ticket->ticket_code,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
            'kind' => $kind,
            'support_request_id' => $ticket->id,
            'read_at' => null,
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
