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
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value'], 'group' => $setting['group']]
            );
        }
    }
}
