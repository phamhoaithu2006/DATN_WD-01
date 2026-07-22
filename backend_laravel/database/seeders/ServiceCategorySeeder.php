<?php

namespace Database\Seeders;

use App\Models\ServiceCategory;
use Illuminate\Database\Seeder;

class ServiceCategorySeeder extends Seeder
{
    public function run(): void
    {
        $serviceCategories = [
            ['name' => 'Khách sạn', 'description' => 'Dịch vụ lưu trú tại khách sạn, resort và homestay.'],
            ['name' => 'Nhà hàng', 'description' => 'Dịch vụ đặt bữa ăn, tiệc đoàn và nhà hàng địa phương.'],
            ['name' => 'Vận chuyển', 'description' => 'Dịch vụ xe đưa đón, thuê xe, tàu và phương tiện di chuyển.'],
            ['name' => 'Vé tham quan', 'description' => 'Dịch vụ vé vào cổng, điểm tham quan và khu vui chơi.'],
            ['name' => 'Ăn uống', 'description' => 'Dịch vụ ăn nhẹ, đồ uống và gói ẩm thực theo tour.'],
            ['name' => 'Giải trí', 'description' => 'Dịch vụ hoạt động giải trí, biểu diễn và trải nghiệm địa phương.'],
            ['name' => 'Bảo hiểm', 'description' => 'Dịch vụ bảo hiểm du lịch trong nước và quốc tế.'],
            ['name' => 'Khác', 'description' => 'Các nhóm dịch vụ bổ sung khác phục vụ vận hành tour.'],
        ];

        foreach ($serviceCategories as $serviceCategory) {
            $category = ServiceCategory::withTrashed()->updateOrCreate(
                ['name' => $serviceCategory['name']],
                [
                    'description' => $serviceCategory['description'],
                    'status' => true,
                ]
            );

            if ($category->trashed()) {
                $category->restore();
            }
        }
    }
}
