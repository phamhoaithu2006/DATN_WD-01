<?php
namespace App\Http\Controllers\Api\Customer;

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
     * Thêm tour vào danh sách yêu thích của người dùng.
     */
    public function store(Request $request) 
    {
        // 1. Validate dữ liệu đầu vào
        // Kiểm tra 'tour_id' có được gửi lên không và có thực sự tồn tại trong bảng 'tours' không
        $validator = Validator::make($request->all(), [
            'tour_id' => 'required|exists:tours,id',
        ]);

        // Nếu validation thất bại, trả về phản hồi lỗi 422 (Unprocessable Entity)
        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $validator->errors()
            ], 422);
        }

        // 2. Kiểm tra xác thực (Phòng hờ trường hợp quên middleware auth)
        // Đảm bảo chỉ người dùng đã đăng nhập mới có quyền thực hiện hành động này
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Bạn cần đăng nhập để thêm tour yêu thích.'
            ], 401); // 401 Unauthorized
        }

        // 3. Thực hiện lưu vào database
        // syncWithoutDetaching giúp thêm bản ghi vào bảng trung gian (pivot) 
        // mà không xóa các mục đã tồn tại, đồng thời không gây lỗi nếu đã like rồi
        $user->wishlists()->syncWithoutDetaching([$request->tour_id]);

        // Trả về phản hồi thành công
        return response()->json([
            'status' => 'success',
            'message' => 'Đã lưu tour vào danh sách yêu thích'
        ], 200);
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