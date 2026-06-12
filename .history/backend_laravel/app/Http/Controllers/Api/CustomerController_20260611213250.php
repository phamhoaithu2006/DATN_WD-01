<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class CustomerController extends Controller
{
    /**
     * Hiển thị danh sách tất cả khách hàng.
     * * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        // 1. Truy vấn cơ sở dữ liệu:
        // Lọc tất cả các bản ghi từ bảng 'users' có 'role_id' bằng 2.
        // Role_id = 2 tương ứng với 'customer' trong bảng 'roles'.
        $customers = User::where('role_id', 2)->get();

        // 2. Trả về kết quả dưới dạng JSON:
        // Chúng ta bao gói dữ liệu trong một mảng chuẩn để phía Frontend 
        // dễ dàng kiểm tra trạng thái (status) và đọc dữ liệu (data).
        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách khách hàng thành công',
            'data' => $customers
        ], 200);
    }


    /**
     * Tìm kiếm khách hàng theo các điều kiện lọc (Name, Email, Phone, Status).
     * * Cách thức hoạt động:
     * - Sử dụng phương thức 'when()' để kiểm tra sự tồn tại của tham số trong request.
     * - Nếu tham số tồn tại, Laravel sẽ tự động nối điều kiện vào câu lệnh SQL.
     * - 'like' được dùng cho 'name' để tìm kiếm gần đúng, giúp trải nghiệm người dùng tốt hơn.
     * * @param Request $request
     * @return JsonResponse
     */
    public function search(Request $request): JsonResponse
    {
        // Khởi tạo truy vấn: Chỉ lấy những User có role_id = 2 (tương ứng với khách hàng)
        $query = User::where('role_id', 2);

        // 1. Tìm kiếm theo tên (Tìm gần đúng - Like)
        $query->when($request->name, function ($q) use ($request) {
            return $q->where('full_name', 'like', '%' . $request->name . '%');
        });

        // 2. Tìm kiếm theo email (Tìm chính xác)
        $query->when($request->email, function ($q) use ($request) {
            return $q->where('email', $request->email);
        });

        // 3. Tìm kiếm theo số điện thoại (Tìm chính xác)
        $query->when($request->phone, function ($q) use ($request) {
            return $q->where('phone', $request->phone);
        });

        // 4. Lọc theo trạng thái tài khoản (VD: active, inactive)
        $query->when($request->status, function ($q) use ($request) {
            return $q->where('status', $request->status);
        });

        // Thực thi truy vấn và lấy kết quả
        $customers = $query->get();

        // Trả về kết quả JSON chuẩn hóa
        return response()->json([
            'status' => 'success',
            'count' => $customers->count(), // Trả về thêm số lượng bản ghi tìm thấy
            'data' => $customers
        ], 200);
    }
}