<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\TourResource;
use App\Models\Tour;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TourManagerController extends Controller
{
    
//==============================================================BÊN GIAO DIỆN KHÁCH HÀNG==========================================================================
    /**
     * Lấy danh sách tour cho khách hàng.
     * Sử dụng phân trang và eager loading để tối ưu hiệu năng.
     */
    public function index_gdkh(Request $request)
    {
        $tours = Tour::query()
            ->where('status', 'published')       // Lọc dữ liệu: Chỉ lấy các tour đã xuất bản
            ->with(['category', 'destination'])  // Eager Loading: Load sẵn dữ liệu liên quan để tránh N+1 Query
            ->orderBy('id', 'desc')              // Sắp xếp: Tour mới nhất lên đầu
            ->paginate(12);                      // Phân trang: Giới hạn 12 kết quả mỗi lần gọi, tránh quá tải server/client

        // Chuyển đổi collection dữ liệu sang định dạng JSON đã định nghĩa trong Resource
        return TourResource::collection($tours);
    }

    /**
     * Xem chi tiết một tour.
     * Tìm kiếm theo slug thay vì ID để SEO thân thiện hơn.
     */
    public function show_gdkh($slug)
    {
        // Tìm kiếm tour theo slug và điều kiện xuất bản
        $tour = Tour::where('slug', $slug)
            ->where('status', 'published')
            ->with(['category', 'destination']) // Load kèm dữ liệu để Resource sử dụng
            ->firstOrFail();                    // Nếu không tìm thấy, tự động bắn lỗi 404

        // Trả về dạng object đơn lẻ
        return new TourResource($tour);
    }

    /**
     * Tìm kiếm tour theo yêu cầu từ client.
     * Sử dụng Query Builder linh hoạt để xây dựng câu truy vấn theo điều kiện.
     */
    public function search_gdkh(Request $request)
    {
        // Khởi tạo query với các điều kiện bắt buộc (status, quan hệ liên quan)
        $query = Tour::query()
            ->where('status', 'published') 
            ->with(['category', 'destination']);

        // 1. Tìm kiếm theo tên (Từ khóa)
        // Dùng 'when' để chỉ thêm điều kiện vào query nếu người dùng có nhập 'keyword'
        $query->when($request->filled('keyword'), function ($q) use ($request) {
            $q->where('title', 'LIKE', '%' . $request->keyword . '%');
        });

        // 2. Tìm kiếm theo điểm đến (destination_id)
        $query->when($request->filled('destination_id'), function ($q) use ($request) {
            $q->where('destination_id', $request->destination_id);
        });

        // 3. Tìm kiếm theo ngày khởi hành (start_date)
        // whereDate giúp lấy chính xác ngày bất chấp giờ/phút/giây trong DB
        $query->when($request->filled('start_date'), function ($q) use ($request) {
            $q->whereDate('start_date', $request->start_date);
        });

        // 4. Tìm kiếm theo số khách yêu cầu (available_slots)
        // Kiểm tra xem số chỗ còn trống có đủ cho số lượng khách không
        $query->when($request->filled('guests'), function ($q) use ($request) {
            $q->where('available_slots', '>=', $request->guests);
        });

        // Thực thi query với phân trang để tối ưu bộ nhớ
        $tours = $query->orderBy('id', 'desc')->paginate(12);

        return TourResource::collection($tours);
    }

    /**
     * Lọc danh sách Tour dựa trên các tiêu chí cụ thể.
     * Phù hợp cho tính năng Sidebar Filter trên giao diện người dùng.
     */
    public function filter_gdkh(Request $request)
    {
        // Khởi tạo truy vấn với điều kiện cơ bản
        $query = Tour::query()->where('status', 'published');

        // 1. Lọc theo danh mục (category_id)
        $query->when($request->category_id, fn($q, $id) => $q->where('category_id', $id));

        // 2. Lọc theo khoảng giá (min_price đến max_price)
        // Kết hợp cả hai để tạo khoảng lọc giá trị
        $query->when($request->min_price, fn($q, $min) => $q->where('base_price', '>=', $min));
        $query->when($request->max_price, fn($q, $max) => $q->where('base_price', '<=', $max));

        // 3. Lọc theo số ngày cố định
        $query->when($request->duration_days, fn($q, $days) => $q->where('duration_days', $days));

        // // 4. Lọc theo số chỗ còn trống tối thiểu
        // $query->when($request->min_slots, fn($q, $slots) => $q->where('available_slots', '>=', $slots));

        // Trả về kết quả đã phân trang thông qua Resource
        return TourResource::collection($query->paginate(12));
    }
}
