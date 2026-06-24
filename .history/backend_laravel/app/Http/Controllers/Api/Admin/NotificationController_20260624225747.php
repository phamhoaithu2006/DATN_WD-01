<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NotificationDraft;
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

    //Danh sách xóa mềm
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
}
