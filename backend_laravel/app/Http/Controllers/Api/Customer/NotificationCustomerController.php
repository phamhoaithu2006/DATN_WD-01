<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use App\Services\GuideReviewNotificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class NotificationCustomerController extends Controller
{
    public function __construct(
        private readonly GuideReviewNotificationService $guideReviewNotificationService
    ) {}

    // Hiển thị danh sách thông báo của user đang đăng nhập.
    public function getMyNotifications(Request $request)
    {
        $user = $request->user();
        $user->loadMissing('role');

        // Chỉ tài khoản khách hàng mới được tạo thông báo đánh giá HDV.
        if ($this->isCustomer($user)) {
            $this->guideReviewNotificationService->syncForUser($user);
        }

        $notifications = $this->visibleNotificationsQuery($user)
            ->orderByDesc('created_at')
            ->paginate(10);

        return response()->json([
            'message' => 'Danh sách thông báo của bạn',
            'data' => $notifications,
        ], 200);
    }

    // Xem chi tiết thông báo.
    public function getNotificationDetail($id, Request $request)
    {
        $user = $request->user();
        $user->loadMissing('role');

        $notification = $this->visibleNotificationsQuery($user)
            ->whereKey($id)
            ->first();

        if (! $notification) {
            return response()->json(['message' => 'Thông báo không tồn tại!'], 404);
        }

        if ($notification->status === 'unread') {
            $notification->update([
                'status' => 'read',
                'read_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Chi tiết thông báo',
            'data' => $notification,
        ], 200);
    }

    // Đánh dấu thông báo đã đọc.
    public function markAsRead($id, Request $request)
    {
        $user = $request->user();
        $user->loadMissing('role');

        $notification = $this->visibleNotificationsQuery($user)
            ->whereKey($id)
            ->first();

        if (! $notification) {
            return response()->json(['message' => 'Không tìm thấy thông báo!'], 404);
        }

        $notification->update([
            'status' => 'read',
            'read_at' => now(),
        ]);

        return response()->json(['message' => 'Đã đánh dấu đã đọc!']);
    }

    // Hiển thị số lượng thông báo chưa đọc.
    public function getUnreadCount(Request $request)
    {
        $user = $request->user();
        $user->loadMissing('role');

        $count = $this->visibleNotificationsQuery($user)
            ->where('status', 'unread')
            ->count();

        return response()->json(['unread_count' => $count], 200);
    }

    private function visibleNotificationsQuery(User $user): Builder
    {
        $query = Notification::query()->where('user_id', $user->id);

        // HDV, admin và nhân viên hỗ trợ vẫn xem được thông báo của họ,
        // nhưng không được thấy thông báo yêu cầu khách hàng đánh giá HDV.
        if (! $this->isCustomer($user)) {
            $query->where(function (Builder $notificationQuery): void {
                $notificationQuery
                    ->whereNull('data')
                    ->orWhereNull('data->kind')
                    ->orWhere('data->kind', '!=', 'guide_review_request');
            });
        }

        return $query;
    }

    private function isCustomer(User $user): bool
    {
        return mb_strtolower(trim((string) $user->role?->name)) === 'customer';
    }
}
