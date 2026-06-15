<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TourResource;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    /**
     * Lấy danh sách các tour mà user đã yêu thích.
     */
    public function index(Request $request) {
        // Sử dụng quan hệ 'wishlists' đã định nghĩa trong model User
        return TourResource::collection($request->user()->wishlists()->paginate(10));
    }

    /**
     * Thêm một tour vào danh sách yêu thích.
     */
    public function store(Request $request) {
        // Kiểm tra dữ liệu đầu vào: tour_id phải tồn tại trong bảng tours
        $request->validate(['tour_id' => 'required|exists:tours,id']);

        // syncWithoutDetaching giúp thêm mới mà không xóa các tour đã lưu trước đó.
        // Nếu tour đã tồn tại, nó sẽ không làm gì cả (tránh lỗi trùng lặp).
        $request->user()->wishlists()->syncWithoutDetaching([$request->tour_id]);

        return response()->json(['message' => 'Đã lưu tour vào danh sách yêu thích']);
    }

    /**
     * Xóa một tour khỏi danh sách yêu thích.
     */
    public function destroy($tour_id, Request $request) {
        // Loại bỏ liên kết giữa user và tour trong bảng trung gian
        $request->user()->wishlists()->detach($tour_id);
        
        return response()->json(['message' => 'Đã xóa khỏi danh sách yêu thích']);
    }
}