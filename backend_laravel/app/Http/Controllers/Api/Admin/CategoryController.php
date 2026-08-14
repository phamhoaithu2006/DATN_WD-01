<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\TourActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->normalizeTextInputs($request);

        $validated = $request->validate([
            'search' => 'nullable|string|max:150',
            'status' => 'nullable|in:active,inactive,all',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $status = $validated['status'] ?? 'active';
        $search = trim((string) ($validated['search'] ?? ''));
        $perPage = min(max((int) ($validated['per_page'] ?? 15), 1), 100);

        $paginator = Category::query()
            ->when($status !== 'all', fn ($query) => $query->where('status', $status))
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->withCount('tours')
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();

        $statistics = [
            'total' => Category::query()->count(),
            'active' => Category::query()->where('status', 'active')->count(),
            'inactive' => Category::query()->where('status', 'inactive')->count(),
        ];

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách loại tour thành công',
            'data' => $paginator->items(),
            'pagination' => $this->paginationPayload($paginator),
            'statistics' => $statistics,
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $request->merge([
            'search' => $request->input('name', $request->input('search')),
        ]);

        return $this->index($request);
    }

    public function show(int $id): JsonResponse
    {
        $category = Category::query()
            ->withCount('tours')
            ->find($id);

        if (! $category) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy loại tour',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy chi tiết loại tour thành công',
            'data' => $category,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->normalizeTextInputs($request);

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:categories,name',
            'description' => 'nullable|string|max:500',
            'thumbnail_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'thumbnail_alt_text' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,inactive',
        ]);

        $thumbnailUrl = null;

        if ($request->hasFile('thumbnail_image')) {
            $path = $request->file('thumbnail_image')->store('categories', 'public');
            $thumbnailUrl = asset('storage/' . $path);
        }

        $category = Category::create([
            'name' => $validated['name'],
            'slug' => $this->generateUniqueSlug($validated['name']),
            'description' => $validated['description'] ?? null,
            'thumbnail_url' => $thumbnailUrl,
            'thumbnail_alt_text' => $validated['thumbnail_alt_text'] ?? null,
            'status' => $validated['status'] ?? 'active',
        ]);

        TourActivityLog::record($request->user()?->id, 'category_created', $category->name, 'Đã tạo loại tour mới.', 'category', $category->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Thêm loại tour thành công',
            'data' => $category,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->normalizeTextInputs($request);

        $category = Category::query()->find($id);

        if (! $category) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy loại tour',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100|unique:categories,name,' . $id,
            'description' => 'sometimes|nullable|string|max:500',
            'thumbnail_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'thumbnail_alt_text' => 'sometimes|nullable|string|max:255',
            'status' => 'sometimes|in:active,inactive',
            'remove_thumbnail' => 'sometimes|boolean',
        ]);

        if (array_key_exists('name', $validated)) {
            $category->name = $validated['name'];
            $category->slug = $this->generateUniqueSlug($validated['name'], $id);
        }

        if (array_key_exists('description', $validated)) {
            $category->description = $validated['description'];
        }

        $removeThumbnail = filter_var($validated['remove_thumbnail'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($request->hasFile('thumbnail_image')) {
            $this->deleteStoredCategoryImage($category->thumbnail_url);

            $path = $request->file('thumbnail_image')->store('categories', 'public');
            $category->thumbnail_url = asset('storage/' . $path);
        } elseif ($removeThumbnail) {
            $this->deleteStoredCategoryImage($category->thumbnail_url);
            $category->thumbnail_url = null;
            $category->thumbnail_alt_text = null;
        }

        if (array_key_exists('thumbnail_alt_text', $validated) && ! $removeThumbnail) {
            $category->thumbnail_alt_text = $validated['thumbnail_alt_text'];
        }

        if (array_key_exists('status', $validated)) {
            $category->status = $validated['status'];
        }

        $category->save();

        TourActivityLog::record($request->user()?->id, 'category_updated', $category->name, 'Đã cập nhật loại tour.', 'category', $category->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật loại tour thành công',
            'data' => $category,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $category = Category::query()->find($id);

        if (! $category) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy loại tour',
            ], 404);
        }

        $tourCount = $category->tours()->count();

        if ($tourCount > 0) {
            return response()->json([
                'status' => 'error',
                'message' => "Không thể xóa loại tour đang được sử dụng bởi {$tourCount} tour.",
                'errors' => [
                    'category' => [
                        'Hãy chuyển các tour sang loại khác trước khi xóa loại tour này.',
                    ],
                ],
                'tour_count' => $tourCount,
            ], 422);
        }

        $category->delete();

        TourActivityLog::record($request->user()?->id, 'category_deleted', $category->name, 'Đã chuyển loại tour vào thùng rác.', 'category', $category->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Xóa mềm loại tour thành công',
        ]);
    }

    public function trashed(): JsonResponse
    {
        $categories = Category::onlyTrashed()
            ->withCount('tours')
            ->latest('deleted_at')
            ->get();

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách loại tour đã xóa mềm thành công',
            'data' => $categories,
        ]);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $category = Category::onlyTrashed()->find($id);

        if (! $category) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy loại tour đã xóa mềm',
            ], 404);
        }

        $hasDuplicateActiveName = Category::query()
            ->where('name', $category->name)
            ->where('id', '!=', $category->id)
            ->exists();

        if ($hasDuplicateActiveName) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không thể khôi phục vì tên loại tour đã tồn tại.',
                'errors' => [
                    'name' => ['Vui lòng đổi tên loại tour đang hoạt động trước khi khôi phục.'],
                ],
            ], 422);
        }

        $category->restore();

        TourActivityLog::record($request->user()?->id, 'category_restored', $category->name, 'Đã khôi phục loại tour.', 'category', $category->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Khôi phục loại tour thành công',
            'data' => $category,
        ]);
    }

    private function generateUniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $baseSlug = Str::slug($name);

        if ($baseSlug === '') {
            $baseSlug = 'loai-tour';
        }

        $slug = $baseSlug;
        $index = 1;

        while (
            Category::withTrashed()
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug = $baseSlug . '-' . $index;
            $index++;
        }

        return $slug;
    }

    private function normalizeTextInputs(Request $request): void
    {
        $payload = [];

        foreach (['name', 'description', 'thumbnail_alt_text', 'search'] as $field) {
            if ($request->exists($field) && is_string($request->input($field))) {
                $payload[$field] = trim($request->input($field));
            }
        }

        if ($payload !== []) {
            $request->merge($payload);
        }
    }

    private function paginationPayload($paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ];
    }

    private function deleteStoredCategoryImage(?string $imageUrl): void
    {
        if (! $imageUrl || ! str_contains($imageUrl, '/storage/categories/')) {
            return;
        }

        $urlPath = parse_url($imageUrl, PHP_URL_PATH);

        if (! is_string($urlPath) || ! Str::startsWith($urlPath, '/storage/')) {
            return;
        }

        $storagePath = Str::after($urlPath, '/storage/');

        if ($storagePath !== '') {
            Storage::disk('public')->delete($storagePath);
        }
    }
}
