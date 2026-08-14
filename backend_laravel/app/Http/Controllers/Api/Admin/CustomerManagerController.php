<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\CustomerPresenceSession;
use App\Models\Guide;
use App\Models\Role;
use App\Models\SupportStaff;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CustomerManagerController extends Controller
{
    private const ONLINE_THRESHOLD_SECONDS = 120;

    private function syncRoleRelations(User $user): void
    {
        $user->loadMissing('role');

        $roleName = $user->role?->name;

        if ($roleName === 'support staff') {
            $this->restoreSupportStaff($user);
        } else {
            $this->archiveSupportStaff($user);
        }

        if ($roleName === 'tour guide') {
            $this->restoreGuide($user);
        } else {
            $this->archiveGuide($user);
        }
    }

    private function restoreSupportStaff(User $user): void
    {
        $staff = SupportStaff::withTrashed()
            ->where('user_id', $user->id)
            ->orWhere('email', $user->email)
            ->first();

        if (! $staff) {
            return;
        }

        if ($staff->trashed()) {
            $staff->restore();
        }

        $staff->update([
            'user_id' => $user->id,
            'name' => $user->full_name,
            'email' => $user->email,
            'role' => 'customer_service',
            'status' => $user->status === 'inactive' ? 'inactive' : 'active',
            'hidden_at' => null,
        ]);
    }

    private function archiveSupportStaff(User $user): void
    {
        $staff = SupportStaff::query()->where('user_id', $user->id)->first();

        if (! $staff) {
            return;
        }

        $staff->update([
            'status' => 'hidden',
            'hidden_at' => Carbon::now(),
        ]);

        $staff->delete();
    }

    private function restoreGuide(User $user): void
    {
        $guide = Guide::withTrashed()->where('user_id', $user->id)->first();

        if ($guide) {
            if ($this->isPlaceholderGuide($guide)) {
                if (! $guide->trashed()) {
                    $guide->delete();
                }

                return;
            }

            if ($guide->trashed()) {
                $guide->restore();
            }

            $guide->update([
                'user_id' => $user->id,
                'status' => $user->status === 'inactive' ? 'inactive' : 'active',
            ]);
        }
    }

    private function isPlaceholderGuide(Guide $guide): bool
    {
        return (int) $guide->experience_years === 0
            && (float) $guide->average_rating === 0.0
            && (int) $guide->review_count === 0
            && ! $guide->provinces()->exists()
            && ! $guide->languages()->exists()
            && ! $guide->experiences()->exists();
    }

    private function archiveGuide(User $user): void
    {
        $guide = Guide::query()->where('user_id', $user->id)->first();

        if (! $guide) {
            return;
        }

        $guide->update([
            'status' => 'inactive',
        ]);

        $guide->delete();
    }

    private function generateGuideCode(): string
    {
        $count = Guide::withTrashed()->count() + 1;

        return 'HDV'.str_pad((string) $count, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Lấy tổng số lượng khách hàng hiện có trong hệ thống.
     * * * Cơ chế hoạt động:
     * - Thực hiện truy vấn đếm (COUNT) trên bảng 'users'.
     * - Chỉ lọc các tài khoản có 'role_id' bằng 2 (quy ước cho khách hàng).
     *
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
            'data' => $data,
        ], 200);
    }

    public function statistics(): JsonResponse
    {
        // This endpoint powers the customer-management screen, so only count customer accounts.
        $customers = User::query()->whereHas('role', fn ($query) => $query->where('name', 'customer'));

        $totalUsers = (clone $customers)->count();
        $activeUsers = (clone $customers)->where('status', 'active')->count();
        $lockedUsers = (clone $customers)->whereIn('status', ['inactive', 'locked'])->count();
        $totalBookings = Booking::whereHas('user.role', fn ($query) => $query->where('name', 'customer'))->count();

        // 3. TRẢ VỀ DỮ LIỆU
        // Đóng gói các kết quả đã tính toán vào một mảng định dạng JSON
        return response()->json([
            'status' => 'success', // Trạng thái phản hồi thành công
            'data' => [
                'total_users' => $totalUsers,    // Tổng số người dùng hệ thống
                'active_users' => $activeUsers,   // Số người dùng đang hoạt động
                'locked_users' => $lockedUsers,   // Số người dùng bị khóa
                'total_bookings' => $totalBookings, // Tổng số lượt đặt lịch từ nhóm Khách hàng (role 2)
            ],
        ], 200); // Mã phản hồi HTTP 200 (OK)
    }

    /**
     * Hiển thị danh sách tất cả khách hàng kèm theo tổng số booking của mỗi người.
     */
    public function index(): JsonResponse
    {
        // Sử dụng withCount('bookings') để đếm số lượng đặt chỗ của mỗi người
        $users = User::withCount('bookings')->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách tất cả người dùng thành công',
            'data' => $users,
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
     */
    public function search(Request $request): JsonResponse
    {
        $query = User::withCount('bookings'); // Thêm withCount nếu cần

        // 1. Lọc theo role_id
        $query->when($request->role_id, function ($q) use ($request) {
            return $q->where('role_id', $request->role_id);
        });

        if ($request->boolean('exclude_completed_support_staff')) {
            $query->whereDoesntHave('supportStaff', function ($supportStaffQuery) {
                $supportStaffQuery
                    ->whereNotNull('specialization')
                    ->where('specialization', '!=', '')
                    ->whereNotNull('experience_years')
                    ->whereNotNull('status')
                    ->where('status', '!=', '');
            });
        }

        // 2. Lọc theo status
        $query->when($request->status, function ($q) use ($request) {
            return $q->where('status', $request->status);
        });

        // 3. Tìm kiếm tổng hợp theo 'search' (Tên hoặc Email hoặc SĐT)
        $query->when($request->search, function ($q) use ($request) {
            $term = '%'.$request->search.'%';

            return $q->where(function ($subQuery) use ($term) {
                $subQuery->where('full_name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('phone', 'like', $term);
            });
        });

        // Sử dụng paginate(10) thay vì get() như bạn đã yêu cầu trước đó
        $customers = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $customers,
        ], 200);
    }

    /**
     * Hàm xử lý tạo mới một tài khoản khách hàng.
     */
    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'phone' => 'nullable|string|max:10',
            'role_id' => 'required|exists:roles,id',

            // FE gửi file với key là avatar
            'avatar' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $avatarUrl = null;

        if ($request->hasFile('avatar')) {
            // Lưu vào storage/app/public/avatars
            $path = $request->file('avatar')->store('avatars', 'public');

            // Ví dụ: http://localhost:8000/storage/avatars/abc123.jpg
            $avatarUrl = asset('storage/'.$path);
        }

        $user = DB::transaction(function () use ($validatedData, $avatarUrl) {
            $user = User::create([
                'full_name' => $validatedData['full_name'],
                'email' => $validatedData['email'],
                'password' => Hash::make($validatedData['password']),
                'phone' => $validatedData['phone'] ?? null,
                'role_id' => $validatedData['role_id'],
                'status' => 'active',
                'avatar_url' => $avatarUrl,
            ]);

            $this->syncRoleRelations($user->fresh());

            return $user;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Tạo tài khoản thành công',
            'data' => $user->fresh('role'),
        ], 201);
    }

    // hiển thị role
    public function index_role()
    {
        // Lấy tất cả các role
        $roles = Role::all(['id', 'name']); // Chỉ lấy những cột cần thiết

        return response()->json([
            'status' => 'success',
            'data' => $roles,
        ], 200);
    }

    /**
     * Xem chi tiết thông tin khách hàng dựa trên ID, kèm theo tổng số booking.
     *
     * @param  int  $id
     */
    public function show($id): JsonResponse
    {
        // Tìm User theo ID và kèm theo thông tin Role + số lượng Booking
        // Sử dụng with để lấy quan hệ role (nếu trong model User đã định nghĩa function role())
        $user = User::with('role')
            ->withCount('bookings')
            ->find($id);

        // Kiểm tra nếu không tìm thấy người dùng
        if (! $user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy người dùng',
            ], 404);
        }

        // Trả về dữ liệu chi tiết của người dùng
        return response()->json([
            'status' => 'success',
            'message' => 'Lấy thông tin thành công',
            'data' => $user,
        ], 200);
    }

    /**
     * Cập nhật thông tin khách hàng (bao gồm cả mật khẩu).
     *
     * @param  int  $id
     */
    public function update(Request $request, $id): JsonResponse
    {
        $customer = User::with('role')->find($id);

        if (! $customer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy người dùng',
            ], 404);
        }

        $validatedData = $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,'.$id,
            'phone' => 'nullable|string|max:15',
            'status' => 'sometimes|in:active,inactive',
            'password' => 'sometimes|string|min:6',
            'role_id' => 'sometimes|exists:roles,id',

            'avatar' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        $previousAvatarPath = null;

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
                    $previousAvatarPath = Str::after($oldPath, 'storage/');
                }
            }

            // Lưu ảnh mới
            $newPath = $request->file('avatar')->store('avatars', 'public');

            $validatedData['avatar_url'] = asset('storage/'.$newPath);
        }

        DB::transaction(function () use ($customer, $validatedData) {
            $customer->update($validatedData);
            $this->syncRoleRelations($customer->fresh());
        });

        if ($previousAvatarPath) {
            Storage::disk('public')->delete($previousAvatarPath);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật thông tin thành công',
            'data' => $customer->fresh('role'),
        ]);
    }

    /**
     * Khóa tài khoản khách hàng bằng cách cập nhật status thành 'inactive'.
     *
     * * @param int $id
     */
    public function lock($id): JsonResponse
    {
        // 1. Tìm kiếm người dùng bằng find() thay vì where()
        $user = User::find($id);

        // 2. Kiểm tra sự tồn tại của người dùng
        if (! $user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy tài khoản người dùng',
            ], 404);
        }

        // 3. Kiểm tra nếu tài khoản đã bị khóa trước đó
        if ($user->status === 'inactive') {
            return response()->json([
                'status' => 'warning',
                'message' => 'Tài khoản này đã bị khóa từ trước',
            ], 422);
        }

        // 4. Cập nhật trạng thái thành 'inactive'
        $user->update(['status' => 'inactive']);

        return response()->json([
            'status' => 'success',
            'message' => 'Tài khoản đã bị khóa thành công',
        ], 200);
    }

    /**
     * Mở khóa tài khoản khách hàng bằng cách cập nhật status thành 'active'.
     *
     * * @param int $id
     */
    public function unlock($id): JsonResponse
    {
        // 1. Tìm kiếm người dùng bằng find() để áp dụng cho mọi tài khoản
        $user = User::find($id);

        // 2. Kiểm tra sự tồn tại của người dùng
        if (! $user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy tài khoản người dùng',
            ], 404);
        }

        // 3. Kiểm tra nếu tài khoản đang ở trạng thái 'active' (không cần mở khóa nữa)
        if ($user->status === 'active') {
            return response()->json([
                'status' => 'warning',
                'message' => 'Tài khoản này hiện đang hoạt động bình thường',
            ], 422);
        }

        // 4. Cập nhật trạng thái thành 'active'
        $user->update(['status' => 'active']);

        return response()->json([
            'status' => 'success',
            'message' => 'Tài khoản đã được mở khóa thành công',
        ], 200);
    }

    public function activityHistory(Request $request, int $id): JsonResponse
    {
        $customer = User::query()
            ->whereHas('role', fn ($query) => $query->where('name', 'customer'))
            ->findOrFail($id);

        $limit = min(max($request->integer('activity_limit', 100), 1), 300);
        $activities = collect();

        if (Schema::hasTable('bookings')) {
            $activities = $activities->merge(
                DB::table('bookings')->where('user_id', $customer->id)
                    ->select('id', 'booking_code', 'status', 'total_amount', 'created_at')->get()
                    ->map(fn ($booking) => [
                        'id' => "booking-{$booking->id}", 'action' => 'booking_created',
                        'description' => 'Đặt tour',
                        'detail' => "Booking {$booking->booking_code} · ".number_format((float) $booking->total_amount, 0, ',', '.').' đ',
                        'status' => $booking->status,
                        'created_at' => Carbon::parse($booking->created_at)->toIso8601String(),
                    ])
            );
        }

        if (Schema::hasTable('payments') && Schema::hasTable('bookings')) {
            $activities = $activities->merge(
                DB::table('payments')->join('bookings', 'bookings.id', '=', 'payments.booking_id')
                    ->where('bookings.user_id', $customer->id)
                    ->select('payments.id', 'payments.payment_method', 'payments.amount', 'payments.status', 'payments.created_at')->get()
                    ->map(fn ($payment) => [
                        'id' => "payment-{$payment->id}", 'action' => 'payment',
                        'description' => 'Thanh toán booking',
                        'detail' => strtoupper($payment->payment_method).' · '.number_format((float) $payment->amount, 0, ',', '.').' đ',
                        'status' => $payment->status,
                        'created_at' => Carbon::parse($payment->created_at)->toIso8601String(),
                    ])
            );
        }

        if (Schema::hasTable('booking_status_histories') && Schema::hasTable('bookings')) {
            $activities = $activities->merge(
                DB::table('booking_status_histories as history')
                    ->join('bookings', 'bookings.id', '=', 'history.booking_id')
                    ->where('bookings.user_id', $customer->id)
                    ->where(function ($query): void {
                        $query->where('history.note', 'like', '[customer_cancellation_requested]%')
                            ->orWhere('history.note', 'like', '[customer_cancellation_withdrawn]%');
                    })
                    ->select('history.id', 'history.note', 'history.created_at', 'bookings.booking_code')
                    ->get()
                    ->map(function ($item): array {
                        $isWithdrawn = str_starts_with($item->note, '[customer_cancellation_withdrawn]');
                        $detail = trim((string) preg_replace('/^\[[^]]+\]\s*/', '', $item->note));

                        return [
                            'id' => "booking-cancellation-{$item->id}",
                            'action' => $isWithdrawn ? 'booking_cancellation_withdrawn' : 'booking_cancellation_requested',
                            'description' => $isWithdrawn ? 'Rút yêu cầu hủy tour' : 'Yêu cầu hủy tour',
                            'detail' => "Booking {$item->booking_code} · {$detail}",
                            'status' => $isWithdrawn ? 'withdrawn' : 'pending',
                            'created_at' => Carbon::parse($item->created_at)->toIso8601String(),
                        ];
                    })
            );
        }

        if (Schema::hasTable('support_requests')) {
            $activities = $activities->merge(
                DB::table('support_requests')->where('user_id', $customer->id)
                    ->select('id', 'ticket_code', 'subject', 'status', 'created_at')->get()
                    ->map(fn ($item) => [
                        'id' => "support-{$item->id}", 'action' => 'support_request',
                        'description' => 'Gửi yêu cầu hỗ trợ',
                        'detail' => "{$item->ticket_code} · {$item->subject}", 'status' => $item->status,
                        'created_at' => Carbon::parse($item->created_at)->toIso8601String(),
                    ])
            );
        }

        if (Schema::hasTable('tour_reviews')) {
            $activities = $activities->merge(
                DB::table('tour_reviews')->where('user_id', $customer->id)
                    ->select('id', 'rating', 'comment', 'status', 'created_at')->get()
                    ->map(fn ($item) => [
                        'id' => "review-{$item->id}", 'action' => 'tour_review',
                        'description' => 'Đánh giá tour',
                        'detail' => "{$item->rating}/5 sao".($item->comment ? " · {$item->comment}" : ''),
                        'status' => $item->status,
                        'created_at' => Carbon::parse($item->created_at)->toIso8601String(),
                    ])
            );
        }

        if (Schema::hasTable('wishlists')) {
            $activities = $activities->merge(
                DB::table('wishlists')->where('user_id', $customer->id)
                    ->select('id', 'tour_id', 'created_at')->get()
                    ->map(fn ($item) => [
                        'id' => "wishlist-{$item->id}", 'action' => 'wishlist_added',
                        'description' => 'Thêm tour vào yêu thích', 'detail' => "Mã tour #{$item->tour_id}",
                        'status' => null, 'created_at' => Carbon::parse($item->created_at)->toIso8601String(),
                    ])
            );
        }

        $activities = $activities->sortByDesc('created_at')->take($limit)->values();

        return response()->json(['success' => true, 'data' => [
            'customer' => [
                'id' => $customer->id, 'name' => $customer->full_name, 'email' => $customer->email,
                'avatar_url' => $customer->avatar_url, 'status' => $customer->status,
            ],
            'activity_summary' => ['total_actions' => $activities->count()],
            'activities' => $activities,
        ]]);
    }

    public function presenceIndex(): JsonResponse
    {
        if (! Schema::hasTable('customer_presence_sessions')) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $customerIds = User::query()
            ->whereHas('role', fn ($query) => $query->where('name', 'customer'))
            ->pluck('id');

        $latestSessions = CustomerPresenceSession::query()
            ->whereIn('user_id', $customerIds)
            ->latest('last_seen_at')
            ->get()
            ->unique('user_id');

        $presence = $customerIds->mapWithKeys(function ($userId) use ($latestSessions) {
            $session = $latestSessions->firstWhere('user_id', $userId);
            $isOnline = $session
                && ! $session->ended_at
                && $session->last_seen_at?->greaterThanOrEqualTo(now()->subSeconds(self::ONLINE_THRESHOLD_SECONDS));

            return [(string) $userId => [
                'is_online' => (bool) $isOnline,
                'last_seen_at' => $session?->last_seen_at?->toIso8601String(),
                'online_since' => $isOnline ? $session?->started_at?->toIso8601String() : null,
                'online_seconds' => $isOnline
                    ? max(0, $session->started_at->diffInSeconds(now()))
                    : 0,
            ]];
        });

        return response()->json(['success' => true, 'data' => $presence]);
    }
}
