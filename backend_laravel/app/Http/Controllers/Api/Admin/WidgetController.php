<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WidgetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $widgets = Banner::query()
            ->when($request->status, fn ($query) => $query->where('status', $request->status))
            ->when($request->type, fn ($query) => $query->where('type', $request->type))
            ->when($request->position, fn ($query) => $query->where('position', $request->position))
            ->when($request->page, fn ($query) => $query->whereJsonContains('display_pages', $request->page))
            ->orderBy('sort_order')
            ->latest('id')
            ->get();

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách widget thành công',
            'data' => $widgets,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());

        $widget = Banner::create($this->payload($validated));

        return response()->json([
            'status' => 'success',
            'message' => 'Thêm widget thành công',
            'data' => $widget,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $widget = Banner::query()->find($id);

        if (! $widget) {
            return $this->notFound();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy chi tiết widget thành công',
            'data' => $widget,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $widget = Banner::query()->find($id);

        if (! $widget) {
            return $this->notFound();
        }

        $validated = $request->validate($this->rules(true));

        $widget->update($this->payload($validated, true));

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật widget thành công',
            'data' => $widget->fresh(),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $widget = Banner::query()->find($id);

        if (! $widget) {
            return $this->notFound();
        }

        $widget->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Xóa widget thành công',
        ]);
    }

    public function toggleStatus(int $id): JsonResponse
    {
        $widget = Banner::query()->find($id);

        if (! $widget) {
            return $this->notFound();
        }

        $widget->update([
            'status' => $widget->status === 'active' ? 'inactive' : 'active',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật trạng thái widget thành công',
            'data' => $widget->fresh(),
        ]);
    }

    private function rules(bool $isUpdate = false): array
    {
        $required = $isUpdate ? 'sometimes|required' : 'required';

        return [
            'title' => [$required, 'string', 'max:255'],
            'display_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'type' => [$required, Rule::in(Banner::TYPES)],
            'image_url' => ['nullable', 'required_if:type,image', 'string', 'max:500'],
            'html_content' => ['nullable', 'required_if:type,html', 'string'],
            'link_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'position' => ['sometimes', 'nullable', Rule::in(Banner::POSITIONS)],
            'display_pages' => ['sometimes', 'nullable', 'array'],
            'display_pages.*' => [Rule::in(Banner::DISPLAY_PAGES)],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ];
    }

    private function payload(array $validated, bool $isUpdate = false): array
    {
        $payload = $validated;

        if (! $isUpdate) {
            $payload['type'] = $payload['type'] ?? 'image';
            $payload['sort_order'] = $payload['sort_order'] ?? 0;
            $payload['status'] = $payload['status'] ?? 'active';
        }

        if (($payload['type'] ?? null) === 'image') {
            $payload['html_content'] = null;
        }

        if (($payload['type'] ?? null) === 'html') {
            $payload['image_url'] = $payload['image_url'] ?? null;
        }

        return $payload;
    }

    private function notFound(): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => 'Không tìm thấy widget',
        ], 404);
    }
}
