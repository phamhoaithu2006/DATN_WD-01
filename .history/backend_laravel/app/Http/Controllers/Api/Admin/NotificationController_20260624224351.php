<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NotificationDraft;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
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

    
}