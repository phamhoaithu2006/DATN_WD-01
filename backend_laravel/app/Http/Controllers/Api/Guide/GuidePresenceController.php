<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Models\GuidePresenceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GuidePresenceController extends Controller
{
    private const ONLINE_THRESHOLD_SECONDS = 120;

    public function heartbeat(Request $request): JsonResponse
    {
        $now = now();
        $user = $request->user();

        $session = DB::transaction(function () use ($now, $request, $user) {
            GuidePresenceSession::query()
                ->where('user_id', $user->id)->whereNull('ended_at')
                ->where('last_seen_at', '<', $now->copy()->subSeconds(self::ONLINE_THRESHOLD_SECONDS))
                ->get()->each(function (GuidePresenceSession $stale) {
                    $endedAt = $stale->last_seen_at ?: now();
                    $stale->update([
                        'ended_at' => $endedAt,
                        'duration_seconds' => max(0, $stale->started_at->diffInSeconds($endedAt)),
                    ]);
                });

            $session = GuidePresenceSession::query()->where('user_id', $user->id)
                ->whereNull('ended_at')->where('last_seen_at', '>=', $now->copy()->subSeconds(self::ONLINE_THRESHOLD_SECONDS))
                ->latest('id')->first();

            $data = [
                'last_seen_at' => $now,
                'ip_address' => $request->ip(),
                'user_agent' => mb_substr((string) $request->userAgent(), 0, 2000),
            ];

            if ($session) {
                $session->update($data + ['duration_seconds' => max(0, $session->started_at->diffInSeconds($now))]);
            } else {
                $session = GuidePresenceSession::create($data + ['user_id' => $user->id, 'started_at' => $now, 'duration_seconds' => 0]);
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
