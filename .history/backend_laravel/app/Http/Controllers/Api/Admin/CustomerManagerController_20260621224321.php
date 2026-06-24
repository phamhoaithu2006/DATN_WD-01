<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class CustomerManagerController extends Controller
{

    /**
     * Lấy tổng số lượng khách hàng hiện có trong hệ thống.
     * * * Cơ chế hoạt động:
     * - Thực hiện truy vấn đếm (COUNT) trên bảng 'users'.
     * - Chỉ lọc các tài khoản có 'role_id' bằng 2 (quy ước cho khách hàng).
     * * * @return JsonResponse Trả về đối tượng JSON chứa trạng thái và tổng số lượng.
     */
    public function count(): JsonResponse
    {
        // Đếm số lượng bản ghi thỏa mãn điều kiện role_id = 2
        $total = User::where('role_id', 2)->count();

        // Trả về kết quả dưới dạng JSON với mã trạng thái HTTP 200 (OK)
        return response()->json([
            'status' => 'success',
            'total'  => $total // Trả về con số tổng để Frontend hiển thị lên Dashboard
        ], 200);
    }


    /**
     * Hiển thị danh sách tất cả khách hàng kèm theo tổng số booking của mỗi người.
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        // 1. Truy vấn với withCount('bookings')
        // Laravel sẽ tự động đếm số lượng bản ghi trong bảng bookings có user_id tương ứng
        // và trả về kết quả trong trường 'bookings_count'
        $customers = User::where('role_id', 2)
            ->withCount('bookings')
            ->get();

        // 2. Trả về kết quả JSON
        // Mỗi object trong mảng 'data' bây giờ sẽ có thêm trường 'bookings_count'
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



    /**
     * Hàm xử lý tạo mới một tài khoản khách hàng.
     * * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        // 1. Validate dữ liệu đầu vào
        $validatedData = $request->validate([
            'full_name' => 'required|string|max:255',
            'email'     => 'required|email|unique:users,email',
            'password'  => 'required|min:6',
            'phone'     => 'nullable|string|max:15',
            // Kiểm tra role_id có tồn tại trong bảng roles để đảm bảo tính toàn vẹn dữ liệu
            'role_id'   => 'required|exists:roles,id',
        ]);

        // 2. Tạo User mới với dữ liệu đã được xác thực
        $user = User::create([
            'full_name' => $validatedData['full_name'],
            'email'     => $validatedData['email'],
            // Mã hóa mật khẩu trước khi lưu vào cơ sở dữ liệu
            'password'  => Hash::make($validatedData['password']),
            'phone'     => $validatedData['phone'] ?? null,
            'role_id'   => $validatedData['role_id'],
            'status'    => 'active', // Mặc định trạng thái là active khi tạo mới
        ]);

        // 3. Trả về kết quả JSON với mã trạng thái 201 (Created)
        return response()->json([
            'status'  => 'success',
            'message' => 'Tạo tài khoản thành công',
            'data'    => $user
        ], 201);
    }


    /**
     * Xem chi tiết thông tin khách hàng dựa trên ID, kèm theo tổng số booking.
     * @param int $id
     * @return JsonResponse
     */
    public function show($id): JsonResponse
    {
        // Tìm User theo ID, kiểm tra role và đếm số lượng booking
        $customer = User::where('id', $id)
            ->where('role_id', 2)
            ->withCount('bookings')
            ->first();

        // Nếu không tìm thấy, trả về thông báo lỗi 404
        if (!$customer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy khách hàng'
            ], 404);
        }

        // Nếu tìm thấy, trả về dữ liệu khách hàng (bao gồm bookings_count)
        return response()->json([
            'status' => 'success',
            'data' => $customer
        ], 200);
    }

    /**
     * Cập nhật thông tin khách hàng (bao gồm cả mật khẩu).
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, $id): JsonResponse
    {
        // 1. Tìm kiếm khách hàng (vẫn giữ điều kiện role_id nếu bạn muốn giới hạn đối tượng cập nhật)
        $customer = User::find($id);

        if (!$customer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy người dùng'
            ], 404);
        }

        // 2. Validate dữ liệu
        $validatedData = $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'email'     => 'sometimes|email|unique:users,email,' . $id,
            'phone'     => 'nullable|string|max:15',
            'status'    => 'sometimes|in:active,inactive',
            'password'  => 'sometimes|string|min:6',
            // Thêm rule để cho phép cập nhật role_id nếu nó có trong request
            'role_id'   => 'sometimes|exists:roles,id',
        ]);

        // 3. Xử lý mật khẩu nếu có gửi lên
        if (isset($validatedData['password'])) {
            $validatedData['password'] = Hash::make($validatedData['password']);
        }

        // 4. Cập nhật dữ liệu
        // Laravel sẽ tự động cập nhật các field có trong $validatedData
        $customer->update($validatedData);

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật thông tin thành công',
            'data' => $customer
        ], 200);
    }


    /**
     * Khóa tài khoản khách hàng bằng cách cập nhật status thành 'inactive'.
     * * @param int $id
     * @return JsonResponse
     */
    public function lock($id): JsonResponse
    {
        // 1. Tìm user và kiểm tra quyền
        $customer = User::where('id', $id)->where('role_id', 2)->first();

        if (!$customer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy khách hàng'
            ], 404);
        }

        // 2. Cập nhật trạng thái thành 'inactive'
        $customer->update(['status' => 'inactive']);

        return response()->json([
            'status' => 'success',
            'message' => 'Tài khoản đã bị khóa thành công'
        ], 200);
    }


    /**
     * Mở khóa tài khoản khách hàng bằng cách cập nhật status thành 'active'.
     * * @param int $id
     * @return JsonResponse
     */
    public function unlock($id): JsonResponse
    {
        // 1. Tìm user theo ID và kiểm tra role là khách hàng (2)
        $customer = User::where('id', $id)->where('role_id', 2)->first();

        if (!$customer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy khách hàng'
            ], 404);
        }

        // 2. Cập nhật trạng thái về 'active' để mở khóa
        $customer->update(['status' => 'active']);

        return response()->json([
            'status' => 'success',
            'message' => 'Tài khoản đã được mở khóa thành công'
        ], 200);
    }
}
