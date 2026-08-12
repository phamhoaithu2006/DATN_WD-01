<?php

namespace App\Console\Commands;

use App\Services\ProvinceSyncService;
use Illuminate\Console\Command;
use Throwable;

class SyncProvincesCommand extends Command
{
    protected $signature = 'provinces:sync';

    protected $description = 'Đồng bộ tỉnh/thành từ Provinces Open API';

    public function handle(ProvinceSyncService $provinceSyncService): int
    {
        try {
            $result = $provinceSyncService->sync();

            $this->components->info(sprintf(
                'Đã đồng bộ tỉnh/thành: tạo mới %d, cập nhật %d, không đổi %d.',
                $result['created'],
                $result['updated'],
                $result['skipped'],
            ));

            return self::SUCCESS;
        } catch (Throwable $throwable) {
            report($throwable);
            $this->components->error('Đồng bộ tỉnh/thành thất bại: '.$throwable->getMessage());

            return self::FAILURE;
        }
    }
}
