<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Du lịch biển', 'slug' => 'du-lich-bien', 'description' => 'Các hành trình nghỉ dưỡng biển đảo.', 'status' => 'active'],
            ['name' => 'Du lịch văn hóa', 'slug' => 'du-lich-van-hoa', 'description' => 'Khám phá di sản, lịch sử và đời sống địa phương.', 'status' => 'active'],
            ['name' => 'Du lịch nghỉ dưỡng', 'slug' => 'du-lich-nghi-duong', 'description' => 'Tour thư giãn tại resort và điểm đến cao cấp.', 'status' => 'active'],
            ['name' => 'Du lịch khám phá', 'slug' => 'du-lich-kham-pha', 'description' => 'Hành trình thiên nhiên, núi rừng và trải nghiệm mới.', 'status' => 'active'],
        ];

        foreach ($categories as $category) {
            Category::updateOrCreate(
                ['slug' => $category['slug']],
                $category
            );
        }
    }
}
