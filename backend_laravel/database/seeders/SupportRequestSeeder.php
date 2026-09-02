<?php

namespace Database\Seeders;

use App\Models\SupportRequest;
use App\Models\SupportRequestHistory;
use App\Models\SupportRequestMessage;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use RuntimeException;

class SupportRequestSeeder extends Seeder
{
    private const TICKETS = [
        [
            'code' => 'SUP-VV-01',
            'customer_email' => 'customer01@gmail.com',
            'category' => 'payment',
            'priority' => 'high',
            'subject' => 'Thanh toán VNPAY chưa cập nhật',
            'description' => 'Tôi đã thanh toán qua VNPAY nhưng đơn đặt tour vẫn hiển thị chưa thanh toán.',
            'status' => 'pending',
            'assigned_email' => null,
            'needs_more_info' => false,
            'info_request_message' => null,
            'admin_request_status' => null,
            'admin_request_content' => null,
        ],
        [
            'code' => 'SUP-VV-02',
            'customer_email' => 'customer02@gmail.com',
            'category' => 'account',
            'priority' => 'medium',
            'subject' => 'Không nhận được mã OTP đăng nhập',
            'description' => 'Tôi đã yêu cầu gửi lại mã OTP nhiều lần nhưng chưa nhận được email xác nhận.',
            'status' => 'pending',
            'assigned_email' => null,
            'needs_more_info' => false,
            'info_request_message' => null,
            'admin_request_status' => null,
            'admin_request_content' => null,
        ],
        [
            'code' => 'SUP-VV-03',
            'customer_email' => 'customer03@gmail.com',
            'category' => 'general',
            'priority' => 'low',
            'subject' => 'Tư vấn lịch trình tour miền Trung',
            'description' => 'Tôi muốn được tư vấn lịch trình phù hợp cho gia đình có trẻ nhỏ.',
            'status' => 'pending',
            'assigned_email' => null,
            'needs_more_info' => false,
            'info_request_message' => null,
            'admin_request_status' => null,
            'admin_request_content' => null,
        ],
        [
            'code' => 'SUP-VV-04',
            'customer_email' => 'customer04@gmail.com',
            'category' => 'feedback',
            'priority' => 'medium',
            'subject' => 'Góp ý về điểm đón khách',
            'description' => 'Tôi muốn góp ý để thông tin điểm đón khách được hiển thị rõ hơn trong chi tiết tour.',
            'status' => 'pending',
            'assigned_email' => null,
            'needs_more_info' => false,
            'info_request_message' => null,
            'admin_request_status' => null,
            'admin_request_content' => null,
        ],
        [
            'code' => 'SUP-VV-05',
            'customer_email' => 'customer05@gmail.com',
            'category' => 'payment',
            'priority' => 'high',
            'subject' => 'Cần kiểm tra giao dịch hoàn tiền',
            'description' => 'Khoản hoàn tiền của tôi chưa về tài khoản dù yêu cầu đã được xác nhận.',
            'status' => 'pending',
            'assigned_email' => 'support01@gmail.com',
            'needs_more_info' => true,
            'info_request_message' => 'Vui lòng bổ sung ảnh chụp giao dịch và bốn số cuối của tài khoản nhận tiền.',
            'admin_request_status' => null,
            'admin_request_content' => null,
        ],
        [
            'code' => 'SUP-VV-06',
            'customer_email' => 'customer06@gmail.com',
            'category' => 'account',
            'priority' => 'medium',
            'subject' => 'Cập nhật thông tin người đặt tour',
            'description' => 'Tôi cần đổi số điện thoại liên hệ trong một booking đã xác nhận.',
            'status' => 'pending',
            'assigned_email' => 'support02@gmail.com',
            'needs_more_info' => true,
            'info_request_message' => 'Vui lòng cung cấp mã booking và số điện thoại mới để chúng tôi đối chiếu.',
            'admin_request_status' => null,
            'admin_request_content' => null,
        ],
        [
            'code' => 'SUP-VV-07',
            'customer_email' => 'customer07@gmail.com',
            'category' => 'general',
            'priority' => 'medium',
            'subject' => 'Xác nhận dịch vụ đưa đón',
            'description' => 'Tôi muốn xác nhận lại thời gian xe đón tại sân bay cho chuyến đi sắp tới.',
            'status' => 'in_progress',
            'assigned_email' => 'support01@gmail.com',
            'needs_more_info' => false,
            'info_request_message' => null,
            'admin_request_status' => null,
            'admin_request_content' => null,
        ],
        [
            'code' => 'SUP-VV-08',
            'customer_email' => 'customer08@gmail.com',
            'category' => 'technical',
            'priority' => 'high',
            'subject' => 'Không tải được vé điện tử',
            'description' => 'Trang vé điện tử báo lỗi khi tôi tải xuống trên điện thoại.',
            'status' => 'in_progress',
            'assigned_email' => 'support02@gmail.com',
            'needs_more_info' => false,
            'info_request_message' => null,
            'admin_request_status' => null,
            'admin_request_content' => null,
        ],
        [
            'code' => 'SUP-VV-09',
            'customer_email' => 'customer09@gmail.com',
            'category' => 'payment',
            'priority' => 'high',
            'subject' => 'Đối soát khoản thanh toán bị trùng',
            'description' => 'Tài khoản của tôi bị trừ tiền hai lần cho cùng một booking.',
            'status' => 'in_progress',
            'assigned_email' => 'support03@gmail.com',
            'needs_more_info' => false,
            'info_request_message' => null,
            'admin_request_status' => 'pending',
            'admin_request_content' => 'Nhờ Admin kiểm tra giao dịch trùng và xác nhận phương án hoàn tiền cho khách.',
        ],
        [
            'code' => 'SUP-VV-10',
            'customer_email' => 'customer10@gmail.com',
            'category' => 'account',
            'priority' => 'medium',
            'subject' => 'Điều chỉnh tên hành khách',
            'description' => 'Tôi cần chỉnh lại tên hành khách trước ngày khởi hành để khớp giấy tờ tùy thân.',
            'status' => 'in_progress',
            'assigned_email' => 'support04@gmail.com',
            'needs_more_info' => false,
            'info_request_message' => null,
            'admin_request_status' => 'processed',
            'admin_request_content' => 'Nhờ Admin xác nhận điều kiện chỉnh tên hành khách cho booking này.',
        ],
        [
            'code' => 'SUP-VV-11',
            'customer_email' => 'customer11@gmail.com',
            'category' => 'general',
            'priority' => 'low',
            'subject' => 'Hỏi về hành lý trong tour',
            'description' => 'Tôi đã nhận được hướng dẫn về hành lý và không còn câu hỏi nào khác.',
            'status' => 'resolved',
            'assigned_email' => 'support05@gmail.com',
            'needs_more_info' => false,
            'info_request_message' => null,
            'admin_request_status' => null,
            'admin_request_content' => null,
        ],
        [
            'code' => 'SUP-VV-12',
            'customer_email' => 'customer12@gmail.com',
            'category' => 'feedback',
            'priority' => 'medium',
            'subject' => 'Góp ý sau chuyến đi Đà Nẵng',
            'description' => 'Tôi đã nhận được phản hồi về góp ý và đánh giá cao cách nhân viên hỗ trợ xử lý.',
            'status' => 'resolved',
            'assigned_email' => 'support06@gmail.com',
            'needs_more_info' => false,
            'info_request_message' => null,
            'admin_request_status' => null,
            'admin_request_content' => null,
        ],
    ];

    public function run(): void
    {
        $users = $this->resolveUsers();

        foreach (self::TICKETS as $data) {
            $this->seedTicket($data, $users);
        }
    }

    /**
     * @return Collection<string, User>
     */
    private function resolveUsers(): Collection
    {
        $emails = collect(self::TICKETS)
            ->flatMap(function (array $ticket): array {
                return [
                    $ticket['customer_email'],
                    $ticket['assigned_email'],
                ];
            })
            ->push('admin@gmail.com')
            ->filter()
            ->unique()
            ->values();

        $users = User::query()
            ->whereIn('email', $emails)
            ->get()
            ->keyBy('email');

        $missingEmails = $emails->diff($users->keys())->values();

        if ($missingEmails->isNotEmpty()) {
            throw new RuntimeException(
                'Không thể seed Form hỗ trợ vì thiếu tài khoản: '
                .$missingEmails->implode(', ')
            );
        }

        return $users;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  Collection<string, User>  $users
     */
    private function seedTicket(array $data, Collection $users): void
    {
        /** @var User $customer */
        $customer = $users->get($data['customer_email']);
        $assignedStaff = $data['assigned_email']
            ? $users->get($data['assigned_email'])
            : null;
        $admin = $users->get('admin@gmail.com');
        $now = now();

        $startedAt = $assignedStaff
            ? $now->copy()->subHours(8)
            : null;
        $infoRequestedAt = $data['needs_more_info']
            ? $now->copy()->subHours(4)
            : null;
        $adminRequestedAt = $data['admin_request_status']
            ? $now->copy()->subHours(3)
            : null;
        $adminProcessedAt = $data['admin_request_status'] === 'processed'
            ? $now->copy()->subHours(1)
            : null;
        $resolvedAt = $data['status'] === 'resolved'
            ? $now->copy()->subHours(2)
            : null;

        $ticket = SupportRequest::query()->updateOrCreate(
            ['ticket_code' => $data['code']],
            [
                'user_id' => $customer->id,
                'full_name' => $customer->full_name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'category' => $data['category'],
                'priority' => $data['priority'],
                'subject' => $data['subject'],
                'description' => $data['description'],
                'status' => $data['status'],
                'assigned_to' => $assignedStaff?->id,
                'started_at' => $startedAt,
                'resolved_at' => $resolvedAt,
                'needs_more_info' => $data['needs_more_info'],
                'info_request_message' => $data['info_request_message'],
                'info_requested_at' => $infoRequestedAt,
                'admin_request_status' => $data['admin_request_status'],
                'admin_request_content' => $data['admin_request_content'],
                'admin_requested_by' => $data['admin_request_status']
                    ? $assignedStaff?->id
                    : null,
                'admin_requested_at' => $adminRequestedAt,
                'admin_processed_by' => $data['admin_request_status'] === 'processed'
                    ? $admin?->id
                    : null,
                'admin_processed_at' => $adminProcessedAt,
                'customer_has_unread_update' => $data['needs_more_info']
                    || $data['status'] !== 'pending',
            ]
        );

        $this->seedMessages(
            $ticket,
            $data,
            $customer,
            $assignedStaff
        );
        $this->seedHistories(
            $ticket,
            $data,
            $customer,
            $assignedStaff,
            $admin
        );
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function seedMessages(
        SupportRequest $ticket,
        array $data,
        User $customer,
        ?User $assignedStaff
    ): void {
        $this->upsertMessage(
            $ticket,
            $customer,
            'customer',
            $data['description']
        );

        if (! $assignedStaff) {
            return;
        }

        $message = $data['needs_more_info']
            ? $data['info_request_message']
            : match ($data['status']) {
                'resolved' => 'Tôi đã kiểm tra và hướng dẫn khách hàng xử lý xong yêu cầu này.',
                default => 'Tôi đã tiếp nhận yêu cầu và đang kiểm tra thông tin liên quan.',
            };

        $this->upsertMessage(
            $ticket,
            $assignedStaff,
            'support_staff',
            $message
        );

        if ($data['admin_request_status'] === 'processed') {
            $this->upsertMessage(
                $ticket,
                null,
                'system',
                'Admin đã xử lý nội dung cần hỗ trợ cho ticket này.'
            );
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function seedHistories(
        SupportRequest $ticket,
        array $data,
        User $customer,
        ?User $assignedStaff,
        ?User $admin
    ): void {
        $this->upsertHistory(
            $ticket,
            $customer,
            'created',
            null,
            'pending',
            "{$customer->full_name} đã gửi yêu cầu hỗ trợ."
        );

        if ($assignedStaff) {
            $this->upsertHistory(
                $ticket,
                $assignedStaff,
                'claimed',
                'pending',
                'in_progress',
                "{$assignedStaff->full_name} đã tiếp nhận yêu cầu hỗ trợ."
            );
        }

        if ($data['needs_more_info']) {
            $this->upsertHistory(
                $ticket,
                $assignedStaff,
                'requested_more_info',
                'in_progress',
                'pending',
                'Nhân viên hỗ trợ yêu cầu khách hàng bổ sung thông tin.',
                ['message' => $data['info_request_message']]
            );
        }

        if ($data['admin_request_status']) {
            $this->upsertHistory(
                $ticket,
                $assignedStaff,
                'sent_to_admin',
                'in_progress',
                'in_progress',
                'Nhân viên hỗ trợ đã gửi yêu cầu xử lý đến Admin.',
                ['content' => $data['admin_request_content']]
            );
        }

        if ($data['admin_request_status'] === 'processed') {
            $this->upsertHistory(
                $ticket,
                $admin,
                'admin_processed',
                'in_progress',
                'in_progress',
                'Admin đã xử lý yêu cầu được chuyển đến.',
                ['content' => $data['admin_request_content']]
            );
        }

        if ($data['status'] === 'resolved') {
            $this->upsertHistory(
                $ticket,
                $assignedStaff,
                'resolved',
                'in_progress',
                'resolved',
                "{$assignedStaff->full_name} đã hoàn tất hỗ trợ."
            );
        }
    }

    private function upsertMessage(
        SupportRequest $ticket,
        ?User $sender,
        string $senderType,
        string $message
    ): void {
        SupportRequestMessage::query()->firstOrCreate(
            [
                'support_request_id' => $ticket->id,
                'sender_id' => $sender?->id,
                'sender_type' => $senderType,
                'message' => $message,
            ]
        );
    }

    /**
     * @param  array<string, mixed>|null  $meta
     */
    private function upsertHistory(
        SupportRequest $ticket,
        ?User $actor,
        string $action,
        ?string $fromStatus,
        ?string $toStatus,
        string $description,
        ?array $meta = null
    ): void {
        SupportRequestHistory::query()->firstOrCreate(
            [
                'support_request_id' => $ticket->id,
                'action' => $action,
                'description' => $description,
            ],
            [
                'actor_id' => $actor?->id,
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'meta' => $meta,
            ]
        );
    }
}
