<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->where('status', 'active')
            ->latest('id')
            ->get();

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách loại tour thành công',
            'data' => $categories,
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:150',
        ]);

        $categories = Category::query()
            ->where('status', 'active')
            ->where('name', 'like', '%' . $request->name . '%')
            ->latest('id')
            ->get();

        return response()->json([
            'status' => 'success',
            'message' => 'Tìm kiếm loại tour thành công',
            'count' => $categories->count(),
            'data' => $categories,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150|unique:categories,name',
            'description' => 'nullable|string',
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

        return response()->json([
            'status' => 'success',
            'message' => 'Thêm loại tour thành công',
            'data' => $category,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $category = Category::query()->find($id);

        if (! $category) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy loại tour',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:150|unique:categories,name,' . $id,
            'description' => 'sometimes|nullable|string',
            'thumbnail_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'thumbnail_alt_text' => 'sometimes|nullable|string|max:255',
            'status' => 'sometimes|in:active,inactive',
        ]);

        if (array_key_exists('name', $validated)) {
            $category->name = $validated['name'];
            $category->slug = $this->generateUniqueSlug($validated['name'], $id);
        }

        if (array_key_exists('description', $validated)) {
            $category->description = $validated['description'];
        }

        if ($request->hasFile('thumbnail_image')) {
            $this->deleteStoredCategoryImage($category->thumbnail_url);

            $path = $request->file('thumbnail_image')->store('categories', 'public');
            $category->thumbnail_url = asset('storage/' . $path);
        }

        if (array_key_exists('thumbnail_alt_text', $validated)) {
            $category->thumbnail_alt_text = $validated['thumbnail_alt_text'];
        }

        if (array_key_exists('status', $validated)) {
            $category->status = $validated['status'];
        }

        $category->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật loại tour thành công',
            'data' => $category,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $category = Category::query()->find($id);

        if (! $category) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy loại tour',
            ], 404);
        }

        $category->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Xóa mềm loại tour thành công',
        ]);
    }

    public function trashed(): JsonResponse
    {
        $categories = Category::onlyTrashed()
            ->latest('deleted_at')
            ->get();

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách loại tour đã xóa mềm thành công',
            'data' => $categories,
        ]);
    }

    public function restore(int $id): JsonResponse
    {
        $category = Category::onlyTrashed()->find($id);

        if (! $category) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy loại tour đã xóa mềm',
            ], 404);
        }

        $category->restore();

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
            Category::query()
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug = $baseSlug . '-' . $index;
            $index++;
        }

        return $slug;
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
