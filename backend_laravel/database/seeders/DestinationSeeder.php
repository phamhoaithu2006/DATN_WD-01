<?php

namespace Database\Seeders;

use App\Models\Destination;
use Illuminate\Database\Seeder;

class DestinationSeeder extends Seeder
{
    public function run(): void
    {
        $destinations = [
            [
                'name' => 'Đà Nẵng',
                'slug' => 'da-nang',
                'province_city' => 'Đà Nẵng',
                'country' => 'Việt Nam',
                'description' => 'Thành phố biển năng động với Bà Nà Hills, bán đảo Sơn Trà và bãi biển Mỹ Khê.',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b',
                'status' => 'active',
            ],
            [
                'name' => 'Hạ Long',
                'slug' => 'ha-long',
                'province_city' => 'Quảng Ninh',
                'country' => 'Việt Nam',
                'description' => 'Di sản thiên nhiên thế giới nổi bật với vịnh biển và hệ thống hang động kỳ vĩ.',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1528127269322-539801943592',
                'status' => 'active',
            ],
            [
                'name' => 'Phú Quốc',
                'slug' => 'phu-quoc',
                'province_city' => 'Kiên Giang',
                'country' => 'Việt Nam',
                'description' => 'Đảo ngọc với biển xanh, resort nghỉ dưỡng và nhiều trải nghiệm giải trí.',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
                'status' => 'active',
            ],
            [
                'name' => 'Sa Pa',
                'slug' => 'sa-pa',
                'province_city' => 'Lào Cai',
                'country' => 'Việt Nam',
                'description' => 'Thị trấn vùng cao với ruộng bậc thang, bản làng và khí hậu mát mẻ.',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
                'status' => 'active',
            ],
        ];

        foreach ($destinations as $destination) {
            Destination::updateOrCreate(
                ['slug' => $destination['slug']],
                $destination
            );
        }
    }
}
