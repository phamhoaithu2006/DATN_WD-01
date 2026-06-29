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
            'Tiếng Anh' => [
                'A1',
                'A2',
                'B1',
                'B2',
                'C1',
                'C2',
            ],

            'Tiếng Pháp' => [
                'A1',
                'A2',
                'B1',
                'B2',
                'C1',
                'C2',
            ],

            'Tiếng Đức' => [
                'A1',
                'A2',
                'B1',
                'B2',
                'C1',
                'C2',
            ],

            'Tiếng Tây Ban Nha' => [
                'A1',
                'A2',
                'B1',
                'B2',
                'C1',
                'C2',
            ],

            'Tiếng Trung' => [
                'HSK1',
                'HSK2',
                'HSK3',
                'HSK4',
                'HSK5',
                'HSK6',
            ],

            'Tiếng Nhật' => [
                'N5',
                'N4',
                'N3',
                'N2',
                'N1',
            ],

            'Tiếng Hàn' => [
                'TOPIK 1',
                'TOPIK 2',
                'TOPIK 3',
                'TOPIK 4',
                'TOPIK 5',
                'TOPIK 6',
            ],
        ];

        foreach ($languages as $languageName => $levels) {

            $language = Language::firstOrCreate([
                'name' => $languageName
            ]);

            foreach ($levels as $level) {

                LanguageLevel::firstOrCreate([
                    'language_id' => $language->id,
                    'level_name'  => $level,
                ]);
            }
        }
    }
}
