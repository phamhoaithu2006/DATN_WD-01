<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Destination;
use App\Models\Tour;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TourSeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::hasTable('tours')) {
            return;
        }

        $admin = User::whereHas('role', fn ($query) => $query->where('name', 'admin'))->first();

        $tours = [
            [
                'category_slug' => 'du-lich-bien',
                'destination_slug' => 'da-nang',
                'title' => 'Đà Nẵng - Hội An 3 ngày 2 đêm',
                'slug' => 'da-nang-hoi-an-3-ngay-2-dem',
                'summary' => 'Khám phá biển Mỹ Khê, phố cổ Hội An và Bà Nà Hills.',
                'description' => 'Tour phù hợp cho gia đình và nhóm bạn muốn kết hợp nghỉ dưỡng biển với trải nghiệm văn hóa miền Trung.',
                'itinerary' => "Ngày 1: Đà Nẵng - Sơn Trà - Mỹ Khê\nNgày 2: Bà Nà Hills - Cầu Vàng\nNgày 3: Hội An - mua sắm đặc sản",
                'duration_days' => 3,
                'duration_nights' => 2,
                'base_price' => 4290000,
                'discount_price' => 3890000,
                'max_slots' => 30,
                'available_slots' => 24,
                'status' => 'published',
                'average_rating' => 4.8,
                'review_count' => 18,
                'images' => [
                    ['image_url' => 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b', 'alt_text' => 'Biển Đà Nẵng', 'sort_order' => 1, 'is_thumbnail' => true],
                    ['image_url' => 'https://images.unsplash.com/photo-1652731011413-93d4c5aa5c7c?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb', 'alt_text' => 'Phố cổ Hội An về đêm', 'sort_order' => 2, 'is_thumbnail' => false],
                ],
                'departures' => [
                    ['departure_date' => now()->addDays(14)->toDateString(), 'return_date' => now()->addDays(16)->toDateString(), 'base_price' => 4290000, 'discount_price' => 3890000, 'total_slots' => 30, 'booked_slots' => 6, 'status' => 'open'],
                    ['departure_date' => now()->addDays(30)->toDateString(), 'return_date' => now()->addDays(32)->toDateString(), 'base_price' => 4290000, 'discount_price' => 4090000, 'total_slots' => 30, 'booked_slots' => 0, 'status' => 'open'],
                ],
            ],
            [
                'category_slug' => 'du-lich-nghi-duong',
                'destination_slug' => 'phu-quoc',
                'title' => 'Phú Quốc nghỉ dưỡng 4 ngày 3 đêm',
                'slug' => 'phu-quoc-nghi-duong-4-ngay-3-dem',
                'summary' => 'Tận hưởng biển xanh, cáp treo Hòn Thơm và chợ đêm Phú Quốc.',
                'description' => 'Lịch trình cân bằng giữa nghỉ dưỡng, vui chơi và trải nghiệm ẩm thực địa phương.',
                'itinerary' => "Ngày 1: Nhận phòng resort\nNgày 2: Nam đảo - Hòn Thơm\nNgày 3: Tự do tắm biển\nNgày 4: Chợ Dương Đông - về lại điểm đón",
                'duration_days' => 4,
                'duration_nights' => 3,
                'base_price' => 6790000,
                'discount_price' => 6290000,
                'max_slots' => 25,
                'available_slots' => 20,
                'status' => 'published',
                'average_rating' => 4.7,
                'review_count' => 21,
                'images' => [
                    ['image_url' => 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', 'alt_text' => 'Biển Phú Quốc', 'sort_order' => 1, 'is_thumbnail' => true],
                ],
                'departures' => [
                    ['departure_date' => now()->addDays(20)->toDateString(), 'return_date' => now()->addDays(23)->toDateString(), 'base_price' => 6790000, 'discount_price' => 6290000, 'total_slots' => 25, 'booked_slots' => 5, 'status' => 'open'],
                ],
            ],
            [
                'category_slug' => 'du-lich-kham-pha',
                'destination_slug' => 'sa-pa',
                'title' => 'Sa Pa - Fansipan 3 ngày 2 đêm',
                'slug' => 'sa-pa-fansipan-3-ngay-2-dem',
                'summary' => 'Chinh phục Fansipan, thăm bản Cát Cát và ngắm ruộng bậc thang.',
                'description' => 'Tour dành cho du khách yêu thiên nhiên vùng cao và văn hóa Tây Bắc.',
                'itinerary' => "Ngày 1: Hà Nội - Sa Pa - Cát Cát\nNgày 2: Fansipan - chợ đêm\nNgày 3: Lao Chải - Tả Van",
                'duration_days' => 3,
                'duration_nights' => 2,
                'base_price' => 3590000,
                'discount_price' => null,
                'max_slots' => 28,
                'available_slots' => 28,
                'status' => 'published',
                'average_rating' => 4.6,
                'review_count' => 12,
                'images' => [
                    ['image_url' => 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee', 'alt_text' => 'Núi rừng Sa Pa', 'sort_order' => 1, 'is_thumbnail' => true],
                ],
                'departures' => [
                    ['departure_date' => now()->addDays(10)->toDateString(), 'return_date' => now()->addDays(12)->toDateString(), 'base_price' => 3590000, 'discount_price' => null, 'total_slots' => 28, 'booked_slots' => 0, 'status' => 'open'],
                ],
            ],
        ];

        foreach ($tours as $tourData) {
            $category = Category::where('slug', $tourData['category_slug'])->first();
            $destination = Destination::where('slug', $tourData['destination_slug'])->first();

            if (! $category || ! $destination) {
                continue;
            }

            $images = $tourData['images'];
            $departures = $tourData['departures'];
            unset($tourData['category_slug'], $tourData['destination_slug'], $tourData['images'], $tourData['departures']);

            $tour = Tour::updateOrCreate(
                ['slug' => $tourData['slug']],
                array_merge($tourData, [
                    'category_id' => $category->id,
                    'destination_id' => $destination->id,
                    'created_by' => $admin?->id,
                ])
            );

            if (Schema::hasTable('tour_images')) {
                foreach ($images as $image) {
                    DB::table('tour_images')->updateOrInsert(
                        ['tour_id' => $tour->id, 'image_url' => $image['image_url']],
                        array_merge($image, ['tour_id' => $tour->id, 'updated_at' => now(), 'created_at' => now()])
                    );
                }
            }

            if (Schema::hasTable('tour_departures')) {
                foreach ($departures as $departure) {
                    DB::table('tour_departures')->updateOrInsert(
                        ['tour_id' => $tour->id, 'departure_date' => $departure['departure_date']],
                        array_merge($departure, ['tour_id' => $tour->id, 'updated_at' => now(), 'created_at' => now()])
                    );
                }
            }

            if (Schema::hasTable('tour_destinations')) {
                DB::table('tour_destinations')->updateOrInsert(
                    ['tour_id' => $tour->id, 'destination_id' => $destination->id],
                    ['sort_order' => 1, 'updated_at' => now(), 'created_at' => now()]
                );
            }
        }
    }
}
