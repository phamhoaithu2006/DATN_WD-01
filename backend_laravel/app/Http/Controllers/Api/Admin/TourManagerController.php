<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tour;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TourManagerController extends Controller
{
    /**
     * 1. API Quản lý danh sách tour (Admin)
     * Yêu cầu: Không hiển thị tour bị ẩn + Tích hợp Lọc & Tìm kiếm
     */
    public function index(Request $request) 
    {
        // Loại trừ tour bị ẩn
        $query = Tour::where('status', '!=', 'hidden');

        //  1. ADMIN TÌM KIẾM: Theo tiêu đề tour (title)
        if ($request->has('search') && $request->search != '') {
            $query->where('title', 'LIKE', '%' . $request->search . '%');
        }

        //  2. ADMIN LỌC TRẠNG THÁI: Lọc nhanh theo 'draft', 'published', 'cancelled'
        if ($request->has('status') && $request->status != '') {
            $query->where('status', $request->status);
        }

        //  3. ADMIN LỌC KHOẢNG GIÁ: Lọc theo khoảng giá base_price
        if ($request->has('price_from') && $request->price_from != '') {
            $query->where('base_price', '>=', $request->price_from);
        }
        if ($request->has('price_to') && $request->price_to != '') {
            $query->where('base_price', '<=', $request->price_to);
        }

        // Giữ nguyên logic sắp xếp và phân trang theo ID giảm dần của bạn
        $tours = $query->orderBy('id', 'desc')->paginate(10);
        
        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách quản lý tour thành công',
            'data' => $tours
        ]);
    }

    /**
     * 2. API Hiển thị tất cả danh sách tour (User)
     * Chỉ lấy danh sách tour chưa ẩn và đã được published + Tích hợp Lọc & Tìm kiếm
     */
    public function publicIndex(Request $request) 
    {
        // Gốc của bạn: Chỉ lấy các tour đã xuất bản (published)
        $query = Tour::where('status', 'published');

        //  1. USER TÌM KIẾM: Tìm theo tiêu đề tour
        if ($request->has('search') && $request->search != '') {
            $query->where('title', 'LIKE', '%' . $request->search . '%');
        }

        //  2. USER LỌC KHOẢNG GIÁ: Tìm theo ngân sách của khách
        if ($request->has('price_from') && $request->price_from != '') {
            $query->where('base_price', '>=', $request->price_from);
        }
        if ($request->has('price_to') && $request->price_to != '') {
            $query->where('base_price', '<=', $request->price_to);
        }

        // Giữ nguyên logic sắp xếp và phân trang theo ID giảm dần của bạn
        $tours = $query->orderBy('id', 'desc')->paginate(10);
        
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

}
