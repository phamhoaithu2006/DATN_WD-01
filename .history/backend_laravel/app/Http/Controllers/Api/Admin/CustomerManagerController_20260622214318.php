<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
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

    public function statistics(): JsonResponse
    {
        $baseQuery = User::where('role_id', 2);

        $total = (clone $baseQuery)->count();
        $active = (clone $baseQuery)->where('status', 'active')->count();
        $locked = (clone $baseQuery)->where('status', 'inactive')->count();
        $totalBookings = Booking::whereHas('user', function ($query) {
            $query->where('role_id', 2);
        })->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'total' => $total,
                'active' => $active,
                'locked' => $locked,
                'total_bookings' => $totalBookings,
            ],
        ], 200);
    }


    /**
     * Hiển thị danh sách tất cả khách hàng kèm theo tổng số booking của mỗi người.
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        // Loại bỏ where('role_id', 2) để lấy tất cả người dùng
        // Sử dụng withCount('bookings') để đếm số lượng đặt chỗ của mỗi người
        $users = User::withCount('bookings')->get();

        return response()->json([
            'status'  => 'success',
            'message' => 'Lấy danh sách tất cả người dùng thành công',
            'data'    => $users
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
        // Khởi tạo truy vấn (Query Builder)
        $query = User::query();

        // 1. Lọc theo role_id (Nếu có truyền lên thì mới lọc)
        $query->when($request->role_id, function ($q) use ($request) {
            return $q->where('role_id', $request->role_id);
        });

        // 2. Tìm kiếm theo tên (Tìm gần đúng - Like)
        $query->when($request->name, function ($q) use ($request) {
            return $q->where('full_name', 'like', '%' . $request->name . '%');
        });

        // 3. Tìm kiếm theo email (Tìm chính xác)
        $query->when($request->email, function ($q) use ($request) {
            return $q->where('email', $request->email);
        });

        // 4. Tìm kiếm theo số điện thoại (Tìm chính xác)
        $query->when($request->phone, function ($q) use ($request) {
            return $q->where('phone', $request->phone);
        });

        // 5. Lọc theo trạng thái tài khoản
        $query->when($request->status, function ($q) use ($request) {
            return $q->where('status', $request->status);
        });

        // Thực thi truy vấn 
        // Nên sử dụng paginate() nếu dữ liệu lớn, ở đây dùng get() theo yêu cầu của bạn
        $customers = $query->get();

        return response()->json([
            'status'  => 'success',
            'count'   => $customers->count(),
            'data'    => $customers
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
        // Tìm User theo ID và kèm theo thông tin Role + số lượng Booking
        // Sử dụng with để lấy quan hệ role (nếu trong model User đã định nghĩa function role())
        $user = User::with('role')
            ->withCount('bookings')
            ->find($id);

        // Kiểm tra nếu không tìm thấy người dùng
        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy người dùng'
            ], 404);
        }

        // Trả về dữ liệu chi tiết của người dùng
        return response()->json([
            'status'  => 'success',
            'message' => 'Lấy thông tin thành công',
            'data'    => $user
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
        // 1. Tìm kiếm người dùng bằng find() thay vì where()
        $user = User::find($id);

        // 2. Kiểm tra sự tồn tại của người dùng
        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy tài khoản người dùng'
            ], 404);
        }

        // 3. Kiểm tra nếu tài khoản đã bị khóa trước đó
        if ($user->status === 'inactive') {
            return response()->json([
                'status'  => 'warning',
                'message' => 'Tài khoản này đã bị khóa từ trước'
            ], 422);
        }

        // 4. Cập nhật trạng thái thành 'inactive'
        $user->update(['status' => 'inactive']);

        return response()->json([
            'status'  => 'success',
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
        // 1. Tìm kiếm người dùng bằng find() để áp dụng cho mọi tài khoản
        $user = User::find($id);

        // 2. Kiểm tra sự tồn tại của người dùng
        if (!$user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy tài khoản người dùng'
            ], 404);
        }

        // 3. Kiểm tra nếu tài khoản đang ở trạng thái 'active' (không cần mở khóa nữa)
        if ($user->status === 'active') {
            return response()->json([
                'status'  => 'warning',
                'message' => 'Tài khoản này hiện đang hoạt động bình thường'
            ], 422);
        }

        // 4. Cập nhật trạng thái thành 'active'
        $user->update(['status' => 'active']);

        return response()->json([
            'status'  => 'success',
            'message' => 'Tài khoản đã được mở khóa thành công'
        ], 200);
    }
}
