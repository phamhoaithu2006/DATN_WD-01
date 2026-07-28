<?php

namespace App\Http\Controllers\Api\Support;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\SupportRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class SupportDashboardController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;
        $today = now()->startOfDay();

        $unreadNotifications = Notification::query()
            ->where('user_id', $userId)
            ->when(
                Schema::hasColumn('notifications', 'status'),
                fn ($query) => $query->where('status', 'unread'),
                fn ($query) => Schema::hasColumn('notifications', 'read_at')
                    ? $query->whereNull('read_at')
                    : $query->whereRaw('1 = 0'),
            )
            ->count();

        $priorityRequests = SupportRequest::query()
            ->with('assignedStaff:id,full_name')
            ->where(function ($query) use ($userId) {
                $query
                    ->where('status', 'pending')
                    ->orWhere(function ($assignedQuery) use ($userId) {
                        $assignedQuery
                            ->where('assigned_to', $userId)
                            ->whereIn('status', ['in_progress', 'pending']);
                    });
            })
            ->orderByRaw("CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END")
            ->orderByDesc('created_at')
            ->limit(6)
            ->get([
                'id', 'ticket_code', 'full_name', 'subject', 'category', 'priority',
                'status', 'assigned_to', 'needs_more_info', 'created_at',
            ]);

        return response()->json([
            'data' => [
                'staff_name' => $request->user()->full_name,
                'stats' => [
                    'pending' => SupportRequest::query()->where('status', 'pending')->count(),
                    'mine_in_progress' => SupportRequest::query()->where('assigned_to', $userId)->where('status', 'in_progress')->count(),
                    'waiting_customer' => SupportRequest::query()->where('assigned_to', $userId)->where('needs_more_info', true)->where('status', 'pending')->count(),
                    'resolved_today' => SupportRequest::query()->where('assigned_to', $userId)->where('status', 'resolved')->where('resolved_at', '>=', $today)->count(),
                    'unread_notifications' => $unreadNotifications,
                ],
                'priority_requests' => $priorityRequests,
            ],
        ]);
    }
}
