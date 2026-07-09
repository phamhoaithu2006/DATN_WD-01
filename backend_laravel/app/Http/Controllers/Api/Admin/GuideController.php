<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Destination;
use App\Models\Guide;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class GuideController extends Controller
{
    /**
     * Các relationship luôn trả về khi lấy HDV.
     */
    private function guideRelations(): array
    {
        return [
            'user',
            'destinations',
            'languages.language',
            'languages.level',
            'experiences.certificate',
        ];
    }

    /**
     * Giới hạn số bản ghi mỗi trang.
     */
    private function perPage(Request $request): int
    {
        return min(
            max((int) $request->input('per_page', 10), 1),
            100
        );
    }

    /**
     * Query cơ bản cho HDV chưa bị xóa.
     */
    private function guideQuery()
    {
        return Guide::query()
            ->with($this->guideRelations())
            ->withCount([
                'assignments as assigned_tours_count' => function ($query) {
                    $query
                        ->where('status', '!=', 'cancelled')
                        ->whereHas('departure', function ($departureQuery) {
                            $departureQuery->where('status', '!=', 'cancelled');
                        });
                },
                'assignments as current_tours_count' => function ($query) {
                    $query
                        ->where('status', '!=', 'cancelled')
                        ->whereHas('departure', function ($departureQuery) {
                            $departureQuery->where('status', '!=', 'cancelled');
                        });
                },
            ])
            ->whereHas('user');
    }

    /**
     * DANH SÁCH HDV
     */
    public function index(Request $request)
    {
        $guides = $this->guideQuery()
            ->latest('id')
            ->paginate($this->perPage($request));

        return response()->json([
            'message' => 'Danh sách hướng dẫn viên',
            'data' => $guides,
        ]);
    }

    /**
     * TÌM KIẾM HDV
     */
    public function search(Request $request)
    {
        $query = $this->guideQuery();

        if ($request->filled('search')) {
            $search = trim($request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('guide_code', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery
                            ->where('full_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
            });
        }

        return response()->json([
            'message' => 'Kết quả tìm kiếm hướng dẫn viên',
            'data' => $query
                ->latest('id')
                ->paginate($this->perPage($request)),
        ]);
    }

    /**
     * LỌC HDV
     *
     * Hỗ trợ:
     * - search
     * - status
     * - experience_years
     * - language
     * - destination_id
     */
    public function filter(Request $request)
    {
        $query = $this->guideQuery();

        if ($request->filled('search')) {
            $search = trim($request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('guide_code', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery
                            ->where('full_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('experience_years')) {
            $query->where(
                'experience_years',
                '>=',
                (int) $request->input('experience_years')
            );
        }

        if ($request->filled('language')) {
            $language = trim($request->input('language'));

            $query->whereHas('languages.language', function ($q) use ($language) {
                $q->where('name', 'like', "%{$language}%");
            });
        }

        // Lọc theo khu vực / điểm đến phụ trách.
        if ($request->filled('destination_id')) {
            $destinationId = (int) $request->input('destination_id');

            $query->whereHas('destinations', function ($q) use ($destinationId) {
                $q->where('destinations.id', $destinationId);
            });
        }

        return response()->json([
            'message' => 'Kết quả lọc hướng dẫn viên',
            'data' => $query
                ->latest('id')
                ->paginate($this->perPage($request)),
        ]);
    }

    /**
     * CHI TIẾT HDV
     */
    public function show($id)
    {
        $guide = $this->guideQuery()->find($id);

        if (!$guide) {
            return response()->json([
                'message' => 'Không tìm thấy hướng dẫn viên',
            ], 404);
        }

        return response()->json([
            'message' => 'Chi tiết hướng dẫn viên',
            'data' => $guide,
        ]);
    }

    /**
     * Danh sách khu vực để dùng trong form HDV.
     */
    public function destinationOptions()
    {
        $destinations = Destination::query()
            ->orderBy('name')
            ->get([
                'id',
                'name',
            ]);

        return response()->json([
            'message' => 'Danh sách khu vực phụ trách',
            'data' => $destinations,
        ]);
    }

    /**
     * THÊM HDV
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => [
                'required',
                'integer',
                'exists:users,id',
                Rule::unique('guides', 'user_id')->whereNull('deleted_at'),
            ],

            'experience_years' => [
                'required',
                'integer',
                'min:0',
            ],

            'status' => [
                'nullable',
                Rule::in(['active', 'inactive', 'locked']),
            ],

            // Khu vực phụ trách thay cho specialization_ids.
            'destination_ids' => [
                'required',
                'array',
                'min:1',
            ],

            'destination_ids.*' => [
                'integer',
                'distinct',
                'exists:destinations,id',
            ],

            'languages' => [
                'nullable',
                'array',
            ],

            'languages.*.language_id' => [
                'required',
                'exists:languages,id',
            ],

            'languages.*.level_id' => [
                'nullable',
                'exists:language_levels,id',
            ],

            'experiences' => [
                'nullable',
                'array',
            ],

            'experiences.*.certificate_id' => [
                'required',
                'exists:certificates,id',
            ],

            'experiences.*.issued_year' => [
                'nullable',
                'integer',
                'min:1900',
                'max:' . now()->year,
            ],
        ]);

        try {
            $guide = DB::transaction(function () use ($validated) {
                $lastId = Guide::withTrashed()->max('id') ?? 0;

                $guideCode = 'HDV' . str_pad(
                    $lastId + 1,
                    3,
                    '0',
                    STR_PAD_LEFT
                );

                $guide = Guide::create([
                    'user_id' => $validated['user_id'],
                    'guide_code' => $guideCode,
                    'experience_years' => $validated['experience_years'],
                    'status' => $validated['status'] ?? 'active',
                ]);

                // Gán các khu vực / điểm đến phụ trách.
                $guide->destinations()->sync(
                    $validated['destination_ids']
                );

                foreach ($validated['languages'] ?? [] as $language) {
                    $guide->languages()->create([
                        'language_id' => $language['language_id'],
                        'level_id' => $language['level_id'] ?? null,
                    ]);
                }

                foreach ($validated['experiences'] ?? [] as $experience) {
                    $guide->experiences()->create([
                        'certificate_id' => $experience['certificate_id'],
                        'issued_year' => $experience['issued_year'] ?? null,
                    ]);
                }

                return $guide;
            });

            return response()->json([
                'message' => 'Thêm hướng dẫn viên thành công',
                'data' => $guide->load($this->guideRelations()),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Không thể thêm hướng dẫn viên: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * SỬA HDV
     */
    public function update(Request $request, $id)
    {
        $guide = Guide::find($id);

        if (!$guide) {
            return response()->json([
                'message' => 'Không tìm thấy hướng dẫn viên',
            ], 404);
        }

        $validated = $request->validate([
            'experience_years' => [
                'sometimes',
                'integer',
                'min:0',
            ],

            'status' => [
                'sometimes',
                Rule::in(['active', 'inactive', 'locked']),
            ],

            'destination_ids' => [
                'sometimes',
                'array',
                'min:1',
            ],

            'destination_ids.*' => [
                'integer',
                'distinct',
                'exists:destinations,id',
            ],

            'languages' => [
                'sometimes',
                'array',
            ],

            'languages.*.language_id' => [
                'required',
                'exists:languages,id',
            ],

            'languages.*.level_id' => [
                'nullable',
                'exists:language_levels,id',
            ],

            'experiences' => [
                'sometimes',
                'array',
            ],

            'experiences.*.certificate_id' => [
                'required',
                'exists:certificates,id',
            ],

            'experiences.*.issued_year' => [
                'nullable',
                'integer',
                'min:1900',
                'max:' . now()->year,
            ],
        ]);

        try {
            DB::transaction(function () use ($guide, $request, $validated) {
                $guideData = collect($validated)
                    ->only([
                        'experience_years',
                        'status',
                    ])
                    ->toArray();

                if (!empty($guideData)) {
                    $guide->update($guideData);
                }

                // Cập nhật khu vực phụ trách.
                if ($request->has('destination_ids')) {
                    $guide->destinations()->sync(
                        $validated['destination_ids']
                    );
                }

                if ($request->has('languages')) {
                    $guide->languages()->delete();

                    foreach ($validated['languages'] ?? [] as $language) {
                        $guide->languages()->create([
                            'language_id' => $language['language_id'],
                            'level_id' => $language['level_id'] ?? null,
                        ]);
                    }
                }

                if ($request->has('experiences')) {
                    $guide->experiences()->delete();

                    foreach ($validated['experiences'] ?? [] as $experience) {
                        $guide->experiences()->create([
                            'certificate_id' => $experience['certificate_id'],
                            'issued_year' => $experience['issued_year'] ?? null,
                        ]);
                    }
                }
            });

            return response()->json([
                'message' => 'Cập nhật hướng dẫn viên thành công',
                'data' => $guide->fresh()->load($this->guideRelations()),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Không thể cập nhật hướng dẫn viên: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * XÓA MỀM HDV
     */
    public function destroy($id)
    {
        $guide = Guide::find($id);

        if (!$guide) {
            return response()->json([
                'message' => 'Không tìm thấy hướng dẫn viên',
            ], 404);
        }

        $guide->delete();

        return response()->json([
            'message' => 'Xóa hướng dẫn viên thành công',
        ]);
    }

    /**
     * DANH SÁCH HDV ĐÃ XÓA MỀM
     */
    public function trashed(Request $request)
    {
        $guides = Guide::onlyTrashed()
            ->with($this->guideRelations())
            ->latest('deleted_at')
            ->paginate($this->perPage($request));

        return response()->json([
            'message' => 'Danh sách hướng dẫn viên đã xóa',
            'data' => $guides,
        ]);
    }

    /**
     * KHÔI PHỤC HDV
     */
    public function restore($id)
    {
        $guide = Guide::withTrashed()->find($id);

        if (!$guide) {
            return response()->json([
                'message' => 'Không tìm thấy hướng dẫn viên',
            ], 404);
        }

        $guide->restore();

        return response()->json([
            'message' => 'Khôi phục hướng dẫn viên thành công',
        ]);
    }

    /**
     * XÓA VĨNH VIỄN HDV
     */
    public function forceDelete($id)
    {
        $guide = Guide::withTrashed()->find($id);

        if (!$guide) {
            return response()->json([
                'message' => 'Không tìm thấy hướng dẫn viên',
            ], 404);
        }

        try {
            DB::transaction(function () use ($guide) {
                $guide->destinations()->detach();
                $guide->languages()->delete();
                $guide->experiences()->delete();

                $guide->forceDelete();
            });

            return response()->json([
                'message' => 'Xóa vĩnh viễn hướng dẫn viên thành công',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Không thể xóa vĩnh viễn HDV vì đang có dữ liệu liên quan.',
            ], 422);
        }
    }

    /**
     * THỐNG KÊ HDV
     */
    public function statistics()
    {
        $stats = Guide::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->get();

        return response()->json([
            'message' => 'Thống kê hướng dẫn viên',
            'total' => Guide::count(),
            'data' => $stats,
        ]);
    }

    /**
     * Danh sách tài khoản có role tour guide nhưng chưa có profile HDV.
     */
    public function availableUsers()
    {
        $users = \App\Models\User::query()
            ->where('role_id', function ($query) {
                $query->select('id')
                    ->from('roles')
                    ->where('name', 'tour guide')
                    ->limit(1);
            })
            ->whereDoesntHave('guide')
            ->orderBy('full_name')
            ->get([
                'id',
                'full_name',
                'email',
                'phone',
            ]);

        return response()->json([
            'message' => 'Danh sách user chưa làm HDV',
            'data' => $users,
        ]);
    }

    /**
     * UPLOAD ẢNH ĐẠI DIỆN
     */
    public function uploadAvatar(Request $request, $id)
    {
        $guide = Guide::with('user')->find($id);

        if (!$guide) {
            return response()->json([
                'message' => 'Không tìm thấy hướng dẫn viên',
            ], 404);
        }

        if (!$guide->user) {
            return response()->json([
                'message' => 'Hướng dẫn viên chưa liên kết tài khoản',
            ], 422);
        }

        $request->validate([
            'avatar' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
        ]);

        $this->deleteLocalAvatar($guide->user->avatar_url);

        $path = $request->file('avatar')->store('avatars', 'public');
        $url = asset('storage/' . $path);

        $guide->user->update([
            'avatar_url' => $url,
        ]);

        return response()->json([
            'message' => 'Cập nhật ảnh đại diện thành công',
            'data' => [
                'avatar_url' => $url,
            ],
        ]);
    }

    /**
     * XÓA ẢNH ĐẠI DIỆN
     */
    public function deleteAvatar($id)
    {
        $guide = Guide::with('user')->find($id);

        if (!$guide) {
            return response()->json([
                'message' => 'Không tìm thấy hướng dẫn viên',
            ], 404);
        }

        if (!$guide->user) {
            return response()->json([
                'message' => 'Hướng dẫn viên chưa liên kết tài khoản',
            ], 422);
        }

        $this->deleteLocalAvatar($guide->user->avatar_url);

        $guide->user->update([
            'avatar_url' => null,
        ]);

        return response()->json([
            'message' => 'Xóa ảnh đại diện thành công',
        ]);
    }

    /**
     * Chỉ xóa avatar local trong storage/avatars.
     */
    private function deleteLocalAvatar(?string $avatarUrl): void
    {
        if (
            !$avatarUrl ||
            !str_contains($avatarUrl, '/storage/avatars/')
        ) {
            return;
        }

        $path = parse_url($avatarUrl, PHP_URL_PATH);

        if (!$path) {
            return;
        }

        $storagePath = str_replace('/storage/', '', $path);

        Storage::disk('public')->delete($storagePath);
    }
}
