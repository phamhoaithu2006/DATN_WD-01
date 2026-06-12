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
}