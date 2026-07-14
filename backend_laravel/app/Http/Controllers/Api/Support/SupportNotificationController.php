<?php

namespace App\Http\Controllers\Api\Support;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SupportNotificationController extends Controller
{
    public function getMyNotifications(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $notifications = Notification::query()
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(10);

        return response()->json([
            'message' => 'Danh sách thông báo của bạn',
            'data' => $notifications,
        ]);
    }

    public function getNotificationDetail(int $id, Request $request): JsonResponse
    {
        $notification = Notification::query()
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $notification) {
            return response()->json(['message' => 'Thông báo không tồn tại!'], 404);
        }

        if ($notification->status === 'unread') {
            $payload = [];

            if (Schema::hasColumn('notifications', 'status')) {
                $payload['status'] = 'read';
            }

            if (Schema::hasColumn('notifications', 'read_at')) {
                $payload['read_at'] = now();
            }

            if (! empty($payload)) {
                $notification->update($payload);
            }
        }

        return response()->json([
            'message' => 'Chi tiết thông báo',
            'data' => $notification->fresh(),
        ]);
    }

    public function markAsRead(int $id, Request $request): JsonResponse
    {
        $notification = Notification::query()
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $notification) {
            return response()->json(['message' => 'Không tìm thấy thông báo!'], 404);
        }

        $payload = [];

        if (Schema::hasColumn('notifications', 'status')) {
            $payload['status'] = 'read';
        }

        if (Schema::hasColumn('notifications', 'read_at')) {
            $payload['read_at'] = now();
        }

        if (! empty($payload)) {
            $notification->update($payload);
        }

        return response()->json([
            'message' => 'Đã đánh dấu đã đọc!',
            'data' => $notification->fresh(),
        ]);
    }

    public function getUnreadCount(Request $request): JsonResponse
    {
        $query = Notification::query()
            ->where('user_id', $request->user()->id);

        if (Schema::hasColumn('notifications', 'status')) {
            $query->where('status', 'unread');
        }

        if (Schema::hasColumn('notifications', 'read_at')) {
            $query->whereNull('read_at');
        }

        return response()->json([
            'unread_count' => $query->count(),
        ]);
    }

    public function sendNotification(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string'],
        ]);

        $adminIds = User::query()
            ->whereHas('role', function ($query) {
                $query->where('name', 'admin');
            })
            ->pluck('id');

        if ($adminIds->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy tài khoản admin để gửi thông báo.',
            ], 404);
        }

        DB::transaction(function () use ($adminIds, $validated, $request) {
            $notifications = $adminIds->map(function ($adminId) use ($validated, $request) {
                return [
                    'user_id' => $adminId,
                    'title' => $validated['title'],
                    'message' => $validated['message'],
                    'type' => 'support_message',
                    'data' => json_encode([
                        'source' => 'support_to_admin',
                        'sender_role' => 'support staff',
                        'sender_user_id' => $request->user()->id,
                    ], JSON_UNESCAPED_UNICODE),
                    'status' => 'unread',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })->all();

            Notification::insert($notifications);
        });

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi thông báo tới admin thành công.',
        ]);
    }
}
