<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\NotificationDraft;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationCustomerController extends Controller
{
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
}