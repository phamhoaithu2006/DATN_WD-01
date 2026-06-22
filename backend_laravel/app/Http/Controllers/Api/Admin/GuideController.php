<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Guide;
// use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GuideController extends Controller
{
    // DANH SÁCH HDV
    public function index(Request $request)
    {
        $guides = Guide::with(['user', 'languages', 'experiences'])
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
        $query = Guide::with(['user', 'languages', 'experiences'])
            ->whereHas('user');

        if ($request->search) {
            $search = $request->search;

            $query->where(function ($guideQuery) use ($search) {
                $guideQuery->where('guide_code', 'like', '%' . $search . '%')
                    ->orWhere('certificate_type', 'like', '%' . $search . '%')
                    ->orWhereHas('user', function ($q) use ($search) {
                        $q->where('full_name', 'like', '%' . $search . '%')
                            ->orWhere('email', 'like', '%' . $search . '%')
                            ->orWhere('phone', 'like', '%' . $search . '%');
                    })
                    ->orWhereHas('languages', function ($q) use ($search) {
                        $q->where('language', 'like', '%' . $search . '%');
                    });
            });
        }

        $guides = $query->paginate(10);

        return response()->json([
            'message' => 'Kết quả tìm kiếm hướng dẫn viên',
            'data'    => $guides,
        ]);
    }

    // LỌC HDV
    public function filter(Request $request)
    {
        $query = Guide::with(['user', 'languages', 'experiences'])
            ->whereHas('user');

        if ($request->search) {
            $search = $request->search;

            $query->where(function ($guideQuery) use ($search) {
                $guideQuery->where('guide_code', 'like', '%' . $search . '%')
                    ->orWhere('certificate_type', 'like', '%' . $search . '%')
                    ->orWhereHas('user', function ($q) use ($search) {
                        $q->where('full_name', 'like', '%' . $search . '%')
                            ->orWhere('email', 'like', '%' . $search . '%')
                            ->orWhere('phone', 'like', '%' . $search . '%');
                    })
                    ->orWhereHas('languages', function ($q) use ($search) {
                        $q->where('language', 'like', '%' . $search . '%');
                    });
            });
        }

        // Lọc theo trạng thái
        if ($request->status) {
            $query->where('status', $request->status);
        }

        // Lọc theo số năm kinh nghiệm
        if ($request->experience_years) {
            $query->where('experience_years', '>=', $request->experience_years);
        }

        // Lọc theo ngoại ngữ
        if ($request->language) {
            $query->whereHas('languages', function ($q) use ($request) {
                $q->where('language', 'like', '%' . $request->language . '%');
            });
        }

        $guides = $query->paginate(10);

        return response()->json([
            'message' => 'Kết quả lọc hướng dẫn viên',
            'data'    => $guides,
        ]);
    }

    // CHI TIẾT HDV
    public function show($id)
    {
        $guide = Guide::with(['user', 'languages', 'experiences'])->find($id);

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
            'user_id'          => 'required|exists:users,id|unique:guides,user_id',
            'certificate_type' => 'nullable|string|max:100',
            'experience_years' => 'required|integer|min:0',
            'status'           => 'in:active,inactive,locked',
            'languages'        => 'nullable|array',
            'languages.*.language' => 'required|string|max:100',
            'languages.*.level'    => 'nullable|in:A1,A2,B1,B2,C1,C2,Native',
            'experiences'      => 'nullable|array',
            'experiences.*.certificate_name' => 'required|string|max:150',
            'experiences.*.issued_by'        => 'nullable|string|max:150',
            'experiences.*.issued_year'      => 'nullable|integer',
        ]);

        DB::beginTransaction();
        try {
            // Tạo mã HDV tự động
            $count = Guide::withTrashed()->count() + 1;
            $guideCode = 'HDV' . str_pad($count, 3, '0', STR_PAD_LEFT);

            $guide = Guide::create([
                'user_id'          => $request->user_id,
                'guide_code'       => $guideCode,
                'certificate_type' => $request->certificate_type,
                'experience_years' => $request->experience_years,
                'status'           => $request->status ?? 'active',
            ]);

            // Thêm ngoại ngữ
            if ($request->languages) {
                foreach ($request->languages as $lang) {
                    $guide->languages()->create($lang);
                }
            }

            // Thêm kinh nghiệm/chứng chỉ
            if ($request->experiences) {
                foreach ($request->experiences as $exp) {
                    $guide->experiences()->create($exp);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Thêm hướng dẫn viên thành công',
                'data'    => $guide->load(['user', 'languages', 'experiences']),
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
            'certificate_type' => 'nullable|string|max:100',
            'experience_years' => 'integer|min:0',
            'status'           => 'in:active,inactive,locked',
            'languages'        => 'nullable|array',
            'languages.*.language' => 'required|string|max:100',
            'languages.*.level'    => 'nullable|in:A1,A2,B1,B2,C1,C2,Native',
            'experiences'      => 'nullable|array',
            'experiences.*.certificate_name' => 'required|string|max:150',
            'experiences.*.issued_by'        => 'nullable|string|max:150',
            'experiences.*.issued_year'      => 'nullable|integer',
        ]);

        DB::beginTransaction();
        try {
            $guide->update($request->only([
                'certificate_type',
                'experience_years',
                'status'
            ]));

            // Cập nhật ngoại ngữ
            if ($request->has('languages')) {
                $guide->languages()->delete();
                foreach ($request->languages as $lang) {
                    $guide->languages()->create($lang);
                }
            }

            // Cập nhật kinh nghiệm
            if ($request->has('experiences')) {
                $guide->experiences()->delete();
                foreach ($request->experiences as $exp) {
                    $guide->experiences()->create($exp);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Cập nhật hướng dẫn viên thành công',
                'data'    => $guide->load(['user', 'languages', 'experiences']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }

    // XÓA HDV
    public function destroy($id)
    {
        $guide = Guide::find($id);

        if (!$guide) {
            return response()->json(['message' => 'Không tìm thấy hướng dẫn viên'], 404);
        }

        $guide->delete();

        return response()->json(['message' => 'Xóa hướng dẫn viên thành công']);
    }

    // THỐNG KÊ
    public function statistics()
    {
        $stats = Guide::select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->get();

        $total = Guide::count();

        return response()->json([
            'message' => 'Thống kê hướng dẫn viên',
            'total'   => $total,
            'data'    => $stats,
        ]);
    }
}
