<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\GuideLeaveRequest;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class AdminGuideLeaveRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = GuideLeaveRequest::query()
            ->with([
                'guide.user:id,full_name,email,phone,avatar_url',
                'attachments',
                'admin:id,full_name,email',
            ])
            ->latest('created_at')
            ->latest('id');

        if ($request->filled('status') && $request->input('status') !== 'all') {
            if ($request->input('status') === 'processed') {
                $query->whereIn('status', ['approved', 'rejected', 'cancelled']);
            } else {
                $query->where('status', $request->input('status'));
            }
        }

        if ($request->filled('leave_state') && $request->input('leave_state') !== 'all') {
            $today = now()->toDateString();

            if ($request->input('leave_state') === 'current') {
                $query->whereDate('start_date', '<=', $today)
                    ->whereDate('end_date', '>=', $today);
            }

            if ($request->input('leave_state') === 'upcoming') {
                $query->whereDate('start_date', '>', $today);
            }

            if ($request->input('leave_state') === 'expired') {
                $query->whereDate('end_date', '<', $today);
            }
        }

        if ($request->filled('created_month')) {
            $query->whereMonth('created_at', (int) $request->input('created_month'));
        }

        if ($request->filled('created_year')) {
            $query->whereYear('created_at', (int) $request->input('created_year'));
        }

        if ($request->filled('created_from')) {
            $query->whereDate('created_at', '>=', $request->input('created_from'));
        }

        if ($request->filled('created_to')) {
            $query->whereDate('created_at', '<=', $request->input('created_to'));
        }

        if ($request->filled('search')) {
            $keyword = trim((string) $request->input('search'));

            $query->whereHas('guide.user', function ($userQuery) use ($keyword) {
                $userQuery
                    ->where('full_name', 'like', "%{$keyword}%")
                    ->orWhere('email', 'like', "%{$keyword}%");
            })->orWhereHas('guide', function ($guideQuery) use ($keyword) {
                $guideQuery->where('guide_code', 'like', "%{$keyword}%");
            });
        }

        $requests = $query->paginate(
            min(max($request->integer('per_page', 10), 1), 100)
        );

        $requests->setCollection(
            $requests->getCollection()->map(
                fn (GuideLeaveRequest $leaveRequest) => $this->serializeLeaveRequest($leaveRequest)
            )
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Danh sách đơn xin nghỉ HDV.',
            'summary' => $this->summary(),
            'data' => $requests,
        ]);
    }

    public function summary(): array
    {
        $today = now()->toDateString();

        return [
            'pending_count' => GuideLeaveRequest::query()
                ->where('status', 'pending')
                ->count(),

            'processed_count' => GuideLeaveRequest::query()
                ->whereIn('status', ['approved', 'rejected', 'cancelled'])
                ->count(),

            'approved_count' => GuideLeaveRequest::query()
                ->where('status', 'approved')
                ->count(),

            'rejected_count' => GuideLeaveRequest::query()
                ->where('status', 'rejected')
                ->count(),

            'available_guides_count' => Guide::query()
                ->whereHas('user')
                ->whereNotExists(function ($subQuery) use ($today) {
                    $subQuery
                        ->selectRaw('1')
                        ->from('guide_leave_requests as glr')
                        ->whereColumn('glr.guide_id', 'guides.id')
                        ->where(function ($leaveQuery) use ($today) {
                            $leaveQuery
                                ->where('glr.status', 'pending')
                                ->orWhere(function ($approvedQuery) use ($today) {
                                    $approvedQuery
                                        ->where('glr.status', 'approved')
                                        ->whereDate('glr.end_date', '>=', $today);
                                });
                        });
                })
                ->count(),

            'pending_guides_count' => GuideLeaveRequest::query()
                ->where('status', 'pending')
                ->distinct('guide_id')
                ->count('guide_id'),

            'waiting_leave_guides_count' => GuideLeaveRequest::query()
                ->where('status', 'approved')
                ->whereDate('start_date', '>', $today)
                ->distinct('guide_id')
                ->count('guide_id'),

            'resting_guides_count' => GuideLeaveRequest::query()
                ->where('status', 'approved')
                ->whereDate('start_date', '<=', $today)
                ->whereDate('end_date', '>=', $today)
                ->distinct('guide_id')
                ->count('guide_id'),
        ];
    }

    public function show(GuideLeaveRequest $leaveRequest): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'message' => 'Chi tiết đơn xin nghỉ HDV.',
            'data' => $this->serializeLeaveRequest($leaveRequest),
        ]);
    }

    public function approve(Request $request, GuideLeaveRequest $leaveRequest): JsonResponse
    {
        return $this->updateStatus($request, $leaveRequest, 'approved');
    }

    public function reject(Request $request, GuideLeaveRequest $leaveRequest): JsonResponse
    {
        return $this->updateStatus($request, $leaveRequest, 'rejected');
    }

    public function updateDecision(Request $request, GuideLeaveRequest $leaveRequest): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
        ]);

        return $this->updateStatus($request, $leaveRequest, $validated['status']);
    }

    private function updateStatus(
        Request $request,
        GuideLeaveRequest $leaveRequest,
        string $status
    ): JsonResponse {
        if ($leaveRequest->status === 'cancelled') {
            return response()->json([
                'message' => 'Đơn xin nghỉ này đã bị HDV hủy, không thể phê duyệt.',
            ], 422);
        }

        if ($leaveRequest->end_date && $leaveRequest->end_date->lt(now()->startOfDay())) {
            return response()->json([
                'message' => 'Thời gian xin nghỉ đã qua nên không thể sửa trạng thái phê duyệt.',
            ], 422);
        }

        $validated = $request->validate([
            'admin_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $oldStatus = $leaveRequest->status;

        $leaveRequest->update([
            'status' => $status,
            'admin_note' => $validated['admin_note'] ?? null,
            'admin_id' => $request->user()?->id,
            'reviewed_at' => now(),
        ]);

        $leaveRequest->load([
            'guide.user:id,full_name,email',
            'attachments',
            'admin:id,full_name,email',
        ]);

        $this->notifyGuide($leaveRequest, $oldStatus);
        $this->notifyAdminsDecision($leaveRequest, $request->user(), $oldStatus);

        return response()->json([
            'status' => 'success',
            'message' => $status === 'approved'
                ? 'Đã duyệt đơn xin nghỉ.'
                : 'Đã không duyệt đơn xin nghỉ.',
            'data' => $this->serializeLeaveRequest($leaveRequest),
            'summary' => $this->summary(),
        ]);
    }

    private function serializeLeaveRequest(GuideLeaveRequest $leaveRequest): array
    {
        $leaveRequest->loadMissing([
            'guide.user:id,full_name,email,phone,avatar_url',
            'attachments',
            'admin:id,full_name,email',
        ]);

        $today = now()->startOfDay();

        return [
            'id' => $leaveRequest->id,
            'guide_id' => $leaveRequest->guide_id,
            'guide_name' => $leaveRequest->guide?->user?->full_name,
            'guide_email' => $leaveRequest->guide?->user?->email,
            'guide_phone' => $leaveRequest->guide?->user?->phone,
            'guide_code' => $leaveRequest->guide?->guide_code,
            'start_date' => $leaveRequest->start_date?->toDateString(),
            'end_date' => $leaveRequest->end_date?->toDateString(),
            'reason' => $leaveRequest->reason,
            'status' => $leaveRequest->status,
            'admin_note' => $leaveRequest->admin_note,
            'admin' => $leaveRequest->admin?->only(['id', 'full_name', 'email']),
            'reviewed_at' => $leaveRequest->reviewed_at?->toDateTimeString(),
            'cancel_reason' => $leaveRequest->cancel_reason,
            'cancelled_at' => $leaveRequest->cancelled_at?->toDateTimeString(),
            'created_at' => $leaveRequest->created_at?->toDateTimeString(),
            'updated_at' => $leaveRequest->updated_at?->toDateTimeString(),
            'can_update_decision' => $leaveRequest->end_date
                ? $leaveRequest->end_date->gte($today)
                : true,
            'leave_state' => $this->leaveState($leaveRequest),
            'attachments' => $leaveRequest->attachments->map(fn ($file) => [
                'id' => $file->id,
                'name' => $file->original_name,
                'mime_type' => $file->mime_type,
                'size_bytes' => $file->size_bytes,
                'url' => $file->url,
            ])->values(),
        ];
    }

    private function leaveState(GuideLeaveRequest $leaveRequest): string
    {
        $today = now()->toDateString();

        if ($leaveRequest->end_date?->toDateString() < $today) {
            return 'expired';
        }

        if (
            $leaveRequest->start_date?->toDateString() <= $today &&
            $leaveRequest->end_date?->toDateString() >= $today
        ) {
            return 'current';
        }

        return 'upcoming';
    }

    private function notifyGuide(GuideLeaveRequest $leaveRequest, string $oldStatus): void
    {
        $guideUserId = $leaveRequest->guide?->user_id;

        if (!$guideUserId) {
            return;
        }

        $statusText = $leaveRequest->status === 'approved'
            ? 'đã được duyệt'
            : 'không được duyệt';

        $startDate = $leaveRequest->start_date?->format('d/m/Y');
        $endDate = $leaveRequest->end_date?->format('d/m/Y');

        $message = "Đơn xin nghỉ từ {$startDate} đến {$endDate} {$statusText}.";

        if ($leaveRequest->admin_note) {
            $message .= "\nGhi chú admin: {$leaveRequest->admin_note}";
        }

        $this->createNotification(
            userId: $guideUserId,
            title: 'Kết quả đơn xin nghỉ',
            message: $message,
            data: [
                'source' => 'guide_leave_request',
                'type' => 'guide_leave_request',
                'action' => $leaveRequest->status,
                'old_status' => $oldStatus,
                'guide_leave_request_id' => $leaveRequest->id,
                'leave_request_id' => $leaveRequest->id,
            ]
        );
    }

    private function notifyAdminsDecision(
        GuideLeaveRequest $leaveRequest,
        ?User $actor,
        string $oldStatus
    ): void {
        $adminIds = $this->adminUserIds();

        if ($adminIds->isEmpty()) {
            return;
        }

        $guideName = $leaveRequest->guide?->user?->full_name
            ?? "HDV #{$leaveRequest->guide_id}";

        $actorName = $actor?->full_name
            ?? $actor?->name
            ?? $actor?->email
            ?? 'Admin';

        $statusText = $leaveRequest->status === 'approved'
            ? 'duyệt'
            : 'không duyệt';

        $startDate = $leaveRequest->start_date?->format('d/m/Y');
        $endDate = $leaveRequest->end_date?->format('d/m/Y');

        $message = "{$actorName} vừa {$statusText} đơn xin nghỉ của {$guideName} từ {$startDate} đến {$endDate}.";

        if ($oldStatus !== 'pending') {
            $message .= "\nTrạng thái cũ: {$oldStatus}.";
        }

        foreach ($adminIds as $adminId) {
            $this->createNotification(
                userId: $adminId,
                title: 'Đơn xin nghỉ HDV đã được xử lý',
                message: $message,
                data: [
                    'source' => 'guide_leave_request',
                    'type' => 'guide_leave_request',
                    'action' => $leaveRequest->status,
                    'old_status' => $oldStatus,
                    'guide_leave_request_id' => $leaveRequest->id,
                    'leave_request_id' => $leaveRequest->id,
                    'guide_id' => $leaveRequest->guide_id,
                ]
            );
        }
    }

    private function createNotification(
        ?int $userId,
        string $title,
        string $message,
        array $data = []
    ): void {
        if (!$userId) {
            return;
        }

        $payload = [
            'draft_id' => null,
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => 'system',
            'status' => 'unread',
        ];

        if (Schema::hasColumn('notifications', 'data')) {
            $payload['data'] = json_encode($data);
        }

        Notification::query()->create($payload);
    }

    private function adminUserIds()
    {
        $query = User::query();

        if (Schema::hasColumn('users', 'role')) {
            $query->whereRaw('LOWER(role) = ?', ['admin']);
        } elseif (Schema::hasColumn('users', 'role_id') && Schema::hasTable('roles')) {
            $query->whereHas('role', function ($roleQuery) {
                $roleQuery->whereRaw('LOWER(name) = ?', ['admin']);
            });
        } else {
            return collect();
        }

        return $query->pluck('id');
    }
}
