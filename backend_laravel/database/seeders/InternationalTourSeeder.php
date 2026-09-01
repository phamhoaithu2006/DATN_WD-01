<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Province;
use App\Models\Tour;
use App\Models\TourAgePricingRule;
use App\Models\TourImage;
use App\Models\TourItinerary;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InternationalTourSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $adminId = User::query()
                ->whereHas('role', fn ($query) => $query->where('name', 'admin'))
                ->value('id');

            if (! $adminId) {
                $this->command?->warn('Bỏ qua tour quốc tế: chưa có tài khoản quản trị viên.');

                return;
            }

            $category = Category::withTrashed()->updateOrCreate(
                ['slug' => 'tour-quoc-te'],
                [
                    'name' => 'Tour quốc tế',
                    'description' => 'Các hành trình khám phá văn hóa, ẩm thực và danh thắng quốc tế.',
                    'status' => 'active',
                ]
            );
            $category->restore();

            foreach ($this->tourData() as $data) {
                $destination = Province::firstOrCreate(
                    ['name' => $data['destination']],
                    ['code' => $data['code']]
                );
                $tour = Tour::withTrashed()->updateOrCreate(
                    ['slug' => $data['slug']],
                    [
                        'category_id' => $category->id,
                        'province_id' => $destination->id,
                        'created_by' => $adminId,
                        'title' => $data['title'],
                        'summary' => $data['summary'],
                        'description' => $data['description'],
                        'itinerary' => collect($data['days'])
                            ->map(fn (string $activity, int $day) => 'Ngày '.($day + 1).": {$activity}")
                            ->implode("\n"),
                        'duration_days' => count($data['days']),
                        'duration_nights' => count($data['days']) - 1,
                        'base_price' => $data['price'],
                        'discount_price' => $data['price'] - 1000000,
                        'max_slots' => 30,
                        'available_slots' => 30,
                        'status' => 'published',
                        'average_rating' => 0,
                        'review_count' => 0,
                    ]
                );
                $tour->restore();

                $this->syncStandardAgePricingRules($tour);

                TourImage::updateOrCreate(
                    ['tour_id' => $tour->id, 'is_thumbnail' => true],
                    [
                        'image_url' => $data['image'],
                        'alt_text' => 'Ảnh '.$data['title'],
                        'sort_order' => 1,
                    ]
                );

                foreach ($data['days'] as $dayIndex => $activity) {
                    $day = $dayIndex + 1;
                    TourItinerary::updateOrCreate(
                        ['tour_id' => $tour->id, 'day_number' => $day, 'sort_order' => 1],
                        [
                            'type' => $day === 1
                                ? TourItinerary::ACTIVITY_DEPARTURE
                                : ($day === count($data['days'])
                                    ? TourItinerary::ACTIVITY_RETURN
                                    : TourItinerary::ACTIVITY_SIGHTSEEING),
                            'title' => $activity,
                            'start_time' => $day === 1 ? '06:30:00' : '08:00:00',
                            'end_time' => '18:00:00',
                            'duration' => 'Cả ngày',
                            'transport' => $day === 1 ? 'Máy bay và xe du lịch' : 'Xe du lịch',
                            'description' => $activity.'. Hướng dẫn viên đồng hành và hỗ trợ đoàn theo chương trình.',
                        ]
                    );
                }
            }
        });

        // Tạo lịch mỗi ngày trong tháng 9, booking mẫu và phân công HDV không trùng lịch.
        $this->call(SeptemberTourScheduleSeeder::class);
    }

    private function syncStandardAgePricingRules(Tour $tour): void
    {
        $canonicalRuleIds = [];

        foreach (TourAgePricingRule::standardDefinitions() as $definition) {
            $rule = TourAgePricingRule::query()->updateOrCreate(
                [
                    'tour_id' => $tour->id,
                    'min_age' => $definition['min_age'],
                    'max_age' => $definition['max_age'],
                ],
                [
                    'label' => $definition['label'],
                    'pricing_type' => $definition['pricing_type'],
                    'price_value' => $definition['price_value'],
                    'sort_order' => $definition['sort_order'],
                    'is_active' => true,
                ]
            );

            $canonicalRuleIds[] = $rule->id;
        }

        TourAgePricingRule::query()
            ->where('tour_id', $tour->id)
            ->whereNotIn('id', $canonicalRuleIds)
            ->update([
                'is_active' => false,
                'updated_at' => now(),
            ]);
    }

    private function tourData(): array
    {
        return [
            [
                'title' => 'Nhật Bản mùa thu Tokyo - Phú Sĩ - Kyoto',
                'slug' => 'nhat-ban-mua-thu-tokyo-phu-si-kyoto',
                'destination' => 'Nhật Bản', 'code' => 'INT-JP', 'price' => 39900000,
                'summary' => 'Khám phá Tokyo, núi Phú Sĩ, cố đô Kyoto và văn hóa Nhật Bản.',
                'description' => 'Hành trình Nhật Bản trọn gói với vé máy bay, khách sạn, tham quan và hướng dẫn viên.',
                'image' => 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200',
                'days' => ['Bay đến Tokyo, nhận phòng', 'Tham quan Tokyo', 'Núi Phú Sĩ và hồ Kawaguchi', 'Trải nghiệm tàu cao tốc đến Kyoto', 'Khám phá cố đô Kyoto', 'Mua sắm Osaka', 'Trở về Việt Nam'],
            ],
            [
                'title' => 'Hàn Quốc Seoul - Nami - Everland',
                'slug' => 'han-quoc-seoul-nami-everland',
                'destination' => 'Hàn Quốc', 'code' => 'INT-KR', 'price' => 25900000,
                'summary' => 'Trải nghiệm Seoul hiện đại, đảo Nami lãng mạn và công viên Everland.',
                'description' => 'Tour Hàn Quốc kết hợp văn hóa, vui chơi, ẩm thực và mua sắm.',
                'image' => 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=1200',
                'days' => ['Bay đến Seoul', 'Cung điện Gyeongbokgung và làng Bukchon', 'Đảo Nami', 'Công viên Everland', 'Mua sắm Seoul', 'Trở về Việt Nam'],
            ],
            [
                'title' => 'Thái Lan Bangkok - Pattaya',
                'slug' => 'thai-lan-bangkok-pattaya',
                'destination' => 'Thái Lan', 'code' => 'INT-TH', 'price' => 12900000,
                'summary' => 'Khám phá Bangkok sôi động và thành phố biển Pattaya.',
                'description' => 'Hành trình Thái Lan phù hợp gia đình, kết hợp tham quan và nghỉ dưỡng.',
                'image' => 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200',
                'days' => ['Bay đến Bangkok, di chuyển Pattaya', 'Đảo Coral', 'Nông trại và show văn hóa', 'Bangkok, Wat Arun', 'Mua sắm Bangkok', 'Trở về Việt Nam'],
            ],
            [
                'title' => 'Singapore - Malaysia liên tuyến',
                'slug' => 'singapore-malaysia-lien-tuyen',
                'destination' => 'Singapore - Malaysia', 'code' => 'INT-SGMY', 'price' => 18900000,
                'summary' => 'Một hành trình khám phá Singapore, Malacca và Kuala Lumpur.',
                'description' => 'Tour liên tuyến hai quốc gia với các biểu tượng đô thị nổi tiếng Đông Nam Á.',
                'image' => 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200',
                'days' => ['Bay đến Singapore', 'Sentosa và Gardens by the Bay', 'Singapore - Malacca', 'Malacca - Kuala Lumpur', 'Khám phá Kuala Lumpur', 'Trở về Việt Nam'],
            ],
            [
                'title' => 'Trung Quốc Bắc Kinh - Thượng Hải',
                'slug' => 'trung-quoc-bac-kinh-thuong-hai',
                'destination' => 'Trung Quốc', 'code' => 'INT-CN', 'price' => 29900000,
                'summary' => 'Tham quan Vạn Lý Trường Thành, Tử Cấm Thành và Bến Thượng Hải.',
                'description' => 'Hành trình kết nối hai thành phố biểu tượng của Trung Quốc.',
                'image' => 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1200',
                'days' => ['Bay đến Bắc Kinh', 'Tử Cấm Thành và Thiên An Môn', 'Vạn Lý Trường Thành', 'Tàu cao tốc đến Thượng Hải', 'Bến Thượng Hải và phố Nam Kinh', 'Disneyland hoặc tự do khám phá', 'Trở về Việt Nam'],
            ],
        ];
    }
}
