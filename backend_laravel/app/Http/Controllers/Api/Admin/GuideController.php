<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class GuideController extends Controller
{
    // DANH SÁCH HDV
    public function index(Request $request)
    {
        $guides = Guide::with([
            'user',
            'specializations',
            'languages.language',
            'languages.level',
            'experiences.certificate',
        ])
            ->whereHas('user')
            ->paginate(10);

        return response()->json([
            'message' => 'Danh sách hướng dẫn viên',
            'data'    => $guides,
        ]);
    }

    // TÌM KIẾM HDV
    public function search(Request $request)
    {
        $query = Guide::with([
            'user',
            'specializations',
            'languages.language',
            'languages.level',
            'experiences.certificate',
        ])
            ->whereHas('user');

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('guide_code', 'like', '%' . $search . '%')
                    ->orWhereHas('user', function ($q) use ($search) {
                        $q->where('full_name', 'like', '%' . $search . '%')
                            ->orWhere('email', 'like', '%' . $search . '%')
                            ->orWhere('phone', 'like', '%' . $search . '%');
                    })
                    ->orWhereHas('specializations', function ($q) use ($search) {
                        $q->where('name', 'like', '%' . $search . '%');
                    })
                    ->orWhereHas('languages.language', function ($q) use ($search) {
                        $q->where('name', 'like', '%' . $search . '%');
                    })
                    ->orWhereHas('experiences.certificate', function ($q) use ($search) {
                        $q->where('name', 'like', '%' . $search . '%');
                    });
            });
        }

        return response()->json([
            'message' => 'Kết quả tìm kiếm hướng dẫn viên',
            'data'    => $query->paginate(10),
        ]);
    }

    // LỌC HDV
    public function filter(Request $request)
    {
        $query = Guide::with([
            'user',
            'specializations',
            'languages.language',
            'languages.level',
            'experiences.certificate',
        ])
            ->whereHas('user');

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('guide_code', 'like', '%' . $search . '%')
                    ->orWhereHas('user', function ($q) use ($search) {
                        $q->where('full_name', 'like', '%' . $search . '%')
                            ->orWhere('email', 'like', '%' . $search . '%')
                            ->orWhere('phone', 'like', '%' . $search . '%');
                    })
                    ->orWhereHas('specializations', function ($q) use ($search) {
                        $q->where('name', 'like', '%' . $search . '%');
                    })
                    ->orWhereHas('languages.language', function ($q) use ($search) {
                        $q->where('name', 'like', '%' . $search . '%');
                    });
            });
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->experience_years) {
            $query->where('experience_years', '>=', $request->experience_years);
        }

        if ($request->language) {
            $query->whereHas('languages.language', function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->language . '%');
            });
        }

        if ($request->specialization_id) {
            $query->whereHas('specializations', function ($q) use ($request) {
                $q->where('guide_specializations.id', $request->specialization_id);
            });
        }

        return response()->json([
            'message' => 'Kết quả lọc hướng dẫn viên',
            'data'    => $query->paginate(10),
        ]);
    }

    // CHI TIẾT HDV
    public function show($id)
    {
        $guide = Guide::with([
            'user',
            'specializations',
            'languages.language',
            'languages.level',
            'experiences.certificate',
        ])->find($id);

        if (!$guide) {
            return response()->json(['message' => 'Không tìm thấy hướng dẫn viên'], 404);
        }

        return response()->json([
            'message' => 'Chi tiết hướng dẫn viên',
            'data'    => $guide,
        ]);
    }

    // THÊM HDV
    public function store(Request $request)
    {
        $request->validate([
            'user_id' => [
                'required',
                'exists:users,id',
                Rule::unique('guides', 'user_id')->whereNull('deleted_at'),
            ],
            'experience_years'             => 'required|integer|min:0',
            'status'                       => 'in:active,inactive,locked',
            'specialization_ids'           => 'nullable|array',
            'specialization_ids.*'         => 'exists:guide_specializations,id',
            'languages'                    => 'nullable|array',
            'languages.*.language_id'      => 'required|exists:languages,id',
            'languages.*.level_id'         => 'nullable|exists:language_levels,id',
            'experiences'                  => 'nullable|array',
            'experiences.*.certificate_id' => 'required|exists:certificates,id',
            'experiences.*.issued_year'    => 'nullable|integer',
        ]);

        DB::beginTransaction();
        try {
            $count     = Guide::withTrashed()->count() + 1;
            $guideCode = 'HDV' . str_pad($count, 3, '0', STR_PAD_LEFT);

            $guide = Guide::create([
                'user_id'          => $request->user_id,
                'guide_code'       => $guideCode,
                'experience_years' => $request->experience_years,
                'status'           => $request->status ?? 'active',
            ]);

            if ($request->specialization_ids) {
                $guide->specializations()->sync($request->specialization_ids);
            }

            if ($request->languages) {
                foreach ($request->languages as $lang) {
                    $guide->languages()->create([
                        'language_id' => $lang['language_id'],
                        'level_id'    => $lang['level_id'] ?? null,
                    ]);
                }
            }

            if ($request->experiences) {
                foreach ($request->experiences as $exp) {
                    $guide->experiences()->create([
                        'certificate_id' => $exp['certificate_id'],
                        'issued_year'    => $exp['issued_year'] ?? null,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Thêm hướng dẫn viên thành công',
                'data'    => $guide->load([
                    'user',
                    'specializations',
                    'languages.language',
                    'languages.level',
                    'experiences.certificate',
                ]),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }

    // SỬA HDV
    public function update(Request $request, $id)
    {
        $guide = Guide::find($id);

        if (!$guide) {
            return response()->json(['message' => 'Không tìm thấy hướng dẫn viên'], 404);
        }

        $request->validate([
            'experience_years'             => 'integer|min:0',
            'status'                       => 'in:active,inactive,locked',
            'specialization_ids'           => 'nullable|array',
            'specialization_ids.*'         => 'exists:guide_specializations,id',
            'languages'                    => 'nullable|array',
            'languages.*.language_id'      => 'required|exists:languages,id',
            'languages.*.level_id'         => 'nullable|exists:language_levels,id',
            'experiences'                  => 'nullable|array',
            'experiences.*.certificate_id' => 'required|exists:certificates,id',
            'experiences.*.issued_year'    => 'nullable|integer',
        ]);

        DB::beginTransaction();
        try {
            $guide->update($request->only(['experience_years', 'status']));

            if ($request->has('specialization_ids')) {
                $guide->specializations()->sync($request->specialization_ids ?? []);
            }

            if ($request->has('languages')) {
                $guide->languages()->delete();
                foreach ($request->languages as $lang) {
                    $guide->languages()->create([
                        'language_id' => $lang['language_id'],
                        'level_id'    => $lang['level_id'] ?? null,
                    ]);
                }
            }

            if ($request->has('experiences')) {
                $guide->experiences()->delete();
                foreach ($request->experiences as $exp) {
                    $guide->experiences()->create([
                        'certificate_id' => $exp['certificate_id'],
                        'issued_year'    => $exp['issued_year'] ?? null,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Cập nhật hướng dẫn viên thành công',
                'data'    => $guide->load([
                    'user',
                    'specializations',
                    'languages.language',
                    'languages.level',
                    'experiences.certificate',
                ]),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }

    // XÓA MỀM HDV
    public function destroy($id)
    {
        $guide = Guide::find($id);

        if (!$guide) {
            return response()->json(['message' => 'Không tìm thấy hướng dẫn viên'], 404);
        }

        $guide->delete();

        return response()->json(['message' => 'Xóa hướng dẫn viên thành công']);
    }

    // DANH SÁCH ĐÃ XÓA MỀM
    public function trashed()
    {
        $guides = Guide::onlyTrashed()->with([
            'user',
            'specializations',
            'languages.language',
            'languages.level',
            'experiences.certificate',
        ])
            ->paginate(10);

        return response()->json([
            'message' => 'Danh sách hướng dẫn viên đã xóa',
            'data'    => $guides,
        ]);
    }

    // KHÔI PHỤC HDV
    public function restore($id)
    {
        $guide = Guide::withTrashed()->find($id);

        if (!$guide) {
            return response()->json(['message' => 'Không tìm thấy hướng dẫn viên'], 404);
        }

        $guide->restore();

        return response()->json(['message' => 'Khôi phục hướng dẫn viên thành công']);
    }

    // XÓA VĨNH VIỄN HDV
    public function forceDelete($id)
    {
        $guide = Guide::withTrashed()->find($id);

        if (!$guide) {
            return response()->json(['message' => 'Không tìm thấy hướng dẫn viên'], 404);
        }

        $guide->specializations()->detach();
        $guide->languages()->delete();
        $guide->experiences()->delete();
        $guide->forceDelete();

        return response()->json(['message' => 'Xóa vĩnh viễn hướng dẫn viên thành công']);
    }

    // THỐNG KÊ
    public function statistics()
    {
        $stats = Guide::select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->get();

        return response()->json([
            'message' => 'Thống kê hướng dẫn viên',
            'total'   => Guide::count(),
            'data'    => $stats,
        ]);
    }
}
