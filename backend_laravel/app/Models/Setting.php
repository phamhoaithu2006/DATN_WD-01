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
    ];

    protected $fillable = [
        'key',
        'value',
        'group',
    ];
}
