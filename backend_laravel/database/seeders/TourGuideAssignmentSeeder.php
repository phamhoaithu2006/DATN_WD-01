<?php

namespace Database\Seeders;

use App\Models\Guide;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TourGuideAssignmentSeeder extends Seeder
{
    public function run(): void
    {
        $adminId = User::query()->where('email', 'admin@vivugo.vn')->value('id');
        $guides = Guide::query()->whereIn('guide_code', ['HDV001', 'HDV002', 'HDV003'])->get()->keyBy('guide_code');
        $tours = Tour::query()
            ->whereIn('slug', [
                'da-nang-hoi-an-3-ngay-2-dem',
                'phu-quoc-nghi-duong-4-ngay-3-dem',
                'sa-pa-fansipan-3-ngay-2-dem',
            ])
            ->get()
            ->keyBy('slug');

        if ($guides->count() < 3 || $tours->count() < 3) {
            $this->command->warn('Thiếu tour hoặc hướng dẫn viên để tạo lịch phân công mẫu.');

            return;
        }

        $fixtures = [
            ['da-nang-hoi-an-3-ngay-2-dem', 'HDV002', -1, 1, 'open', 'confirmed', 'Đoàn đang di chuyển, theo dõi lịch trình từng ngày.'],
            ['phu-quoc-nghi-duong-4-ngay-3-dem', 'HDV003', -2, 1, 'open', 'confirmed', 'Lịch mẫu đang diễn ra.'],
            ['sa-pa-fansipan-3-ngay-2-dem', 'HDV001', -15, -13, 'completed', 'completed', 'Tour kết thúc thuận lợi, khách phản hồi tốt.'],
            ['da-nang-hoi-an-3-ngay-2-dem', 'HDV002', -30, -28, 'completed', 'completed', 'Tour đã hoàn thành.'],
            ['phu-quoc-nghi-duong-4-ngay-3-dem', 'HDV003', -45, -42, 'completed', 'completed', 'Tour kết thúc tốt đẹp.'],
        ];

        foreach ($fixtures as [$tourSlug, $guideCode, $startOffset, $endOffset, $departureStatus, $assignmentStatus, $note]) {
            $tour = $tours[$tourSlug];
            $guide = $guides[$guideCode];
            $start = now()->addDays($startOffset);
            $end = now()->addDays($endOffset);
            $price = $tour->discount_price ?? $tour->base_price;

            $departure = TourDeparture::query()->updateOrCreate(
                ['tour_id' => $tour->id, 'departure_date' => $start->toDateString()],
                [
                    'return_date' => $end->toDateString(),
                    'price' => $price,
                    'base_price' => $tour->base_price,
                    'discount_price' => $tour->discount_price,
                    'total_slots' => $tour->max_slots,
                    'booked_slots' => 0,
                    'status' => $departureStatus,
                ]
            );

            DB::table('tour_guide_assignments')->updateOrInsert(
                ['guide_id' => $guide->id, 'tour_departure_id' => $departure->id],
                [
                    'role' => 'lead',
                    'status' => $assignmentStatus,
                    'note' => $note,
                    'notes' => $note,
                    'assigned_by' => $adminId,
                    'assigned_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $futureAssignments = [
            ['da-nang-hoi-an-3-ngay-2-dem', 'HDV001', 0, 'assigned'],
            ['da-nang-hoi-an-3-ngay-2-dem', 'HDV001', 1, 'confirmed'],
            ['phu-quoc-nghi-duong-4-ngay-3-dem', 'HDV002', 0, 'assigned'],
            ['sa-pa-fansipan-3-ngay-2-dem', 'HDV003', 0, 'confirmed'],
        ];

        foreach ($futureAssignments as [$tourSlug, $guideCode, $position, $status]) {
            $departure = TourDeparture::query()
                ->where('tour_id', $tours[$tourSlug]->id)
                ->whereDate('departure_date', '>', now())
                ->orderBy('departure_date')
                ->skip($position)
                ->first();

            if (! $departure) {
                continue;
            }

            DB::table('tour_guide_assignments')->updateOrInsert(
                ['guide_id' => $guides[$guideCode]->id, 'tour_departure_id' => $departure->id],
                [
                    'role' => 'lead',
                    'status' => $status,
                    'note' => null,
                    'notes' => null,
                    'assigned_by' => $adminId,
                    'assigned_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
