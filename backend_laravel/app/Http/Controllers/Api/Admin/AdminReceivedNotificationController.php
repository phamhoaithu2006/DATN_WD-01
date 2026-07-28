<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportRequest;
use App\Services\SupportWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AdminReceivedNotificationController extends Controller
{
    public function __construct(
        private readonly SupportWorkflowService $workflow
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'notification_filter' => ['nullable', 'in:all,support_admin_request'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $filter = $validated['notification_filter'] ?? 'all';
        $perPage = (int) ($validated['per_page'] ?? 15);

        $query = DB::table('notifications')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at');

        if ($filter === 'support_admin_request') {
            $pendingRequestIds = SupportRequest::query()
                ->where('admin_request_status', 'pending')
                ->whereNotIn('status', ['resolved', 'cancelled'])
                ->pluck('id');

            $query->whereIn('support_request_id', $pendingRequestIds);
        }

        return response()->json([
            'success' => true,
            'data' => $query->paginate($perPage),
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = DB::table('notifications')
            ->where('user_id', $request->user()->id)
            ->where('status', 'unread')
            ->count();

        return response()->json([
            'unread_count' => $count,
        ]);
    }

    public function show(
        Request $request,
        int $notification
    ): JsonResponse {
        $item = DB::table('notifications')
            ->where('id', $notification)
            ->where('user_id', $request->user()->id)
            ->first();

        abort_unless($item, 404);

        DB::table('notifications')
            ->where('id', $notification)
            ->update([
                'status' => 'read',
                'read_at' => now(),
                'updated_at' => now(),
            ]);

        $supportRequestId = $this->resolveSupportRequestId($item);
        $supportRequest = null;

        if ($supportRequestId) {
            $supportRequest = SupportRequest::query()
                ->with([
                    'user:id,full_name,email,phone,avatar_url',
                    'assignedStaff:id,full_name,email,phone,avatar_url',
                    'attachments',
                    'messages' => function ($query) {
                        $query
                            ->with([
                                'sender:id,full_name,email,avatar_url',
                                'attachments',
                            ])
                            ->orderBy('created_at');
                    },
                ])
                ->find($supportRequestId);

            if ($supportRequest) {
                $supportRequest->attachments->transform(
                    fn ($attachment) => $this->decorateAttachment($attachment)
                );

                $supportRequest->messages->each(
                    function ($message) {
                        $message->attachments->transform(
                            fn ($attachment) => $this->decorateAttachment($attachment)
                        );
                    }
                );
            }
        }

        $notificationData = (array) $item;
        $notificationData['status'] = 'read';
        $notificationData['read_at'] =
            $notificationData['read_at'] ?? now()->toDateTimeString();

        if ($supportRequestId) {
            $notificationData['support_request_id'] = $supportRequestId;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'notification' => $notificationData,
                'support_request' => $supportRequest,
            ],
        ]);
    }

    public function processSupportRequest(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        $processed = DB::transaction(
            function () use ($request, $supportRequest) {
                $ticket = SupportRequest::query()
                    ->lockForUpdate()
                    ->findOrFail($supportRequest->id);

                if (
                    $ticket->status !== 'in_progress'
                    || $ticket->admin_request_status !== 'pending'
                ) {
                    return null;
                }

                $ticket->update([
                    'status' => 'resolved',
                    'admin_request_status' => 'processed',
                    'admin_processed_by' => $request->user()->id,
                    'admin_processed_at' => now(),
                    'resolved_at' => now(),
                    'customer_has_unread_update' => true,
                ]);

                $this->workflow->addHistory(
                    $ticket,
                    $request->user()->id,
                    'admin_processed',
                    'in_progress',
                    'resolved',
                    'Admin đã xác nhận xử lý xong yêu cầu.'
                );

                if ($ticket->user_id) {
                    $this->workflow->notifyUser(
                        (int) $ticket->user_id,
                        'Yêu cầu hỗ trợ đã được xử lý',
                        "Yêu cầu hỗ trợ {$ticket->ticket_code} của bạn đã được xử lý thành công.",
                        'support_request_resolved',
                        $ticket->id
                    );
                }

                if ($ticket->assigned_to) {
                    $this->workflow->notifyUser(
                        (int) $ticket->assigned_to,
                        'Yêu cầu hỗ trợ đã được Admin xử lý',
                        "Yêu cầu {$ticket->ticket_code} đã được Admin xác nhận xử lý xong.",
                        'support_request_admin_processed',
                        $ticket->id
                    );
                }

                return $ticket->fresh();
            },
            3
        );

        if (! $processed) {
            return response()->json([
                'success' => false,
                'message' => 'Yêu cầu này không còn ở trạng thái chờ Admin xử lý.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã xác nhận xử lý xong yêu cầu.',
            'data' => $processed,
        ]);
    }

    private function resolveSupportRequestId(object $notification): ?int
    {
        $directId =
            isset($notification->support_request_id)
            && is_numeric($notification->support_request_id)
                ? (int) $notification->support_request_id
                : null;

        if (
            $directId
            && SupportRequest::query()->whereKey($directId)->exists()
        ) {
            return $directId;
        }

        $data = $this->parseNotificationData($notification->data ?? null);

        foreach ([
            $data['support_request_id'] ?? null,
            $data['request_id'] ?? null,
            $data['ticket_id'] ?? null,
            $data['related_id'] ?? null,
            $data['reference_id'] ?? null,
            $data['entity_id'] ?? null,
        ] as $candidateId) {
            if (
                is_numeric($candidateId)
                && SupportRequest::query()
                    ->whereKey((int) $candidateId)
                    ->exists()
            ) {
                return (int) $candidateId;
            }
        }

        $ticketCode = trim((string) ($data['ticket_code'] ?? ''));

        if ($ticketCode === '') {
            $sourceText = implode(' ', array_filter([
                $notification->title ?? null,
                $notification->message ?? null,
                $data['title'] ?? null,
                $data['message'] ?? null,
            ]));

            if (
                preg_match('/SUP-\d{8}-[A-Z0-9]+/i', $sourceText, $matches)
            ) {
                $ticketCode = strtoupper($matches[0]);
            }
        }

        if ($ticketCode === '') {
            return null;
        }

        $id = SupportRequest::query()
            ->whereRaw('UPPER(ticket_code) = ?', [strtoupper($ticketCode)])
            ->value('id');

        return $id ? (int) $id : null;
    }

    private function parseNotificationData(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_object($value)) {
            return (array) $value;
        }

        if (! is_string($value) || trim($value) === '') {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function decorateAttachment($attachment)
    {
        $filePath = $attachment->file_path ?? null;
        $publicPath = $filePath
            ? Storage::disk('public')->url($filePath)
            : null;

        $attachment->setAttribute(
            'url',
            $publicPath ? url($publicPath) : null
        );

        $attachment->setAttribute(
            'is_image',
            str_starts_with(
                strtolower((string) ($attachment->mime_type ?? '')),
                'image/'
            )
        );

        return $attachment;
    }
}