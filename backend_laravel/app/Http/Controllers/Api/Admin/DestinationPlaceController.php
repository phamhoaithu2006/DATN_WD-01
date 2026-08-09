<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DestinationPlace;
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
            ->with('destination:id,name,province_city,country')
            ->where('destination_id', $validated['destination_id']);

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($searchQuery) use ($search) {
                $searchQuery->where('name', 'like', '%'.$search.'%')
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

        return response()->json([
            'message' => 'Thêm điểm đến chi tiết thành công.',
            'data' => $place->load('destination:id,name,province_city,country'),
        ], 201);
    }

    public function show(DestinationPlace $destinationPlace): JsonResponse
    {
        return response()->json([
            'data' => $destinationPlace->load('destination:id,name,province_city,country'),
        ]);
    }

    public function update(Request $request, DestinationPlace $destinationPlace): JsonResponse
    {
        $destinationPlace->update($this->validatedData($request, $destinationPlace));

        return response()->json([
            'message' => 'Cập nhật điểm đến chi tiết thành công.',
            'data' => $destinationPlace->fresh()->load('destination:id,name,province_city,country'),
        ]);
    }

    public function destroy(DestinationPlace $destinationPlace): JsonResponse
    {
        $destinationPlace->delete();

        return response()->json(['message' => 'Xóa điểm đến chi tiết thành công.']);
    }

    private function validatedData(Request $request, ?DestinationPlace $destinationPlace = null): array
    {
        return $request->validate([
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
            'address' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'thumbnail_url' => ['nullable', 'url', 'max:500'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);
    }
}
