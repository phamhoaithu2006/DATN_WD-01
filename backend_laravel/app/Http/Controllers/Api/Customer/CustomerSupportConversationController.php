<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\SupportRequest;
use App\Models\SupportRequestMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Throwable;

class CustomerSupportConversationController extends Controller
{
    /**
     * =========================================================
     * LẤY LỊCH SỬ TRAO ĐỔI CỦA MỘT YÊU CẦU
     * =========================================================
     *
     * Chỉ khách hàng sở hữu ticket mới được xem.
     *
     * GET:
     * /api/customer/support-requests/{supportRequest}/messages
     */
    public function messages(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        // Kiểm tra ticket có thuộc khách hàng đang đăng nhập hay không
        $this->authorizeOwner(
            $request,
            $supportRequest
        );

        $messages = $supportRequest
            ->messages()
            ->with([
                'sender:id,full_name,email,avatar_url',
                'attachments',
            ])
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $messages,
        ]);
    }

    /**
     * =========================================================
     * KHÁCH HÀNG GỬI PHẢN HỒI
     * =========================================================
     *
     * POST:
     * /api/customer/support-requests/{supportRequest}/messages
     *
     * Khách có thể:
     * - gửi nội dung
     * - gửi file
     * - hoặc cả hai
     */
    public function sendMessage(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        // Chỉ chủ ticket mới được gửi tin nhắn
        $this->authorizeOwner(
            $request,
            $supportRequest
        );

        /*
        |--------------------------------------------------------------------------
        | Không cho phản hồi khi yêu cầu đã hoàn tất
        |--------------------------------------------------------------------------
        */
        if ($supportRequest->status === 'resolved') {
            return response()->json([
                'success' => false,
                'message' => 'Yêu cầu này đã hoàn tất và không nhận thêm phản hồi.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Validate dữ liệu
        |--------------------------------------------------------------------------
        */
        $data = $request->validate([
            'message' => [
                'nullable',
                'string',
                'max:10000',
                'required_without:attachments',
            ],

            'attachments' => [
                'nullable',
                'array',
                'max:5',
            ],

            'attachments.*' => [
                'file',
                'mimes:jpg,jpeg,png,webp,pdf,doc,docx',
                'max:5120',
            ],
        ]);

        $storedPaths = [];

        try {
            $message = DB::transaction(
                function () use (
                    $request,
                    $supportRequest,
                    $data,
                    &$storedPaths
                ) {
                    /*
                    |--------------------------------------------------------------------------
                    | Tạo tin nhắn
                    |--------------------------------------------------------------------------
                    */
                    $message = SupportRequestMessage::query()
                        ->create([
                            'support_request_id' => $supportRequest->id,

                            'sender_id' => $request->user()->id,

                            'sender_type' => 'customer',

                            'message' => $data['message'] ?? null,
                        ]);

                    /*
                    |--------------------------------------------------------------------------
                    | Upload file đính kèm
                    |--------------------------------------------------------------------------
                    */
                    if ($request->hasFile('attachments')) {
                        foreach (
                            $request->file('attachments') as $file
                        ) {
                            $path = $file->store(
                                "support-request-messages/{$supportRequest->id}/{$message->id}",
                                'public'
                            );

                            $storedPaths[] = $path;

                            $message
                                ->attachments()
                                ->create([
                                    'original_name' =>
                                        $file->getClientOriginalName(),

                                    'file_path' =>
                                        $path,

                                    'mime_type' =>
                                        $file->getMimeType(),

                                    'size' =>
                                        $file->getSize(),
                                ]);
                        }
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Thông báo cho NVHT
                    |--------------------------------------------------------------------------
                    |
                    | Nếu ticket đã có người xử lý:
                    | -> gửi thông báo cho NVHT đó.
                    |
                    | Nếu chưa có người xử lý:
                    | -> không tạo notification riêng ở đây,
                    |    vì ticket vẫn đang nằm trong kho chung.
                    |
                    */
                    $this->notifyAssignedSupportStaff(
                        $supportRequest
                    );

                    return $message;
                },
                3
            );

            /*
            |--------------------------------------------------------------------------
            | Load thông tin người gửi + file
            |--------------------------------------------------------------------------
            */
            $message->load([
                'sender:id,full_name,email,avatar_url',
                'attachments',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Đã gửi phản hồi.',
                'data' => $message,
            ], 201);
        } catch (Throwable $exception) {
            /*
             * Nếu transaction rollback nhưng file đã upload,
             * xóa các file đó để tránh file rác.
             */
            foreach ($storedPaths as $path) {
                Storage::disk('public')
                    ->delete($path);
            }

            throw $exception;
        }
    }

    /**
     * =========================================================
     * KIỂM TRA QUYỀN SỞ HỮU TICKET
     * =========================================================
     */
    private function authorizeOwner(
        Request $request,
        SupportRequest $supportRequest
    ): void {
        if (
            (int) $supportRequest->user_id
            !==
            (int) $request->user()->id
        ) {
            /*
             * Trả 404 thay vì 403 để không làm lộ ticket
             * của khách hàng khác.
             */
            abort(404);
        }
    }

    /**
     * =========================================================
     * THÔNG BÁO CHO NVHT ĐANG XỬ LÝ
     * =========================================================
     */
    private function notifyAssignedSupportStaff(
        SupportRequest $supportRequest
    ): void {
        /*
         * Ticket chưa có NVHT nhận thì bỏ qua.
         */
        if (! $supportRequest->assigned_to) {
            return;
        }

        /*
         * Nếu bảng notifications không tồn tại thì bỏ qua.
         */
        if (! Schema::hasTable('notifications')) {
            return;
        }

        $notificationData = [
            'user_id' => $supportRequest->assigned_to,

            'title' => 'Khách hàng có phản hồi mới',

            'message' =>
                "Khách hàng vừa phản hồi yêu cầu {$supportRequest->ticket_code}.\n"
                . "Tiêu đề: {$supportRequest->subject}",

            'status' => 'unread',
        ];

        /*
         * Một số project có cột type.
         */
        if (
            Schema::hasColumn(
                'notifications',
                'type'
            )
        ) {
            $notificationData['type'] = 'system';
        }

        /*
         * Một số project có draft_id.
         */
        if (
            Schema::hasColumn(
                'notifications',
                'draft_id'
            )
        ) {
            $notificationData['draft_id'] = null;
        }

        Notification::query()
            ->create($notificationData);
    }
}