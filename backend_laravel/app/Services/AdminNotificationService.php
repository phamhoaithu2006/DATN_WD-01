<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\TourDeparture;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminNotificationService
{
    public function notifyTourDepartureCreated(
        TourDeparture $departure,
        ?User $actor = null
    ): void {
        $departure->loadMissing([
            'tour:id,title',
        ]);

        $tourTitle = $departure->tour?->title ?? 'tour';
        $departureDate = $this->formatDate($departure->departure_date);
        $returnDate = $this->formatDate(
            $departure->return_date ?: $departure->departure_date
        );
        $actorLabel = $this->getActorLabel($actor);

        $this->notifyAdmins(
            title: 'Có lịch khởi hành mới',
            message: "{$actorLabel} vừa thêm lịch khởi hành cho {$tourTitle}.\nNgày đi: {$departureDate}.\nNgày về: {$returnDate}.",
            data: [
                'source' => 'tour_departure',
                'action' => 'created',
                'tour_id' => $departure->tour_id,
                'tour_departure_id' => $departure->id,
            ]
        );
    }

    public function notifyTourDepartureUpdated(
        TourDeparture $departure,
        ?User $actor = null,
        array $changes = [],
        ?string $reason = null
    ): void {
        $departure->loadMissing([
            'tour:id,title',
        ]);

        $tourTitle = $departure->tour?->title ?? 'tour';
        $actorLabel = $this->getActorLabel($actor);
        $reasonText = trim((string) $reason);
        $changeLines = $this->formatChangeLines($changes);

        $message = "{$actorLabel} vừa cập nhật lịch khởi hành của {$tourTitle}.";

        if ($reasonText !== '') {
            $message .= "\nLý do: {$reasonText}.";
        }

        if ($changeLines !== '') {
            $message .= "\nNội dung thay đổi:\n{$changeLines}";
        } else {
            $departureDate = $this->formatDate($departure->departure_date);
            $returnDate = $this->formatDate(
                $departure->return_date ?: $departure->departure_date
            );

            $message .= "\nNgày đi: {$departureDate}.\nNgày về: {$returnDate}.";
        }

        $this->notifyAdmins(
            title: 'Lịch khởi hành đã được cập nhật',
            message: $message,
            data: [
                'source' => 'tour_departure',
                'action' => 'updated',
                'tour_id' => $departure->tour_id,
                'tour_departure_id' => $departure->id,
                'changes' => $changes,
                'reason' => $reasonText,
            ]
        );
    }

    public function notifyTourDepartureDeleted(
        TourDeparture $departure,
        ?User $actor = null
    ): void {
        $departure->loadMissing([
            'tour:id,title',
        ]);

        $tourTitle = $departure->tour?->title ?? 'tour';
        $departureDate = $this->formatDate($departure->departure_date);
        $returnDate = $this->formatDate(
            $departure->return_date ?: $departure->departure_date
        );
        $actorLabel = $this->getActorLabel($actor);

        $this->notifyAdmins(
            title: 'Lịch khởi hành đã bị xoá',
            message: "{$actorLabel} vừa xoá lịch khởi hành của {$tourTitle}.\nNgày đi: {$departureDate}.\nNgày về: {$returnDate}.",
            data: [
                'source' => 'tour_departure',
                'action' => 'deleted',
                'tour_id' => $departure->tour_id,
                'tour_departure_id' => $departure->id,
            ]
        );
    }

    public function notifyGuideAutoAssigned(
        TourDeparture $departure,
        $guide,
        ?User $actor = null
    ): void {
        $this->notifyGuideAssignmentChanged(
            departure: $departure,
            actor: $actor,
            title: 'HDV đã được tự động phân công',
            action: 'guide_auto_assigned',
            guide: $guide
        );
    }

    public function notifyGuideDirectAssigned(
        TourDeparture $departure,
        $guide,
        ?User $actor = null
    ): void {
        $this->notifyGuideAssignmentChanged(
            departure: $departure,
            actor: $actor,
            title: 'HDV đã được phân công trực tiếp',
            action: 'guide_direct_assigned',
            guide: $guide
        );
    }

    public function notifyGuideReplaced(
        TourDeparture $departure,
        $oldGuide,
        $newGuide,
        ?User $actor = null
    ): void {
        $departure->loadMissing([
            'tour:id,title',
        ]);

        $tourTitle = $departure->tour?->title ?? 'tour';
        $departureDate = $this->formatDate($departure->departure_date);
        $returnDate = $this->formatDate(
            $departure->return_date ?: $departure->departure_date
        );
        $actorLabel = $this->getActorLabel($actor);
        $oldGuideName = $this->getGuideName($oldGuide);
        $newGuideName = $this->getGuideName($newGuide);

        $this->notifyAdmins(
            title: 'HDV phụ trách đã được thay đổi',
            message: "{$actorLabel} vừa đổi HDV phụ trách cho {$tourTitle}.\nNgày đi: {$departureDate}.\nNgày về: {$returnDate}.\nHDV cũ: {$oldGuideName}.\nHDV mới: {$newGuideName}.",
            data: [
                'source' => 'guide_assignment',
                'action' => 'guide_replaced',
                'tour_id' => $departure->tour_id,
                'tour_departure_id' => $departure->id,
                'old_guide_id' => $oldGuide?->id ?? null,
                'new_guide_id' => $newGuide?->id ?? null,
            ]
        );
    }

    public function notifyGuideAssignmentCancelled(
        TourDeparture $departure,
        $guide,
        ?User $actor = null
    ): void {
        $this->notifyGuideAssignmentChanged(
            departure: $departure,
            actor: $actor,
            title: 'Phân công HDV đã được hoàn tác',
            action: 'guide_assignment_cancelled',
            guide: $guide
        );
    }

    private function notifyGuideAssignmentChanged(
        TourDeparture $departure,
        ?User $actor,
        string $title,
        string $action,
        $guide = null
    ): void {
        $departure->loadMissing([
            'tour:id,title',
        ]);

        $tourTitle = $departure->tour?->title ?? 'tour';
        $departureDate = $this->formatDate($departure->departure_date);
        $returnDate = $this->formatDate(
            $departure->return_date ?: $departure->departure_date
        );
        $actorLabel = $this->getActorLabel($actor);
        $guideName = $this->getGuideName($guide);

        $this->notifyAdmins(
            title: $title,
            message: "{$actorLabel} vừa thực hiện thao tác phân công HDV cho {$tourTitle}.\nNgày đi: {$departureDate}.\nNgày về: {$returnDate}.\nHDV: {$guideName}.",
            data: [
                'source' => 'guide_assignment',
                'action' => $action,
                'tour_id' => $departure->tour_id,
                'tour_departure_id' => $departure->id,
                'guide_id' => $guide?->id ?? null,
            ]
        );
    }

    private function notifyAdmins(
        string $title,
        string $message,
        array $data = []
    ): void {
        $adminIds = $this->getAdminUserIds();

        if ($adminIds->isEmpty()) {
            return;
        }

        $now = now();
        $hasDraftId = Schema::hasColumn('notifications', 'draft_id');
        $hasData = Schema::hasColumn('notifications', 'data');

        $rows = $adminIds
            ->map(function ($userId) use (
                $title,
                $message,
                $data,
                $now,
                $hasDraftId,
                $hasData
            ) {
                $row = [
                    'user_id' => $userId,
                    'title' => $title,
                    'message' => $message,
                    'type' => 'system',
                    'status' => 'unread',
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                if ($hasDraftId) {
                    $row['draft_id'] = null;
                }

                if ($hasData) {
                    $row['data'] = json_encode($data, JSON_UNESCAPED_UNICODE);
                }

                return $row;
            })
            ->values()
            ->all();

        Notification::insert($rows);
    }

    private function getAdminUserIds()
    {
        if (Schema::hasColumn('users', 'role')) {
            $query = DB::table('users')
                ->whereRaw('LOWER(role) = ?', ['admin']);

            if (Schema::hasColumn('users', 'deleted_at')) {
                $query->whereNull('deleted_at');
            }

            return $query->pluck('id');
        }

        if (
            Schema::hasTable('roles') &&
            Schema::hasColumn('users', 'role_id') &&
            Schema::hasColumn('roles', 'name')
        ) {
            $query = DB::table('users')
                ->join('roles', 'roles.id', '=', 'users.role_id')
                ->whereRaw('LOWER(roles.name) = ?', ['admin']);

            if (Schema::hasColumn('users', 'deleted_at')) {
                $query->whereNull('users.deleted_at');
            }

            return $query->pluck('users.id');
        }

        return collect();
    }

    private function getActorLabel(?User $user): string
    {
        $name = $this->getUserName($user);
        $roleName = $this->getRoleName($user);

        return "{$name} ({$roleName})";
    }

    private function getUserName(?User $user): string
    {
        return $user?->username
            ?? $user?->full_name
            ?? $user?->name
            ?? $user?->email
            ?? 'Admin';
    }

    private function getRoleName(?User $user): string
    {
        if (!$user) {
            return 'admin';
        }

        if (Schema::hasColumn('users', 'role')) {
            return strtolower((string) ($user->role ?? 'admin'));
        }

        try {
            $user->loadMissing([
                'role',
            ]);

            return strtolower(
                (string) (
                    $user->role?->name
                    ?? $user->role?->slug
                    ?? $user->role?->code
                    ?? 'admin'
                )
            );
        } catch (\Throwable $e) {
            return 'admin';
        }
    }

    private function getGuideName($guide): string
    {
        if (!$guide) {
            return 'Chưa xác định';
        }

        try {
            $guide->loadMissing([
                'user:id,full_name,name,email',
            ]);
        } catch (\Throwable $e) {
            // Bỏ qua nếu object truyền vào không phải Eloquent model đầy đủ.
        }

        return $guide->user?->full_name
            ?? $guide->user?->name
            ?? $guide->guide_code
            ?? "HDV #{$guide->id}";
    }

    private function formatChangeLines(array $changes): string
    {
        return collect($changes)
            ->map(function ($change) {
                $field = $change['field'] ?? null;

                if (!$field) {
                    return null;
                }

                $label = $this->fieldLabel($field);
                $oldValue = $this->formatFieldValue(
                    $field,
                    $change['old'] ?? null
                );
                $newValue = $this->formatFieldValue(
                    $field,
                    $change['new'] ?? null
                );

                return "- {$label}: {$oldValue} → {$newValue}";
            })
            ->filter()
            ->implode("\n");
    }

    private function fieldLabel(string $field): string
    {
        return [
            'departure_date' => 'Ngày đi',
            'return_date' => 'Ngày về',
            'price' => 'Giá',
            'discount_price' => 'Giá giảm',
            'total_slots' => 'Tổng số chỗ',
            'status' => 'Trạng thái',
        ][$field] ?? $field;
    }

    private function formatFieldValue(string $field, $value): string
    {
        if ($value === null || $value === '') {
            return 'trống';
        }

        if (in_array($field, ['departure_date', 'return_date'], true)) {
            return $this->formatDate($value);
        }

        if (in_array($field, ['price', 'discount_price'], true)) {
            return number_format((float) $value, 0, ',', '.') . 'đ';
        }

        if ($field === 'status') {
            return [
                'open' => 'Đang mở',
                'closed' => 'Đã đóng',
                'completed' => 'Hoàn thành',
                'cancelled' => 'Đã hủy',
            ][$value] ?? (string) $value;
        }

        return (string) $value;
    }

    private function formatDate($value): string
    {
        if (!$value) {
            return 'chưa xác định';
        }

        return Carbon::parse($value)->format('d/m/Y');
    }
}