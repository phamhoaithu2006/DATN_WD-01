<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportStaff;
use App\Models\SupportStaffPresenceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminSupportStaffMonitoringController extends Controller
{
    private const ONLINE_THRESHOLD_SECONDS = 120;

    /**
     * Trả trạng thái online/offline của toàn bộ NVHT.
     *
     * Frontend có thể gọi lại endpoint này mỗi 30–60 giây.
     */
    public function presenceIndex(): JsonResponse
    {
        $staffList =
            SupportStaff::query()
                ->withoutTrashed()
                ->with([
                    'user:id,full_name,email,avatar_url',
                ])
                ->whereNotNull(
                    'user_id'
                )
                ->orderBy('id')
                ->get();

        $presenceMap =
            $staffList
                ->mapWithKeys(
                    function (
                        SupportStaff $staff
                    ) {
                        return [
                            (string) $staff->id =>
                                $this
                                    ->buildPresenceData(
                                        (int) $staff
                                            ->user_id
                                    ),
                        ];
                    }
                );

        return response()->json([
            'success' => true,
            'data' => $presenceMap,
        ]);
    }

    /**
     * Chi tiết lịch sử thao tác form hỗ trợ và lịch sử online.
     */
    public function activityHistory(
        Request $request,
        int $id
    ): JsonResponse {
        $staff =
            SupportStaff::query()
                ->withoutTrashed()
                ->with([
                    'user:id,full_name,email,phone,avatar_url',
                ])
                ->findOrFail($id);

        $userId =
            (int) $staff->user_id;

        $activityLimit =
            min(
                max(
                    (int) $request->input(
                        'activity_limit',
                        100
                    ),
                    1
                ),
                300
            );

        $sessionLimit =
            min(
                max(
                    (int) $request->input(
                        'session_limit',
                        50
                    ),
                    1
                ),
                200
            );

        $activities =
            $this->getSupportActivities(
                $userId,
                $activityLimit
            );

        $sessions =
            SupportStaffPresenceSession::query()
                ->where(
                    'user_id',
                    $userId
                )
                ->latest('started_at')
                ->limit($sessionLimit)
                ->get()
                ->map(
                    fn (
                        SupportStaffPresenceSession $session
                    ) => [
                        'id' =>
                            $session->id,

                        'started_at' =>
                            optional(
                                $session->started_at
                            )->toIso8601String(),

                        'last_seen_at' =>
                            optional(
                                $session->last_seen_at
                            )->toIso8601String(),

                        'ended_at' =>
                            optional(
                                $session->ended_at
                            )->toIso8601String(),

                        'duration_seconds' =>
                            $this
                                ->getSessionDurationSeconds(
                                    $session
                                ),

                        'is_current' =>
                            $this->isSessionOnline(
                                $session
                            ),

                        'ip_address' =>
                            $session->ip_address,
                    ]
                )
                ->values();

        $ticketSummary =
            $this->getTicketSummary(
                $userId
            );

        return response()->json([
            'success' => true,

            'data' => [
                'staff' => [
                    'id' =>
                        $staff->id,

                    'staff_code' =>
                        sprintf(
                            'NV%03d',
                            $staff->id
                        ),

                    'user_id' =>
                        $userId,

                    'name' =>
                        $staff->user
                            ?->full_name
                        ?: $staff->name,

                    'email' =>
                        $staff->user
                            ?->email
                        ?: $staff->email,

                    'avatar_url' =>
                        $staff->user
                            ?->avatar_url,
                ],

                'presence' =>
                    $this
                        ->buildPresenceData(
                            $userId
                        ),

                'ticket_summary' =>
                    $ticketSummary,

                'activity_summary' => [
                    'total_actions' =>
                        $activities->count(),

                    'claimed' =>
                        $activities
                            ->where(
                                'action',
                                'claimed'
                            )
                            ->count(),

                    'requested_more_info' =>
                        $activities
                            ->whereIn(
                                'action',
                                [
                                    'requested_more_info',
                                    'request_more_info',
                                ]
                            )
                            ->count(),

                    'transferred' =>
                        $activities
                            ->whereIn(
                                'action',
                                [
                                    'transferred',
                                    'transfer',
                                ]
                            )
                            ->count(),

                    'sent_to_admin' =>
                        $activities
                            ->whereIn(
                                'action',
                                [
                                    'sent_to_admin',
                                    'send_to_admin',
                                ]
                            )
                            ->count(),
                ],

                'activities' =>
                    $activities
                        ->values(),

                'sessions' =>
                    $sessions,
            ],
        ]);
    }

    private function getSupportActivities(
        int $userId,
        int $limit
    ): Collection {
        if (
            ! Schema::hasTable(
                'support_request_histories'
            )
        ) {
            return collect();
        }

        $query =
            DB::table(
                'support_request_histories as history'
            )
                ->where(
                    'history.actor_id',
                    $userId
                );

        if (
            Schema::hasTable(
                'support_requests'
            )
            && Schema::hasColumn(
                'support_request_histories',
                'support_request_id'
            )
        ) {
            $query->leftJoin(
                'support_requests as request',
                'request.id',
                '=',
                'history.support_request_id'
            );
        }

        $columns = [
            'history.id',
            'history.support_request_id',
            'history.actor_id',
            'history.action',
            'history.description',
            'history.from_status',
            'history.to_status',
            'history.created_at',
        ];

        if (
            Schema::hasColumn(
                'support_request_histories',
                'metadata'
            )
        ) {
            $columns[] =
                'history.metadata';
        }

        if (
            Schema::hasTable(
                'support_requests'
            )
        ) {
            if (
                Schema::hasColumn(
                    'support_requests',
                    'ticket_code'
                )
            ) {
                $columns[] =
                    'request.ticket_code';
            } elseif (
                Schema::hasColumn(
                    'support_requests',
                    'code'
                )
            ) {
                $columns[] =
                    'request.code as ticket_code';
            }
        }

        return $query
            ->select($columns)
            ->latest(
                'history.created_at'
            )
            ->limit($limit)
            ->get()
            ->map(
                function ($activity) {
                    $metadata =
                        $activity
                            ->metadata
                        ?? null;

                    if (
                        is_string($metadata)
                    ) {
                        $decoded =
                            json_decode(
                                $metadata,
                                true
                            );

                        $metadata =
                            is_array($decoded)
                            ? $decoded
                            : [];
                    }

                    return [
                        'id' =>
                            $activity->id,

                        'support_request_id' =>
                            $activity
                                ->support_request_id
                            ?? null,

                        'ticket_code' =>
                            $activity
                                ->ticket_code
                            ?? null,

                        'action' =>
                            $activity
                                ->action
                            ?? 'activity',

                        'description' =>
                            $activity
                                ->description
                            ?? null,

                        'from_status' =>
                            $activity
                                ->from_status
                            ?? null,

                        'to_status' =>
                            $activity
                                ->to_status
                            ?? null,

                        'metadata' =>
                            is_array(
                                $metadata
                            )
                            ? $metadata
                            : [],

                        'created_at' =>
                            $activity
                                ->created_at
                            ? Carbon::parse(
                                $activity
                                    ->created_at
                            )->toIso8601String()
                            : null,
                    ];
                }
            );
    }

    private function getTicketSummary(
        int $userId
    ): array {
        if (
            ! Schema::hasTable(
                'support_requests'
            )
            || ! Schema::hasColumn(
                'support_requests',
                'assigned_to'
            )
        ) {
            return [
                'in_progress' => 0,
                'needs_more_info' => 0,
                'resolved' => 0,
                'total_assigned' => 0,
            ];
        }

        $base =
            DB::table(
                'support_requests'
            )
                ->where(
                    'assigned_to',
                    $userId
                );

        return [
            'in_progress' =>
                (clone $base)
                    ->where(
                        'status',
                        'in_progress'
                    )
                    ->count(),

            'needs_more_info' =>
                (clone $base)
                    ->where(
                        'status',
                        'pending'
                    )
                    ->where(
                        'needs_more_info',
                        true
                    )
                    ->count(),

            'resolved' =>
                (clone $base)
                    ->where(
                        'status',
                        'resolved'
                    )
                    ->count(),

            'total_assigned' =>
                (clone $base)
                    ->count(),
        ];
    }

    private function buildPresenceData(
        int $userId
    ): array {
        $latestSession =
            SupportStaffPresenceSession::query()
                ->where(
                    'user_id',
                    $userId
                )
                ->latest(
                    'last_seen_at'
                )
                ->first();

        if (! $latestSession) {
            return [
                'is_online' => false,
                'online_since' => null,
                'last_seen_at' => null,
                'online_seconds' => 0,
                'offline_seconds' => null,
                'today_online_seconds' => 0,
                'threshold_seconds' =>
                    self::ONLINE_THRESHOLD_SECONDS,
            ];
        }

        $isOnline =
            $this->isSessionOnline(
                $latestSession
            );

        $lastSeen =
            $latestSession
                ->last_seen_at;

        return [
            'is_online' =>
                $isOnline,

            'online_since' =>
                $isOnline
                ? optional(
                    $latestSession
                        ->started_at
                )->toIso8601String()
                : null,

            'last_seen_at' =>
                optional(
                    $lastSeen
                )->toIso8601String(),

            'online_seconds' =>
                $isOnline
                ? max(
                    0,
                    $latestSession
                        ->started_at
                        ->diffInSeconds(
                            now()
                        )
                )
                : 0,

            'offline_seconds' =>
                ! $isOnline
                && $lastSeen
                ? max(
                    0,
                    $lastSeen
                        ->diffInSeconds(
                            now()
                        )
                )
                : 0,

            'today_online_seconds' =>
                $this
                    ->getTodayOnlineSeconds(
                        $userId
                    ),

            'threshold_seconds' =>
                self::ONLINE_THRESHOLD_SECONDS,
        ];
    }

    private function isSessionOnline(
        SupportStaffPresenceSession $session
    ): bool {
        if (
            $session->ended_at
            || ! $session->last_seen_at
        ) {
            return false;
        }

        return $session
            ->last_seen_at
            ->greaterThanOrEqualTo(
                now()
                    ->subSeconds(
                        self::ONLINE_THRESHOLD_SECONDS
                    )
            );
    }

    private function getSessionDurationSeconds(
        SupportStaffPresenceSession $session
    ): int {
        if (
            $this->isSessionOnline(
                $session
            )
        ) {
            return max(
                0,
                $session
                    ->started_at
                    ->diffInSeconds(
                        now()
                    )
            );
        }

        return max(
            0,
            (int) $session
                ->duration_seconds
        );
    }

    private function getTodayOnlineSeconds(
        int $userId
    ): int {
        $startOfDay =
            now()->startOfDay();

        $endOfDay =
            now()->endOfDay();

        return SupportStaffPresenceSession::query()
            ->where(
                'user_id',
                $userId
            )
            ->where(
                'last_seen_at',
                '>=',
                $startOfDay
            )
            ->get()
            ->sum(
                function (
                    SupportStaffPresenceSession $session
                ) use (
                    $startOfDay,
                    $endOfDay
                ) {
                    $start =
                        $session
                            ->started_at
                            ->greaterThan(
                                $startOfDay
                            )
                        ? $session
                            ->started_at
                        : $startOfDay;

                    $rawEnd =
                        $this
                            ->isSessionOnline(
                                $session
                            )
                        ? now()
                        : (
                            $session
                                ->ended_at
                            ?: $session
                                ->last_seen_at
                        );

                    $end =
                        $rawEnd
                            ->lessThan(
                                $endOfDay
                            )
                        ? $rawEnd
                        : $endOfDay;

                    return $end
                        ->greaterThan($start)
                        ? $start
                            ->diffInSeconds(
                                $end
                            )
                        : 0;
                }
            );
    }
}