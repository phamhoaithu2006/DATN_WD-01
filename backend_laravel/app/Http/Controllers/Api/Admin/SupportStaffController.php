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
        'noi_dia' => 'Ná»™i Ä‘á»‹a',
        'quoc_te' => 'Quá»‘c táº¿',
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
            })
            ->whereNotNull('specialization')
            ->where('specialization', '!=', '')
            ->whereNotNull('experience_years')
            ->whereNotNull('status')
            ->where('status', '!=', '');
    }

    private function hydrateSupportStaff($staff)
    {
        if ($staff?->user) {
            $staff->setAttribute('name', $staff->user->full_name);
            $staff->setAttribute('email', $staff->user->email);
            $staff->setAttribute('phone', $staff->user->phone);
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

    private function hasCompleteSupportStaffProfile(?SupportStaff $staff): bool
    {
        if (!$staff) {
            return false;
        }

        return filled($staff->specialization)
            && $staff->experience_years !== null
            && filled($staff->status);
    }

    private function applySupportStaffFilters($query, Request $request): void
    {
        if ($request->filled('search')) {
            $search = $request->string('search')->trim();
            $query->where(function ($subQuery) use ($search) {
                $subQuery
                    ->whereRaw("CONCAT('NV', LPAD(support_staff.id, 3, '0')) like ?", ['%' . $search . '%'])
                    ->orWhere('support_staff.name', 'like', '%' . $search . '%')
                    ->orWhere('support_staff.email', 'like', '%' . $search . '%')
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery
                            ->where('full_name', 'like', '%' . $search . '%')
                            ->orWhere('email', 'like', '%' . $search . '%')
                            ->orWhere('phone', 'like', '%' . $search . '%');
                    })
                    ->orWhere('role', 'like', '%' . $search . '%');
            });
        }

        if ($request->filled('code')) {
            $code = $request->string('code')->trim();
            $query->where(function ($subQuery) use ($code) {
                $subQuery->whereRaw("CONCAT('NV', LPAD(support_staff.id, 3, '0')) like ?", ['%' . $code . '%']);

                if (preg_match('/^\d+$/', (string) $code)) {
                    $subQuery->orWhere('support_staff.id', (int) $code);
                }
            });
        }

        if ($request->filled('name')) {
            $name = $request->string('name')->trim();
            $query->where(function ($subQuery) use ($name) {
                $subQuery
                    ->where('support_staff.name', 'like', '%' . $name . '%')
                    ->orWhereHas('user', function ($userQuery) use ($name) {
                        $userQuery->where('full_name', 'like', '%' . $name . '%');
                    });
            });
        }

        if ($request->filled('email')) {
            $email = $request->string('email')->trim();
            $query->where(function ($subQuery) use ($email) {
                $subQuery
                    ->where('support_staff.email', 'like', '%' . $email . '%')
                    ->orWhereHas('user', function ($userQuery) use ($email) {
                        $userQuery->where('email', 'like', '%' . $email . '%');
                    });
            });
        }

        if ($request->filled('phone')) {
            $phone = $request->string('phone')->trim();
            $query->whereHas('user', function ($userQuery) use ($phone) {
                $userQuery->where('phone', 'like', '%' . $phone . '%');
            });
        }
    }

    public function index(Request $request)
    {
        $query = $this->supportStaffQuery();
        $this->applySupportStaffFilters($query, $request);

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
            'message' => 'Láº¥y danh sÃ¡ch nhÃ¢n viÃªn há»— trá»£ thÃ nh cÃ´ng',
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
            'message' => 'Láº¥y thá»‘ng kÃª nhÃ¢n viÃªn há»— trá»£ thÃ nh cÃ´ng',
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

    public function availableUsers()
    {
        $users = User::query()
            ->whereHas('role', function ($roleQuery) {
                $roleQuery->where('name', 'support staff');
            })
            ->whereDoesntHave('supportStaff', function ($supportStaffQuery) {
                $supportStaffQuery
                    ->whereNotNull('specialization')
                    ->where('specialization', '!=', '')
                    ->whereNotNull('experience_years')
                    ->whereNotNull('status')
                    ->where('status', '!=', '');
            })
            ->orderBy('full_name')
            ->get([
                'id',
                'full_name',
                'email',
                'phone',
                'avatar_url',
            ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Danh sÃ¡ch user chÆ°a cÃ³ há»“ sÆ¡ NVHT',
            'data' => $users,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => [
                'required',
                'integer',
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
        $staff = SupportStaff::withTrashed()->where('user_id', $user->id)->first();

        if (($user->role?->name ?? null) !== 'support staff') {
            return response()->json([
                'status' => 'error',
                'message' => 'Tài khoản phải có role NVHT.',
            ], 422);
        }

        if ($this->hasCompleteSupportStaffProfile($staff)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tài khoản này đã có hồ sơ NVHT hoàn chỉnh.',
            ], 422);
        }

        $data['name'] = $user->full_name;
        $data['email'] = $user->email;
        $data['status'] = $data['status'] ?? 'active';
        $data['hidden_at'] = $data['status'] === 'hidden' ? Carbon::now() : null;

        if ($staff) {
            if ($staff->trashed()) {
                $staff->restore();
            }

            $staff->update($data);
        } else {
            $staff = SupportStaff::create($data);
        }

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
                    'message' => 'TÃ i khoáº£n pháº£i cÃ³ role NVHT.',
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
            'message' => 'Cáº­p nháº­t thÃ´ng tin nhÃ¢n viÃªn thÃ nh cÃ´ng',
            'data' => $staff,
        ]);
    }

    public function destroy($id)
    {
        $staff = SupportStaff::findOrFail($id);
        $staff->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'ÄÃ£ chuyá»ƒn nhÃ¢n viÃªn há»— trá»£ vÃ o thÃ¹ng rÃ¡c',
        ]);
    }

    public function trashed(Request $request)
    {
        $query = SupportStaff::onlyTrashed()->with(['user.role']);
        $this->applySupportStaffFilters($query, $request);

        $perPage = max((int) $request->input('per_page', 10), 1);
        $staff = $query->latest('deleted_at')->paginate($perPage);
        $staff->setCollection($staff->getCollection()->map(fn ($item) => $this->hydrateSupportStaff($item)));

        return response()->json([
            'status' => 'success',
            'message' => 'Láº¥y danh sÃ¡ch nhÃ¢n viÃªn trong thÃ¹ng rÃ¡c thÃ nh cÃ´ng',
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
            'message' => 'KhÃ´i phá»¥c nhÃ¢n viÃªn há»— trá»£ thÃ nh cÃ´ng',
            'data' => $staff,
        ]);
    }

    public function forceDestroy($id)
    {
        $staff = SupportStaff::onlyTrashed()->findOrFail($id);
        $staff->forceDelete();

        return response()->json([
            'status' => 'success',
            'message' => 'XÃ³a vÄ©nh viá»…n nhÃ¢n viÃªn há»— trá»£ thÃ nh cÃ´ng',
        ]);
    }
    public function uploadAvatar(Request $request, $id)
    {
        $staff = SupportStaff::with('user.role')->findOrFail($id);

        if (!$staff->user) {
            return response()->json([
                'status' => 'error',
                'message' => 'NhÃƒÂ¢n viÃƒÂªn hÃ¡Â»â€” trÃ¡Â»Â£ chÃ†Â°a liÃƒÂªn kÃ¡ÂºÂ¿t tÃƒÂ i khoÃ¡ÂºÂ£n.',
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
            'message' => 'CÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t Ã¡ÂºÂ£nh Ã„â€˜Ã¡ÂºÂ¡i diÃ¡Â»â€¡n nhÃƒÂ¢n viÃƒÂªn hÃ¡Â»â€” trÃ¡Â»Â£ thÃƒÂ nh cÃƒÂ´ng',
            'data' => $staff,
        ]);
    }

    public function deleteAvatar($id)
    {
        $staff = SupportStaff::with('user.role')->findOrFail($id);

        if (!$staff->user) {
            return response()->json([
                'status' => 'error',
                'message' => 'NhÃƒÂ¢n viÃƒÂªn hÃ¡Â»â€” trÃ¡Â»Â£ chÃ†Â°a liÃƒÂªn kÃ¡ÂºÂ¿t tÃƒÂ i khoÃ¡ÂºÂ£n.',
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
            'message' => 'XÃƒÂ³a Ã¡ÂºÂ£nh Ã„â€˜Ã¡ÂºÂ¡i diÃ¡Â»â€¡n nhÃƒÂ¢n viÃƒÂªn hÃ¡Â»â€” trÃ¡Â»Â£ thÃƒÂ nh cÃƒÂ´ng',
            'data' => $staff,
        ]);
    }
}
