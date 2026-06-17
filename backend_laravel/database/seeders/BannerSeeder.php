<?php

namespace Database\Seeders;

use App\Models\Banner;
use Illuminate\Database\Seeder;

class BannerSeeder extends Seeder
{
    public function run(): void
    {
        $banners = [
            [
                'title' => 'Khám phá Việt Nam cùng ViVuGo',
                'display_title' => 'Khám phá Việt Nam cùng ViVuGo',
                'type' => 'image',
                'image_url' => 'https://images.unsplash.com/photo-1528127269322-539801943592',
                'html_content' => null,
                'link_url' => '/tours',
                'position' => 'home_hero',
                'display_pages' => ['home'],
                'sort_order' => 1,
                'status' => 'active',
            ],
            [
                'title' => 'Ưu đãi mùa hè',
                'display_title' => 'Ưu đãi mùa hè',
                'type' => 'image',
                'image_url' => 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
                'html_content' => null,
                'link_url' => '/tours?promotion=summer',
                'position' => 'home_middle',
                'display_pages' => ['home'],
                'sort_order' => 2,
                'status' => 'active',
            ],
        ];

        foreach ($banners as $banner) {
            Banner::updateOrCreate(
                ['title' => $banner['title'], 'position' => $banner['position']],
                $banner
            );
        }
    }
}
