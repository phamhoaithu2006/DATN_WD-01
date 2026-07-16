<?php

namespace App\Http\Controllers\Api\Support;

use App\Http\Controllers\Controller;
use App\Models\SupportRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportRequestController extends Controller
{
    /**
     * Danh sách + search + filter.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:pending,in_progress,resolved'],
            'category' => [
                'nullable',
                'in:technical,payment,account,feedback,general'
            ],
            'priority' => ['nullable', 'in:low,medium,high'],
        ]);

        $query = SupportRequest::query()
            ->with([
                'user:id,full_name,email,phone,avatar_url',
                'assignedTo:id,full_name,email',
            ])
            ->withCount('attachments');

        // Search tên, email, SĐT
        if ($request->filled('search')) {
            $search = trim($request->search);

            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('ticket_code', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        $requests = $query
            ->orderByRaw("
                CASE status
                    WHEN 'pending' THEN 1
                    WHEN 'in_progress' THEN 2
                    WHEN 'resolved' THEN 3
                    ELSE 4
                END
            ")
            ->orderByDesc('created_at')
            ->paginate(10);

        $counts = [
            'pending' => SupportRequest::where('status', 'pending')->count(),
            'in_progress' => SupportRequest::where('status', 'in_progress')->count(),
            'resolved' => SupportRequest::where('status', 'resolved')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $requests,
            'counts' => $counts,
        ]);
    }

    /**
     * Chi tiết ticket.
     */
    public function show(SupportRequest $supportRequest): JsonResponse
    {
        $supportRequest->load([
            'user:id,full_name,email,phone,avatar_url',
            'assignedTo:id,full_name,email',
            'attachments',
        ]);

        return response()->json([
            'success' => true,
            'data' => $supportRequest,
        ]);
    }

    /**
     * Số badge trên menu.
     *
     * Chưa hỗ trợ + Đang hỗ trợ.
     */
    public function badgeCount(): JsonResponse
    {
        $count = SupportRequest::query()
            ->whereIn('status', [
                'pending',
                'in_progress'
            ])
            ->count();

        return response()->json([
            'count' => $count,
        ]);
    }

    /**
     * Đổi trạng thái.
     */
    public function updateStatus(
        Request $request,
        SupportRequest $supportRequest
    ): JsonResponse {
        $data = $request->validate([
            'status' => [
                'required',
                'in:pending,in_progress,resolved'
            ],
        ]);

        $status = $data['status'];

        $updateData = [
            'status' => $status,
        ];

        if ($status === 'pending') {
            $updateData['assigned_to'] = null;
            $updateData['started_at'] = null;
            $updateData['resolved_at'] = null;
        }

        if ($status === 'in_progress') {
            $updateData['assigned_to'] = $request->user()->id;
            $updateData['started_at'] =
                $supportRequest->started_at ?? now();

            $updateData['resolved_at'] = null;
        }

        if ($status === 'resolved') {
            $updateData['assigned_to'] =
                $supportRequest->assigned_to
                ?? $request->user()->id;

            $updateData['started_at'] =
                $supportRequest->started_at
                ?? now();

            $updateData['resolved_at'] = now();
        }

        $supportRequest->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật trạng thái thành công.',
            'data' => $supportRequest
                ->fresh()
                ->load([
                    'assignedTo:id,full_name,email',
                    'attachments',
                ]),
        ]);
    }
}