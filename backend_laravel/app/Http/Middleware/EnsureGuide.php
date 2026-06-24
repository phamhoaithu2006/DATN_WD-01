<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureGuide
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role?->name !== 'tour guide') {
            return response()->json([
                'message' => 'Ban khong co quyen truy cap khu vuc HDV',
            ], 403);
        }

        return $next($request);
    }
}
