<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportStaff;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class SupportStaffController extends Controller
{
    private const STATUSES = ['active', 'inactive', 'hidden'];
    private const SPECIALIZATIONS = ['noi_dia', 'quoc_te'];
    private const SPECIALIZATION_LABELS = [
        'noi_dia' => 'Nội địa',
        'quoc_te' => 'Quốc tế',
    ];

    private function supportStaffQuery()
    {
        return SupportStaff::query()
            ->withoutTrashed()
            ->with(['user.role'])
            ->whereHas('user', function ($query) {
                $query->whereHas('role', function ($roleQuery) {
                    $roleQuery->where('name', 'support staff');
                });
            });
    }

    private function hydrateSupportStaff($staff)
    {
        if ($staff?->user) {
            $staff->setAttribute('name', $staff->user->full_name);
            $staff->setAttribute('email', $staff->user->email);
            $staff->setAttribute('avatar_url', $staff->user->avatar_url);
        }

        if ($staff) {
            $staff->setAttribute(
                'specialization_label',
                self::SPECIALIZATION_LABELS[$staff->specialization ?? ''] ?? ($staff->specialization ?? null),
            );
        }

        return $staff;
    }

    public function index(Request $request)
    {
        $query = $this->supportStaffQuery();

        if ($request->filled('search')) {
            $search = $request->string('search')->trim();
            $query->where(function ($subQuery) use ($search) {
                $subQuery
                    ->where('support_staff.name', 'like', '%' . $search . '%')
                    ->orWhere('support_staff.email', 'like', '%' . $search . '%')
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery
                            ->where('full_name', 'like', '%' . $search . '%')
                            ->orWhere('email', 'like', '%' . $search . '%');
                    })
                    ->orWhere('role', 'like', '%' . $search . '%');
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('specialization')) {
            $query->where('specialization', $request->input('specialization'));
        }

        if ($request->filled('rating_from')) {
            $query->where('performance_rating', '>=', $request->input('rating_from'));
        }

        if ($request->filled('rating_to')) {
            $query->where('performance_rating', '<=', $request->input('rating_to'));
        }

        $perPage = max((int) $request->input('per_page', 10), 1);
        $staff = $query->latest()->paginate($perPage);
        $staff->setCollection($staff->getCollection()->map(fn ($item) => $this->hydrateSupportStaff($item)));

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách nhân viên hỗ trợ thành công',
            'data' => $staff,
        ]);
    }

    public function statistics()
    {
        $baseQuery = $this->supportStaffQuery();

        $totals = (clone $baseQuery)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active")
            ->selectRaw("SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive")
            ->selectRaw("SUM(CASE WHEN status = 'hidden' THEN 1 ELSE 0 END) as hidden")
            ->selectRaw('COALESCE(AVG(performance_rating), 0) as average_rating')
            ->first();

        $topStaff = (clone $baseQuery)
            ->orderByDesc('performance_rating')
            ->orderByDesc('updated_at')
            ->limit(5)
            ->select('support_staff.*')
            ->get();
        $topStaff = $topStaff->map(fn ($item) => $this->hydrateSupportStaff($item));

        $roleOptions = (clone $baseQuery)
            ->select('role')
            ->distinct()
            ->orderBy('role')
            ->pluck('role');

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy thống kê nhân viên hỗ trợ thành công',
            'data' => [
                'total' => (int) ($totals->total ?? 0),
                'active' => (int) ($totals->active ?? 0),
                'inactive' => (int) ($totals->inactive ?? 0),
                'hidden' => (int) ($totals->hidden ?? 0),
                'average_rating' => round((float) ($totals->average_rating ?? 0), 2),
                'role_options' => $roleOptions,
                'top_staff' => $topStaff,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => [
                'required',
                'integer',
                Rule::unique('support_staff', 'user_id')->whereNull('deleted_at'),
                Rule::exists('users', 'id'),
            ],
            'specialization' => ['required', 'string', Rule::in(self::SPECIALIZATIONS)],
            'experience_years' => ['required', 'integer', 'min:0'],
            'role' => 'required|string|max:100',
            'status' => ['nullable', 'string', Rule::in(self::STATUSES)],
            'performance_rating' => 'nullable|numeric|between:0,5',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $user = User::with('role')->findOrFail($data['user_id']);

        if (($user->role?->name ?? null) !== 'support staff') {
            return response()->json([
                'status' => 'error',
                'message' => 'Tài khoản phải có role NVHT.',
            ], 422);
        }

        $data['name'] = $user->full_name;
        $data['email'] = $user->email;
        $data['status'] = $data['status'] ?? 'active';
        $data['hidden_at'] = $data['status'] === 'hidden' ? Carbon::now() : null;

        $staff = SupportStaff::create($data);
        $staff->load('user.role');
        $this->hydrateSupportStaff($staff);

        return response()->json([
            'status' => 'success',
            'message' => 'Thêm nhân viên hỗ trợ thành công',
            'data' => $staff,
        ], 201);
    }

    public function show($id)
    {
        $staff = $this->supportStaffQuery()->findOrFail($id);
        $this->hydrateSupportStaff($staff);

        return response()->json([
            'status' => 'success',
            'data' => $staff,
        ]);
    }

    public function update(Request $request, $id)
    {
        $staff = SupportStaff::query()->with('user.role')->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'user_id' => [
                'sometimes',
                'required',
                'integer',
                Rule::exists('users', 'id'),
                Rule::unique('support_staff', 'user_id')->ignore($id)->whereNull('deleted_at'),
            ],
            'specialization' => ['sometimes', 'required', 'string', Rule::in(self::SPECIALIZATIONS)],
            'experience_years' => ['sometimes', 'required', 'integer', 'min:0'],
            'role' => 'sometimes|required|string|max:100',
            'status' => ['sometimes', 'required', 'string', Rule::in(self::STATUSES)],
            'performance_rating' => 'sometimes|required|numeric|between:0,5',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        if (array_key_exists('user_id', $data)) {
            $user = User::with('role')->findOrFail($data['user_id']);

            if (($user->role?->name ?? null) !== 'support staff') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Tài khoản phải có role NVHT.',
                ], 422);
            }

            $data['name'] = $user->full_name;
            $data['email'] = $user->email;
        }

        if (array_key_exists('status', $data)) {
            $data['hidden_at'] = $data['status'] === 'hidden' ? Carbon::now() : null;
        }

        $staff->update($data);
        $staff->load('user.role');
        $this->hydrateSupportStaff($staff);

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật thông tin nhân viên thành công',
            'data' => $staff,
        ]);
    }

    public function destroy($id)
    {
        $staff = SupportStaff::findOrFail($id);
        $staff->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Đã chuyển nhân viên hỗ trợ vào thùng rác',
        ]);
    }

    public function trashed(Request $request)
    {
        $query = SupportStaff::onlyTrashed()->with(['user.role']);

        if ($request->filled('search')) {
            $search = $request->string('search')->trim();
            $query->where(function ($subQuery) use ($search) {
                $subQuery
                    ->where('support_staff.name', 'like', '%' . $search . '%')
                    ->orWhere('support_staff.email', 'like', '%' . $search . '%')
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery
                            ->where('full_name', 'like', '%' . $search . '%')
                            ->orWhere('email', 'like', '%' . $search . '%');
                    })
                    ->orWhere('role', 'like', '%' . $search . '%');
            });
        }

        $perPage = max((int) $request->input('per_page', 10), 1);
        $staff = $query->latest('deleted_at')->paginate($perPage);
        $staff->setCollection($staff->getCollection()->map(fn ($item) => $this->hydrateSupportStaff($item)));

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách nhân viên trong thùng rác thành công',
            'data' => $staff,
        ]);
    }

    public function restore($id)
    {
        $staff = SupportStaff::onlyTrashed()->with('user.role')->findOrFail($id);
        $staff->restore();
        $this->hydrateSupportStaff($staff);

        return response()->json([
            'status' => 'success',
            'message' => 'Khôi phục nhân viên hỗ trợ thành công',
            'data' => $staff,
        ]);
    }

    public function forceDestroy($id)
    {
        $staff = SupportStaff::onlyTrashed()->findOrFail($id);
        $staff->forceDelete();

        return response()->json([
            'status' => 'success',
            'message' => 'Xóa vĩnh viễn nhân viên hỗ trợ thành công',
        ]);
    }
    public function uploadAvatar(Request $request, $id)
    {
        $staff = SupportStaff::with('user.role')->findOrFail($id);

        if (!$staff->user) {
            return response()->json([
                'status' => 'error',
                'message' => 'NhÃ¢n viÃªn há»— trá»£ chÆ°a liÃªn káº¿t tÃ i khoáº£n.',
            ], 422);
        }

        $request->validate([
            'avatar' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        if ($staff->user->avatar_url && str_contains($staff->user->avatar_url, '/storage/avatars/')) {
            $oldPath = str_replace('/storage/', '', parse_url($staff->user->avatar_url, PHP_URL_PATH));
            Storage::disk('public')->delete($oldPath);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $url = asset('storage/' . $path);

        $staff->user->update(['avatar_url' => $url]);
        $staff->load('user.role');
        $this->hydrateSupportStaff($staff);

        return response()->json([
            'status' => 'success',
            'message' => 'Cáº­p nháº­t áº£nh Ä‘áº¡i diá»‡n nhÃ¢n viÃªn há»— trá»£ thÃ nh cÃ´ng',
            'data' => $staff,
        ]);
    }

    public function deleteAvatar($id)
    {
        $staff = SupportStaff::with('user.role')->findOrFail($id);

        if (!$staff->user) {
            return response()->json([
                'status' => 'error',
                'message' => 'NhÃ¢n viÃªn há»— trá»£ chÆ°a liÃªn káº¿t tÃ i khoáº£n.',
            ], 422);
        }

        if ($staff->user->avatar_url && str_contains($staff->user->avatar_url, '/storage/avatars/')) {
            $oldPath = str_replace('/storage/', '', parse_url($staff->user->avatar_url, PHP_URL_PATH));
            Storage::disk('public')->delete($oldPath);
        }

        $staff->user->update(['avatar_url' => null]);
        $staff->load('user.role');
        $this->hydrateSupportStaff($staff);

        return response()->json([
            'status' => 'success',
            'message' => 'XÃ³a áº£nh Ä‘áº¡i diá»‡n nhÃ¢n viÃªn há»— trá»£ thÃ nh cÃ´ng',
            'data' => $staff,
        ]);
    }
}
