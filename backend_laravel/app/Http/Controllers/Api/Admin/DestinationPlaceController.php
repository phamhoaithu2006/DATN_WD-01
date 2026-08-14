<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DestinationPlace;
use App\Models\Destination;
use App\Models\District;
use App\Models\TourActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DestinationPlaceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'destination_id' => ['required', 'integer', 'exists:destinations,id'],
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = DestinationPlace::query()
            ->with(['destination:id,name,province_city,country', 'district.province:id,name'])
            ->where('destination_id', $validated['destination_id']);

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
        $data['slug'] = $data['slug'] ?? str($data['name'])->slug().'-'.$data['destination_id'];
        $place = DestinationPlace::query()->create($data);
        TourActivityLog::record($request->user()?->id, 'place_created', $place->name, 'Đã tạo điểm đến chi tiết mới.', 'destination_place', $place->id);

        return response()->json([
            'message' => 'Thêm điểm đến chi tiết thành công.',
            'data' => $place->load(['destination:id,name,province_city,country', 'district.province:id,name']),
        ], 201);
    }

    public function show(DestinationPlace $destinationPlace): JsonResponse
    {
        return response()->json([
            'data' => $destinationPlace->load(['destination:id,name,province_city,country', 'district.province:id,name']),
        ]);
    }

    public function update(Request $request, DestinationPlace $destinationPlace): JsonResponse
    {
        $destinationPlace->update($this->validatedData($request, $destinationPlace));
        TourActivityLog::record($request->user()?->id, 'place_updated', $destinationPlace->name, 'Đã cập nhật điểm đến chi tiết.', 'destination_place', $destinationPlace->id);

        return response()->json([
            'message' => 'Cập nhật điểm đến chi tiết thành công.',
            'data' => $destinationPlace->fresh()->load(['destination:id,name,province_city,country', 'district.province:id,name']),
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
        $data = $request->validate([
            'destination_id' => ['required', 'integer', 'exists:destinations,id'],
            'name' => [
                'required',
                'string',
                'max:180',
                Rule::unique('destination_places', 'name')
                    ->where(fn ($query) => $query->where('destination_id', $request->integer('destination_id')))
                    ->ignore($destinationPlace?->id),
            ],
            'slug' => ['nullable', 'string', 'max:220', Rule::unique('destination_places', 'slug')->ignore($destinationPlace?->id)],
            'district_name' => ['nullable', 'string', 'max:150'],
            'district_id' => ['nullable', 'integer', 'exists:districts,id'],
            'address' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'thumbnail_url' => ['nullable', 'url', 'max:500'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        if (! empty($data['district_id'])) {
            $allowedProvinceIds = Destination::query()->findOrFail($data['destination_id'])->provinces()->pluck('provinces.id');
            $district = District::query()->whereKey($data['district_id'])->whereIn('province_id', $allowedProvinceIds)->first();
            if (! $district) {
                abort(422, 'Quận/huyện không thuộc các tỉnh của điểm đến đã chọn.');
            }
            $data['district_name'] = $district->name;
        }

        return $data;
    }
}
