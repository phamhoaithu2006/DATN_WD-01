<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['key' => 'site_name', 'value' => 'ViVuGo', 'group' => 'general'],
            ['key' => 'footer_text', 'value' => 'ViVuGo đồng hành cùng những chuyến đi đáng nhớ.', 'group' => 'footer'],
            ['key' => 'footer_hotline', 'value' => '1900 2026', 'group' => 'footer'],
            ['key' => 'footer_email', 'value' => 'support@vivugo.vn', 'group' => 'footer'],
            ['key' => 'footer_address', 'value' => 'Hà Nội, Việt Nam', 'group' => 'footer'],
            ['key' => 'password_min_length', 'value' => '8', 'group' => 'security'],
            ['key' => 'require_2fa', 'value' => '0', 'group' => 'security'],
            ['key' => 'session_timeout_minutes', 'value' => '120', 'group' => 'security'],
            ['key' => 'allow_remember_login', 'value' => '1', 'group' => 'security'],
            ['key' => 'default_language', 'value' => 'vi', 'group' => 'locale'],
            ['key' => 'timezone', 'value' => 'Asia/Ho_Chi_Minh', 'group' => 'locale'],
            ['key' => 'date_format', 'value' => 'dd/mm/yyyy', 'group' => 'locale'],
            ['key' => 'currency', 'value' => 'VND', 'group' => 'locale'],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value'], 'group' => $setting['group']]
            );
        }
    }
}
