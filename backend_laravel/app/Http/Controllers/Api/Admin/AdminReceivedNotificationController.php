<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportRequest;
use App\Services\SupportWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminReceivedNotificationController extends Controller
{
    public function __construct(
        private readonly SupportWorkflowService $workflow
    ) {}

    public function index(Request $request): JsonResponse
    {
        $notifications = DB::table('notifications')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $notifications,
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

        $supportRequest = null;

        if ($item->support_request_id) {
            $supportRequest = SupportRequest::query()
                ->with([
                    'user:id,full_name,email,phone',
                    'assignedStaff:id,full_name,email,avatar_url',
                ])
                ->find($item->support_request_id);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'notification' => $item,
                'support_request' => $supportRequest,
            ],
        ]);
    }

    public function processSupportRequest(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        $processed = DB::transaction(function () use ($request, $supportRequest) {
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

            return $ticket;
        }, 3);

        if (! $processed) {
            return response()->json([
                'success' => false,
                'message' => 'Yêu cầu này không còn ở trạng thái chờ Admin xử lý.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã xác nhận xử lý xong yêu cầu.',
            'data' => $processed->fresh(),
        ]);
    }
}