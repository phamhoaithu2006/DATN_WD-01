<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'message' => 'Lấy cấu hình hệ thống thành công',
            'data' => $this->settingsData(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'site_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'footer_text' => ['sometimes', 'nullable', 'string'],
            'footer_hotline' => ['sometimes', 'nullable', 'string', 'max:30'],
            'footer_email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'footer_address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'auto_backup_enabled' => ['sometimes', 'boolean'],
            'backup_frequency' => ['sometimes', 'string', 'in:daily,weekly,monthly'],
            'backup_time' => ['sometimes', 'date_format:H:i'],
            'backup_retention_days' => ['sometimes', 'integer', 'min:1'],
        ]);

        foreach ($validated as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                [
                    'value' => $value,
                    'group' => $this->groupForKey($key),
                ]
            );
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật cấu hình hệ thống thành công',
            'data' => $this->settingsData(),
        ]);
    }

    private function settingsData(): array
    {
        $settings = Setting::query()
            ->whereIn('key', Setting::ALLOWED_KEYS)
            ->pluck('value', 'key')
            ->toArray();

        return collect(Setting::ALLOWED_KEYS)
            ->mapWithKeys(fn (string $key) => [$key => $settings[$key] ?? null])
            ->toArray();
    }

    private function groupForKey(string $key): string
    {
        return match (true) {
            str_starts_with($key, 'footer_') => 'footer',
            str_starts_with($key, 'backup_') || $key === 'auto_backup_enabled' => 'backup',
            default => 'general',
        };
    }
}
