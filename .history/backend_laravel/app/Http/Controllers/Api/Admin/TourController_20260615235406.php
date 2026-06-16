<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\TourResource;
use App\Models\Tour;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TourController extends Controller
{
    /**
     * 1. API Quản lý danh sách tour (Admin)
     * Yêu cầu: Không hiển thị tour bị ẩn.
     */
    public function index()
    {
        $tours = Tour::where('status', '!=', 'hidden')->orderBy('id', 'desc')->paginate(10);
        
        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách quản lý tour thành công',
            'data' => $tours
        ]);
    }

    /**
     * 2. API Hiển thị tất cả danh sách tour (User)
     * Chỉ lấy danh sách tour chưa ẩn và đã được published (xuất bản).
     */
    public function publicIndex()
    {
        $tours = Tour::where('status', 'published')->orderBy('id', 'desc')->paginate(10);
        
        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách tour thành công',
            'data' => $tours
        ]);
    }

    /**
     * 3. API Thêm tour
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'category_id' => 'required|integer',
            'destination_id' => 'required|integer',
            'created_by' => 'required|integer',
            'title' => 'required|string|max:255',
            'summary' => 'nullable|string|max:500',
            'description' => 'nullable|string',
            'itinerary' => 'nullable|string',
            'duration_days' => 'required|integer',
            'duration_nights' => 'required|integer',
            'base_price' => 'required|numeric',
            'max_slots' => 'required|integer',
            'status' => 'required|in:draft,published,hidden,cancelled',
        ]);

        // Tự động tạo slug nếu chưa có
        $validatedData['slug'] = $request->slug ?? Str::slug($validatedData['title']);
        $validatedData['available_slots'] = $request->available_slots ?? $validatedData['max_slots'];

        $tour = Tour::create($validatedData);

        return response()->json([
            'status' => 'success',
            'message' => 'Thêm tour thành công',
            'data' => $tour
        ], 201);
    }

    /**
     * 4. API Sửa tour
     */
    public function update(Request $request, $id)
    {
        $tour = Tour::findOrFail($id);

        $validatedData = $request->validate([
            'category_id' => 'sometimes|integer',
            'destination_id' => 'sometimes|integer',
            'title' => 'sometimes|string|max:255',
            'base_price' => 'sometimes|numeric',
            // Thêm các rule validate khác tùy nhu cầu cập nhật...
        ]);

        if (isset($validatedData['title']) && !$request->has('slug')) {
            $validatedData['slug'] = Str::slug($validatedData['title']);
        }

        $tour->update($validatedData);

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật tour thành công',
            'data' => $tour
        ]);
    }

    /**
     * 5. API Xóa tour (Soft Delete)
     */
    public function destroy($id)
    {
        $tour = Tour::findOrFail($id);
        $tour->delete(); // Chạy soft delete do Model có cấu hình SoftDeletes

        return response()->json([
            'status' => 'success',
            'message' => 'Đã xóa tour thành công'
        ]);
    }

    /**
     * 6. API Ẩn tour
     * Cập nhật trạng thái thành 'hidden'. Sẽ không hiện trong danh sách Admin (index) và User (publicIndex).
     */
    public function hide($id)
    {
        $tour = Tour::findOrFail($id);
        $tour->update(['status' => 'hidden']);

        return response()->json([
            'status' => 'success',
            'message' => 'Đã ẩn tour thành công',
            'data' => $tour
        ]);
    }

    /**
     * 7. API Hiển thị lại tour bị ẩn
     * Cập nhật trạng thái từ 'hidden' sang 'published' (hoặc 'draft' tùy logic của bạn).
     */
    public function unhide($id)
    {
        $tour = Tour::findOrFail($id);
        
        if ($tour->status !== 'hidden') {
            return response()->json([
                'status' => 'error',
                'message' => 'Tour này hiện không bị ẩn'
            ], 400);
        }

        $tour->update(['status' => 'published']); // Hoặc 'draft'

        return response()->json([
            'status' => 'success',
            'message' => 'Đã bỏ ẩn tour thành công',
            'data' => $tour
        ]);
    }

    /**
     * 8. API Hiển thị tất cả tour bị ẩn
     */
    public function hiddenTours()
    {
        $tours = Tour::where('status', 'hidden')->orderBy('id', 'desc')->paginate(10);
        
        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách tour bị ẩn thành công',
            'data' => $tours
        ]);
    }

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
 * Tìm kiếm và lọc tour theo yêu cầu từ client.
 * Sử dụng Query Builder linh hoạt để xây dựng câu truy vấn theo điều kiện.
 */
public function search(Request $request)
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
}
