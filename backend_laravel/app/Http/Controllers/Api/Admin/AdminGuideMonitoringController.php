<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\GuidePresenceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminGuideMonitoringController extends Controller
{
    private const ONLINE_THRESHOLD_SECONDS = 120;

    public function presenceIndex(): JsonResponse
    {
        $map = Guide::query()->withoutTrashed()->whereNotNull('user_id')->pluck('user_id', 'id')
            ->mapWithKeys(fn ($userId, $guideId) => [(string) $guideId => $this->presence((int) $userId)]);

        return response()->json(['success' => true, 'data' => $map]);
    }

    public function activityHistory(Request $request, int $id): JsonResponse
    {
        $guide = Guide::query()->withoutTrashed()->with('user:id,full_name,email,avatar_url')->findOrFail($id);
        $sessions = GuidePresenceSession::query()->where('user_id', $guide->user_id)->latest('started_at')->limit(100)->get()
            ->map(fn (GuidePresenceSession $session) => [
                'id' => $session->id, 'started_at' => $session->started_at?->toIso8601String(),
                'last_seen_at' => $session->last_seen_at?->toIso8601String(), 'ended_at' => $session->ended_at?->toIso8601String(),
                'duration_seconds' => $this->duration($session), 'is_current' => $this->online($session), 'ip_address' => $session->ip_address,
            ])->values();
        $activities = $this->activities((int) $guide->user_id, min(max($request->integer('activity_limit', 100), 1), 300));

        return response()->json(['success' => true, 'data' => [
            'guide' => ['id' => $guide->id, 'guide_code' => $guide->guide_code, 'name' => $guide->user?->full_name, 'email' => $guide->user?->email, 'avatar_url' => $guide->user?->avatar_url],
            'presence' => $this->presence((int) $guide->user_id),
            'activity_summary' => ['total_actions' => $activities->count()],
            'activities' => $activities->values(), 'sessions' => $sessions,
        ]]);
    }

    private function activities(int $userId, int $limit)
    {
        $items = collect();
        if (Schema::hasTable('guide_leave_requests')) {
            $items = $items->merge(DB::table('guide_leave_requests')->where('user_id', $userId)->select('id', 'reason', 'status', 'created_at')->get()
                ->map(fn ($row) => ['id' => "leave-{$row->id}", 'action' => 'leave_request', 'description' => 'Gửi đơn xin nghỉ', 'detail' => $row->reason, 'status' => $row->status, 'created_at' => Carbon::parse($row->created_at)->toIso8601String()]));
        }
        if (Schema::hasTable('guide_replacement_requests')) {
            $items = $items->merge(DB::table('guide_replacement_requests')->where('requested_by', $userId)->select('id', 'reason', 'status', 'created_at')->get()
                ->map(fn ($row) => ['id' => "replacement-{$row->id}", 'action' => 'replacement_request', 'description' => 'Gửi yêu cầu đổi HDV', 'detail' => $row->reason, 'status' => $row->status, 'created_at' => Carbon::parse($row->created_at)->toIso8601String()]));
        }
        if (Schema::hasTable('attendance_sessions')) {
            $items = $items->merge(DB::table('attendance_sessions')->where('created_by', $userId)->select('id', 'name', 'note', 'created_at')->get()
                ->map(fn ($row) => ['id' => "attendance-{$row->id}", 'action' => 'attendance_session', 'description' => 'Tạo phiên điểm danh', 'detail' => $row->name.($row->note ? ": {$row->note}" : ''), 'status' => null, 'created_at' => Carbon::parse($row->created_at)->toIso8601String()]));
        }
        if (Schema::hasTable('attendances')) {
            $items = $items->merge(DB::table('attendances')->where('checked_in_by', $userId)->whereNotNull('checked_in_at')->select('id', 'checked_in_at')->get()
                ->map(fn ($row) => ['id' => "check-in-{$row->id}", 'action' => 'check_in', 'description' => 'Điểm danh khách', 'detail' => 'Đã xác nhận khách có mặt.', 'status' => null, 'created_at' => Carbon::parse($row->checked_in_at)->toIso8601String()]));
            $items = $items->merge(DB::table('attendances')->where('checked_out_by', $userId)->whereNotNull('checked_out_at')->select('id', 'checked_out_at')->get()
                ->map(fn ($row) => ['id' => "check-out-{$row->id}", 'action' => 'check_out', 'description' => 'Xác nhận khách rời điểm danh', 'detail' => 'Đã xác nhận khách rời phiên điểm danh.', 'status' => null, 'created_at' => Carbon::parse($row->checked_out_at)->toIso8601String()]));
        }
        return $items->sortByDesc('created_at')->take($limit)->values();
    }

    private function presence(int $userId): array
    {
        $session = GuidePresenceSession::query()->where('user_id', $userId)->latest('last_seen_at')->first();
        $today = GuidePresenceSession::query()->where('user_id', $userId)->whereDate('started_at', today())->get()->sum(fn ($item) => $this->duration($item));
        if (! $session) return ['is_online' => false, 'last_seen_at' => null, 'online_seconds' => 0, 'offline_seconds' => null, 'today_online_seconds' => $today];
        return ['is_online' => $this->online($session), 'last_seen_at' => $session->last_seen_at?->toIso8601String(), 'online_since' => $session->started_at?->toIso8601String(), 'online_seconds' => $this->online($session) ? $this->duration($session) : 0, 'offline_seconds' => $this->online($session) ? 0 : max(0, $session->last_seen_at->diffInSeconds(now())), 'today_online_seconds' => $today];
    }

    private function online(GuidePresenceSession $session): bool { return ! $session->ended_at && $session->last_seen_at?->greaterThanOrEqualTo(now()->subSeconds(self::ONLINE_THRESHOLD_SECONDS)); }
    private function duration(GuidePresenceSession $session): int { return max(0, $session->started_at->diffInSeconds($session->ended_at ?: now())); }
}
