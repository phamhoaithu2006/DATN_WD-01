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
        // Sử dụng quan hệ 'wishlists' đã định nghĩa trong model User
        return TourResource::collection($request->user()->wishlists()->paginate(10));
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
