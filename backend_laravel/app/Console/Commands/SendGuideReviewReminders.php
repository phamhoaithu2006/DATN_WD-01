<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\GuideReviewNotificationService;
use Illuminate\Console\Command;

class SendGuideReviewReminders extends Command
{
    protected $signature = 'guide-reviews:send-reminders {--user-id=}';

    protected $description = 'Create review reminder notifications for customers whose tours have ended';

    public function handle(): int
    {
        /** @var GuideReviewNotificationService $notificationService */
        $notificationService = app(GuideReviewNotificationService::class);

        $userId = $this->option('user-id');

        if ($userId !== null) {
            $user = User::query()->find($userId);

            if (! $user) {
                $this->error('Không tìm thấy khách hàng.');

                return self::FAILURE;
            }

            $createdCount = $notificationService->syncForUser($user);
        } else {
            $createdCount = $notificationService->syncAllEligibleCustomers();
        }

        $this->info("Đã tạo {$createdCount} thông báo nhắc đánh giá HDV.");

        return self::SUCCESS;
    }
}
