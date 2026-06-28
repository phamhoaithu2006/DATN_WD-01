<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\GuideSpecialization;

class GuideSpecializationSeeder extends Seeder
{
    public function run(): void
    {
        $specializations = [
            ['name' => 'Nội địa',  'description' => 'Hướng dẫn viên du lịch nội địa'],
            ['name' => 'Quốc tế',  'description' => 'Hướng dẫn viên du lịch quốc tế'],
        ];

        foreach ($specializations as $item) {
            GuideSpecialization::updateOrCreate(
                ['name' => $item['name']],
                ['description' => $item['description']]
            );
        }
    }
}
