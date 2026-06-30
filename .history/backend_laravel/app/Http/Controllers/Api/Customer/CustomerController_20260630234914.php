<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Setting;
use App\Models\Tour;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CustomerController extends Controller
{
    // Sửa thông tin cơ bản cho người dùng
    public function updateProfile(Request $request)
{
    // 1. Kiểm tra dữ liệu FE gửi lên
    $validatedData = $request->validate([
        // Họ tên bắt buộc, là chuỗi và tối đa 255 ký tự
        'full_name' => 'required|string|max:255',

        // Số điện thoại có thể bỏ trống, tối đa 20 ký tự
        'phone' => 'nullable|string|max:20',

        // FE gửi file ảnh với key là "avatar"
        // Chỉ nhận jpg, jpeg, png, webp và dung lượng tối đa 2MB
        'avatar' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
    ]);

    // 2. Lấy user hiện đang đăng nhập từ token Sanctum
    $user = $request->user();

    // 3. Tạo mảng dữ liệu cơ bản cần cập nhật
    $updateData = [
        'full_name' => $validatedData['full_name'],
        'phone' => $validatedData['phone'] ?? null,
    ];

    // 4. Kiểm tra người dùng có chọn file ảnh mới hay không
    if ($request->hasFile('avatar')) {

        // Lưu ảnh vào thư mục:
        // storage/app/public/avatars
        //
        // $newPath sẽ có dạng:
        // avatars/abcxyz123.jpg
        $newPath = $request->file('avatar')->store('avatars', 'public');

        // 5. Xóa ảnh avatar cũ để tránh file rác trong storage
        if ($user->avatar_url) {

            // Lấy phần path từ URL cũ
            // Ví dụ:
            // http://localhost:8000/storage/avatars/old.jpg
            // sẽ lấy được:
            // /storage/avatars/old.jpg
            $oldUrlPath = parse_url($user->avatar_url, PHP_URL_PATH);

            // Chỉ xóa khi avatar cũ là ảnh được lưu trong hệ thống Laravel
            if (
                is_string($oldUrlPath) &&
                Str::startsWith($oldUrlPath, '/storage/avatars/')
            ) {
                // Chuyển:
                // /storage/avatars/old.jpg
                // thành:
                // avatars/old.jpg
                $oldPath = Str::after($oldUrlPath, '/storage/');

                // Xóa file cũ trong storage/app/public/avatars
                Storage::disk('public')->delete($oldPath);
            }
        }

        // 6. Tạo URL public của ảnh mới để lưu vào database
        // Ví dụ:
        // http://localhost:8000/storage/avatars/abcxyz123.jpg
        $updateData['avatar_url'] = asset('storage/' . $newPath);
    }

    // 7. Cập nhật thông tin user vào database
    $user->update($updateData);

    // 8. Trả về user mới nhất sau khi cập nhật
    return response()->json([
        'success' => true,
        'message' => 'Cập nhật thành công',
        'data' => $user->fresh(),
    ]);
}

    // ===========Đổi Pass khi nhớ MK cũ==============================
    // Sửa mật khẩu cho người dùng (TH: nhớ mật khẩu cũ)
    public function changePassword(Request $request)
    {
        $passwordMinLength = Setting::intValueFor('password_min_length', 8);

        // 1. Xác thực dữ liệu đầu vào (Validation)
        $request->validate([
            'current_password' => 'required', // Bắt buộc nhập mật khẩu cũ
            'new_password' => ['required', Password::min($passwordMinLength), 'confirmed'],
            // 'min:6': Mật khẩu mới tối thiểu 6 ký tự
            // 'confirmed': Tự động so khớp với trường 'new_password_confirmation' (phải gửi kèm từ frontend)
        ]);

        $user = $request->user();

        // 2. Kiểm tra mật khẩu hiện tại (Security Check)
        // Hash::check sẽ so sánh chuỗi plain-text ($request->current_password)
        // với mã hash đã lưu trong database ($user->password)
        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Mật khẩu cũ không đúng'], 400); // Mã lỗi 400: Bad Request
        }

        // 3. Cập nhật mật khẩu mới
        // Hash::make giúp mã hóa mật khẩu mới trước khi lưu vào database
        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        // 4. Trả về phản hồi thành công
        return response()->json(['message' => 'Đổi mật khẩu thành công']);
    }

    // ======================================Đổi Pass khi không nhớ MK cũ============================================
    // Gửi mã OTP
    public function forgotPassword(Request $request)
    {
        $request->validate(['identifier' => 'required']);

        $user = User::where('email', $request->identifier)
            ->orWhere('phone', $request->identifier)
            ->first();

        if (! $user) {
            return response()->json(['message' => 'Tài khoản không tồn tại'], 404);
        }

        $otp = rand(100000, 999999);

        // THỬ CÁCH LƯU TRỰC TIẾP NÀY XEM CÓ ĐƯỢC KHÔNG:
        $user->otp = $otp;
        $user->save(); // Dùng save() thay vì update() để kiểm tra

        // Debug: Kiểm tra xem đã lưu chưa
        if ($user->otp == $otp) {
            return response()->json(['message' => 'Lưu thành công', 'otp_in_db' => $user->otp]);
        } else {
            return response()->json(['message' => 'Lưu thất bại']);
        }
    }

    // Xác nhận mã OTP và đổi pass
    public function resetPassword(Request $request)
    {
        $passwordMinLength = Setting::intValueFor('password_min_length', 8);

        // 1. Xác thực dữ liệu đầu vào
        // Yêu cầu đầy đủ các thông tin cần thiết: định danh, mã OTP và mật khẩu mới
        $request->validate([
            'identifier' => 'required',
            'otp' => 'required',
            'password' => ['required', Password::min($passwordMinLength), 'confirmed'], // confirmed yêu cầu password_confirmation
        ]);

        // 2. Tìm người dùng dựa trên email hoặc số điện thoại
        $user = User::where('email', $request->identifier)
            ->orWhere('phone', $request->identifier)->first();

        // 3. Kiểm tra tính hợp lệ của OTP
        // Kiểm tra xem user có tồn tại không VÀ mã OTP có khớp với mã đã lưu không
        if (! $user || $user->otp != $request->otp) {
            return response()->json(['message' => 'Mã OTP không đúng hoặc tài khoản không tồn tại'], 400);
        }

        // 4. Cập nhật mật khẩu mới và xóa mã OTP
        // Mật khẩu mới được hash trước khi lưu.
        // Đặt otp = null để ngăn chặn việc sử dụng lại mã này (One-time use)
        $user->update([
            'password' => Hash::make($request->password),
            'otp' => null,
        ]);

        return response()->json(['message' => 'Đặt lại mật khẩu thành công']);
    }
    // ==========================================================================================================================

}
