<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexServiceCategoryRequest;
use App\Http\Requests\StoreServiceCategoryRequest;
use App\Http\Requests\UpdateServiceCategoryRequest;
use App\Http\Resources\ServiceCategoryResource;
use App\Models\ServiceCategory;
use App\Services\ServiceCategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceCategoryController extends Controller
{
    public function __construct(private readonly ServiceCategoryService $serviceCategoryService) {}

    public function index(IndexServiceCategoryRequest $request): JsonResponse
    {
        $serviceCategories = $this->serviceCategoryService->paginate($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Danh sách loại dịch vụ',
            'data' => [
                'items' => ServiceCategoryResource::collection($serviceCategories->getCollection())->resolve($request),
                'pagination' => [
                    'current_page' => $serviceCategories->currentPage(),
                    'last_page' => $serviceCategories->lastPage(),
                    'per_page' => $serviceCategories->perPage(),
                    'total' => $serviceCategories->total(),
                ],
            ],
        ]);
    }

    public function store(StoreServiceCategoryRequest $request): JsonResponse
    {
        $serviceCategory = $this->serviceCategoryService->create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Tạo loại dịch vụ thành công',
            'data' => $this->resource($serviceCategory, $request),
        ], 201);
    }

    public function show(int $id, Request $request): JsonResponse
    {
        $serviceCategory = $this->serviceCategoryService->find($id);

        if (! $serviceCategory) {
            return $this->notFound();
        }

        return response()->json([
            'success' => true,
            'message' => 'Chi tiết loại dịch vụ',
            'data' => $this->resource($serviceCategory, $request),
        ]);
    }

    public function update(UpdateServiceCategoryRequest $request, int $id): JsonResponse
    {
        $serviceCategory = $this->serviceCategoryService->find($id);

        if (! $serviceCategory) {
            return $this->notFound();
        }

        $serviceCategory = $this->serviceCategoryService->update($serviceCategory, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật loại dịch vụ thành công',
            'data' => $this->resource($serviceCategory, $request),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $serviceCategory = $this->serviceCategoryService->find($id);

        if (! $serviceCategory) {
            return $this->notFound();
        }

        $this->serviceCategoryService->delete($serviceCategory);

        return response()->json([
            'success' => true,
            'message' => 'Xóa loại dịch vụ thành công',
            'data' => null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function resource(ServiceCategory $serviceCategory, Request $request): array
    {
        return (new ServiceCategoryResource($serviceCategory))->resolve($request);
    }

    private function notFound(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Không tìm thấy loại dịch vụ',
            'errors' => [],
        ], 404);
    }
}
