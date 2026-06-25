<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Language;
use App\Models\LanguageLevel;

class LanguageSeeder extends Seeder
{
    public function run(): void
    {
        $languages = [
            'Tiếng Anh',
            'Tiếng Pháp',
            'Tiếng Trung',
            'Tiếng Nhật',
            'Tiếng Hàn',
            'Tiếng Đức',
            'Tiếng Tây Ban Nha',
        ];

        $levelNames = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'];

        foreach ($languages as $langName) {
            $language = Language::firstOrCreate(['name' => $langName]);
            foreach ($levelNames as $level) {
                LanguageLevel::firstOrCreate([
                    'language_id' => $language->id,
                    'level_name'  => $level,
                ]);
            }
        }
    }
}
