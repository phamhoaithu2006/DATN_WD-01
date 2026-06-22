<?php

namespace App\Console\Commands;

use App\Models\Setting;
use App\Services\DatabaseBackupService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

class DatabaseBackupCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:backup {--scheduled : Chỉ tạo backup nếu cấu hình tự động sao lưu đang đến lịch chạy}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Tạo bản sao lưu database MySQL/MariaDB';

    /**
     * Execute the console command.
     */
    public function handle(DatabaseBackupService $backups): int
    {
        if ($this->option('scheduled') && ! $this->shouldRunScheduledBackup()) {
            $this->components->info('Chưa đến lịch sao lưu hoặc bản sao lưu của kỳ này đã được tạo.');

            return self::SUCCESS;
        }

        try {
            $backup = $backups->createBackup();
            $deleted = $backups->pruneOldBackups((int) Setting::valueFor('backup_retention_days', 7));

            if ($this->option('scheduled')) {
                Cache::forever('database_backup.last_scheduled_period', $this->scheduledPeriodKey());
            }

            $this->components->info("Đã tạo bản sao lưu: {$backup['filename']}");

            if ($deleted > 0) {
                $this->components->info("Đã xóa {$deleted} bản sao lưu cũ.");
            }

            return self::SUCCESS;
        } catch (RuntimeException $exception) {
            $this->components->error($exception->getMessage());

            return self::FAILURE;
        }
    }

    private function shouldRunScheduledBackup(): bool
    {
        if (! filter_var(Setting::valueFor('auto_backup_enabled', false), FILTER_VALIDATE_BOOLEAN)) {
            return false;
        }

        $periodKey = $this->scheduledPeriodKey();

        if ($periodKey === null || Cache::get('database_backup.last_scheduled_period') === $periodKey) {
            return false;
        }

        $backupTime = (string) Setting::valueFor('backup_time', '02:00');

        return CarbonImmutable::now()->format('H:i') >= $backupTime;
    }

    private function scheduledPeriodKey(): ?string
    {
        $now = CarbonImmutable::now();

        return match (Setting::valueFor('backup_frequency', 'daily')) {
            'daily' => 'daily:'.$now->format('Y-m-d'),
            'weekly' => $now->isMonday() ? 'weekly:'.$now->format('o-W') : null,
            'monthly' => $now->day === 1 ? 'monthly:'.$now->format('Y-m') : null,
            default => null,
        };
    }
}
