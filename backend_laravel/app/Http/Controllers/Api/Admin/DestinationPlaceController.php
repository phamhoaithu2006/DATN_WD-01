<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DestinationPlace;
use App\Models\District;
use App\Models\TourActivityLog;
use App\Models\TourItinerary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DestinationPlaceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'province_id' => ['required', 'integer', 'exists:provinces,id'],
            'activity_type' => ['nullable', Rule::in(TourItinerary::ACTIVITY_TYPES)],
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $query = DestinationPlace::query()
            ->with($this->relations())
            ->when(
                ! empty($validated['province_id']),
                fn ($placeQuery) => $placeQuery->where('province_id', $validated['province_id'])
            );

        if (! empty($validated['activity_type'])) {
            $query->whereHas(
                'activityTypeLinks',
                fn ($activityQuery) => $activityQuery->where('activity_type', $validated['activity_type'])
            );
        }

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($searchQuery) use ($search) {
                $searchQuery->where('name', 'like', '%'.$search.'%')
                    ->orWhere('district_name', 'like', '%'.$search.'%')
                    ->orWhere('address', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%');
            });
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        return response()->json([
            'data' => $query->latest()->paginate($validated['per_page'] ?? 10),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedData($request);
        $activityTypes = $data['activity_types'] ?? [TourItinerary::ACTIVITY_SIGHTSEEING];
        unset($data['activity_types']);

        $data['slug'] = $data['slug']
            ?? str($data['name'])->slug().'-'.($data['province_id'] ?? 'place');

        $place = DB::transaction(function () use ($data, $activityTypes): DestinationPlace {
            $place = DestinationPlace::query()->create($data);
            $this->syncActivityTypes($place, $activityTypes);

            return $place;
        });
        TourActivityLog::record($request->user()?->id, 'place_created', $place->name, 'Đã tạo điểm đến chi tiết mới.', 'destination_place', $place->id);

        return response()->json([
            'message' => 'Thêm điểm đến chi tiết thành công.',
            'data' => $place->load($this->relations()),
        ], 201);
    }

    public function show(DestinationPlace $destinationPlace): JsonResponse
    {
        return response()->json([
            'data' => $destinationPlace->load($this->relations()),
        ]);
    }

    public function update(Request $request, DestinationPlace $destinationPlace): JsonResponse
    {
        $data = $this->validatedData($request, $destinationPlace);
        $activityTypes = array_key_exists('activity_types', $data)
            ? $data['activity_types']
            : null;
        unset($data['activity_types']);

        DB::transaction(function () use ($destinationPlace, $data, $activityTypes): void {
            $destinationPlace->update($data);

            if ($activityTypes !== null) {
                $this->syncActivityTypes($destinationPlace, $activityTypes);
            }
        });
        TourActivityLog::record($request->user()?->id, 'place_updated', $destinationPlace->name, 'Đã cập nhật điểm đến chi tiết.', 'destination_place', $destinationPlace->id);

        return response()->json([
            'message' => 'Cập nhật điểm đến chi tiết thành công.',
            'data' => $destinationPlace->fresh()->load($this->relations()),
        ]);
    }

    public function destroy(Request $request, DestinationPlace $destinationPlace): JsonResponse
    {
        $destinationPlace->delete();
        TourActivityLog::record($request->user()?->id, 'place_deleted', $destinationPlace->name, 'Đã xóa điểm đến chi tiết.', 'destination_place', $destinationPlace->id);

        return response()->json(['message' => 'Xóa điểm đến chi tiết thành công.']);
    }

    private function validatedData(Request $request, ?DestinationPlace $destinationPlace = null): array
    {
        // Nhận province_id là chuẩn mới; chấp nhận destination_id cũ chỉ để
        // tránh lỗi với client chưa được cập nhật đồng thời.
        if (!$request->has('province_id') && $request->has('destination_id')) {
            $request->merge([
                'province_id' => $request->input('destination_id'),
            ]);
        }

        $data = $request->validate([
            'province_id' => ['required', 'integer', 'exists:provinces,id'],
            'name' => ['required', 'string', 'max:180'],
            'slug' => ['nullable', 'string', 'max:220', Rule::unique('destination_places', 'slug')->ignore($destinationPlace?->id)],
            'district_name' => ['nullable', 'string', 'max:150'],
            'district_id' => ['nullable', 'integer', 'exists:districts,id'],
            'address' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'thumbnail_url' => ['nullable', 'url', 'max:500'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'activity_types' => ['sometimes', 'array', 'min:1', 'max:6'],
            'activity_types.*' => ['string', Rule::in(TourItinerary::ACTIVITY_TYPES)],
        ]);

        $provinceId = $this->resolveProvinceId($data);
        $data['province_id'] = $provinceId;
        unset($data['destination_id']);
        $duplicateQuery = DestinationPlace::query()
            ->where('name', $data['name'])
            ->when(
                $destinationPlace,
                fn ($query) => $query->where('id', '!=', $destinationPlace->id)
            );

        $duplicateQuery->where('province_id', $provinceId);

        $duplicateExists = $duplicateQuery->exists();

        if ($duplicateExists) {
            throw ValidationException::withMessages([
                'name' => 'Tên địa điểm đã tồn tại trong tỉnh/thành này.',
            ]);
        }

        if (! empty($data['district_id'])) {
            $district = District::query()
                ->whereKey($data['district_id'])
                ->where('province_id', $provinceId)
                ->first();

            if (! $district) {
                throw ValidationException::withMessages([
                    'district_id' => 'Quận/huyện không thuộc tỉnh/thành đã chọn.',
                ]);
            }

            $data['district_name'] = $district->name;
        }

        return $data;
    }

    private function resolveProvinceId(array $data): int
    {
        return (int) $data['province_id'];
    }

    private function syncActivityTypes(DestinationPlace $place, array $activityTypes): void
    {
        $place->activityTypeLinks()->delete();

        foreach (array_values(array_unique($activityTypes)) as $activityType) {
            $place->activityTypeLinks()->create([
                'activity_type' => $activityType,
            ]);
        }
    }

    private function relations(): array
    {
        return [
            'province:id,name',
            'district.province:id,name',
            'activityTypeLinks:id,destination_place_id,activity_type',
        ];
    }
}
