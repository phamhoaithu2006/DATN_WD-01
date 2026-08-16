<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\Province;
use App\Models\TourActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class GuideController extends Controller
{
    private function orderByOnlineFirst($query)
    {
        if (Schema::hasTable('guide_presence_sessions')) {
            $query->orderByRaw(
                'EXISTS (SELECT 1 FROM guide_presence_sessions gps WHERE gps.user_id = guides.user_id AND gps.ended_at IS NULL AND gps.last_seen_at >= ?) DESC',
                [now()->subSeconds(120)]
            );
        }

        return $query;
    }

    private function timelineSnapshot(Guide $guide): array
    {
        $guide->loadMissing($this->guideRelations());

        return [
            'name' => $guide->user?->full_name,
            'email' => $guide->user?->email,
            'phone' => $guide->user?->phone,
            'guide_code' => $guide->guide_code,
            'experience_years' => $guide->experience_years,
            'status' => $guide->status,
            'languages' => $guide->languages->map(fn ($item) => trim(($item->language?->name ?? '').' '.($item->level?->name ?? '')))->values()->all(),
            'certificates' => $guide->experiences->map(fn ($item) => trim(($item->certificate?->name ?? '').' '.($item->issued_year ?? '')))->values()->all(),
        ];
    }

    private function recordAdminAction(Request $request, Guide $guide, string $action, string $description, array $metadata = []): void
    {
        TourActivityLog::record($request->user()?->id, $action, $guide->user?->full_name ?? $guide->guide_code, $description, 'guide', $guide->id, $metadata);
    }

    /**
     * Các relationship luôn trả về khi lấy HDV.
     */
    private function guideRelations(): array
    {
        return [
            'user',
            // Giữ tên quan hệ cũ trong response để frontend cũ vẫn đọc được,
            // nhưng dữ liệu thực tế vẫn lấy từ guide_provinces.
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
            ->when(Schema::hasTable('guide_leave_requests'), function ($query) {
                $today = now()->toDateString();

                $query
                    ->selectSub(function ($subQuery) {
                        $subQuery
                            ->from('guide_leave_requests as glr_pending')
                            ->selectRaw('COUNT(*)')
                            ->whereColumn('glr_pending.guide_id', 'guides.id')
                            ->where('glr_pending.status', 'pending');
                    }, 'pending_leave_requests_count')
                    ->selectSub(function ($subQuery) use ($today) {
                        $subQuery
                            ->from('guide_leave_requests as glr_current')
                            ->selectRaw('COUNT(*)')
                            ->whereColumn('glr_current.guide_id', 'guides.id')
                            ->where('glr_current.status', 'approved')
                            ->whereDate('glr_current.start_date', '<=', $today)
                            ->whereDate('glr_current.end_date', '>=', $today);
                    }, 'current_leave_requests_count')
                    ->selectSub(function ($subQuery) use ($today) {
                        $subQuery
                            ->from('guide_leave_requests as glr_upcoming')
                            ->selectRaw('COUNT(*)')
                            ->whereColumn('glr_upcoming.guide_id', 'guides.id')
                            ->where('glr_upcoming.status', 'approved')
                            ->whereDate('glr_upcoming.start_date', '>', $today);
                    }, 'waiting_leave_requests_count');
            })
            ->whereHas('user');
    }

    public function leaveSummary()
    {
        if (!Schema::hasTable('guide_leave_requests')) {
            return response()->json([
                'message' => 'Thống kê đơn nghỉ HDV',
                'data' => [
                    'available_guides_count' => 0,
                    'pending_guides_count' => 0,
                    'waiting_leave_guides_count' => 0,
                    'resting_guides_count' => 0,
                ],
            ]);
        }

        $today = now()->toDateString();

        return response()->json([
            'message' => 'Thống kê đơn nghỉ HDV',
            'data' => [
                'available_guides_count' => Guide::query()
                    ->whereHas('user')
                    ->whereNotExists(function ($subQuery) use ($today) {
                        $subQuery
                            ->select(DB::raw(1))
                            ->from('guide_leave_requests as glr')
                            ->whereColumn('glr.guide_id', 'guides.id')
                            ->where(function ($leaveQuery) use ($today) {
                                $leaveQuery
                                    ->where('glr.status', 'pending')
                                    ->orWhere(function ($approvedQuery) use ($today) {
                                        $approvedQuery
                                            ->where('glr.status', 'approved')
                                            ->whereDate('glr.end_date', '>=', $today);
                                    });
                            });
                    })
                    ->count(),

                'pending_guides_count' => DB::table('guide_leave_requests')
                    ->where('status', 'pending')
                    ->distinct('guide_id')
                    ->count('guide_id'),

                'waiting_leave_guides_count' => DB::table('guide_leave_requests')
                    ->where('status', 'approved')
                    ->whereDate('start_date', '>', $today)
                    ->distinct('guide_id')
                    ->count('guide_id'),

                'resting_guides_count' => DB::table('guide_leave_requests')
                    ->where('status', 'approved')
                    ->whereDate('start_date', '<=', $today)
                    ->whereDate('end_date', '>=', $today)
                    ->distinct('guide_id')
                    ->count('guide_id'),

            ],
        ]);
    }

    /**
     * DANH SÁCH HDV
     */
    public function index(Request $request)
    {
        $guides = $this->orderByOnlineFirst($this->guideQuery())
            ->orderByDesc('guides.updated_at')
            ->orderByDesc('guides.id')
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
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        return response()->json([
            'message' => 'Kết quả tìm kiếm hướng dẫn viên',
            'data' => $this->orderByOnlineFirst($query)
                ->orderByDesc('guides.updated_at')
                ->orderByDesc('guides.id')
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
     * - province_id (destination_id là khóa tương thích tạm thời)
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
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if (
            $request->filled('leave_status') &&
            $request->input('leave_status') !== 'all' &&
            Schema::hasTable('guide_leave_requests')
        ) {
            $leaveStatus = $request->input('leave_status');
            $today = now()->toDateString();

            if ($leaveStatus === 'resting') {
                $query->whereExists(function ($subQuery) use ($today) {
                    $subQuery
                        ->select(DB::raw(1))
                        ->from('guide_leave_requests as glr')
                        ->whereColumn('glr.guide_id', 'guides.id')
                        ->where('glr.status', 'approved')
                        ->whereDate('glr.start_date', '<=', $today)
                        ->whereDate('glr.end_date', '>=', $today);
                });
            }

            if ($leaveStatus === 'pending_leave') {
                $query->whereExists(function ($subQuery) use ($today) {
                    $subQuery
                        ->select(DB::raw(1))
                        ->from('guide_leave_requests as glr')
                        ->whereColumn('glr.guide_id', 'guides.id')
                        ->where('glr.status', 'pending');
                });
            }

            if ($leaveStatus === 'waiting_leave') {
                $query->whereExists(function ($subQuery) use ($today) {
                    $subQuery
                        ->select(DB::raw(1))
                        ->from('guide_leave_requests as glr')
                        ->whereColumn('glr.guide_id', 'guides.id')
                        ->where('glr.status', 'approved')
                        ->whereDate('glr.start_date', '>', $today);
                });
            }

            if ($leaveStatus === 'available_leave') {
                $query->whereNotExists(function ($subQuery) use ($today) {
                    $subQuery
                        ->select(DB::raw(1))
                        ->from('guide_leave_requests as glr')
                        ->whereColumn('glr.guide_id', 'guides.id')
                        ->whereIn('glr.status', ['pending', 'approved'])
                        ->whereDate('glr.end_date', '>=', $today);
                });
            }
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

        // Lọc theo tỉnh/thành phụ trách.
        return response()->json([
            'message' => 'Kết quả lọc hướng dẫn viên',
            'data' => $this->orderByOnlineFirst($query)
                ->orderByDesc('guides.updated_at')
                ->orderByDesc('guides.id')
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
     * Danh sách tỉnh/thành để dùng trong form HDV.
     */
    public function destinationOptions()
    {
        $provinces = Province::query()
            ->orderBy('name')
            ->get([
                'id',
                'name',
            ]);

        return response()->json([
            'message' => 'Danh sách tỉnh/thành phụ trách',
            'data' => $provinces,
        ]);
    }

    /**
     * THÊM HDV
     */
    public function adminTimeline()
    {
        $activities = TourActivityLog::query()
            ->with('actor:id,full_name,email')
            ->where('metadata->entity_type', 'guide')
            ->latest()->limit(100)->get()
            ->map(fn (TourActivityLog $activity) => [
                'id' => $activity->id,
                'description' => $activity->description,
                'target_name' => $activity->tour_title,
                'metadata' => $activity->metadata,
                'actor' => $activity->actor ? ['name' => $activity->actor->full_name, 'email' => $activity->actor->email] : null,
                'created_at' => $activity->created_at?->toIso8601String(),
            ]);

        return response()->json(['status' => 'success', 'data' => $activities]);
    }

    public function store(Request $request)
    {
        // Nhận tên province_ids mới, đồng thời giữ tương thích với frontend cũ.
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
                'max:40',
            ],

            'status' => [
                'nullable',
                Rule::in(['active', 'inactive', 'locked']),
            ],

            // Tỉnh/thành phụ trách; destination_ids là tên khóa tương thích tạm thời.
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

                // Gán các tỉnh/thành phụ trách.
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

            $guide->load($this->guideRelations());
            $this->recordAdminAction($request, $guide, 'created', 'Thêm hướng dẫn viên.', ['after' => $this->timelineSnapshot($guide)]);

            return response()->json([
                'message' => 'Thêm hướng dẫn viên thành công',
                'data' => $guide,
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

        $before = $this->timelineSnapshot($guide);

        // Nhận tên province_ids mới, đồng thời giữ tương thích với frontend cũ.
        $validated = $request->validate([
            'full_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'email',
                Rule::unique('users', 'email')->ignore($guide->user_id),
            ],
            'phone' => ['sometimes', 'nullable', 'string', 'max:15'],
            'experience_years' => [
                'sometimes',
                'integer',
                'min:0',
                'max:40',
            ],

            'status' => [
                'sometimes',
                Rule::in(['active', 'inactive', 'locked']),
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
                $userData = collect($validated)
                    ->only(['full_name', 'email', 'phone'])
                    ->toArray();

                if (!empty($userData)) {
                    $guide->user()->update($userData);
                }

                $guideData = collect($validated)
                    ->only([
                        'experience_years',
                        'status',
                    ])
                    ->toArray();

                if (!empty($guideData)) {
                    $guide->update($guideData);
                }

                // Cập nhật tỉnh/thành phụ trách.
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

            $updatedGuide = $guide->fresh()->load($this->guideRelations());
            $this->recordAdminAction($request, $updatedGuide, 'updated', 'Cập nhật hướng dẫn viên.', [
                'before' => $before,
                'after' => $this->timelineSnapshot($updatedGuide),
            ]);

            return response()->json([
                'message' => 'Cập nhật hướng dẫn viên thành công',
                'data' => $updatedGuide,
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
    public function destroy(Request $request, $id)
    {
        $guide = Guide::find($id);

        if (!$guide) {
            return response()->json([
                'message' => 'Không tìm thấy hướng dẫn viên',
            ], 404);
        }

        $guide->load($this->guideRelations());
        $before = $this->timelineSnapshot($guide);
        $guide->delete();
        $this->recordAdminAction($request, $guide, 'deleted', 'Chuyển hướng dẫn viên vào thùng rác.', ['before' => $before]);

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
    public function restore(Request $request, $id)
    {
        $guide = Guide::withTrashed()->find($id);

        if (!$guide) {
            return response()->json([
                'message' => 'Không tìm thấy hướng dẫn viên',
            ], 404);
        }

        $guide->restore();
        $guide->load($this->guideRelations());
        $this->recordAdminAction($request, $guide, 'restored', 'Khôi phục hướng dẫn viên.', ['after' => $this->timelineSnapshot($guide)]);

        return response()->json([
            'message' => 'Khôi phục hướng dẫn viên thành công',
        ]);
    }

    /**
     * XÓA VĨNH VIỄN HDV
     */
    public function forceDelete(Request $request, $id)
    {
        $guide = Guide::withTrashed()->find($id);

        if (!$guide) {
            return response()->json([
                'message' => 'Không tìm thấy hướng dẫn viên',
            ], 404);
        }

        try {
            $guide->load($this->guideRelations());
            $before = $this->timelineSnapshot($guide);
            $guideId = $guide->id;
            $guideName = $guide->user?->full_name ?? $guide->guide_code;
            DB::transaction(function () use ($guide) {
                $guide->languages()->delete();
                $guide->experiences()->delete();

                $guide->forceDelete();
            });

            TourActivityLog::record($request->user()?->id, 'force_deleted', $guideName, 'Xóa vĩnh viễn hướng dẫn viên.', 'guide', $guideId, ['before' => $before]);

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
