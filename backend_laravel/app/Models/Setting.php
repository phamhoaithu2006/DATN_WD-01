<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    public const ALLOWED_KEYS = [
        'site_name',
        'logo_url',
        'contact_email',
        'hotline',
        'address',
        'footer_text',
        'footer_hotline',
        'footer_email',
        'footer_address',
        'password_min_length',
        'require_2fa',
        'session_timeout_minutes',
        'allow_remember_login',
        'notify_email_enabled',
        'notify_sms_enabled',
        'notify_push_enabled',
        'admin_notification_email',
        'default_language',
        'timezone',
        'date_format',
        'currency',
        'payment_enabled',
        'payment_gateway',
        'vat_percent',
        'invoice_prefix',
        'auto_backup_enabled',
        'backup_frequency',
        'backup_time',
        'backup_retention_days',
    ];

    public const PUBLIC_KEYS = [
        'site_name',
        'logo_url',
        'contact_email',
        'hotline',
        'address',
        'footer_text',
        'footer_hotline',
        'footer_email',
        'footer_address',
        'default_language',
        'timezone',
        'date_format',
        'currency',
    ];

    protected $fillable = [
        'key',
        'value',
        'group',
    ];

    public static function valueFor(string $key, mixed $default = null): mixed
    {
        return static::query()->where('key', $key)->value('value') ?? $default;
    }

    public static function intValueFor(string $key, int $default): int
    {
        $value = static::valueFor($key);

        return is_numeric($value) ? (int) $value : $default;
    }

    public static function boolValueFor(string $key, bool $default = false): bool
    {
        $value = static::valueFor($key);

        if ($value === null) {
            return $default;
        }

        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }
}
