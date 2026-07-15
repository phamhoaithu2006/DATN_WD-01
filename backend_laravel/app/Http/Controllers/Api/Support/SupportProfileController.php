<?php

namespace App\Http\Controllers\Api\Support;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SupportProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load(['role', 'supportStaff.user']);

        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin nhân viên hỗ trợ thành công',
            'data' => $user,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $supportStaff = $user->supportStaff;

        if (! $supportStaff) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản này chưa có hồ sơ nhân viên hỗ trợ',
            ], 404);
        }

        $validated = $request->validate([
            'full_name' => ['sometimes', 'required', 'string', 'max:150'],
            'email' => ['sometimes', 'required', 'email', 'max:150', 'unique:users,email,' . $user->id],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'status' => ['sometimes', 'required', 'in:active,inactive'],
        ]);

        $userUpdateData = [];

        if (array_key_exists('full_name', $validated)) {
            $userUpdateData['full_name'] = $validated['full_name'];
            $supportStaff->name = $validated['full_name'];
        }

        if (array_key_exists('email', $validated)) {
            $userUpdateData['email'] = $validated['email'];
            $supportStaff->email = $validated['email'];
        }

        if (array_key_exists('phone', $validated)) {
            $userUpdateData['phone'] = $validated['phone'];
        }

        if (array_key_exists('status', $validated)) {
            $userUpdateData['status'] = $validated['status'];
            $supportStaff->status = $validated['status'];
        }

        if (! empty($userUpdateData)) {
            $user->update($userUpdateData);
        }

        $supportStaff->save();

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thông tin nhân viên hỗ trợ thành công',
            'data' => $user->fresh()->load(['role', 'supportStaff.user']),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'old_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:6', 'confirmed'],
        ], [
            'old_password.required' => 'Vui lòng nhập mật khẩu cũ.',
            'new_password.required' => 'Vui lòng nhập mật khẩu mới.',
            'new_password.min' => 'Mật khẩu mới phải có ít nhất 6 ký tự.',
            'new_password.confirmed' => 'Mật khẩu xác nhận không khớp.',
        ]);

        $user = $request->user();

        if (! Hash::check($validated['old_password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Mật khẩu cũ không đúng.',
            ], 422);
        }

        if (Hash::check($validated['new_password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Mật khẩu mới phải khác mật khẩu cũ.',
            ], 422);
        }

        $user->update([
            'password' => Hash::make($validated['new_password']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đổi mật khẩu thành công.',
        ]);
    }
}
