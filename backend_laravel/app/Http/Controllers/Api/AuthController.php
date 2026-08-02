<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetOtpMail;
use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rules\Password;
use Throwable;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $passwordMinLength = Setting::intValueFor('password_min_length', 8);

        $request->validate([
            'full_name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:20', 'unique:users,phone'],
            'password' => ['required', 'string', Password::min($passwordMinLength), 'confirmed'],
        ]);

        $customerRole = Role::where('name', 'customer')->firstOrFail();

        $user = User::create([
            'role_id' => $customerRole->id,
            'full_name' => $request->full_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'status' => 'active',
        ]);

        $token = $user->createToken(
            'auth_token',
            ['*'],
            now()->addMinutes(Setting::intValueFor('session_timeout_minutes', 120))
        )->plainTextToken;

        return response()->json([
            'message' => 'Đăng ký thành công',
            'token' => $token,
            'user' => $user->load('role'),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $identifier = trim((string) $request->input('identifier', $request->input('email', '')));
        $request->merge(['identifier' => $identifier]);

        $request->validate([
            'identifier' => ['required', 'string'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $user = $this->findUserByIdentifier(trim($request->identifier))?->load('role');
        $passwordMatches = false;

        if ($user) {
            try {
                $passwordMatches = Hash::check($request->password, $user->password);
            } catch (Throwable $exception) {
                // Không để lỗi hash cũ/lỗi dữ liệu lộ ra phía người dùng.
                Log::warning('Không thể xác thực mật khẩu có định dạng không hợp lệ', [
                    'user_id' => $user->id,
                    'exception' => $exception::class,
                ]);
            }
        }

        if (! $user || ! $passwordMatches) {
            return response()->json([
                'message' => 'Email hoặc SĐT hoặc mật khẩu không đúng',
            ], 401);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'Tài khoản đang bị khóa hoặc chưa kích hoạt',
            ], 403);
        }

        $expiresAt = now()->addMinutes(Setting::intValueFor('session_timeout_minutes', 120));

        if ($request->boolean('remember') && Setting::boolValueFor('allow_remember_login', true)) {
            $expiresAt = now()->addDays(30);
        }

        $token = $user->createToken('auth_token', ['*'], $expiresAt)->plainTextToken;

        return response()->json([
            'message' => 'Đăng nhập thành công',
            'token' => $token,
            'user' => $user->load('role'),
        ]);
    }

    /**
     * Gửi mã OTP đặt lại mật khẩu tới email của người dùng.
     * Luôn trả về phản hồi trung lập để tránh lộ thông tin tài khoản tồn tại.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'identifier' => ['required', 'string', 'max:150'],
        ]);

        $neutral = [
            'message' => 'Nếu thông tin khớp với tài khoản, mã xác nhận đã được gửi tới email của bạn.',
        ];

        $user = $this->findUserByIdentifier(trim($request->identifier));

        if (! $user) {
            return response()->json($neutral);
        }

        $otp = (string) random_int(100000, 999999);

        $user->update([
            'otp' => Hash::make($otp),
            'otp_expires_at' => now()->addMinutes(10),
        ]);

        try {
            Mail::to($user->email)->send(new PasswordResetOtpMail(
                $otp,
                $user->full_name,
                (string) Setting::valueFor('site_name', 'ViVuGo'),
            ));
        } catch (Throwable $e) {
            // Vẫn trả phản hồi trung lập: trả lỗi 500 sẽ vô tình tiết lộ tài khoản tồn tại.
            try {
                Log::error('Không gửi được email OTP đặt lại mật khẩu', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            } catch (Throwable) {
                // Logging lỗi (ví dụ file log không ghi được) cũng không được phá phản hồi trung lập.
            }
        }

        return response()->json($neutral);
    }

    /**
     * Xác nhận mã OTP và đặt lại mật khẩu mới.
     * Trả về cùng một thông báo lỗi cho mọi trường hợp không hợp lệ để tránh dò đoán.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $passwordMinLength = Setting::intValueFor('password_min_length', 8);

        $request->validate([
            'identifier' => ['required', 'string', 'max:150'],
            'otp' => ['required', 'digits:6'],
            'password' => ['required', 'string', Password::min($passwordMinLength), 'confirmed'],
        ]);

        $user = $this->findUserByIdentifier(trim($request->identifier));

        if (
            ! $user
            || ! $user->otp
            || ! $user->otp_expires_at
            || $user->otp_expires_at->isPast()
            || ! Hash::check($request->otp, $user->otp)
        ) {
            return response()->json([
                'message' => 'Mã xác nhận không đúng hoặc đã hết hạn.',
            ], 400);
        }

        $user->update([
            'password' => Hash::make($request->password),
            'otp' => null,
            'otp_expires_at' => null,
        ]);

        // Thu hồi toàn bộ phiên đăng nhập cũ sau khi đổi mật khẩu.
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Đăng xuất thành công',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role');

        return response()->json([
            'success' => true,
            'user' => $user,
            'data' => $user,
        ]);
    }

    /**
     * Tìm người dùng theo email hoặc số điện thoại (chuẩn hóa đầu số 84 về 0).
     */
    private function findUserByIdentifier(string $identifier): ?User
    {
        if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            return User::where('email', strtolower($identifier))->first();
        }

        $normalizedPhone = preg_replace('/\D+/', '', $identifier);
        $phoneCandidates = array_values(array_unique(array_filter([
            $normalizedPhone,
            str_starts_with($normalizedPhone, '84') ? '0' . substr($normalizedPhone, 2) : null,
        ])));

        if ($phoneCandidates === []) {
            return null;
        }

        return User::whereIn('phone', $phoneCandidates)->first();
    }
}
