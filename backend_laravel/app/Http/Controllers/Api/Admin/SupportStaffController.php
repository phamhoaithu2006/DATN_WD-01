<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportStaff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SupportStaffController extends Controller
{
    // API 1 & 3: Hiển thị danh sách, phân trang, tìm kiếm nâng cao & lọc 
    public function index(Request $request)
    {
        $query = SupportStaff::query();

        // Tìm kiếm theo từ khóa key (Tên hoặc Email) 
        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        // Lọc theo chức vụ (role) 
        if ($request->has('role') && $request->role != '') {
            $query->where('role', $request->role);
        }

        // Lọc theo trạng thái (status) 
        if ($request->has('status') && $request->status != '') {
            $query->where('status', $request->status);
        }

        // Lọc theo hiệu suất (Tìm nhân viên từ mức rating chỉ định trở lên) 
        if ($request->has('rating_from') && $request->rating_from != '') {
            $query->where('performance_rating', '>=', $request->rating_from);
        }

        // Sắp xếp mới nhất và phân trang tự động 10 bản ghi 
        $staff = $query->latest()->paginate(10);

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách nhân viên thành công',
            'data' => $staff
        ], 200);
    }

    // API 2: Thêm mới tài khoản nhân viên 
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:support_staff,email',
            'role' => 'required|string',
            'status' => 'nullable|string',
            'performance_rating' => 'nullable|numeric|between:0,5'
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $staff = SupportStaff::create($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Thêm nhân viên hỗ trợ thành công',
            'data' => $staff
        ], 201);
    }

    // API 4: Xem chi tiết tài khoản nhân viên 
    public function show($id)
    {
        $staff = SupportStaff::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $staff
        ], 200);
    }

    // API 2: Cập nhật thông tin (Sửa tài khoản) 
    public function update(Request $request, $id)
    {
        $staff = SupportStaff::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:support_staff,email,' . $id,
            'role' => 'sometimes|required|string',
            'status' => 'sometimes|required|string',
            'performance_rating' => 'sometimes|required|numeric|between:0,5'
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'error', 'errors' => $validator->errors()], 422);
        }

        $staff->update($request->all());

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật thông tin nhân viên thành công',
            'data' => $staff
        ], 200);
    }
}