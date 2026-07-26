<?php

namespace App\Http\Controllers\Api\Support;

use App\Http\Controllers\Controller;
use App\Models\SupportRequest;
use App\Services\SupportWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupportWorkflowController extends Controller
{
    public function __construct(
        private readonly SupportWorkflowService $workflow
    ) {}

    /**
     * NVHT tiếp nhận ticket.
     *
     * Flow:
     * pending + needs_more_info = false
     *              ↓
     *         in_progress
     *
     * Không cho tiếp nhận khi ticket đang chờ khách bổ sung.
     */
    public function claim(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        $currentUser = $request->user();

        $updated = DB::transaction(function () use (
            $supportRequest,
            $currentUser
        ) {
            $ticket = SupportRequest::query()
                ->lockForUpdate()
                ->findOrFail($supportRequest->id);

            if (
                $ticket->status !== 'pending'
                || (bool) $ticket->needs_more_info
            ) {
                return null;
            }

            $ticket->forceFill([
                'status' => 'in_progress',
                'assigned_to' => $currentUser->id,
                'started_at' => now(),
                'resolved_at' => null,
                'needs_more_info' => false,
                'customer_has_unread_update' => true,
            ])->save();

            $this->workflow->addHistory(
                $ticket,
                $currentUser->id,
                'claimed',
                'pending',
                'in_progress',
                'Yêu cầu đã được nhân viên hỗ trợ tiếp nhận.'
            );

            if ($ticket->user_id) {
                $this->workflow->notifyUser(
                    (int) $ticket->user_id,
                    'Yêu cầu hỗ trợ đã được tiếp nhận',
                    "Yêu cầu hỗ trợ {$ticket->ticket_code} của bạn đã được tiếp nhận và đang được xử lý.",
                    'support_request_claimed',
                    $ticket->id
                );
            }

            return $ticket->fresh();
        }, 3);

        if (! $updated) {
            return response()->json([
                'success' => false,
                'message' => 'Yêu cầu này chưa thể tiếp nhận. Ticket có thể đã được nhân viên khác tiếp nhận hoặc đang chờ khách hàng bổ sung thông tin.',
            ], 409);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã tiếp nhận yêu cầu.',
            'data' => $updated,
        ]);
    }

    /**
     * NVHT yêu cầu khách bổ sung thông tin.
     *
     * Chỉ được yêu cầu bổ sung SAU KHI đã tiếp nhận ticket:
     * - status = in_progress
     * - assigned_to = NVHT hiện tại
     *
     * Sau khi gửi yêu cầu bổ sung:
     * - status = pending
     * - assigned_to = null
     * - needs_more_info = true
     *
     * Khi khách bổ sung xong:
     * - status vẫn pending
     * - needs_more_info = false
     * => ticket trở lại "Chưa hỗ trợ".
     */
    public function requestMoreInfo(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        $data = $request->validate([
            'message' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        $currentUser = $request->user();

        $result = DB::transaction(function () use (
            $request,
            $supportRequest,
            $currentUser,
            $data
        ) {
            $ticket = SupportRequest::query()
                ->lockForUpdate()
                ->findOrFail($supportRequest->id);

            if (
                $ticket->status !== 'in_progress'
                || (int) $ticket->assigned_to !== (int) $currentUser->id
            ) {
                return null;
            }

            if ($ticket->admin_request_status === 'pending') {
                return [
                    'error' => 'admin_pending',
                ];
            }

            $ticket->forceFill([
                /*
                 * Chuyển sang nhóm "Cần bổ sung" nhưng vẫn giữ NVHT
                 * đã tiếp nhận để biết ticket thuộc về ai.
                 */
                'status' => 'pending',
                'assigned_to' => $ticket->assigned_to,
                'started_at' => $ticket->started_at,
                'resolved_at' => null,

                'needs_more_info' => true,
                'info_request_message' => $data['message'],
                'info_requested_at' => now(),

                'customer_has_unread_update' => true,
            ])->save();

            $this->workflow->addHistory(
                $ticket,
                $request->user()->id,
                'requested_more_info',
                'in_progress',
                'pending',
                'Nhân viên hỗ trợ yêu cầu khách hàng bổ sung thông tin.',
                [
                    'message' => $data['message'],
                ]
            );

            if ($ticket->user_id) {
                $this->workflow->notifyUser(
                    (int) $ticket->user_id,
                    'Yêu cầu hỗ trợ cần bổ sung thông tin',
                    "Yêu cầu {$ticket->ticket_code} cần bổ sung thông tin. {$data['message']}",
                    'support_request_more_info',
                    $ticket->id
                );
            }

            return [
                'ticket' => $ticket->fresh(),
            ];
        }, 3);

        if (! $result) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ nhân viên đang phụ trách ticket mới được yêu cầu khách hàng bổ sung thông tin.',
            ], 403);
        }

        if (($result['error'] ?? null) === 'admin_pending') {
            return response()->json([
                'success' => false,
                'message' => 'Ticket đã gửi Admin xử lý nên không thể yêu cầu khách bổ sung thông tin.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi yêu cầu bổ sung thông tin cho khách hàng.',
            'data' => $result['ticket'],
        ]);
    }

    /**
     * NVHT gửi nội dung cần Admin xử lý.
     *
     * Ticket vẫn giữ:
     * status = in_progress
     */
    public function sendToAdmin(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        $data = $request->validate([
            'content' => ['required', 'string', 'min:5', 'max:5000'],
        ]);

        $updated = DB::transaction(function () use (
            $request,
            $supportRequest,
            $data
        ) {
            $ticket = SupportRequest::query()
                ->lockForUpdate()
                ->findOrFail($supportRequest->id);

            if (
                $ticket->status !== 'in_progress'
                || (int) $ticket->assigned_to !== (int) $request->user()->id
            ) {
                return [
                    'error' => 'forbidden',
                    'message' => 'Chỉ nhân viên đang phụ trách mới được gửi yêu cầu xử lý đến Admin.',
                ];
            }

            if ($ticket->admin_request_status === 'pending') {
                return [
                    'error' => 'already_pending',
                    'message' => 'Yêu cầu này đã được gửi đến Admin và đang chờ xử lý.',
                ];
            }

            $ticket->forceFill([
                'admin_request_status' => 'pending',
                'admin_request_content' => $data['content'],
                'admin_requested_by' => $request->user()->id,
                'admin_requested_at' => now(),
                'admin_processed_by' => null,
                'admin_processed_at' => null,
            ])->save();

            $this->workflow->addHistory(
                $ticket,
                $request->user()->id,
                'sent_to_admin',
                'in_progress',
                'in_progress',
                'Nhân viên hỗ trợ đã gửi yêu cầu xử lý đến Admin.',
                [
                    'content' => $data['content'],
                ]
            );

            $this->workflow->notifyAdmins(
                'Yêu cầu hỗ trợ cần xử lý',
                "Mã: {$ticket->ticket_code}\nNVHT đã gửi yêu cầu xử lý.\n\nNội dung:\n{$data['content']}",
                'support_request_admin_action',
                $ticket->id
            );

            return [
                'ticket' => $ticket->fresh(),
            ];
        }, 3);

        if (($updated['error'] ?? null) === 'forbidden') {
            return response()->json([
                'success' => false,
                'message' => $updated['message'],
            ], 403);
        }

        if (($updated['error'] ?? null) === 'already_pending') {
            return response()->json([
                'success' => false,
                'message' => $updated['message'],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi yêu cầu xử lý đến Admin.',
            'data' => $updated['ticket'],
        ]);
    }
}