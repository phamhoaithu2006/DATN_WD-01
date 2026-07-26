<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\CustomerPresenceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerPresenceController extends Controller
{
    private const ONLINE_THRESHOLD_SECONDS = 120;

    public function heartbeat(Request $request): JsonResponse
    {
        $now = now();
        $user = $request->user();

        $session = DB::transaction(function () use ($now, $request, $user) {
            CustomerPresenceSession::query()
                ->where('user_id', $user->id)
                ->whereNull('ended_at')
                ->where('last_seen_at', '<', $now->copy()->subSeconds(self::ONLINE_THRESHOLD_SECONDS))
                ->lockForUpdate()
                ->get()
                ->each(function (CustomerPresenceSession $staleSession): void {
                    $endedAt = $staleSession->last_seen_at ?: now();
                    $staleSession->update([
                        'ended_at' => $endedAt,
                        'duration_seconds' => max(0, $staleSession->started_at->diffInSeconds($endedAt)),
                    ]);
                });

            $session = CustomerPresenceSession::query()
                ->where('user_id', $user->id)
                ->whereNull('ended_at')
                ->where('last_seen_at', '>=', $now->copy()->subSeconds(self::ONLINE_THRESHOLD_SECONDS))
                ->lockForUpdate()
                ->latest('id')
                ->first();

            $data = [
                'last_seen_at' => $now,
                'ip_address' => $request->ip(),
                'user_agent' => mb_substr((string) $request->userAgent(), 0, 2000),
            ];

            if ($session) {
                $session->update($data + [
                    'duration_seconds' => max(0, $session->started_at->diffInSeconds($now)),
                ]);
            } else {
                $session = CustomerPresenceSession::create($data + [
                    'user_id' => $user->id,
                    'started_at' => $now,
                    'duration_seconds' => 0,
                ]);
            }

            return $session->fresh();
        }, 3);

        return response()->json(['success' => true, 'data' => [
            'is_online' => true,
            'online_since' => $session->started_at?->toIso8601String(),
            'last_seen_at' => $session->last_seen_at?->toIso8601String(),
            'online_seconds' => max(0, $session->started_at->diffInSeconds(now())),
        ]]);
    }
}
