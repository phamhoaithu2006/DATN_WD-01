<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\SupportRequest;
use App\Models\SupportRequestMessage;
use App\Models\User;
use App\Services\SupportWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Throwable;

class CustomerSupportRequestCenterController extends Controller
{
    public function __construct(
        private readonly SupportWorkflowService $workflow
    ) {}

    /**
     * Danh sách yêu cầu của khách hàng.
     */
    public function index(Request $request): JsonResponse
    {
        $items = SupportRequest::query()
            ->where('user_id', $request->user()->id)
            ->with('attachments')
            ->orderByDesc('created_at')
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    /**
     * Chi tiết yêu cầu.
     *
     * Khi khách mở ticket:
     * customer_has_unread_update = false
     */
    public function show(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        $this->authorizeOwner(
            $request,
            $supportRequest
        );

        if ($supportRequest->customer_has_unread_update) {
            $supportRequest->forceFill([
                'customer_has_unread_update' => false,
            ])->save();
        }

        $supportRequest->load([
            'attachments',
            'messages.sender:id,full_name,avatar_url',
            'messages.attachments',
        ]);

        return response()->json([
            'success' => true,
            'data' => $supportRequest,
        ]);
    }

    /**
     * Badge cập nhật chưa đọc của khách.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $count = SupportRequest::query()
            ->where('user_id', $request->user()->id)
            ->where('customer_has_unread_update', true)
            ->count();

        return response()->json([
            'unread_count' => $count,
        ]);
    }

    /**
     * Khách bổ sung thông tin.
     *
     * Trước khi bổ sung:
     * status = pending
     * needs_more_info = true
     *
     * Sau khi bổ sung:
     * status = pending
     * needs_more_info = false
     *
     * => Phía NVHT trở lại "Chưa hỗ trợ / Chưa tiếp nhận".
     */
    public function supplement(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        $this->authorizeOwner(
            $request,
            $supportRequest
        );

        $supportRequest->refresh();

        if ($supportRequest->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể bổ sung thông tin khi yêu cầu đang chờ.',
            ], 422);
        }

        if (! (bool) $supportRequest->needs_more_info) {
            return response()->json([
                'success' => false,
                'message' => 'Yêu cầu này hiện không cần bổ sung thông tin.',
            ], 422);
        }

        $data = $request->validate([
            'message' => ['required', 'string', 'min:5', 'max:10000'],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => [
                'file',
                'mimes:jpg,jpeg,png,webp,pdf,doc,docx',
                'max:5120',
            ],
        ]);

        $storedPaths = [];

        try {
            $result = DB::transaction(function () use (
                $request,
                $supportRequest,
                $data,
                &$storedPaths
            ) {
                /*
                 * Lock ticket để tránh NVHT thao tác đồng thời
                 * trong lúc khách đang gửi bổ sung.
                 */
                $ticket = SupportRequest::query()
                    ->lockForUpdate()
                    ->findOrFail($supportRequest->id);

                if (
                    $ticket->status !== 'pending'
                    || ! (bool) $ticket->needs_more_info
                ) {
                    return null;
                }

                $message = SupportRequestMessage::query()->create([
                    'support_request_id' => $ticket->id,
                    'sender_id' => $request->user()->id,
                    'sender_type' => 'customer',
                    'message' => $data['message'],
                ]);

                if ($request->hasFile('attachments')) {
                    foreach ($request->file('attachments') as $file) {
                        $path = $file->store(
                            "support-request-messages/{$ticket->id}/{$message->id}",
                            'public'
                        );

                        $storedPaths[] = $path;

                        $message->attachments()->create([
                            'original_name' => $file->getClientOriginalName(),
                            'file_path' => $path,
                            'mime_type' => $file->getMimeType(),
                            'size' => $file->getSize(),
                        ]);
                    }
                }

                /*
                 * Quan trọng:
                 * Sau khi khách bổ sung xong thì ticket trở lại
                 * trạng thái "Chưa hỗ trợ" ở phía NVHT.
                 *
                 * Database vẫn dùng status=pending.
                 */
                $ticket->forceFill([
                    /*
                     * Khách bổ sung xong:
                     * ticket quay lại "Đang hỗ trợ" của chính NVHT
                     * đã tiếp nhận trước đó.
                     *
                     * assigned_to và started_at được giữ nguyên từ lúc
                     * NVHT yêu cầu bổ sung.
                     */
                    'status' => 'in_progress',
                    'assigned_to' => $ticket->assigned_to,
                    'started_at' => $ticket->started_at,
                    'resolved_at' => null,

                    'needs_more_info' => false,

                    /*
                     * Giữ info_request_message để còn lịch sử nội dung
                     * NVHT từng yêu cầu. Frontend không hiển thị cảnh báo
                     * nữa vì needs_more_info đã false.
                     */
                    'customer_has_unread_update' => false,
                ])->save();

                $this->workflow->addHistory(
                    $ticket,
                    $request->user()->id,
                    'customer_supplemented',
                    'pending',
                    'in_progress',
                    'Khách hàng đã bổ sung thông tin. Yêu cầu được chuyển lại cho nhân viên hỗ trợ đang phụ trách.',
                    [
                        'message' => $data['message'],
                    ]
                );

                return [
                    'message' => $message,
                    'ticket' => $ticket->fresh(),
                ];
            }, 3);

            if (! $result) {
                return response()->json([
                    'success' => false,
                    'message' => 'Yêu cầu này không còn ở trạng thái cần bổ sung thông tin.',
                ], 409);
            }

            /*
             * Thông báo cho NVHT sau khi transaction đã hoàn tất.
             */
            $this->notifySupportStaffAboutSupplement(
                $result['ticket']
            );

            return response()->json([
                'success' => true,
                'message' => 'Đã gửi thông tin bổ sung.',
                'data' => [
                    'support_request' => $result['ticket'],
                    'message' => $result['message']->load('attachments'),
                ],
            ]);
        } catch (Throwable $exception) {
            foreach ($storedPaths as $path) {
                Storage::disk('public')->delete($path);
            }

            throw $exception;
        }
    }

    /**
     * Thông báo tất cả NVHT rằng khách đã bổ sung xong.
     */
    private function notifySupportStaffAboutSupplement(
        SupportRequest $supportRequest
    ): void {
        $supportUserIds =
            $this->getSupportUserIds();

        foreach ($supportUserIds as $supportUserId) {
            $this->workflow->notifyUser(
                (int) $supportUserId,
                'Khách hàng đã bổ sung thông tin',
                "Khách hàng đã bổ sung thông tin cho yêu cầu {$supportRequest->ticket_code}. Yêu cầu đã trở lại trạng thái chưa tiếp nhận.",
                'support_request_customer_supplemented',
                $supportRequest->id
            );
        }
    }

    /**
     * Lấy danh sách user_id của NVHT.
     */
    private function getSupportUserIds(): Collection
    {
        $ids = collect();

        foreach (
            [
                'support_staff',
                'support_staffs',
            ] as $table
        ) {
            if (
                ! Schema::hasTable($table)
                || ! Schema::hasColumn($table, 'user_id')
            ) {
                continue;
            }

            $query = DB::table($table)
                ->whereNotNull('user_id');

            if (Schema::hasColumn($table, 'status')) {
                $query->where(
                    'status',
                    'active'
                );
            }

            $ids = $query->pluck(
                'user_id'
            );

            if ($ids->isNotEmpty()) {
                break;
            }
        }

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
            ->map(
                fn ($id) => (int) $id
            )
            ->unique()
            ->values();
    }

    /**
     * Chỉ cho chủ ticket thao tác.
     */
    private function authorizeOwner(
        Request $request,
        SupportRequest $supportRequest
    ): void {
        if (
            (int) $supportRequest->user_id
            !== (int) $request->user()->id
        ) {
            abort(404);
        }
    }
}