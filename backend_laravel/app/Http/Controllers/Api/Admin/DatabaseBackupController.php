<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\DatabaseBackupService;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DatabaseBackupController extends Controller
{
    public function __construct(private readonly DatabaseBackupService $backups) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách bản sao lưu thành công',
            'data' => $this->backups->listBackups(),
        ]);
    }

    public function store(): JsonResponse
    {
        try {
            $backup = $this->backups->createBackup();
            $this->backups->pruneOldBackups((int) Setting::valueFor('backup_retention_days', 7));

            return response()->json([
                'status' => 'success',
                'message' => 'Tạo bản sao lưu database thành công',
                'data' => $backup,
            ], 201);
        } catch (RuntimeException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ], 422);
        }
    }

    public function download(string $filename): BinaryFileResponse|JsonResponse
    {
        try {
            $path = $this->backups->downloadPath($filename);

            return response()->download($path, $filename, [
                'Content-Type' => 'application/sql',
            ]);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ], 404);
        }
    }

    public function destroy(string $filename): JsonResponse
    {
        try {
            $this->backups->deleteBackup($filename);

            return response()->json([
                'status' => 'success',
                'message' => 'Xóa bản sao lưu thành công',
            ]);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ], 404);
        }
    }
}
