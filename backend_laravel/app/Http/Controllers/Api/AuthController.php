<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // ĐĂNG KÝ
    public function register(Request $request)
    {
        $request->validate([
            'full_name' => 'required|string|max:255',
            'email'     => 'required|email|unique:users,email',
            'phone'     => 'required|string|unique:users,phone',
            'password'  => 'required|string|min:6|confirmed',
        ]);

        $user = User::create([
            'role_id'   => 2,
            'full_name' => $request->full_name,
            'email'     => $request->email,
            'phone'     => $request->phone,
            'password'  => Hash::make($request->password),
            'status'    => 'active',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Đăng ký thành công',
            'token'   => $token,
            'user'    => $user,
        ], 201);
    }

    // ĐĂNG NHẬP
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::with('role')->where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Email hoặc mật khẩu không đúng'
            ], 401);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'Tai khoan dang bi khoa hoac chua kich hoat'
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Đăng nhập thành công',
            'token'   => $token,
            'user'    => $user,
        ]);
    }

    // ĐĂNG XUẤT
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Đăng xuất thành công'
        ]);
    }

    public function me(Request $request)
    {
        /**
         * $request->user() là một phương thức tiện ích của Laravel.
         * Khi đi qua middleware 'auth:sanctum', Laravel sẽ tự động tìm kiếm
         * User tương ứng với token trong header Authorization và gán vào request.
         */
        $user = $request->user();

        // Trả về phản hồi dạng JSON cho client (Frontend/Mobile)
        return response()->json([
            'success' => true,      // Trạng thái yêu cầu thành công
            'data'    => $user      // Dữ liệu người dùng (tương ứng với các cột trong bảng users của bạn)
        ]);
    }
}
