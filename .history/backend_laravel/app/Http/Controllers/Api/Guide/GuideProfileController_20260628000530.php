<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    //Sửa thông 
    public function update(Request $request)
    {
        // Xác định User đang gửi yêu cầu
        $user = $request->user();

        // Tìm kiếm thông tin Guide của User hiện tại
        $guide = Guide::where('user_id', $user->id)->first();

        // Kiểm tra tồn tại trước khi cập nhật
        if (!$guide) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản này chưa có thông tin HDV',
            ], 404);
        }

        // Xác thực dữ liệu đầu vào (Validation)
        $validated = $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'sometimes|nullable|string|max:20',
            'avatar_url' => 'sometimes|nullable|string|max:255',
            'certificate_type' => 'sometimes|string|max:255',
            'experience_years' => 'sometimes|integer|min:0',
            'status' => 'sometimes|in:active,inactive',
            'languages' => 'sometimes|array',
            'languages.*.language_id' => 'required_with:languages|exists:languages,id',
            'languages.*.level_id' => 'nullable|integer',
            'certificates' => 'sometimes|array',
            'certificates.*.certificate_id' => 'required_with:certificates|exists:certificates,id',
            'certificates.*.issued_year' => 'nullable|integer|min:1900|max:' . date('Y'),
        ]);

        // Sử dụng Database Transaction để đảm bảo toàn vẹn dữ liệu
        // Nếu bất kỳ phần cập nhật nào lỗi, toàn bộ thay đổi sẽ được rollback
        DB::transaction(function () use ($validated, $user, $guide) {
            // Cập nhật thông tin profile User
            $user->update([
                'full_name' => $validated['full_name'] ?? $user->full_name,
                'email' => $validated['email'] ?? $user->email,
                'phone' => $validated['phone'] ?? $user->phone,
                'avatar_url' => $validated['avatar_url'] ?? $user->avatar_url,
            ]);

            // Cập nhật thông tin profile Guide
            $guide->update([
                'certificate_type' => $validated['certificate_type'] ?? $guide->certificate_type,
                'experience_years' => $validated['experience_years'] ?? $guide->experience_years,
                'status' => $validated['status'] ?? $guide->status,
            ]);

            // Đồng bộ hóa danh sách ngôn ngữ (Many-to-Many)
            if (isset($validated['languages'])) {
                $syncLanguages = [];
                foreach ($validated['languages'] as $language) {
                    $syncLanguages[$language['language_id']] = [
                        'level_id' => $language['level_id'] ?? null,
                    ];
                }
                $guide->languages()->sync($syncLanguages);
            }

            // Cập nhật danh sách chứng chỉ/kinh nghiệm (One-to-Many)
            if (isset($validated['certificates'])) {
                // Xóa dữ liệu cũ và tạo mới toàn bộ (phương pháp Replace)
                $guide->experiences()->delete();
                foreach ($validated['certificates'] as $certificate) {
                    $guide->experiences()->create([
                        'certificate_id' => $certificate['certificate_id'],
                        'issued_year' => $certificate['issued_year'] ?? null,
                    ]);
                }
            }
        });

        // Load lại dữ liệu mới nhất sau khi cập nhật để trả về cho client
        $guide->load([
            'user:id,role_id,full_name,email,phone,avatar_url,status',
            'languages:id,name',
            'experiences.certificate:id,name,issued_by',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thông tin HDV thành công',
            'data' => [
                // ... [Dữ liệu trả về tương tự như hàm show] ...
            ],
        ]);
    }
}
