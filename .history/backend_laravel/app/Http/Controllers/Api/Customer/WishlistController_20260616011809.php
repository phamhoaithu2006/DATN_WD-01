<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Resources\TourResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class WishlistController extends Controller
{
    /**
     * Lấy danh sách các tour mà user đã yêu thích.
     */
    public function index(Request $request)
{
    $user = $request->user();
    
    // In ra thông tin quan trọng để debug
    return response()->json([
        'authenticated_user_id' => $user->id,
        'token_ability' => $request->user()->currentAccessToken()->abilities ?? 'N/A',
        'wishlist_count' => $user->wishlists()->count(),
        'all_wishlist_entries' => \DB::table('wishlists')->where('user_id', $user->id)->get()
    ]);
}

    /**
     * Thêm tour vào danh sách yêu thích của người dùng.
     */
    public function store(Request $request)
    {
        // Kiểm tra người dùng đã đăng nhập chưa
        if (!$request->user()) {
            return response()->json(['message' => 'Bạn chưa đăng nhập'], 401);
        }

        $request->validate(['tour_id' => 'required|exists:tours,id']);
        $request->user()->wishlists()->syncWithoutDetaching([$request->tour_id]);

        return response()->json(['message' => 'Đã lưu tour vào danh sách yêu thích']);
    }

    /**
     * Xóa một tour khỏi danh sách yêu thích.
     */
    public function destroy($tour_id, Request $request)
    {
        // Loại bỏ liên kết giữa user và tour trong bảng trung gian
        $request->user()->wishlists()->detach($tour_id);

        return response()->json(['message' => 'Đã xóa khỏi danh sách yêu thích']);
    }
}
