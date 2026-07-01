<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class GuideProfileController extends Controller
{
    //Lấy thông tin hdv (I)
    public function show(Request $request)
    {
        // Lấy thông tin user hiện tại từ token xác thực
        $user = $request->user();

        // Truy vấn thông tin Guide (Hướng dẫn viên) từ database
        // Sử dụng Eager Loading (with) để tối ưu hóa truy vấn, tránh lỗi N+1
        $guide = Guide::with([
            'user:id,role_id,full_name,email,phone,avatar_url,status', // Chỉ lấy các cột cần thiết từ bảng User
            'guideLanguages:id,name',                                       // Lấy danh sách ngôn ngữ
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
                'guideLanguages' => $guide->guideLanguages->map(fn($language) => [
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

    //Sửa thông tin hdv (II)
    public function update(Request $request)
    {
        // 1. Lấy user đang đăng nhập từ token Sanctum
        $user = $request->user();

        // 2. Tìm thông tin Guide liên kết với user hiện tại
        $guide = Guide::where('user_id', $user->id)->first();

        // Nếu user chưa có profile HDV thì không cho cập nhật
        if (!$guide) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản này chưa có thông tin HDV',
            ], 404);
        }

        // 3. Validate dữ liệu FE gửi lên
        $validated = $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'sometimes|nullable|string|max:20',

            // FE gửi file ảnh với key là avatar
            // Chỉ nhận jpg, jpeg, png, webp, tối đa 2MB
            'avatar' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',

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

        // 4. Chuẩn bị dữ liệu cập nhật cho bảng users
        $userUpdateData = [];

        // Chỉ update field nào FE thực sự gửi lên
        if (array_key_exists('full_name', $validated)) {
            $userUpdateData['full_name'] = $validated['full_name'];
        }

        if (array_key_exists('email', $validated)) {
            $userUpdateData['email'] = $validated['email'];
        }

        if (array_key_exists('phone', $validated)) {
            $userUpdateData['phone'] = $validated['phone'];
        }

        // 5. Chuẩn bị dữ liệu cập nhật cho bảng guides
        $guideUpdateData = [];

        if (array_key_exists('certificate_type', $validated)) {
            $guideUpdateData['certificate_type'] = $validated['certificate_type'];
        }

        if (array_key_exists('experience_years', $validated)) {
            $guideUpdateData['experience_years'] = $validated['experience_years'];
        }

        if (array_key_exists('status', $validated)) {
            $guideUpdateData['status'] = $validated['status'];
        }

        // Biến lưu đường dẫn avatar mới và avatar cũ
        $newAvatarPath = null;
        $oldAvatarPath = null;

        // 6. Nếu HDV chọn ảnh mới
        if ($request->hasFile('avatar')) {
            // Lưu file vào:
            // storage/app/public/avatars
            //
            // Ví dụ $newAvatarPath:
            // avatars/abcXYZ123.jpg
            $newAvatarPath = $request->file('avatar')->store('avatars', 'public');

            // Nếu upload lỗi thì dừng
            if (!$newAvatarPath) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể lưu ảnh avatar',
                ], 500);
            }

            // Tạo link public để lưu database
            // Ví dụ:
            // http://localhost:8000/storage/avatars/abcXYZ123.jpg
            $userUpdateData['avatar_url'] = asset('storage/' . $newAvatarPath);

            // Lấy đường dẫn avatar cũ để xóa sau khi update DB thành công
            if ($user->avatar_url) {
                $oldUrlPath = parse_url($user->avatar_url, PHP_URL_PATH);

                // Chỉ xử lý ảnh avatar được lưu local trong Laravel
                if (
                    is_string($oldUrlPath) &&
                    Str::startsWith($oldUrlPath, '/storage/avatars/')
                ) {
                    // Chuyển:
                    // /storage/avatars/old-avatar.jpg
                    // thành:
                    // avatars/old-avatar.jpg
                    $oldAvatarPath = Str::after($oldUrlPath, '/storage/');
                }
            }
        }

        try {
            // 7. Transaction: nếu lỗi database thì các thay đổi DB sẽ rollback
            DB::transaction(function () use (
                $validated,
                $user,
                $guide,
                $userUpdateData,
                $guideUpdateData
            ) {
                // Cập nhật thông tin User
                if (!empty($userUpdateData)) {
                    $user->update($userUpdateData);
                }

                // Cập nhật thông tin Guide
                if (!empty($guideUpdateData)) {
                    $guide->update($guideUpdateData);
                }

                // 8. Đồng bộ ngôn ngữ của HDV
                if (isset($validated['languages'])) {
                    $syncLanguages = [];

                    foreach ($validated['languages'] as $language) {
                        $syncLanguages[$language['language_id']] = [
                            'level_id' => $language['level_id'] ?? null,
                        ];
                    }

                    $guide->guideLanguages()->sync($syncLanguages);
                }

                // 9. Cập nhật chứng chỉ
                if (isset($validated['certificates'])) {
                    // Xóa toàn bộ chứng chỉ cũ
                    $guide->experiences()->delete();

                    // Tạo lại danh sách chứng chỉ mới
                    foreach ($validated['certificates'] as $certificate) {
                        $guide->experiences()->create([
                            'certificate_id' => $certificate['certificate_id'],
                            'issued_year' => $certificate['issued_year'] ?? null,
                        ]);
                    }
                }
            });
        } catch (\Throwable $e) {
            // Nếu database lỗi thì xóa ảnh mới vừa upload để tránh file rác
            if ($newAvatarPath) {
                Storage::disk('public')->delete($newAvatarPath);
            }

            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Cập nhật thông tin HDV thất bại',
            ], 500);
        }

        // 10. Chỉ xóa avatar cũ sau khi database update thành công
        if ($oldAvatarPath) {
            Storage::disk('public')->delete($oldAvatarPath);
        }

        // 11. Load lại dữ liệu mới nhất để trả về FE
        $guide->load([
            'user:id,role_id,full_name,email,phone,avatar_url,status',
            'guideLanguages:id,name',
            'experiences.certificate:id,name,issued_by',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thông tin HDV thành công',
            'data' => $guide,
        ]);
    }

    //Sửa pass khi nhớ pass (III)
    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'old_password' => 'required',
            'new_password' => 'required|string|min:6|confirmed',
        ], [
            'old_password.required' => 'Vui lòng nhập mật khẩu cũ.',
            'new_password.required' => 'Vui lòng nhập mật khẩu mới.',
            'new_password.min' => 'Mật khẩu mới phải có ít nhất 6 ký tự.',
            'new_password.confirmed' => 'Mật khẩu xác nhận không khớp.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        // Kiểm tra mật khẩu cũ
        if (!Hash::check($request->old_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Mật khẩu cũ không đúng.',
            ], 400);
        }

        // Không cho phép đặt mật khẩu mới trùng mật khẩu cũ
        if (Hash::check($request->new_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Mật khẩu mới phải khác mật khẩu cũ.',
            ], 400);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đổi mật khẩu thành công.',
        ]);
    }
}
