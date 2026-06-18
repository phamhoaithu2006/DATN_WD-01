<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    public const ALLOWED_KEYS = [
        'site_name',
        'footer_text',
        'footer_hotline',
        'footer_email',
        'footer_address',
        'auto_backup_enabled',
        'backup_frequency',
        'backup_time',
        'backup_retention_days',
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
}
