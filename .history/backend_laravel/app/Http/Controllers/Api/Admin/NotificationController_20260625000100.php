<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NotificationDraft;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    //Tạo bản nháp thông báo (I)
    public function saveDraft(Request $request)
    {
        // 1. Validate dữ liệu
        $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'target_type' => 'required|in:all,role,specific',
            'target_ids' => 'nullable|array', // Mảng các ID người dùng hoặc ID vai trò
        ]);

        // 2. Kiểm tra nếu có id thì cập nhật, không thì tạo mới
        $draft = NotificationDraft::updateOrCreate(
            ['id' => $request->id, 'status' => 'draft'], // Điều kiện tìm kiếm
            [
                'title' => $request->title,
                'message' => $request->message,
                'target_type' => $request->target_type,
                'target_ids' => $request->target_ids,
                'status' => 'draft'
            ]
        );

        return response()->json([
            'message' => 'Lưu nháp thành công!',
            'data' => $draft
        ], 200);
    }

    //Lấy danh sách bản nháp (II)
    public function listDrafts()
    {
        // Lấy tất cả bản nháp, sắp xếp theo thời gian mới nhất
        $drafts = NotificationDraft::where('status', 'draft')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'message' => 'Danh sách bản nháp',
            'data' => $drafts
        ], 200);
    }

    //Xem chi tiết bản nháp (III)
    public function showDraft($id)
    {
        // Tìm bản nháp theo ID, nếu không thấy sẽ tự động trả về lỗi 404
        $draft = NotificationDraft::findOrFail($id);

        // Kiểm tra thêm nếu bạn chỉ muốn lấy những bản chưa gửi
        if ($draft->status !== 'draft') {
            return response()->json(['message' => 'Bản nháp này đã được gửi hoặc không tồn tại.'], 404);
        }

        return response()->json([
            'message' => 'Chi tiết bản nháp',
            'data' => $draft
        ], 200);
    }

    //Chỉnh sửa bản nháp (IV)
    public function updateDraft(Request $request, $id)
    {
        // 1. Tìm bản nháp cần sửa
        $draft = NotificationDraft::where('id', $id)->where('status', 'draft')->first();

        if (!$draft) {
            return response()->json(['message' => 'Không tìm thấy bản nháp hoặc bản nháp đã được gửi.'], 404);
        }

        // 2. Validate dữ liệu mới
        $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'target_type' => 'required|in:all,role,specific',
            'target_ids' => 'nullable|array',
        ]);

        // 3. Cập nhật dữ liệu
        $draft->update([
            'title' => $request->title,
            'message' => $request->message,
            'target_type' => $request->target_type,
            'target_ids' => $request->target_ids,
        ]);

        return response()->json([
            'message' => 'Cập nhật bản nháp thành công!',
            'data' => $draft
        ], 200);
    }

    //Xóa mềm bản nháp (V)
    public function destroy($id)
    {
        $draft = NotificationDraft::find($id);

        if (!$draft) {
            return response()->json(['message' => 'Bản nháp không tồn tại.'], 404);
        }

        $draft->delete(); // Lệnh này tự động cập nhật deleted_at (xóa mềm)

        return response()->json(['message' => 'Đã xóa bản nháp thành công!'], 200);
    }

    //Danh sách xóa mềm (VI)
    public function listTrashedDrafts()
    {
        // Chỉ lấy những bản ghi đã bị xóa mềm
        $trashedDrafts = NotificationDraft::onlyTrashed()
            ->orderBy('deleted_at', 'desc')
            ->get();

        return response()->json([
            'message' => 'Danh sách bản nháp trong thùng rác',
            'data' => $trashedDrafts
        ], 200);
    }

    //Khoi phục xóa mềm (VII)
    public function restoreDraft($id)
    {
        // 1. Tìm bản ghi đã xóa (sử dụng withTrashed để tìm cả những bản đã bị xóa mềm)
        $draft = NotificationDraft::withTrashed()->find($id);

        // 2. Kiểm tra nếu không tồn tại hoặc chưa bị xóa
        if (!$draft || !$draft->trashed()) {
            return response()->json(['message' => 'Bản nháp không tồn tại trong thùng rác.'], 404);
        }

        // 3. Khôi phục bản ghi
        $draft->restore();

        return response()->json([
            'message' => 'Khôi phục bản nháp thành công!',
            'data' => $draft
        ], 200);
    }

    //Xóa vĩnh viễn bản nháp (VIII)
    public function forceDeleteDraft($id)
    {
        // 1. Tìm bản ghi đã xóa bằng withTrashed()
        $draft = NotificationDraft::withTrashed()->find($id);

        // 2. Kiểm tra nếu không tồn tại
        if (!$draft) {
            return response()->json(['message' => 'Bản nháp không tồn tại.'], 404);
        }

        // 3. Xóa vĩnh viễn khỏi database
        $draft->forceDelete();

        return response()->json(['message' => 'Đã xóa vĩnh viễn bản nháp thành công!'], 200);
    }

    //Gửi thông báo (IX)
    public function sendNotification($id)
    {
        $draft = NotificationDraft::where('id', $id)->where('status', 'draft')->first();

        if (!$draft) {
            return response()->json(['message' => 'Bản nháp không tồn tại hoặc đã gửi!'], 404);
        }

        $users = match ($draft->target_type) {
            'all' => User::all(),
            'role' => User::whereIn('role_id', $draft->target_ids)->get(),
            'specific' => User::whereIn('id', $draft->target_ids)->get(),
            default => collect(),
        };

        // Vòng lặp để tạo bản ghi cho từng user
        foreach ($users as $user) {
            Notification::create([
                'draft_id' => $draft->id,
                'user_id' => $user->id,
                'title'   => $draft->title,
                'message' => $draft->message,
                'type'    => 'system',
                'status'  => 'unread' // Dùng cột bạn vừa thêm vào migration
            ]);
        }

        $draft->update(['status' => 'sent']);

        return response()->json(['message' => 'Gửi thông báo thành công cho ' . $users->count() . ' người!']);
    }

    //Hiển thị thông báo đã gửi (X)
    public function getAllSentNotifications()
    {
        // Lấy tất cả các bản nháp đã gửi (campaigns)
        $campaigns = \App\Models\NotificationDraft::where('status', 'sent')
            ->orderBy('updated_at', 'desc')
            ->get();

        // Duyệt qua từng chiến dịch để đếm xem đã gửi cho bao nhiêu người
        $result = $campaigns->map(function ($campaign) {
            return [
                'id' => $campaign->id,
                'title' => $campaign->title,
                'message' => $campaign->message,
                'sent_at' => $campaign->updated_at,
                // Đếm số người nhận dựa trên bảng notifications 
                // Giả định bạn có lưu thông tin chiến dịch trong cột 'data' hoặc dùng một bảng liên kết
                'total_recipients' => \App\Models\Notification::where('title', $campaign->title)
                    ->where('created_at', '>=', $campaign->updated_at->subMinutes(1))
                    ->count(),
            ];
        });

        return response()->json([
            'message' => 'Danh sách các chiến dịch thông báo đã gửi',
            'data' => $result
        ], 200);
    }

    //Thu hồi lại thông báo đã gửi (XI)
    public function revoke($draft_id)
    {
        // 1. Kiểm tra bản nháp xem có tồn tại và đã gửi hay chưa
        $draft = \App\Models\NotificationDraft::where('id', $draft_id)
            ->where('status', 'sent')
            ->first();

        if (!$draft) {
            return response()->json([
                'message' => 'Không tìm thấy chiến dịch hoặc thông báo đã bị thu hồi trước đó!'
            ], 404);
        }

        // 2. Xóa các thông báo đã gửi dựa trên draft_id
        // Nếu bạn chưa kịp thêm draft_id, hãy dùng: where('title', $draft->title)
        $deletedCount = \App\Models\Notification::where('draft_id', $draft_id)->delete();

        // 3. Cập nhật lại trạng thái bản nháp về 'draft' để Admin có thể chỉnh sửa và gửi lại
        $draft->update(['status' => 'draft']);

        return response()->json([
            'message' => "Đã thu hồi thành công $deletedCount thông báo đã gửi cho người dùng.",
        ], 200);
    }
}
