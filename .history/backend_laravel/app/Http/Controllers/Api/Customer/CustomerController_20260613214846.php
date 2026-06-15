<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class CustomerController extends Controller
{
    //Sửa thông tin cơ bản cho người dùng
    public function updateProfile(Request $request)
    {
        // 1. Xác thực dữ liệu đầu vào (Validation)
        // Đảm bảo dữ liệu gửi lên đúng định dạng trước khi xử lý
        $request->validate([
            'full_name' => 'required|string|max:255', // Bắt buộc, kiểu chuỗi, tối đa 255 ký tự
            'phone'     => 'nullable|string|max:20',  // Có thể để trống, kiểu chuỗi, tối đa 20 ký tự
        ]);

        // 2. Lấy thông tin User đang đăng nhập
        // Sử dụng instance của Request để truy xuất user hiện tại thông qua Auth guard
        $user = $request->user();

        // 3. Cập nhật thông tin vào cơ sở dữ liệu
        // Sử dụng phương thức update() để gán giá trị mới từ request vào model User
        $user->update([
            'full_name' => $request->full_name,
            'phone'     => $request->phone,
        ]);

        // 4. Trả về phản hồi dạng JSON
        // Thông báo cho client (frontend) biết quá trình cập nhật đã hoàn tất
        return response()->json(['success' => true, 'message' => 'Cập nhật thành công']);
    }


    //===========Đổi Pass khi nhớ MK cũ==============================
    //Sửa mật khẩu cho người dùng (TH: nhớ mật khẩu cũ)
    public function changePassword(Request $request)
    {
        // 1. Xác thực dữ liệu đầu vào (Validation)
        $request->validate([
            'current_password' => 'required', // Bắt buộc nhập mật khẩu cũ
            'new_password'     => 'required|min:6|confirmed', 
            // 'min:6': Mật khẩu mới tối thiểu 6 ký tự
            // 'confirmed': Tự động so khớp với trường 'new_password_confirmation' (phải gửi kèm từ frontend)
        ]);

        $user = $request->user();

        // 2. Kiểm tra mật khẩu hiện tại (Security Check)
        // Hash::check sẽ so sánh chuỗi plain-text ($request->current_password) 
        // với mã hash đã lưu trong database ($user->password)
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Mật khẩu cũ không đúng'], 400); // Mã lỗi 400: Bad Request
        }

        // 3. Cập nhật mật khẩu mới
        // Hash::make giúp mã hóa mật khẩu mới trước khi lưu vào database
        $user->update([
            'password' => Hash::make($request->new_password)
        ]);

        // 4. Trả về phản hồi thành công
        return response()->json(['message' => 'Đổi mật khẩu thành công']);
    }


    //===========Đổi Pass khi không nhớ MK cũ==========================
    //Gửi mã OTP
    public function forgotPassword(Request $request)
    {
        $request->validate(['identifier' => 'required']);

        $user = User::where('email', $request->identifier)
                    ->orWhere('phone', $request->identifier)
                    ->first();

        if (!$user) return response()->json(['message' => 'Tài khoản không tồn tại'], 404);

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

    // Xác nhận mã OTP và đổi MK
    public function resetPassword(Request $request)
{
    // 1. Xác thực dữ liệu đầu vào
    // Yêu cầu đầy đủ các thông tin cần thiết: định danh, mã OTP và mật khẩu mới
    $request->validate([
        'identifier' => 'required',
        'otp'        => 'required',
        'password'   => 'required|min:6|confirmed' // confirmed yêu cầu password_confirmation
    ]);

    // 2. Tìm người dùng dựa trên email hoặc số điện thoại
    $user = User::where('email', $request->identifier)
                ->orWhere('phone', $request->identifier)->first();

    // 3. Kiểm tra tính hợp lệ của OTP
    // Kiểm tra xem user có tồn tại không VÀ mã OTP có khớp với mã đã lưu không
    if (!$user || $user->otp != $request->otp) {
        return response()->json(['message' => 'Mã OTP không đúng hoặc tài khoản không tồn tại'], 400);
    }

    // 4. Cập nhật mật khẩu mới và xóa mã OTP
    // Mật khẩu mới được hash trước khi lưu.
    // Đặt otp = null để ngăn chặn việc sử dụng lại mã này (One-time use)
    $user->update([
        'password' => Hash::make($request->password),
        'otp'      => null 
    ]);

    return response()->json(['message' => 'Đặt lại mật khẩu thành công']);
}


}