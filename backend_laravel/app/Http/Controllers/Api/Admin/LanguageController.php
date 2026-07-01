<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Language;
use App\Models\LanguageLevel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LanguageController extends Controller
{
    // DANH SÁCH NGÔN NGỮ (kèm levels)
    public function index()
    {
        $languages = Language::with('levels')->orderBy('name')->get();

        return response()->json([
            'message' => 'Danh sách ngôn ngữ',
            'data'    => $languages,
        ]);
    }

    // CHI TIẾT 1 NGÔN NGỮ
    public function show($id)
    {
        $language = Language::with('levels')->find($id);

        if (!$language) {
            return response()->json(['message' => 'Không tìm thấy ngôn ngữ'], 404);
        }

        return response()->json([
            'message' => 'Chi tiết ngôn ngữ',
            'data'    => $language,
        ]);
    }

    // THÊM NGÔN NGỮ MỚI (có thể kèm danh sách level luôn)
    public function store(Request $request)
    {
        $request->validate([
            'name'              => 'required|string|max:100|unique:languages,name',
            'levels'            => 'nullable|array',
            'levels.*'          => 'required|string|max:20',
        ]);

        DB::beginTransaction();
        try {
            $language = Language::create([
                'name' => $request->name,
            ]);

            if ($request->levels) {
                foreach ($request->levels as $levelName) {
                    LanguageLevel::create([
                        'language_id' => $language->id,
                        'level_name'  => $levelName,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Thêm ngôn ngữ thành công',
                'data'    => $language->load('levels'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }

    // SỬA NGÔN NGỮ (đổi tên, không đụng tới levels ở đây)
    public function update(Request $request, $id)
    {
        $language = Language::find($id);

        if (!$language) {
            return response()->json(['message' => 'Không tìm thấy ngôn ngữ'], 404);
        }

        $request->validate([
            'name' => 'required|string|max:100|unique:languages,name,' . $id,
        ]);

        $language->update(['name' => $request->name]);

        return response()->json([
            'message' => 'Cập nhật ngôn ngữ thành công',
            'data'    => $language->load('levels'),
        ]);
    }

    // XÓA NGÔN NGỮ (sẽ xóa luôn levels do cascade)
    public function destroy($id)
    {
        $language = Language::find($id);

        if (!$language) {
            return response()->json(['message' => 'Không tìm thấy ngôn ngữ'], 404);
        }

        $language->delete();

        return response()->json(['message' => 'Xóa ngôn ngữ thành công']);
    }

    // ===== QUẢN LÝ LEVEL THEO NGÔN NGỮ =====

    // DANH SÁCH LEVEL CỦA 1 NGÔN NGỮ
    public function levels($languageId)
    {
        $language = Language::find($languageId);

        if (!$language) {
            return response()->json(['message' => 'Không tìm thấy ngôn ngữ'], 404);
        }

        return response()->json([
            'message' => 'Danh sách cấp độ của ' . $language->name,
            'data'    => $language->levels,
        ]);
    }

    // THÊM 1 LEVEL MỚI CHO NGÔN NGỮ
    public function storeLevel(Request $request, $languageId)
    {
        $language = Language::find($languageId);

        if (!$language) {
            return response()->json(['message' => 'Không tìm thấy ngôn ngữ'], 404);
        }

        $request->validate([
            'level_name' => [
                'required',
                'string',
                'max:20',
                function ($attribute, $value, $fail) use ($languageId) {
                    $exists = LanguageLevel::where('language_id', $languageId)
                        ->where('level_name', $value)
                        ->exists();
                    if ($exists) {
                        $fail('Cấp độ này đã tồn tại cho ngôn ngữ này.');
                    }
                },
            ],
        ]);

        $level = LanguageLevel::create([
            'language_id' => $languageId,
            'level_name'  => $request->level_name,
        ]);

        return response()->json([
            'message' => 'Thêm cấp độ thành công',
            'data'    => $level,
        ], 201);
    }

    // SỬA 1 LEVEL
    public function updateLevel(Request $request, $languageId, $levelId)
    {
        $level = LanguageLevel::where('language_id', $languageId)->find($levelId);

        if (!$level) {
            return response()->json(['message' => 'Không tìm thấy cấp độ'], 404);
        }

        $request->validate([
            'level_name' => [
                'required',
                'string',
                'max:20',
                function ($attribute, $value, $fail) use ($languageId, $levelId) {
                    $exists = LanguageLevel::where('language_id', $languageId)
                        ->where('level_name', $value)
                        ->where('id', '!=', $levelId)
                        ->exists();
                    if ($exists) {
                        $fail('Cấp độ này đã tồn tại cho ngôn ngữ này.');
                    }
                },
            ],
        ]);

        $level->update(['level_name' => $request->level_name]);

        return response()->json([
            'message' => 'Cập nhật cấp độ thành công',
            'data'    => $level,
        ]);
    }

    // XÓA 1 LEVEL
    public function destroyLevel($languageId, $levelId)
    {
        $level = LanguageLevel::where('language_id', $languageId)->find($levelId);

        if (!$level) {
            return response()->json(['message' => 'Không tìm thấy cấp độ'], 404);
        }

        $level->delete();

        return response()->json(['message' => 'Xóa cấp độ thành công']);
    }
}
