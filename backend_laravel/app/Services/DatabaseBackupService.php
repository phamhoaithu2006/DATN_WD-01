<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\File;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\Process\Process;

class DatabaseBackupService
{
    private const BACKUP_FILENAME_PATTERN = '/^vivugo-backup-\d{8}-\d{6}\.sql$/';

    public function createBackup(): array
    {
        $connectionName = config('database.default');
        $connection = config("database.connections.{$connectionName}");

        if (! in_array($connection['driver'] ?? null, ['mysql', 'mariadb'], true)) {
            throw new RuntimeException('Chức năng sao lưu hiện chỉ hỗ trợ MySQL/MariaDB.');
        }

        $this->ensureBackupDirectoryExists();

        $filename = 'vivugo-backup-'.now()->format('Ymd-His').'.sql';
        $path = $this->backupPath($filename);
        $process = new Process($this->dumpCommand($connection, $path));
        $process->setEnv($this->dumpEnvironment($connection));
        $process->setTimeout(300);
        $process->run();

        if (! $process->isSuccessful()) {
            File::delete($path);

            $errorOutput = trim($process->getErrorOutput()) ?: trim($process->getOutput());
            throw new RuntimeException($errorOutput ?: 'Không thể tạo bản sao lưu database. Vui lòng kiểm tra mysqldump.');
        }

        return $this->backupInfo($path);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listBackups(): array
    {
        $this->ensureBackupDirectoryExists();

        return collect(File::files($this->backupDirectory()))
            ->filter(fn ($file) => $this->isValidBackupFilename($file->getFilename()))
            ->sortByDesc(fn ($file) => $file->getMTime())
            ->map(fn ($file) => $this->backupInfo($file->getPathname()))
            ->values()
            ->all();
    }

    public function downloadPath(string $filename): string
    {
        $path = $this->backupPathForFilename($filename);

        if (! File::exists($path)) {
            throw new InvalidArgumentException('Không tìm thấy bản sao lưu.');
        }

        return $path;
    }

    public function deleteBackup(string $filename): void
    {
        $path = $this->downloadPath($filename);

        File::delete($path);
    }

    public function pruneOldBackups(int $retentionDays): int
    {
        $this->ensureBackupDirectoryExists();

        $deleted = 0;
        $threshold = CarbonImmutable::now()->subDays($retentionDays)->getTimestamp();

        foreach (File::files($this->backupDirectory()) as $file) {
            if (! $this->isValidBackupFilename($file->getFilename())) {
                continue;
            }

            if ($file->getMTime() < $threshold) {
                File::delete($file->getPathname());
                $deleted++;
            }
        }

        return $deleted;
    }

    public function isValidBackupFilename(string $filename): bool
    {
        return preg_match(self::BACKUP_FILENAME_PATTERN, $filename) === 1;
    }

    public function backupDirectory(): string
    {
        return storage_path('app/backups');
    }

    /**
     * @param  array<string, mixed>  $connection
     * @return array<int, string>
     */
    private function dumpCommand(array $connection, string $path): array
    {
        $command = [
            'mysqldump',
            '--single-transaction',
            '--quick',
            '--routines',
            '--triggers',
            '--default-character-set='.($connection['charset'] ?? 'utf8mb4'),
            '--host='.($connection['host'] ?? '127.0.0.1'),
            '--port='.(string) ($connection['port'] ?? 3306),
            '--user='.(string) ($connection['username'] ?? 'root'),
            '--result-file='.$path,
        ];

        if (! empty($connection['unix_socket'])) {
            $command[] = '--socket='.(string) $connection['unix_socket'];
        }

        $command[] = (string) ($connection['database'] ?? '');

        return $command;
    }

    /**
     * @param  array<string, mixed>  $connection
     * @return array<string, string>
     */
    private function dumpEnvironment(array $connection): array
    {
        if (empty($connection['password'])) {
            return [];
        }

        return [
            'MYSQL_PWD' => (string) $connection['password'],
        ];
    }

    private function ensureBackupDirectoryExists(): void
    {
        File::ensureDirectoryExists($this->backupDirectory());
    }

    private function backupPathForFilename(string $filename): string
    {
        if (! $this->isValidBackupFilename($filename)) {
            throw new InvalidArgumentException('Tên file sao lưu không hợp lệ.');
        }

        return $this->backupPath($filename);
    }

    private function backupPath(string $filename): string
    {
        return $this->backupDirectory().DIRECTORY_SEPARATOR.$filename;
    }

    /**
     * @return array<string, mixed>
     */
    private function backupInfo(string $path): array
    {
        return [
            'filename' => basename($path),
            'size' => File::size($path),
            'created_at' => CarbonImmutable::createFromTimestamp(File::lastModified($path))->toIso8601String(),
        ];
    }
}
