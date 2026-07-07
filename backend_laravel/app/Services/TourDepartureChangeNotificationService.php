<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Notification;
use App\Models\NotificationDraft;
use App\Models\TourDeparture;
use Carbon\Carbon;

class TourDepartureChangeNotificationService
{
    public function sendForUpdatedDeparture(
        TourDeparture $departure,
        array $changes,
        string $changeReason
    ): array {
        $departure->loadMissing([
            'tour:id,title',
            'guideAssignments.guide:id,user_id',
        ]);

        $customerUserIds = Booking::query()
            ->where('tour_departure_id', $departure->id)
            ->whereNotNull('user_id')
            ->whereNotIn('status', [
                'cancelled',
                'canceled',
            ])
            ->pluck('user_id');

        $guideUserIds = $departure->guideAssignments
            ->where('status', 'assigned')
            ->pluck('guide.user_id')
            ->filter();

        $recipientIds = $customerUserIds
            ->merge($guideUserIds)
            ->filter()
            ->unique()
            ->values();

        $tourTitle = $departure->tour?->title
            ?? "Tour #{$departure->tour_id}";

        $departureDate = Carbon::parse(
            $departure->departure_date
        )->format('d/m/Y');

        $returnDate = Carbon::parse(
            $departure->return_date ?? $departure->departure_date
        )->format('d/m/Y');

        $reason = trim($changeReason);

        if ($reason === '') {
            $reason = 'Không nêu lý do.';
        }

        $changedText = $this->buildChangedText($changes);

        if ($changedText === '') {
            $changedText = 'Thông tin lịch khởi hành đã được điều chỉnh.';
        }

        $title = 'Cập nhật lịch khởi hành';

        $message =
            "Lịch khởi hành của tour \"{$tourTitle}\" đã được cập nhật.\n\n" .
            "Thời gian hiện tại: {$departureDate} - {$returnDate}\n\n" .
            "Lý do thay đổi:\n{$reason}\n\n" .
            "Nội dung thay đổi:\n- {$changedText}\n\n" .
            'Vui lòng kiểm tra lại lịch trình của bạn.';

        /*
         * Tạo bản ghi sent để xuất hiện trong
         * quản lý thông báo của admin.
         */
        $draft = NotificationDraft::create([
            'title' => $title,
            'message' => $message,
            'target_type' => 'specific',
            'target_ids' => $recipientIds->all(),
            'status' => 'sent',
        ]);

        $now = now();

        $notifications = $recipientIds
            ->map(fn ($userId) => [
                'draft_id' => $draft->id,
                'user_id' => $userId,
                'title' => $title,
                'message' => $message,
                'type' => 'system',
                'status' => 'unread',
                'created_at' => $now,
                'updated_at' => $now,
            ])
            ->all();

        if (!empty($notifications)) {
            Notification::insert($notifications);
        }

        return [
            'draft_id' => $draft->id,
            'recipient_count' => count($notifications),
        ];
    }

    private function buildChangedText(array $changes): string
    {
        $fieldLabels = [
            'departure_date' => 'Ngày khởi hành',
            'return_date' => 'Ngày về',
            'price' => 'Giá gốc riêng của lịch',
            'discount_price' => 'Giá giảm riêng của lịch',
            'total_slots' => 'Tổng số chỗ',
            'status' => 'Trạng thái lịch',
        ];

        return collect($changes)
            ->filter(function ($change) {
                return is_array($change) &&
                    !empty($change['field']);
            })
            ->map(function ($change) use ($fieldLabels) {
                $field = $change['field'];

                $label = $fieldLabels[$field] ?? $field;

                $oldValue = $this->formatChangeValue(
                    $field,
                    $change['old'] ?? null
                );

                $newValue = $this->formatChangeValue(
                    $field,
                    $change['new'] ?? null
                );

                return "{$label}: {$oldValue} → {$newValue}";
            })
            ->implode("\n- ");
    }

    private function formatChangeValue(string $field, $value): string
    {
        if ($value === null || $value === '') {
            return 'Không có';
        }

        if (in_array($field, [
            'departure_date',
            'return_date',
        ], true)) {
            return Carbon::parse($value)->format('d/m/Y');
        }

        if (in_array($field, [
            'price',
            'discount_price',
        ], true)) {
            return number_format(
                (float) $value,
                0,
                ',',
                '.'
            ) . ' VNĐ';
        }

        if ($field === 'status') {
            $statusLabels = [
                'open' => 'Đang mở',
                'closed' => 'Đã đóng',
                'completed' => 'Hoàn thành',
                'cancelled' => 'Đã hủy',
            ];

            return $statusLabels[$value] ?? $value;
        }

        return (string) $value;
    }
}