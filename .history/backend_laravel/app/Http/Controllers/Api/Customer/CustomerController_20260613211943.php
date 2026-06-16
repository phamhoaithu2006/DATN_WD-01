<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class CustomerController extends Controller
{
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

}