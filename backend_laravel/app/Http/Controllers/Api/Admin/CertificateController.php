<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use Illuminate\Http\Request;

class CertificateController extends Controller
{
    // DANH SÁCH CHỨNG CHỈ
    public function index(Request $request)
    {
        $query = Certificate::query();

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('issued_by', 'like', '%' . $search . '%');
            });
        }

        $certificates = $query->orderBy('name')->get();

        return response()->json([
            'message' => 'Danh sách chứng chỉ',
            'data'    => $certificates,
        ]);
    }

    // CHI TIẾT CHỨNG CHỈ
    public function show($id)
    {
        $certificate = Certificate::find($id);

        if (!$certificate) {
            return response()->json(['message' => 'Không tìm thấy chứng chỉ'], 404);
        }

        return response()->json([
            'message' => 'Chi tiết chứng chỉ',
            'data'    => $certificate,
        ]);
    }

    // THÊM CHỨNG CHỈ MỚI
    public function store(Request $request)
    {
        $request->validate([
            'name'      => 'required|string|max:150|unique:certificates,name',
            'issued_by' => 'nullable|string|max:150',
        ]);

        $certificate = Certificate::create([
            'name'      => $request->name,
            'issued_by' => $request->issued_by,
        ]);

        return response()->json([
            'message' => 'Thêm chứng chỉ thành công',
            'data'    => $certificate,
        ], 201);
    }

    // SỬA CHỨNG CHỈ
    public function update(Request $request, $id)
    {
        $certificate = Certificate::find($id);

        if (!$certificate) {
            return response()->json(['message' => 'Không tìm thấy chứng chỉ'], 404);
        }

        $request->validate([
            'name'      => 'required|string|max:150|unique:certificates,name,' . $id,
            'issued_by' => 'nullable|string|max:150',
        ]);

        $certificate->update([
            'name'      => $request->name,
            'issued_by' => $request->issued_by,
        ]);

        return response()->json([
            'message' => 'Cập nhật chứng chỉ thành công',
            'data'    => $certificate,
        ]);
    }

    // XÓA CHỨNG CHỈ
    public function destroy($id)
    {
        $certificate = Certificate::find($id);

        if (!$certificate) {
            return response()->json(['message' => 'Không tìm thấy chứng chỉ'], 404);
        }

        // Kiểm tra nếu chứng chỉ đang được HDV nào sử dụng
        $isUsed = $certificate->guides()->exists();
        if ($isUsed) {
            return response()->json([
                'message' => 'Không thể xóa vì chứng chỉ này đang được hướng dẫn viên sử dụng.',
            ], 422);
        }

        $certificate->delete();

        return response()->json(['message' => 'Xóa chứng chỉ thành công']);
    }
}
