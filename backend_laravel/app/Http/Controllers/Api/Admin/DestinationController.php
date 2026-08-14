<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Destination;
use App\Models\Province;
use App\Models\TourActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DestinationController extends Controller
{
    /**
     * 1. Lấy danh sách tất cả các điểm đến (Destinations).
     *
     * * @return JsonResponse
     */
    public function index()
    {
        // Lấy toàn bộ bản ghi từ bảng destinations
        return response()->json(Destination::with('provinces:id,name')->get(), 200);
    }

    /**
     * 2. Lấy thông tin chi tiết của một điểm đến theo ID.
     *
     * * @param  int  $id
     * @return JsonResponse
     */
    public function show($id)
    {
        // Tìm địa điểm theo ID, nếu không thấy sẽ tự động bắn ra ModelNotFoundException (lỗi 404)
        $destination = Destination::with('provinces:id,name')->findOrFail($id);

        // Trả về dữ liệu dưới dạng JSON với cấu trúc rõ ràng
        return response()->json([
            'success' => true,
            'data' => $destination,
        ], 200);
    }

    /**
     * 3. Thêm mới một điểm đến vào cơ sở dữ liệu.
     */
    public function store(Request $request): JsonResponse
    {
        // Xác thực dữ liệu đầu vào
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'slug' => ['nullable', 'string', 'max:180', 'unique:destinations'],
            'province_city' => ['required', 'string', 'max:150'],
            'country' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'thumbnail_url' => ['nullable', 'string', 'max:500'],
            'thumbnail_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'province_ids' => ['required', 'array', 'size:1'],
            'province_ids.*' => ['integer', 'distinct', 'exists:provinces,id'],
        ]);

        // Tạo mới và trả về dữ liệu vừa tạo với mã trạng thái 201 (Created)
        $provinceIds = Arr::pull($data, 'province_ids', []);
        $data['slug'] = $this->generateUniqueSlug($data['slug'] ?? $data['name']);
        $data['status'] = $data['status'] ?? 'active';
        if ($request->hasFile('thumbnail_image')) {
            $path = $request->file('thumbnail_image')->store('destinations', 'public');
            $data['thumbnail_url'] = asset('storage/'.$path);
        }
        unset($data['thumbnail_image']);
        $destination = Destination::create($data);
        $this->syncProvinces($destination, (array) $provinceIds);
        TourActivityLog::record($request->user()?->id, 'destination_created', $destination->name, 'Đã tạo địa chỉ tour mới.', 'destination', $destination->id);

        return response()->json($destination->load('provinces:id,name'), 201);
    }

    /**
     * 4. Cập nhật thông tin của một điểm đến theo ID.
     *
     * @param  int  $id
     */
    public function update(Request $request, $id): JsonResponse
    {
        // Tìm kiếm bản ghi hoặc trả về lỗi 404 nếu không tìm thấy
        $destination = Destination::findOrFail($id);

        // Cập nhật thông tin với toàn bộ dữ liệu từ request
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:180', Rule::unique('destinations', 'slug')->ignore($destination->id)],
            'province_city' => ['sometimes', 'required', 'string', 'max:120'],
            'country' => ['sometimes', 'required', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'thumbnail_url' => ['nullable', 'string', 'max:500'],
            'thumbnail_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_thumbnail' => ['sometimes', 'boolean'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            'province_ids' => ['sometimes', 'required', 'array', 'size:1'],
            'province_ids.*' => ['integer', 'distinct', 'exists:provinces,id'],
        ]);
        $provinceIds = Arr::pull($data, 'province_ids', null);

        if (array_key_exists('name', $data) || array_key_exists('slug', $data)) {
            $slugSource = array_key_exists('slug', $data) && trim((string) $data['slug']) !== ''
                ? $data['slug']
                : ($data['name'] ?? $destination->name);
            $data['slug'] = $this->generateUniqueSlug($slugSource, $destination->id);
        }

        $removeThumbnail = filter_var($data['remove_thumbnail'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if ($request->hasFile('thumbnail_image')) {
            $this->deleteStoredDestinationImage($destination->thumbnail_url);
            $path = $request->file('thumbnail_image')->store('destinations', 'public');
            $data['thumbnail_url'] = asset('storage/'.$path);
        } elseif ($removeThumbnail) {
            $this->deleteStoredDestinationImage($destination->thumbnail_url);
            $data['thumbnail_url'] = null;
        }
        unset($data['thumbnail_image'], $data['remove_thumbnail']);
        $destination->update($data);
        if ($provinceIds !== null) {
            $this->syncProvinces($destination, $provinceIds);
        }
        TourActivityLog::record($request->user()?->id, 'destination_updated', $destination->name, 'Đã cập nhật địa chỉ tour.', 'destination', $destination->id);

        return response()->json($destination->fresh()->load('provinces:id,name'), 200);
    }

    /**
     * 5. Xóa mềm (Soft Delete)
     * Đánh dấu bản ghi là đã xóa bằng cách điền thời gian hiện tại vào cột 'deleted_at'.
     * Bản ghi vẫn tồn tại trong DB nhưng sẽ bị ẩn khỏi các truy vấn thông thường.
     */
    public function destroy(Request $request, $id)
    {
        // Tìm bản ghi cần xóa; nếu không thấy sẽ tự động trả về lỗi 404
        $destination = Destination::findOrFail($id);

        // Thực hiện xóa mềm
        $destination->delete();
        TourActivityLog::record($request->user()?->id, 'destination_deleted', $destination->name, 'Đã chuyển địa chỉ tour vào thùng rác.', 'destination', $destination->id);

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
    public function restore(Request $request, $id)
    {
        // Phải tìm trong phạm vi các bản ghi đã xóa (onlyTrashed)
        $destination = Destination::onlyTrashed()->findOrFail($id);

        // Khôi phục bản ghi
        $destination->restore();
        TourActivityLog::record($request->user()?->id, 'destination_restored', $destination->name, 'Đã khôi phục địa chỉ tour.', 'destination', $destination->id);

        return response()->json(['message' => 'Đã khôi phục thành công'], 200);
    }

    /**
     * 8. Xóa vĩnh viễn (Force Delete)
     * Loại bỏ hoàn toàn dòng dữ liệu đó ra khỏi bảng (không thể khôi phục).
     */
    public function forceDelete(Request $request, $id)
    {
        // Phải tìm trong phạm vi các bản ghi đã xóa trước khi xóa vĩnh viễn
        $destination = Destination::onlyTrashed()->findOrFail($id);

        // Xóa vật lý khỏi database
        $destinationId = $destination->id;
        $destinationName = $destination->name;
        $destination->forceDelete();
        TourActivityLog::record($request->user()?->id, 'destination_force_deleted', $destinationName, 'Đã xóa vĩnh viễn địa chỉ tour.', 'destination', $destinationId);

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
            'city' => 'nullable|string|max:100',
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
            'data' => $results,
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

    public function provinces()
    {
        return response()->json(['data' => Province::query()->orderBy('name')->get(['id', 'name'])]);
    }

    public function districts(Destination $destination)
    {
        $provinces = $destination->provinces()
            ->with(['districts:id,province_id,name'])
            ->orderBy('name')
            ->get(['provinces.id', 'provinces.name']);

        // Tương thích điểm đến cũ chưa có dòng pivot: tự nhận tỉnh từ province_city.
        if ($provinces->isEmpty() && $destination->province_city) {
            $legacyProvince = Province::query()
                ->with(['districts:id,province_id,name'])
                ->where('name', $destination->province_city)
                ->first(['id', 'name']);
            $provinces = $legacyProvince ? collect([$legacyProvince]) : collect();
        }

        return response()->json(['data' => $provinces]);
    }

    private function syncProvinces(Destination $destination, array $provinceIds): void
    {
        if ($provinceIds === []) {
            $matchedId = Province::query()->where('name', $destination->province_city)->value('id');
            $provinceIds = $matchedId ? [$matchedId] : [];
        }
        $destination->provinces()->sync($provinceIds);
    }

    private function generateUniqueSlug(string $value, ?int $ignoreId = null): string
    {
        $baseSlug = Str::slug($value) ?: 'diem-den';
        $slug = $baseSlug;
        $index = 1;

        while (Destination::withTrashed()
            ->when($ignoreId !== null, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->where('slug', $slug)
            ->exists()) {
            $slug = $baseSlug.'-'.$index++;
        }

        return $slug;
    }

    private function deleteStoredDestinationImage(?string $imageUrl): void
    {
        if (! $imageUrl || ! str_contains($imageUrl, '/storage/destinations/')) {
            return;
        }
        $urlPath = parse_url($imageUrl, PHP_URL_PATH);
        if (! is_string($urlPath) || ! Str::startsWith($urlPath, '/storage/')) {
            return;
        }
        Storage::disk('public')->delete(Str::after($urlPath, '/storage/'));
    }
}
