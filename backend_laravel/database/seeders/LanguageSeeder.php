<?php

namespace Database\Seeders;

use App\Models\Language;
use App\Models\LanguageLevel;
use Illuminate\Database\Seeder;

class LanguageSeeder extends Seeder
{
    public function run(): void
    {
        $languages = [
            'Tiếng Anh' => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
            'Tiếng Pháp' => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
            'Tiếng Trung' => ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6'],
            'Tiếng Hàn' => ['TOPIK I', 'TOPIK II', 'TOPIK III', 'TOPIK IV', 'TOPIK V', 'TOPIK VI'],
            'Tiếng Nhật' => ['N5', 'N4', 'N3', 'N2', 'N1'],
            'Tiếng Thái' => ['Sơ cấp', 'Trung cấp', 'Cao cấp'],
            'Tiếng Tây Ban Nha' => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
            'Tiếng Nga' => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
        ];

        foreach ($languages as $name => $levels) {
            $language = Language::query()->updateOrCreate(['name' => $name]);

            foreach ($levels as $levelName) {
                LanguageLevel::query()->updateOrCreate([
                    'language_id' => $language->id,
                    'level_name' => $levelName,
                ]);
            }
        }
    }
}
