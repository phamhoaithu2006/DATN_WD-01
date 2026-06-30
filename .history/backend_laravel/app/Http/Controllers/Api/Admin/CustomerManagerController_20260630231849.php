<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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
        // Sử dụng groupBy để lấy danh sách role_id và số lượng tương ứng
        // Kết quả sẽ có dạng: [{role_id: 1, total: 5}, {role_id: 2, total: 20}, ...]
        $data = User::select('role_id', DB::raw('count(*) as total'))
            ->groupBy('role_id')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $data
        ], 200);
    }

    public function statistics(): JsonResponse
    {
        // 1. THỐNG KÊ USER TOÀN HỆ THỐNG
        // Đếm tổng số bản ghi hiện có trong bảng 'users' không phân biệt vai trò
        $totalUsers = User::count();

        // Đếm số lượng người dùng có trạng thái 'active' (đang hoạt động) trên toàn bộ bảng
        $activeUsers = User::where('status', 'active')->count();

        // Đếm số lượng người dùng có trạng thái 'inactive' (bị khóa/không hoạt động) trên toàn bộ bảng
        $lockedUsers = User::where('status', 'inactive')->count();


        // 2. THỐNG KÊ ĐẶT LỊCH (BOOKINGS)
        // Kiểm tra và đếm các đơn đặt lịch trong bảng 'bookings'
        // Sử dụng whereHas để lọc chỉ những đơn thuộc về user có role_id = 2 (Khách hàng)
        $totalBookings = Booking::whereHas('user', function ($query) {
            $query->where('role_id', 2);
        })->count();


        // 3. TRẢ VỀ DỮ LIỆU
        // Đóng gói các kết quả đã tính toán vào một mảng định dạng JSON
        return response()->json([
            'status' => 'success', // Trạng thái phản hồi thành công
            'data' => [
                'total_users'    => $totalUsers,    // Tổng số người dùng hệ thống
                'active_users'   => $activeUsers,   // Số người dùng đang hoạt động
                'locked_users'   => $lockedUsers,   // Số người dùng bị khóa
                'total_bookings' => $totalBookings, // Tổng số lượt đặt lịch từ nhóm Khách hàng (role 2)
            ],
        ], 200); // Mã phản hồi HTTP 200 (OK)
    }


    /**
     * Hiển thị danh sách tất cả khách hàng kèm theo tổng số booking của mỗi người.
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        // Sử dụng withCount('bookings') để đếm số lượng đặt chỗ của mỗi người
        $users = User::withCount('bookings')->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status'  => 'success',
            'message' => 'Lấy danh sách tất cả người dùng thành công',
            'data'    => $users
        ], 200);
    }

    //     public function index(): JsonResponse
    // {
    //     // Sử dụng paginate(10) thay vì get() để chia 10 user mỗi trang
    //     // Và orderBy để đưa user mới nhất lên đầu
    //     $users = User::withCount('bookings')
    //         ->orderBy('created_at', 'desc')
    //         ->paginate(10);

    //     return response()->json([
    //         'status'  => 'success',
    //         'message' => 'Lấy danh sách người dùng thành công (10 user/trang)',
    //         'data'    => $users
    //     ], 200);
    // }


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
        $query = User::withCount('bookings'); // Thêm withCount nếu cần

        // 1. Lọc theo role_id
        $query->when($request->role_id, function ($q) use ($request) {
            return $q->where('role_id', $request->role_id);
        });

        // 2. Lọc theo status
        $query->when($request->status, function ($q) use ($request) {
            return $q->where('status', $request->status);
        });

        // 3. Tìm kiếm tổng hợp theo 'search' (Tên hoặc Email hoặc SĐT)
        $query->when($request->search, function ($q) use ($request) {
            $term = '%' . $request->search . '%';
            return $q->where(function ($subQuery) use ($term) {
                $subQuery->where('full_name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('phone', 'like', $term);
            });
        });

        // Sử dụng paginate(10) thay vì get() như bạn đã yêu cầu trước đó
        $customers = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status'  => 'success',
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
        $validatedData = $request->validate([
            'full_name' => 'required|string|max:255',
            'email'     => 'required|email|unique:users,email',
            'password'  => 'required|min:6',
            'phone'     => 'nullable|string|max:15',
            'role_id'   => 'required|exists:roles,id',

            // FE gửi file với key là avatar
            'avatar'    => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        $avatarUrl = null;

        if ($request->hasFile('avatar')) {
            // Lưu vào storage/app/public/avatars
            $path = $request->file('avatar')->store('avatars', 'public');

            // Ví dụ: http://localhost:8000/storage/avatars/abc123.jpg
            $avatarUrl = url(Storage::disk('public')->url($path));
        }

        $user = User::create([
            'full_name'  => $validatedData['full_name'],
            'email'      => $validatedData['email'],
            'password'   => Hash::make($validatedData['password']),
            'phone'      => $validatedData['phone'] ?? null,
            'role_id'    => $validatedData['role_id'],
            'status'     => 'active',
            'avatar_url' => $avatarUrl,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Tạo tài khoản thành công',
            'data'    => $user,
        ], 201);
    }


    //hiển thị role
    public function index_role()
    {
        // Lấy tất cả các role
        $roles = Role::all(['id', 'name']); // Chỉ lấy những cột cần thiết

        return response()->json([
            'status' => 'success',
            'data'   => $roles
        ], 200);
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
        $customer = User::find($id);

        if (!$customer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy người dùng',
            ], 404);
        }

        $validatedData = $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'email'     => 'sometimes|email|unique:users,email,' . $id,
            'phone'     => 'nullable|string|max:15',
            'status'    => 'sometimes|in:active,inactive',
            'password'  => 'sometimes|string|min:6',
            'role_id'   => 'sometimes|exists:roles,id',

            'avatar'    => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        if (isset($validatedData['password'])) {
            $validatedData['password'] = Hash::make($validatedData['password']);
        }

        // Không đưa avatar file trực tiếp vào update database
        unset($validatedData['avatar']);

        if ($request->hasFile('avatar')) {
            // Xóa ảnh cũ nếu ảnh cũ được lưu trong storage của Laravel
            if ($customer->avatar_url) {
                $oldPath = parse_url($customer->avatar_url, PHP_URL_PATH) ?? '';

                // /storage/avatars/abc.jpg -> avatars/abc.jpg
                $oldPath = ltrim($oldPath, '/');

                if (Str::startsWith($oldPath, 'storage/')) {
                    $oldPath = Str::after($oldPath, 'storage/');
                    Storage::disk('public')->delete($oldPath);
                }
            }

            // Lưu ảnh mới
            $newPath = $request->file('avatar')->store('avatars', 'public');

            $validatedData['avatar_url'] = url(
                Storage::disk('public')->url($newPath)
            );
        }

        $customer->update($validatedData);

        return response()->json([
            'status'  => 'success',
            'message' => 'Cập nhật thông tin thành công',
            'data'    => $customer->fresh(),
        ]);
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
