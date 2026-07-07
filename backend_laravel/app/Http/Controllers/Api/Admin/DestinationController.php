<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Destination;
use Illuminate\Http\Request;

class DestinationController extends Controller
{
    /**
     * 1. Lấy danh sách tất cả các điểm đến (Destinations).
     * * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        // Lấy toàn bộ bản ghi từ bảng destinations
        return response()->json(Destination::all(), 200);
    }


    /**
     * 2. Lấy thông tin chi tiết của một điểm đến theo ID.
     * * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        // Tìm địa điểm theo ID, nếu không thấy sẽ tự động bắn ra ModelNotFoundException (lỗi 404)
        $destination = Destination::findOrFail($id);

        // Trả về dữ liệu dưới dạng JSON với cấu trúc rõ ràng
        return response()->json([
            'success' => true,
            'data'    => $destination
        ], 200);
    }


    /**
     * 3. Thêm mới một điểm đến vào cơ sở dữ liệu.
     * * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        // Xác thực dữ liệu đầu vào
        $data = $request->validate([
            'name'          => 'required|string',
            'slug'          => 'required|unique:destinations', // Đảm bảo slug là duy nhất
            'province_city' => 'required',
            'country'       => 'required',
        ]);

        // Tạo mới và trả về dữ liệu vừa tạo với mã trạng thái 201 (Created)
        return response()->json(Destination::create($data), 201);
    }


    /**
     * 4. Cập nhật thông tin của một điểm đến theo ID.
     * * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        // Tìm kiếm bản ghi hoặc trả về lỗi 404 nếu không tìm thấy
        $destination = Destination::findOrFail($id);

        // Cập nhật thông tin với toàn bộ dữ liệu từ request
        $destination->update($request->all());

        return response()->json($destination, 200);
    }


    /**
     * 5. Xóa mềm (Soft Delete)
     * Đánh dấu bản ghi là đã xóa bằng cách điền thời gian hiện tại vào cột 'deleted_at'.
     * Bản ghi vẫn tồn tại trong DB nhưng sẽ bị ẩn khỏi các truy vấn thông thường.
     */
    public function destroy($id)
    {
        // Tìm bản ghi cần xóa; nếu không thấy sẽ tự động trả về lỗi 404
        $destination = Destination::findOrFail($id);

        // Thực hiện xóa mềm
        $destination->delete();

        return response()->json(['message' => 'Đã chuyển vào thùng rác'], 200);
    }

    /**
     * 6. Hiển thị danh sách các bản ghi đã xóa mềm
     * Chỉ lấy những bản ghi mà cột 'deleted_at' không rỗng.
     */
    public function trashed()
    {
        // Lọc danh sách chỉ lấy các bản ghi đã bị đánh dấu xóa
        $trashed = Destination::onlyTrashed()->get();

        return response()->json($trashed, 200);
    }

    /**
     * 7. Khôi phục bản ghi đã xóa
     * Tìm bản ghi trong thùng rác và set lại cột 'deleted_at' về NULL.
     */
    public function restore($id)
    {
        // Phải tìm trong phạm vi các bản ghi đã xóa (onlyTrashed)
        $destination = Destination::onlyTrashed()->findOrFail($id);

        // Khôi phục bản ghi
        $destination->restore();

        return response()->json(['message' => 'Đã khôi phục thành công'], 200);
    }

    /**
     * 8. Xóa vĩnh viễn (Force Delete)
     * Loại bỏ hoàn toàn dòng dữ liệu đó ra khỏi bảng (không thể khôi phục).
     */
    public function forceDelete($id)
    {
        // Phải tìm trong phạm vi các bản ghi đã xóa trước khi xóa vĩnh viễn
        $destination = Destination::onlyTrashed()->findOrFail($id);

        // Xóa vật lý khỏi database
        $destination->forceDelete();

        return response()->json(['message' => 'Đã xóa vĩnh viễn khỏi hệ thống'], 200);
    }


    /**
     * 9. Tìm kiếm và lọc danh sách địa điểm với phân trang.
     * Hỗ trợ lọc theo từ khóa, thành phố và quốc gia.
     */
    public function search(Request $request)
    {
        // 1. Validate dữ liệu đầu vào: Đảm bảo dữ liệu an toàn trước khi xử lý
        $request->validate([
            'keyword' => 'nullable|string|max:255',
            'city'    => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
        ]);

        // 2. Khởi tạo query builder
        $query = Destination::query();

        // 3. Xử lý tìm kiếm theo từ khóa (name hoặc province_city)
        // Sử dụng closure để cô lập điều kiện OR, tránh xung đột với các filter khác
        if ($request->filled('keyword')) {
            $keyword = $request->input('keyword');
            $query->where(function ($q) use ($keyword) {
                $q->where('name', 'LIKE', "%{$keyword}%")
                    ->orWhere('province_city', 'LIKE', "%{$keyword}%");
            });
        }

        // 4. Lọc theo thành phố (Sử dụng LIKE để tìm kiếm gần đúng)
        if ($request->filled('city')) {
            $query->where('province_city', 'LIKE', "%{$request->input('city')}%");
        }

        // 5. Lọc theo quốc gia (Tìm kiếm chính xác)
        if ($request->filled('country')) {
            $query->where('country', $request->input('country'));
        }

        // 6. Thực thi phân trang (Pagination)
        // Giới hạn 15 bản ghi/trang để tối ưu hiệu năng server
        $results = $query->paginate(15);

        // 7. Trả về phản hồi cho client
        if ($results->isEmpty()) {
            return response()->json(['message' => 'Không tìm thấy kết quả phù hợp'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $results
        ], 200);
    }

    public function options()
    {
        $items = Destination::query()
            ->where('status', 'active')
            ->orderBy('province_city')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'province_city',
                'country',
            ]);

        return response()->json([
            'data' => $items,
        ]);
    }
}
