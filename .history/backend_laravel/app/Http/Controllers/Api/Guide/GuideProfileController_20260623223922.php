<?php

namespace App\Http\Controllers\Api\;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class GuideProfileController extends Controller
{
    public function getProfile(Request $request)
    {
        // Lấy thông tin user đang đăng nhập
        $user = $request->user();

        // Kiểm tra xem có phải là role HDV (role_id = 3) hay không
        if ($user->role_id !== 3) {
            return response()->json(['message' => 'Bạn không phải là hướng dẫn viên'], 403);
        }

        // Lấy dữ liệu kèm theo các quan hệ
        $profile = $user->load([
            'guideProfile.experiences', 
            'guideProfile.languages'
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $profile
        ]);
    }
}