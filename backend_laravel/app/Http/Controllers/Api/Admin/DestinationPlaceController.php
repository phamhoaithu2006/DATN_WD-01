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
        $place->load($this->relations());
        TourActivityLog::record(
            $request->user()?->id,
            'place_created',
            $place->name,
            'Đã tạo điểm đến chi tiết mới.',
            'destination_place',
            $place->id,
            ['data' => $this->timelineSnapshot($place)]
        );

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

    public function trashed(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'province_id' => ['required', 'integer', 'exists:provinces,id'],
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $query = DestinationPlace::onlyTrashed()
            ->with($this->relations())
            ->where('province_id', $validated['province_id']);

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($searchQuery) use ($search): void {
                $searchQuery->where('name', 'like', '%'.$search.'%')
                    ->orWhere('district_name', 'like', '%'.$search.'%')
                    ->orWhere('address', 'like', '%'.$search.'%');
            });
        }

        return response()->json([
            'data' => $query->latest('deleted_at')->paginate($validated['per_page'] ?? 10),
        ]);
    }

    public function update(Request $request, DestinationPlace $destinationPlace): JsonResponse
    {
        $before = $this->timelineSnapshot($destinationPlace->load($this->relations()));
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
        $destinationPlace = $destinationPlace->fresh()->load($this->relations());
        $after = $this->timelineSnapshot($destinationPlace);
        TourActivityLog::record(
            $request->user()?->id,
            'place_updated',
            $destinationPlace->name,
            'Đã cập nhật điểm đến chi tiết.',
            'destination_place',
            $destinationPlace->id,
            ['changes' => $this->timelineChanges($before, $after), 'data' => $after]
        );

        return response()->json([
            'message' => 'Cập nhật điểm đến chi tiết thành công.',
            'data' => $destinationPlace->fresh()->load($this->relations()),
        ]);
    }

    public function destroy(Request $request, DestinationPlace $destinationPlace): JsonResponse
    {
        $snapshot = $this->timelineSnapshot($destinationPlace->load($this->relations()));
        $destinationPlace->delete();
        TourActivityLog::record(
            $request->user()?->id,
            'place_deleted',
            $destinationPlace->name,
            'Đã xóa mềm điểm đến chi tiết.',
            'destination_place',
            $destinationPlace->id,
            ['data' => $snapshot, 'deleted_at' => now()->toIso8601String()]
        );

        return response()->json(['message' => 'Xóa điểm đến chi tiết thành công.']);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $place = DestinationPlace::onlyTrashed()->findOrFail($id);
        $place->restore();
        $place->load($this->relations());
        TourActivityLog::record(
            $request->user()?->id,
            'place_restored',
            $place->name,
            'Đã khôi phục điểm đến chi tiết.',
            'destination_place',
            $place->id,
            ['data' => $this->timelineSnapshot($place), 'restored_at' => now()->toIso8601String()]
        );

        return response()->json([
            'message' => 'Khôi phục điểm đến chi tiết thành công.',
            'data' => $place->load($this->relations()),
        ]);
    }

    public function forceDestroy(Request $request, int $id): JsonResponse
    {
        $place = DestinationPlace::onlyTrashed()->findOrFail($id);
        $placeId = $place->id;
        $placeName = $place->name;
        $snapshot = $this->timelineSnapshot($place->load($this->relations()));

        DB::transaction(function () use ($place): void {
            $place->activityTypeLinks()->delete();
            $place->forceDelete();
        });

        TourActivityLog::record(
            $request->user()?->id,
            'place_force_deleted',
            $placeName,
            'Đã xóa vĩnh viễn điểm đến chi tiết.',
            'destination_place',
            $placeId,
            ['data' => $snapshot, 'force_deleted_at' => now()->toIso8601String()]
        );

        return response()->json(['message' => 'Đã xóa vĩnh viễn điểm đến chi tiết.']);
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

    private function timelineSnapshot(DestinationPlace $place): array
    {
        return [
            'name' => $place->name,
            'province' => $place->province?->name,
            'district' => $place->district_name,
            'address' => $place->address,
            'description' => $place->description,
            'thumbnail_url' => $place->thumbnail_url,
            'status' => $place->status,
            'activity_types' => $place->activity_types,
        ];
    }

    private function timelineChanges(array $before, array $after): array
    {
        $changes = [];

        foreach ($after as $field => $value) {
            if (json_encode($before[$field] ?? null) !== json_encode($value)) {
                $changes[$field] = [
                    'from' => $before[$field] ?? null,
                    'to' => $value,
                ];
            }
        }

        return $changes;
    }
}
