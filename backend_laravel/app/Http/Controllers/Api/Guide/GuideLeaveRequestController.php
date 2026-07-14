<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\GuideLeaveRequest;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class GuideLeaveRequestController extends Controller
{
    private function getGuide(Request $request): ?Guide
    {
        return Guide::query()
            ->with('user')
            ->where('user_id', $request->user()->id)
            ->first();
    }

    private function leaveTablesReady(): bool
    {
        return Schema::hasTable('guide_leave_requests');
    }

    private function attachmentTableReady(): bool
    {
        return Schema::hasTable('guide_leave_request_attachments');
    }

    private function leaveRequestRelations(bool $includeGuide = false): array
    {
        $relations = ['admin'];

        if ($this->attachmentTableReady()) {
            $relations[] = 'attachments';
        }

        if ($includeGuide) {
            $relations[] = 'guide.user';
        }

        return $relations;
    }

    public function index(Request $request): JsonResponse
    {
        if (!$this->leaveTablesReady()) {
            return response()->json([
                'status' => 'success',
                'message' => 'Chưa tạo bảng guide_leave_requests. Hãy chạy php artisan migrate.',
                'data' => [
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $request->integer('per_page', 10),
                    'total' => 0,
                ],
                'summary' => $this->emptySummary(),
            ]);
        }

        $guide = $this->getGuide($request);

        if (!$guide) {
            return response()->json([
                'status' => 'success',
                'message' => 'Tài khoản chưa có hồ sơ HDV.',
                'data' => [
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $request->integer('per_page', 10),
                    'total' => 0,
                ],
                'summary' => $this->emptySummary(),
            ]);
        }

        $query = GuideLeaveRequest::query()
            ->with($this->leaveRequestRelations())
            ->where('guide_id', $guide->id)
            ->latest('created_at')
            ->latest('id');

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('created_month')) {
            $query->whereMonth('created_at', (int) $request->input('created_month'));
        }

        if ($request->filled('created_year')) {
            $query->whereYear('created_at', (int) $request->input('created_year'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('start_date', '>=', $request->input('from_date'));
        }

        if ($request->filled('to_date')) {
            $query->whereDate('end_date', '<=', $request->input('to_date'));
        }

        $requests = $query->paginate(
            min(max($request->integer('per_page', 10), 1), 50)
        );

        $requests->setCollection(
            $requests->getCollection()->map(
                fn (GuideLeaveRequest $leaveRequest) => $this->serializeLeaveRequest($leaveRequest)
            )
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Danh sách đơn xin nghỉ của HDV.',
            'summary' => $this->summaryForGuide($guide),
            'data' => $requests,
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        if (!$this->leaveTablesReady()) {
            return response()->json([
                'status' => 'success',
                'message' => 'Chưa tạo bảng guide_leave_requests. Hãy chạy php artisan migrate.',
                'data' => $this->emptySummary(),
            ]);
        }

        $guide = $this->getGuide($request);

        return response()->json([
            'status' => 'success',
            'message' => 'Thống kê đơn xin nghỉ.',
            'data' => $guide ? $this->summaryForGuide($guide) : $this->emptySummary(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$this->leaveTablesReady()) {
            return response()->json([
                'message' => 'Chưa tạo bảng guide_leave_requests. Hãy chạy php artisan migrate trước khi gửi đơn xin nghỉ.',
            ], 500);
        }

        $guide = $this->getGuide($request);

        if (!$guide) {
            return response()->json([
                'message' => 'Tài khoản chưa có hồ sơ HDV.',
            ], 404);
        }

        $minDate = now()->addDays(5)->toDateString();

        $validated = $request->validate([
            'start_date' => ['required', 'date', "after_or_equal:{$minDate}"],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['required', 'string', 'min:10', 'max:2000'],
            'evidence' => ['nullable', 'array', 'max:8'],
            'evidence.*' => [
                'file',
                'mimes:jpg,jpeg,png,webp,pdf',
                'max:5120',
            ],
        ], [
            'start_date.after_or_equal' => 'Bạn cần gửi đơn xin nghỉ trước ngày nghỉ ít nhất 5 ngày.',
            'reason.min' => 'Lý do xin nghỉ phải có ít nhất 10 ký tự.',
            'evidence.*.mimes' => 'Bằng chứng chỉ nhận ảnh JPG, PNG, WEBP hoặc PDF.',
            'evidence.*.max' => 'Mỗi file bằng chứng tối đa 5MB.',
        ]);

        $startDate = Carbon::parse($validated['start_date'])->toDateString();
        $endDate = Carbon::parse($validated['end_date'])->toDateString();

        $overlapExists = GuideLeaveRequest::query()
            ->where('guide_id', $guide->id)
            ->whereIn('status', ['pending', 'approved'])
            ->whereDate('start_date', '<=', $endDate)
            ->whereDate('end_date', '>=', $startDate)
            ->exists();

        if ($overlapExists) {
            return response()->json([
                'message' => 'Bạn đã có đơn xin nghỉ đang chờ duyệt hoặc đã duyệt trùng khoảng thời gian này.',
            ], 422);
        }

        $leaveRequest = DB::transaction(function () use ($request, $guide, $validated, $startDate, $endDate) {
            $leaveRequest = GuideLeaveRequest::query()->create([
                'guide_id' => $guide->id,
                'user_id' => $request->user()->id,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'reason' => trim($validated['reason']),
                'status' => 'pending',
            ]);

            if ($this->attachmentTableReady()) {
                foreach ($request->file('evidence', []) as $file) {
                    $path = $file->store('guide-leave-requests', 'public');

                    $leaveRequest->attachments()->create([
                        'file_path' => $path,
                        'original_name' => $file->getClientOriginalName(),
                        'mime_type' => $file->getClientMimeType(),
                        'size_bytes' => $file->getSize() ?: 0,
                    ]);
                }
            }

            $leaveRequest->load($this->leaveRequestRelations(true));

            $this->notifyAdminsAboutLeaveRequest($leaveRequest, 'created');

            return $leaveRequest;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Đã gửi đơn xin nghỉ. Admin sẽ phê duyệt sau.',
            'data' => $this->serializeLeaveRequest($leaveRequest),
        ], 201);
    }

    public function cancel(Request $request, GuideLeaveRequest $leaveRequest): JsonResponse
    {
        if (!$this->leaveTablesReady()) {
            return response()->json([
                'message' => 'Chưa tạo bảng guide_leave_requests.',
            ], 500);
        }

        $guide = $this->getGuide($request);

        abort_unless(
            $guide && (int) $leaveRequest->guide_id === (int) $guide->id,
            404
        );

        if ($leaveRequest->status !== 'pending') {
            return response()->json([
                'message' => 'Chỉ có thể hủy đơn xin nghỉ chưa được admin thao tác.',
            ], 422);
        }

        DB::transaction(function () use ($request, $leaveRequest) {
            $leaveRequest->update([
                'status' => 'cancelled',
                'cancel_reason' => $request->input('cancel_reason'),
                'cancelled_at' => now(),
            ]);

            $leaveRequest->load($this->leaveRequestRelations(true));

            $this->notifyAdminsAboutLeaveRequest($leaveRequest, 'cancelled');
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Đã hủy đơn xin nghỉ.',
            'data' => $this->serializeLeaveRequest($leaveRequest->fresh()->load($this->leaveRequestRelations())),
        ]);
    }

    private function summaryForGuide(Guide $guide): array
    {
        if (!$this->leaveTablesReady()) {
            return $this->emptySummary();
        }

        $today = now()->toDateString();

        return [
            'pending_count' => GuideLeaveRequest::query()
                ->where('guide_id', $guide->id)
                ->where('status', 'pending')
                ->count(),

            'busy_leave_count' => GuideLeaveRequest::query()
                ->where('guide_id', $guide->id)
                ->whereIn('status', ['pending', 'approved'])
                ->whereDate('start_date', '<=', $today)
                ->whereDate('end_date', '>=', $today)
                ->count(),

            'upcoming_busy_leave_count' => GuideLeaveRequest::query()
                ->where('guide_id', $guide->id)
                ->whereIn('status', ['pending', 'approved'])
                ->whereDate('end_date', '>=', $today)
                ->count(),
        ];
    }

    private function emptySummary(): array
    {
        return [
            'pending_count' => 0,
            'busy_leave_count' => 0,
            'upcoming_busy_leave_count' => 0,
        ];
    }

    private function serializeLeaveRequest(GuideLeaveRequest $leaveRequest): array
    {
        $leaveRequest->loadMissing($this->leaveRequestRelations(true));

        $attachments = $this->attachmentTableReady() && $leaveRequest->relationLoaded('attachments')
            ? $leaveRequest->attachments
            : collect();

        return [
            'id' => $leaveRequest->id,
            'guide_id' => $leaveRequest->guide_id,
            'guide_name' => $leaveRequest->guide?->user?->full_name
                ?? $leaveRequest->guide?->user?->name
                ?? null,
            'guide_email' => $leaveRequest->guide?->user?->email,
            'start_date' => $leaveRequest->start_date?->toDateString(),
            'end_date' => $leaveRequest->end_date?->toDateString(),
            'reason' => $leaveRequest->reason,
            'status' => $leaveRequest->status,
            'admin_note' => $leaveRequest->admin_note,
            'admin' => $leaveRequest->admin ? [
                'id' => $leaveRequest->admin->id,
                'full_name' => $leaveRequest->admin->full_name
                    ?? $leaveRequest->admin->name
                    ?? $leaveRequest->admin->email,
                'email' => $leaveRequest->admin->email,
            ] : null,
            'reviewed_at' => $leaveRequest->reviewed_at?->toDateTimeString(),
            'cancel_reason' => $leaveRequest->cancel_reason,
            'cancelled_at' => $leaveRequest->cancelled_at?->toDateTimeString(),
            'created_at' => $leaveRequest->created_at?->toDateTimeString(),
            'updated_at' => $leaveRequest->updated_at?->toDateTimeString(),
            'attachments' => $attachments->map(fn ($file) => [
                'id' => $file->id,
                'name' => $file->original_name,
                'mime_type' => $file->mime_type,
                'size_bytes' => $file->size_bytes,
                'url' => $file->url,
            ])->values(),
        ];
    }

    private function notifyAdminsAboutLeaveRequest(
        GuideLeaveRequest $leaveRequest,
        string $action
    ): void {
        $adminIds = $this->adminUserIds();

        if ($adminIds->isEmpty()) {
            return;
        }

        $guideName = $leaveRequest->guide?->user?->full_name
            ?? $leaveRequest->guide?->user?->name
            ?? "HDV #{$leaveRequest->guide_id}";

        $startDate = $leaveRequest->start_date?->format('d/m/Y');
        $endDate = $leaveRequest->end_date?->format('d/m/Y');

        $title = $action === 'cancelled'
            ? 'HDV đã hủy đơn xin nghỉ'
            : 'HDV gửi đơn xin nghỉ';

        $message = $action === 'cancelled'
            ? "{$guideName} vừa hủy đơn xin nghỉ từ {$startDate} đến {$endDate}."
            : "{$guideName} vừa gửi đơn xin nghỉ từ {$startDate} đến {$endDate}.\nLý do: {$leaveRequest->reason}";

        $data = [
            'source' => 'guide_leave_request',
            'type' => 'guide_leave_request',
            'action' => $action,
            'guide_leave_request_id' => $leaveRequest->id,
            'leave_request_id' => $leaveRequest->id,
            'guide_id' => $leaveRequest->guide_id,
            'start_date' => $leaveRequest->start_date?->toDateString(),
            'end_date' => $leaveRequest->end_date?->toDateString(),
        ];

        foreach ($adminIds as $adminId) {
            $this->createNotification(
                userId: $adminId,
                title: $title,
                message: $message,
                data: $data
            );
        }
    }

    private function createNotification(
        ?int $userId,
        string $title,
        string $message,
        array $data = []
    ): void {
        if (!$userId || !Schema::hasTable('notifications')) {
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