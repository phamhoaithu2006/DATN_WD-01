<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\SupportRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class CustomerSupportRequestController extends Controller
{
    /**
     * Khách hàng gửi yêu cầu hỗ trợ.
     *
     * POST /api/customer/support-requests
     */
    public function store(Request $request): JsonResponse
    {
        /*
        |--------------------------------------------------------------------------
        | 1. Validate dữ liệu gửi từ frontend
        |--------------------------------------------------------------------------
        | Đã bỏ hoàn toàn priority khỏi dữ liệu người dùng nhập.
        | Nếu database vẫn có cột priority thì hệ thống tự lưu mặc định "medium".
        */
        $data = $request->validate([
            'full_name' => [
                'required',
                'string',
                'max:255',
            ],

            'email' => [
                'required',
                'email',
                'max:255',
            ],

            'phone' => [
                'nullable',
                'string',
                'max:20',
            ],

            'category' => [
                'required',
                'string',
                'in:technical,payment,account,feedback,general',
            ],

            'subject' => [
                'required',
                'string',
                'max:255',
            ],

            'description' => [
                'required',
                'string',
                'max:10000',
            ],

            // Tối đa 5 file đính kèm.
            'attachments' => [
                'nullable',
                'array',
                'max:5',
            ],

            // Mỗi file tối đa 5MB.
            'attachments.*' => [
                'file',
                'mimes:jpg,jpeg,png,webp,pdf,doc,docx',
                'max:5120',
            ],
        ]);

        $user = $request->user();

        $storedPaths = [];

        try {
            $result = DB::transaction(function () use (
                $request,
                $data,
                $user,
                &$storedPaths
            ) {
                /*
                |--------------------------------------------------------------------------
                | 2. Tạo mã ticket duy nhất
                |--------------------------------------------------------------------------
                */
                $ticketCode = $this->generateTicketCode();

                /*
                |--------------------------------------------------------------------------
                | 3. Tạo yêu cầu hỗ trợ
                |--------------------------------------------------------------------------
                */
                $createData = [
                    'ticket_code' => $ticketCode,
                    'user_id' => $user->id,

                    'full_name' => $data['full_name'],
                    'email' => $data['email'],
                    'phone' => $data['phone'] ?? null,

                    'category' => $data['category'],

                    'subject' => $data['subject'],
                    'description' => $data['description'],

                    'status' => 'pending',
                    'assigned_to' => null,
                    'started_at' => null,
                    'resolved_at' => null,
                ];

                /*
                 * Nếu bảng support_requests vẫn còn cột priority,
                 * tự gán mức mặc định thay vì bắt khách hàng chọn.
                 */
                if (Schema::hasColumn('support_requests', 'priority')) {
                    $createData['priority'] = 'medium';
                }

                $supportRequest = SupportRequest::query()->create($createData);

                /*
                |--------------------------------------------------------------------------
                | 4. Upload file đính kèm
                |--------------------------------------------------------------------------
                */
                if ($request->hasFile('attachments')) {
                    foreach ($request->file('attachments') as $file) {
                        $path = $file->store(
                            "support-requests/{$supportRequest->id}",
                            'public'
                        );

                        $storedPaths[] = $path;

                        $supportRequest
                            ->attachments()
                            ->create([
                                'original_name' => $file->getClientOriginalName(),
                                'file_path' => $path,
                                'mime_type' => $file->getMimeType(),
                                'size' => $file->getSize(),
                            ]);
                    }
                }

                /*
                |--------------------------------------------------------------------------
                | 5. Tạo thông báo cho nhân viên hỗ trợ
                |--------------------------------------------------------------------------
                */
                $notifiedStaffCount = $this->notifySupportStaff($supportRequest);

                return [
                    'support_request' => $supportRequest,
                    'notified_staff_count' => $notifiedStaffCount,
                ];
            }, 3);

            /** @var SupportRequest $supportRequest */
            $supportRequest = $result['support_request'];

            return response()->json([
                'success' => true,
                'message' => 'Yêu cầu hỗ trợ đã được gửi thành công.',
                'data' => $supportRequest
                    ->fresh()
                    ->load('attachments'),
                'notified_staff_count' => $result['notified_staff_count'],
            ], 201);
        } catch (Throwable $exception) {
            /*
             * Database transaction có thể rollback,
             * nhưng file đã upload thì phải tự xóa.
             */
            foreach ($storedPaths as $path) {
                Storage::disk('public')->delete($path);
            }

            throw $exception;
        }
    }

    /**
     * Sinh mã ticket, ví dụ:
     * SUP-20260716-A1B2C3
     */
    private function generateTicketCode(): string
    {
        do {
            $ticketCode = 'SUP-'
                . now()->format('Ymd')
                . '-'
                . Str::upper(Str::random(6));
        } while (
            SupportRequest::query()
                ->where('ticket_code', $ticketCode)
                ->exists()
        );

        return $ticketCode;
    }

    /**
     * Gửi notification cho tất cả nhân viên hỗ trợ đang hoạt động.
     */
    private function notifySupportStaff(SupportRequest $supportRequest): int
    {
        $supportUserIds = $this->getSupportUserIds();

        if ($supportUserIds->isEmpty()) {
            return 0;
        }

        $categoryLabels = [
            'technical' => 'Lỗi kỹ thuật',
            'payment' => 'Thanh toán',
            'account' => 'Tài khoản',
            'feedback' => 'Góp ý',
            'general' => 'Câu hỏi chung',
        ];

        $categoryLabel = $categoryLabels[$supportRequest->category]
            ?? $supportRequest->category;

        $message = "{$supportRequest->full_name} vừa gửi yêu cầu hỗ trợ mới.\n"
            . "Mã: {$supportRequest->ticket_code}\n"
            . "Chủ đề: {$supportRequest->subject}\n"
            . "Danh mục: {$categoryLabel}";

        $count = 0;

        foreach ($supportUserIds as $supportUserId) {
            $notificationData = [
                'user_id' => $supportUserId,
                'title' => 'Có yêu cầu hỗ trợ mới',
                'message' => $message,
                'status' => 'unread',
            ];

            // Chỉ thêm các cột này nếu bảng notifications thực sự có.
            if (Schema::hasColumn('notifications', 'draft_id')) {
                $notificationData['draft_id'] = null;
            }

            if (Schema::hasColumn('notifications', 'type')) {
                $notificationData['type'] = 'system';
            }

            Notification::query()->create($notificationData);

            $count++;
        }

        return $count;
    }

    /**
     * Tìm user có vai trò "support staff".
     *
     * Hỗ trợ nhiều cấu trúc database:
     * - support_staff.user_id
     * - support_staffs.user_id
     * - users.role
     * - users.role_id -> roles.name
     */
    private function getSupportUserIds()
    {
        $ids = collect();

        /*
        |--------------------------------------------------------------------------
        | Cách 1: bảng support_staff / support_staffs
        |--------------------------------------------------------------------------
        */
        foreach (['support_staff', 'support_staffs'] as $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            if (! Schema::hasColumn($table, 'user_id')) {
                continue;
            }

            $query = DB::table($table)
                ->whereNotNull('user_id');

            if (Schema::hasColumn($table, 'status')) {
                $query->where('status', 'active');
            }

            $ids = $query->pluck('user_id');

            if ($ids->isNotEmpty()) {
                break;
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Cách 2: users.role
        |--------------------------------------------------------------------------
        */
        if (
            $ids->isEmpty()
            && Schema::hasTable('users')
            && Schema::hasColumn('users', 'role')
        ) {
            $ids = User::query()
                ->whereRaw(
                    'LOWER(role) IN (?, ?, ?)',
                    [
                        'support staff',
                        'support_staff',
                        'support',
                    ]
                )
                ->pluck('id');
        }

        /*
        |--------------------------------------------------------------------------
        | Cách 3: users.role_id -> roles.name
        |--------------------------------------------------------------------------
        */
        if (
            $ids->isEmpty()
            && Schema::hasTable('users')
            && Schema::hasTable('roles')
            && Schema::hasColumn('users', 'role_id')
        ) {
            $ids = DB::table('users')
                ->join(
                    'roles',
                    'roles.id',
                    '=',
                    'users.role_id'
                )
                ->whereRaw(
                    'LOWER(roles.name) IN (?, ?, ?)',
                    [
                        'support staff',
                        'support_staff',
                        'support',
                    ]
                )
                ->pluck('users.id');
        }

        return $ids
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();
    }
}