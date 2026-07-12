<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class AdminNotificationBellController extends Controller
{
    public function unreadCount(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Bạn chưa đăng nhập.',
                'data' => [
                    'count' => 0,
                ],
            ], 401);
        }

        $query = Notification::query()
            ->where('user_id', $user->id);

        if (Schema::hasColumn('notifications', 'status')) {
            $query->where('status', 'unread');
        }

        if (Schema::hasColumn('notifications', 'read_at')) {
            $query->whereNull('read_at');
        }

        return response()->json([
            'message' => 'Số thông báo chưa đọc',
            'data' => [
                'count' => $query->count(),
            ],
        ]);
    }

    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Bạn chưa đăng nhập.',
                'data' => [],
            ], 401);
        }

        $notifications = Notification::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 8));

        return response()->json([
            'message' => 'Danh sách thông báo',
            'data' => $notifications,
        ]);
    }

    public function markAsRead(Request $request, int $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Bạn chưa đăng nhập.',
            ], 401);
        }

        $notification = Notification::query()
            ->where('user_id', $user->id)
            ->findOrFail($id);

        $payload = [];

        if (Schema::hasColumn('notifications', 'status')) {
            $payload['status'] = 'read';
        }

        if (Schema::hasColumn('notifications', 'read_at')) {
            $payload['read_at'] = now();
        }

        if (!empty($payload)) {
            $payload['updated_at'] = now();
            $notification->update($payload);
        }

        return response()->json([
            'message' => 'Đã đọc thông báo',
            'data' => $notification->fresh(),
        ]);
    }

    public function markAllAsRead(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Bạn chưa đăng nhập.',
            ], 401);
        }

        $payload = [];

        if (Schema::hasColumn('notifications', 'status')) {
            $payload['status'] = 'read';
        }

        if (Schema::hasColumn('notifications', 'read_at')) {
            $payload['read_at'] = now();
        }

        if (!empty($payload)) {
            $payload['updated_at'] = now();

            Notification::query()
                ->where('user_id', $user->id)
                ->where(function ($query) {
                    if (Schema::hasColumn('notifications', 'status')) {
                        $query->orWhere('status', 'unread');
                    }

                    if (Schema::hasColumn('notifications', 'read_at')) {
                        $query->orWhereNull('read_at');
                    }
                })
                ->update($payload);
        }

        return response()->json([
            'message' => 'Đã đọc tất cả thông báo',
        ]);
    }
}