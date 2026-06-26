<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportStaff;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class SupportStaffController extends Controller
{
    private const STATUSES = ['active', 'inactive', 'hidden'];

    public function index(Request $request)
    {
        $query = SupportStaff::query();

        if ($request->filled('search')) {
            $search = $request->string('search')->trim();
            $query->where(function ($subQuery) use ($search) {
                $subQuery
                    ->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%')
                    ->orWhere('role', 'like', '%' . $search . '%');
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('rating_from')) {
            $query->where('performance_rating', '>=', $request->input('rating_from'));
        }

        if ($request->filled('rating_to')) {
            $query->where('performance_rating', '<=', $request->input('rating_to'));
        }

        $perPage = max((int) $request->input('per_page', 10), 1);

        $staff = $query->latest()->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách nhân viên hỗ trợ thành công',
            'data' => $staff,
        ]);
    }

    public function statistics()
    {
        $baseQuery = SupportStaff::query();

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
            ->get(['id', 'name', 'email', 'role', 'status', 'performance_rating', 'created_at']);

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
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:support_staff,email',
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
        $data['status'] = $data['status'] ?? 'active';
        $data['hidden_at'] = $data['status'] === 'hidden' ? Carbon::now() : null;

        $staff = SupportStaff::create($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Thêm nhân viên hỗ trợ thành công',
            'data' => $staff,
        ], 201);
    }

    public function show($id)
    {
        $staff = SupportStaff::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $staff,
        ]);
    }

    public function update(Request $request, $id)
    {
        $staff = SupportStaff::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('support_staff', 'email')->ignore($id)],
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

        if (array_key_exists('status', $data)) {
            $data['hidden_at'] = $data['status'] === 'hidden' ? Carbon::now() : null;
        }

        $staff->update($data);

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
            'message' => 'Xóa nhân viên hỗ trợ thành công',
        ]);
    }
}