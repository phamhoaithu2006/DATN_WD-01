<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class GuideProfileController extends Controller
{
    public function show(Request $request)
    {
        // Lấy thông tin user hiện tại từ token xác thực
        $user = $request->user();

        // Truy vấn thông tin Guide (Hướng dẫn viên) từ database
        // Sử dụng Eager Loading (with) để tối ưu hóa truy vấn, tránh lỗi N+1
        $guide = Guide::with([
            'user:id,role_id,full_name,email,phone,avatar_url,status', // Chỉ lấy các cột cần thiết từ bảng User
            'languages:id,name',                                       // Lấy danh sách ngôn ngữ
            'experiences.certificate:id,name,issued_by',               // Lấy chứng chỉ thông qua bảng trung gian experiences
        ])
            ->where('user_id', $user->id) // Tìm kiếm theo ID của user đang đăng nhập
            ->first();

        // Kiểm tra nếu không tìm thấy bản ghi (trường hợp user chưa thiết lập thông tin HDV)
        if (!$guide) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản này chưa có thông tin HDV',
            ], 404);
        }

        // Trả về dữ liệu đã được định dạng (Format API response)
        return response()->json([
            'success' => true,
            'message' => 'Thông tin HDV đang đăng nhập',
            'data' => [
                // Thông tin cơ bản của Guide
                'id' => $guide->id,
                'user_id' => $guide->user_id,
                'guide_code' => $guide->guide_code,
                'certificate_type' => $guide->certificate_type,
                'experience_years' => $guide->experience_years,
                'average_rating' => $guide->average_rating,
                'review_count' => $guide->review_count,
                'status' => $guide->status,

                // Thông tin chi tiết từ bảng User
                'user' => $guide->user,

                // Mapping lại danh sách ngôn ngữ để lấy thêm thông tin từ bảng trung gian (pivot)
                'languages' => $guide->languages->map(fn($language) => [
                    'id' => $language->id,
                    'name' => $language->name,
                    'level_id' => $language->pivot->level_id, // Lấy trình độ ngôn ngữ từ bảng pivot
                ]),

                // Mapping lại danh sách chứng chỉ từ mối quan hệ experiences
                'certificates' => $guide->experiences->map(fn($exp) => [
                    'id' => $exp->certificate?->id,
                    'name' => $exp->certificate?->name,
                    'issued_by' => $exp->certificate?->issued_by,
                    'issued_year' => $exp->issued_year, // Lấy năm cấp từ bảng trải nghiệm
                ]),
            ],
        ]);
    }
}
