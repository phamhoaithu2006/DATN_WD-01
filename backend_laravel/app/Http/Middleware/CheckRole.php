<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Vui lòng đăng nhập để sử dụng tính năng này.',
            ], 401);
        }

        $user->loadMissing('role');
        $currentRole = mb_strtolower(trim((string) $user->role?->name));
        $allowedRoles = array_map(
            fn (string $role): string => mb_strtolower(trim($role)),
            $roles
        );

        if ($currentRole === '' || ! in_array($currentRole, $allowedRoles, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền truy cập chức năng này.',
                'errors' => [],
            ], 403);
        }

        return $next($request);
    }
}
