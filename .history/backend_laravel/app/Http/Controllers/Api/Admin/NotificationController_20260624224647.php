<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NotificationDraft;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    //Tạo bản nháp thông báo ()
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

    //Lấy danh sách bản nháp
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

    //Xem chi tiết bản nháp
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
}
