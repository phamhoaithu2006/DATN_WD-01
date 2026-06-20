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
        // Chuẩn hóa dữ liệu trước validation — chặn non-primitive từ cache/state cũ
        $stringFields = [
            'site_name', 'logo_url', 'contact_email', 'hotline', 'address',
            'footer_text', 'footer_hotline', 'footer_email', 'footer_address',
            'default_language', 'timezone', 'date_format', 'currency',
            'payment_gateway', 'invoice_prefix', 'backup_frequency', 'backup_time',
            'admin_notification_email',
        ];

        $integerFields = [
            'password_min_length', 'session_timeout_minutes', 'vat_percent', 'backup_retention_days',
        ];

        $booleanFields = [
            'require_2fa', 'allow_remember_login',
            'notify_email_enabled', 'notify_sms_enabled', 'notify_push_enabled',
            'payment_enabled', 'auto_backup_enabled',
        ];

        $sanitized = [];

        foreach ($request->only(Setting::ALLOWED_KEYS) as $key => $value) {
            if (in_array($key, $stringFields, true)) {
                $sanitized[$key] = is_scalar($value) ? (string) $value : null;
            } elseif (in_array($key, $integerFields, true)) {
                $sanitized[$key] = is_numeric($value) ? (int) $value : $value;
            } elseif (in_array($key, $booleanFields, true)) {
                $sanitized[$key] = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            } else {
                $sanitized[$key] = $value;
            }
        }

        $rules = [
            'site_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'logo_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'contact_email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'hotline' => ['sometimes', 'nullable', 'string', 'max:30'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'footer_text' => ['sometimes', 'nullable', 'string'],
            'footer_hotline' => ['sometimes', 'nullable', 'string', 'max:30'],
            'footer_email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'footer_address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'password_min_length' => ['sometimes', 'integer', 'min:6', 'max:32'],
            'require_2fa' => ['sometimes', 'boolean'],
            'session_timeout_minutes' => ['sometimes', 'integer', 'min:15', 'max:10080'],
            'allow_remember_login' => ['sometimes', 'boolean'],
            'notify_email_enabled' => ['sometimes', 'boolean'],
            'notify_sms_enabled' => ['sometimes', 'boolean'],
            'notify_push_enabled' => ['sometimes', 'boolean'],
            'admin_notification_email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'default_language' => ['sometimes', 'nullable', 'string', 'in:vi,en'],
            'timezone' => ['sometimes', 'nullable', 'string', 'in:Asia/Ho_Chi_Minh,Asia/Bangkok,UTC'],
            'date_format' => ['sometimes', 'nullable', 'string', 'in:dd/mm/yyyy,yyyy-mm-dd,mm/dd/yyyy'],
            'currency' => ['sometimes', 'nullable', 'string', 'in:VND,USD'],
            'payment_enabled' => ['sometimes', 'boolean'],
            'payment_gateway' => ['sometimes', 'nullable', 'string', 'in:vnpay,momo,zalopay,cash'],
            'vat_percent' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'invoice_prefix' => ['sometimes', 'nullable', 'string', 'max:20'],
            'auto_backup_enabled' => ['sometimes', 'boolean'],
            'backup_frequency' => ['sometimes', 'nullable', 'string', 'in:daily,weekly,monthly'],
            'backup_time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'backup_retention_days' => ['sometimes', 'integer', 'min:1'],
        ];

        $validated = \Illuminate\Support\Facades\Validator::make($sanitized, $rules)->validate();

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
            in_array($key, ['password_min_length', 'require_2fa', 'session_timeout_minutes', 'allow_remember_login'], true) => 'security',
            str_starts_with($key, 'notify_') || $key === 'admin_notification_email' => 'notification',
            in_array($key, ['default_language', 'timezone', 'date_format', 'currency'], true) => 'locale',
            str_starts_with($key, 'payment_') || in_array($key, ['vat_percent', 'invoice_prefix'], true) => 'payment',
            str_starts_with($key, 'backup_') || $key === 'auto_backup_enabled' => 'backup',
            default => 'general',
        };
    }
}
