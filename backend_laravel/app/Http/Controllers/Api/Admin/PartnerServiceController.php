<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Partner;
use App\Models\PartnerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PartnerServiceController extends Controller
{
    public function index(Request $request, int $partnerId): JsonResponse
    {
        Partner::findOrFail($partnerId);

        $query = PartnerService::where('partner_id', $partnerId)->withoutTrashed();

        if ($keyword = $request->query('keyword')) {
            $query->where(function ($q) use ($keyword) {
                $q->where('service_name', 'like', "%{$keyword}%")
                    ->orWhere('service_code', 'like', "%{$keyword}%")
                    ->orWhere('origin', 'like', "%{$keyword}%")
                    ->orWhere('destination', 'like', "%{$keyword}%");
            });
        }

        if ($type = $request->query('service_type')) {
            $query->where('service_type', $type);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($day = $request->query('day')) {
            $query->whereJsonContains('operate_days', (int) $day);
        }

        if ($departFrom = $request->query('depart_from')) {
            $query->where('depart_time', '>=', $departFrom);
        }

        if ($departTo = $request->query('depart_to')) {
            $query->where('depart_time', '<=', $departTo);
        }

        $perPage  = min((int) $request->query('per_page', 15), 100);
        $services = $query->orderBy('depart_time')->paginate($perPage);

        return response()->json(['success' => true, 'data' => $services]);
    }

    public function show(int $partnerId, int $id): JsonResponse
    {
        $service = PartnerService::where('partner_id', $partnerId)->findOrFail($id);
        return response()->json(['success' => true, 'data' => $service]);
    }

    public function store(Request $request, int $partnerId): JsonResponse
    {
        Partner::findOrFail($partnerId);

        $validated = $request->validate([
            'service_name'                => ['required', 'string', 'max:200'],
            'service_code'                => ['nullable', 'string', 'max:50'],
            'service_type'                => ['required', Rule::in(['flight', 'hotel', 'restaurant', 'transport', 'train', 'cruise', 'insurance', 'attraction'])],
            'depart_time'                 => ['nullable', 'date_format:H:i'],
            'arrive_time'                 => ['nullable', 'date_format:H:i'],
            'origin'                      => ['nullable', 'string', 'max:150'],
            'destination'                 => ['nullable', 'string', 'max:150'],
            'vehicle_type'                => ['nullable', 'string', 'max:100'],
            'seat_class'                  => ['nullable', 'string', 'max:100'],
            'operate_days'                => ['nullable', 'array'],
            'operate_days.*'              => ['integer', 'min:1', 'max:7'],
            'domestic_booking_hours'      => ['nullable', 'integer', 'min:0'],
            'international_booking_hours' => ['nullable', 'integer', 'min:0'],
            'confirmation_time'           => ['nullable', 'string', 'max:50'],
            'amenities'                   => ['nullable', 'array'],
            'amenities.*'                 => ['string'],
            'status'                      => ['nullable', Rule::in(['active', 'inactive'])],
        ]);

        $validated['partner_id'] = $partnerId;
        $validated['status']     = $validated['status'] ?? 'active';

        $service = PartnerService::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Thêm dịch vụ thành công.',
            'data'    => $service,
        ], 201);
    }

    public function update(Request $request, int $partnerId, int $id): JsonResponse
    {
        $service = PartnerService::where('partner_id', $partnerId)->findOrFail($id);

        $validated = $request->validate([
            'service_name'                => ['sometimes', 'string', 'max:200'],
            'service_code'                => ['nullable', 'string', 'max:50'],
            'service_type'                => ['sometimes', Rule::in(['flight', 'hotel', 'restaurant', 'transport', 'train', 'cruise', 'insurance', 'attraction'])],
            'depart_time'                 => ['nullable', 'date_format:H:i'],
            'arrive_time'                 => ['nullable', 'date_format:H:i'],
            'origin'                      => ['nullable', 'string', 'max:150'],
            'destination'                 => ['nullable', 'string', 'max:150'],
            'vehicle_type'                => ['nullable', 'string', 'max:100'],
            'seat_class'                  => ['nullable', 'string', 'max:100'],
            'operate_days'                => ['nullable', 'array'],
            'operate_days.*'              => ['integer', 'min:1', 'max:7'],
            'domestic_booking_hours'      => ['nullable', 'integer', 'min:0'],
            'international_booking_hours' => ['nullable', 'integer', 'min:0'],
            'confirmation_time'           => ['nullable', 'string', 'max:50'],
            'amenities'                   => ['nullable', 'array'],
            'amenities.*'                 => ['string'],
            'status'                      => ['nullable', Rule::in(['active', 'inactive'])],
        ]);

        $service->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật dịch vụ thành công.',
            'data'    => $service,
        ]);
    }

    public function destroy(int $partnerId, int $id): JsonResponse
    {
        PartnerService::where('partner_id', $partnerId)->findOrFail($id)->delete();
        return response()->json(['success' => true, 'message' => 'Xóa dịch vụ thành công.']);
    }

    public function restore(int $partnerId, int $id): JsonResponse
    {
        $service = PartnerService::onlyTrashed()->where('partner_id', $partnerId)->findOrFail($id);
        $service->restore();
        return response()->json(['success' => true, 'message' => 'Khôi phục thành công.', 'data' => $service]);
    }

    public function forceDestroy(int $partnerId, int $id): JsonResponse
    {
        PartnerService::onlyTrashed()->where('partner_id', $partnerId)->findOrFail($id)->forceDelete();
        return response()->json(['success' => true, 'message' => 'Xóa vĩnh viễn thành công.']);
    }
}
