<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\NotificationDraft;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationCustomerController extends Controller
{
    //Hiển thị danh sách thông báo của khách hàng
    public function getMyNotifications(Request $request)
    {
        // Lấy ID của user đang đăng nhập
        $userId = $request->user()->id;

        // Lấy thông báo, ưu tiên thông báo mới nhất
        $notifications = \App\Models\Notification::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->paginate(10); // Phân trang để tối ưu tải trang cho khách hàng

        return response()->json([
            'message' => 'Danh sách thông báo của bạn',
            'data' => $notifications
        ], 200);
    }

    //Xem chi tiết thông báo
    public function getNotificationDetail($id, Request $request)
    {
        // Tìm thông báo theo ID và đảm bảo thuộc về user đang đăng nhập
        $notification = \App\Models\Notification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$notification) {
            return response()->json(['message' => 'Thông báo không tồn tại!'], 404);
        }

        // Tự động đánh dấu là đã đọc khi khách hàng mở xem chi tiết
        if ($notification->status === 'unread') {
            $notification->update([
                'status' => 'read',
                'read_at' => now()
            ]);
        }

        return response()->json([
            'message' => 'Chi tiết thông báo',
            'data' => $notification
        ], 200);
    }

    //khi họ click vào thông báo, trạng thái sẽ chuyển từ unread sang read.
}
