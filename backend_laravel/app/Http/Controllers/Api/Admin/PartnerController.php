<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Partner;
use App\Models\ServiceCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class PartnerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Partner::with('serviceType')->withoutTrashed();

        if ($keyword = $request->query('keyword')) {
            $query->where(function ($q) use ($keyword) {
                $q->where('name', 'like', "%{$keyword}%")
                    ->orWhere('email', 'like', "%{$keyword}%")
                    ->orWhere('phone', 'like', "%{$keyword}%")
                    ->orWhere('contact_person', 'like', "%{$keyword}%");
            });
        }

        if ($typeId = $request->query('service_type_id')) {
            $query->where('service_type_id', $typeId);
        }

        if ($serviceType = $request->query('service_type')) {
            $query->whereHas('serviceType', fn ($q) => $q->where('slug', $serviceType));
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $perPage = min((int) $request->query('per_page', 10), 100);
        $partners = $query->latest()->paginate($perPage);

        // Transform để frontend đọc được
        $partners->getCollection()->transform(function ($partner) {
            $partner->service_type = $partner->serviceType?->slug ?? '';
            $partner->service_type_label = $partner->serviceType?->name ?? '';
            $partner->rating = $partner->average_rating;
            $partner->contact_name = $partner->contact_person;
            unset($partner->serviceType); // ← thêm dòng này để ẩn object

            return $partner;
        });

        return response()->json(['success' => true, 'data' => $partners]);
    }

    public function statistics(): JsonResponse
    {
        $total = Partner::withoutTrashed()->count();
        $totalActive = Partner::withoutTrashed()->where('status', 'active')->count();
        $totalInactive = Partner::withoutTrashed()->where('status', 'inactive')->count();

        $serviceTypes = ServiceCategory::query()->orderBy('name')->get()->map(fn ($t) => [
            'value' => $t->slug,
            'label' => $t->name,
            'count' => $t->partners()->withoutTrashed()->count(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'active' => $totalActive,
                'inactive' => $totalInactive,
                'hidden' => 0,
                'average_rating' => Partner::withoutTrashed()->avg('average_rating') ?? 0,
                'service_types' => $serviceTypes,
            ],
        ]);
    }

    public function serviceTypes(): JsonResponse
    {
        $types = ServiceCategory::query()
            ->select('id', 'name', 'slug', 'status')
            ->orderBy('name')
            ->get();

        return response()->json(['success' => true, 'data' => $types]);
    }

    public function show(int $id): JsonResponse
    {
        $partner = Partner::with('serviceType')->findOrFail($id);

        $partner->service_type = $partner->serviceType?->slug ?? '';
        $partner->service_type_label = $partner->serviceType?->name ?? '';
        $partner->rating = $partner->average_rating;
        $partner->contact_name = $partner->contact_person;
        unset($partner->serviceType); // ← thêm dòng này

        return response()->json(['success' => true, 'data' => $partner]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'service_type_id' => ['required', 'integer', Rule::exists('service_categories', 'id')->whereNull('deleted_at')],
            'name' => ['required', 'string', 'max:150'],
            'contact_person' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'description' => ['nullable', 'string'],
            'logo_url' => ['nullable', 'url', 'max:500'],
            'contract_start' => ['nullable', 'date'],
            'contract_end' => ['nullable', 'date', 'after_or_equal:contract_start'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
        ]);
        $validated['status'] = $validated['status'] ?? 'active';
        $partner = Partner::create($validated);
        $partner->refresh()->load('serviceType');

        return response()->json([
            'success' => true,
            'message' => 'Thêm đối tác thành công.',
            'data' => $partner,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $partner = Partner::findOrFail($id);
        $validated = $request->validate([
            'service_type_id' => ['sometimes', 'integer', Rule::exists('service_categories', 'id')->whereNull('deleted_at')],
            'name' => ['sometimes', 'string', 'max:150'],
            'contact_person' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'description' => ['nullable', 'string'],
            'logo_url' => ['nullable', 'url', 'max:500'],
            'contract_start' => ['nullable', 'date'],
            'contract_end' => ['nullable', 'date', 'after_or_equal:contract_start'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
        ]);

        $partner->update($validated);
        $partner->refresh()->load('serviceType');

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thành công.',
            'data' => $partner,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        Partner::findOrFail($id)->delete();

        return response()->json(['success' => true, 'message' => 'Xóa mềm thành công.']);
    }

    public function trashed(Request $request): JsonResponse
    {
        $query = Partner::with('serviceType')->onlyTrashed();

        if ($keyword = $request->query('keyword')) {
            $query->where('name', 'like', "%{$keyword}%");
        }

        $perPage = min((int) $request->query('per_page', 10), 100);
        $partners = $query->latest('deleted_at')->paginate($perPage);

        return response()->json(['success' => true, 'data' => $partners]);
    }

    public function restore(int $id): JsonResponse
    {
        $partner = Partner::onlyTrashed()->findOrFail($id);
        $partner->restore();

        return response()->json([
            'success' => true,
            'message' => 'Khôi phục thành công.',
            'data' => $partner->refresh()->load('serviceType'),
        ]);
    }

    public function forceDestroy(int $id): JsonResponse
    {
        $partner = Partner::onlyTrashed()->findOrFail($id);

        if (
            $partner->logo_url &&
            str_contains($partner->logo_url, '/storage/partner/')
        ) {
            $oldPath = str_replace(
                '/storage/',
                '',
                parse_url($partner->logo_url, PHP_URL_PATH)
            );

            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $partner->forceDelete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa vĩnh viễn thành công.',
        ]);
    }

    public function uploadLogo(Request $request, int $id): JsonResponse
    {
        $partner = Partner::findOrFail($id);

        $request->validate([
            'logo' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
        ]);

        // Xóa logo cũ nếu có
        if (
            $partner->logo_url &&
            str_contains($partner->logo_url, '/storage/partner/')
        ) {
            $oldPath = str_replace(
                '/storage/',
                '',
                parse_url($partner->logo_url, PHP_URL_PATH)
            );

            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        // Upload logo mới
        $file = $request->file('logo');

        $fileName = uniqid().'_'.time().'.'.$file->getClientOriginalExtension();

        $path = $file->storeAs(
            'partner',
            $fileName,
            'public'
        );

        $url = asset('storage/'.$path);

        $partner->update([
            'logo_url' => $url,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Upload logo thành công.',
            'data' => [
                'logo_url' => $url,
            ],
        ]);
    }

    public function deleteLogo(int $id): JsonResponse
    {
        $partner = Partner::findOrFail($id);

        if (
            $partner->logo_url &&
            str_contains($partner->logo_url, '/storage/partner/')
        ) {
            $oldPath = str_replace(
                '/storage/',
                '',
                parse_url($partner->logo_url, PHP_URL_PATH)
            );

            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $partner->update([
            'logo_url' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Xóa logo thành công.',
        ]);
    }
}
