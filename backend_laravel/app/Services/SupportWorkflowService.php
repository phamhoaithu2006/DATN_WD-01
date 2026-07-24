<?php

namespace App\Services;

use App\Models\SupportRequest;
use App\Models\SupportRequestHistory;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SupportWorkflowService
{
    public function notifyUser(
        int $userId,
        string $title,
        string $message,
        string $kind,
        ?int $supportRequestId = null
    ): void {
        DB::table('notifications')->insert([
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'status' => 'unread',
            'kind' => $kind,
            'support_request_id' => $supportRequestId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function notifyAdmins(
        string $title,
        string $message,
        string $kind,
        ?int $supportRequestId = null
    ): void {
        // Nếu User của bạn dùng relation roles() thay vì role(), đổi tại đây.
        $adminIds = User::query()
            ->whereHas('role', function ($query) {
                $query->whereIn('name', ['admin', 'Admin']);
            })
            ->pluck('id');

        foreach ($adminIds as $adminId) {
            $this->notifyUser(
                (int) $adminId,
                $title,
                $message,
                $kind,
                $supportRequestId
            );
        }
    }

    public function addHistory(
        SupportRequest $supportRequest,
        ?int $actorId,
        string $action,
        ?string $fromStatus,
        ?string $toStatus,
        string $description,
        ?array $meta = null
    ): void {
        SupportRequestHistory::query()->create([
            'support_request_id' => $supportRequest->id,
            'actor_id' => $actorId,
            'action' => $action,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'description' => $description,
            'meta' => $meta,
        ]);
    }
}
