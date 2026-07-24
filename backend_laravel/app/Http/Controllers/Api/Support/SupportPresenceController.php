<?php

namespace App\Http\Controllers\Api\Support;

use App\Http\Controllers\Controller;
use App\Models\SupportStaffPresenceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SupportPresenceController extends Controller
{
    /*
     * NVHT được xem là online khi heartbeat gần nhất
     * không quá 2 phút.
     */
    private const ONLINE_THRESHOLD_SECONDS = 120;

    public function heartbeat(
        Request $request
    ): JsonResponse {
        $user = $request->user();
        $now = now();

        $session = DB::transaction(
            function () use (
                $user,
                $request,
                $now
            ) {
                /*
                 * Đóng các phiên cũ đã mất heartbeat.
                 */
                SupportStaffPresenceSession::query()
                    ->where(
                        'user_id',
                        $user->id
                    )
                    ->whereNull(
                        'ended_at'
                    )
                    ->where(
                        'last_seen_at',
                        '<',
                        $now
                            ->copy()
                            ->subSeconds(
                                self::ONLINE_THRESHOLD_SECONDS
                            )
                    )
                    ->lockForUpdate()
                    ->get()
                    ->each(
                        function ($staleSession) {
                            $endedAt =
                                $staleSession
                                    ->last_seen_at
                                ?: now();

                            $staleSession->forceFill([
                                'ended_at' =>
                                    $endedAt,

                                'duration_seconds' =>
                                    max(
                                        0,
                                        $staleSession
                                            ->started_at
                                            ->diffInSeconds(
                                                $endedAt
                                            )
                                    ),
                            ])->save();
                        }
                    );

                $activeSession =
                    SupportStaffPresenceSession::query()
                        ->where(
                            'user_id',
                            $user->id
                        )
                        ->whereNull(
                            'ended_at'
                        )
                        ->where(
                            'last_seen_at',
                            '>=',
                            $now
                                ->copy()
                                ->subSeconds(
                                    self::ONLINE_THRESHOLD_SECONDS
                                )
                        )
                        ->lockForUpdate()
                        ->latest('id')
                        ->first();

                if (! $activeSession) {
                    $activeSession =
                        SupportStaffPresenceSession::create([
                            'user_id' =>
                                $user->id,

                            'started_at' =>
                                $now,

                            'last_seen_at' =>
                                $now,

                            'duration_seconds' =>
                                0,

                            'ip_address' =>
                                $request->ip(),

                            'user_agent' =>
                                mb_substr(
                                    (string) $request
                                        ->userAgent(),
                                    0,
                                    2000
                                ),
                        ]);
                } else {
                    $activeSession->forceFill([
                        'last_seen_at' =>
                            $now,

                        'duration_seconds' =>
                            max(
                                0,
                                $activeSession
                                    ->started_at
                                    ->diffInSeconds(
                                        $now
                                    )
                            ),

                        'ip_address' =>
                            $request->ip(),

                        'user_agent' =>
                            mb_substr(
                                (string) $request
                                    ->userAgent(),
                                0,
                                2000
                            ),
                    ])->save();
                }

                return $activeSession->fresh();
            },
            3
        );

        return response()->json([
            'success' => true,

            'data' => [
                'is_online' => true,

                'online_since' =>
                    optional(
                        $session->started_at
                    )->toIso8601String(),

                'last_seen_at' =>
                    optional(
                        $session->last_seen_at
                    )->toIso8601String(),

                'online_seconds' =>
                    max(
                        0,
                        $session
                            ->started_at
                            ->diffInSeconds(
                                Carbon::now()
                            )
                    ),

                'threshold_seconds' =>
                    self::ONLINE_THRESHOLD_SECONDS,
            ],
        ]);
    }
}