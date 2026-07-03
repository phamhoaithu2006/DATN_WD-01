<?php

namespace App\Services;

use App\Models\ServiceCategory;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Arr;

class ServiceCategoryService
{
    /**
     * @param  array{search?: string|null, status?: mixed, page?: int|null, per_page?: int|null}  $filters
     */
    public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = min(max((int) ($filters['per_page'] ?? 10), 1), 100);

        $query = ServiceCategory::query()
            ->when($this->hasSearch($filters), function ($query) use ($filters): void {
                $search = trim((string) $filters['search']);

                $query->where('name', 'like', "%{$search}%");
            })
            ->when($this->hasStatus($filters), function ($query) use ($filters): void {
                $query->where('status', $this->toBoolean($filters['status']));
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        return $query->paginate($perPage);
    }

    public function find(int $id): ?ServiceCategory
    {
        return ServiceCategory::query()->find($id);
    }

    /**
     * @param  array{name: string, description?: string|null, status: bool|int|string}  $data
     */
    public function create(array $data): ServiceCategory
    {
        return ServiceCategory::query()->create($this->payload($data));
    }

    /**
     * @param  array{name: string, description?: string|null, status: bool|int|string}  $data
     */
    public function update(ServiceCategory $serviceCategory, array $data): ServiceCategory
    {
        $serviceCategory->update($this->payload($data));

        return $serviceCategory->fresh();
    }

    public function delete(ServiceCategory $serviceCategory): void
    {
        $serviceCategory->delete();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function hasSearch(array $filters): bool
    {
        return array_key_exists('search', $filters) && trim((string) $filters['search']) !== '';
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function hasStatus(array $filters): bool
    {
        return array_key_exists('status', $filters)
            && $filters['status'] !== null
            && $filters['status'] !== '';
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{name: string, description?: string|null, status: bool}
     */
    private function payload(array $data): array
    {
        $payload = Arr::only($data, ['name', 'description', 'status']);
        $payload['status'] = $this->toBoolean($payload['status']);

        return $payload;
    }

    private function toBoolean(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }
}
