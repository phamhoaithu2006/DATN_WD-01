<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TourGuideAssignmentSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        // ==========================================================
        // BƯỚC 1: Tạo thêm tour_departures cho 2 trường hợp còn thiếu
        // (4 departures gốc id 1-4 đều có departure_date tương lai
        // => chỉ đang cover trường hợp "Sắp diễn ra")
        // ==========================================================
        $extraDepartures = [
            // --- Đang diễn ra: departure_date đã qua, return_date chưa tới ---
            [
                'tour_id'        => 1, // Đà Nẵng - Hội An
                'departure_date' => $now->copy()->subDay()->toDateString(),
                'return_date'    => $now->copy()->addDay()->toDateString(),
                'base_price'     => 4290000,
                'discount_price' => 3890000,
                'total_slots'    => 30,
                'booked_slots'   => 18,
                'status'         => 'open', // enum chưa có 'ongoing', controller tự suy ra qua ngày
            ],
            [
                'tour_id'        => 2, // Phú Quốc
                'departure_date' => $now->copy()->subDays(2)->toDateString(),
                'return_date'    => $now->copy()->addDays(1)->toDateString(),
                'base_price'     => 6790000,
                'discount_price' => 6290000,
                'total_slots'    => 25,
                'booked_slots'   => 22,
                'status'         => 'open',
            ],

            // --- Đã hoàn thành: cả departure_date và return_date đều trong quá khứ ---
            [
                'tour_id'        => 3, // Sa Pa - Fansipan
                'departure_date' => $now->copy()->subDays(15)->toDateString(),
                'return_date'    => $now->copy()->subDays(13)->toDateString(),
                'base_price'     => 3590000,
                'discount_price' => null,
                'total_slots'    => 28,
                'booked_slots'   => 28,
                'status'         => 'completed',
            ],
            [
                'tour_id'        => 1, // Đà Nẵng - Hội An (đợt cũ)
                'departure_date' => $now->copy()->subDays(30)->toDateString(),
                'return_date'    => $now->copy()->subDays(28)->toDateString(),
                'base_price'     => 4290000,
                'discount_price' => 3890000,
                'total_slots'    => 30,
                'booked_slots'   => 27,
                'status'         => 'completed',
            ],
        ];

        $departureIds = [];

        foreach ($extraDepartures as $key => $dep) {
            DB::table('tour_departures')->updateOrInsert(
                [
                    'tour_id'        => $dep['tour_id'],
                    'departure_date' => $dep['departure_date'],
                ],
                array_merge($dep, [
                    'updated_at' => $now,
                    'created_at' => $now,
                ])
            );

            $departureIds[$key] = DB::table('tour_departures')
                ->where('tour_id', $dep['tour_id'])
                ->where('departure_date', $dep['departure_date'])
                ->value('id');
        }

        // ==========================================================
        // BƯỚC 2: Gán hướng dẫn viên (guide_id 1,2,3) vào các
        // departure vừa tạo, cùng với 4 assignment "sắp diễn ra" cũ
        // ==========================================================
        $assignments = [
            // --- Sắp diễn ra (dùng lại departure id 1-4 đã có sẵn) ---
            [
                'guide_id'          => 1,
                'tour_departure_id' => 1,
                'status'            => 'assigned',
                'note'              => null,
            ],
            [
                'guide_id'          => 1,
                'tour_departure_id' => 2,
                'status'            => 'confirmed',
                'note'              => 'Đoàn khách VIP, lưu ý phục vụ chu đáo.',
            ],
            [
                'guide_id'          => 2,
                'tour_departure_id' => 3,
                'status'            => 'assigned',
                'note'              => null,
            ],
            [
                'guide_id'          => 3,
                'tour_departure_id' => 4,
                'status'            => 'confirmed',
                'note'              => null,
            ],

            // --- Đang diễn ra ---
            [
                'guide_id'          => 2,
                'tour_departure_id' => $departureIds[0],
                'status'            => 'confirmed',
                'note'              => 'Đoàn đang di chuyển, theo dõi lịch trình từng ngày.',
            ],
            [
                'guide_id'          => 3,
                'tour_departure_id' => $departureIds[1],
                'status'            => 'confirmed',
                'note'              => null,
            ],

            // --- Đã hoàn thành ---
            [
                'guide_id'          => 1,
                'tour_departure_id' => $departureIds[2],
                'status'            => 'completed',
                'note'              => 'Tour kết thúc thuận lợi, khách phản hồi tốt.',
            ],
            [
                'guide_id'          => 2,
                'tour_departure_id' => $departureIds[3],
                'status'            => 'completed',
                'note'              => null,
            ],
        ];

        foreach ($assignments as $assignment) {
            DB::table('tour_guide_assignments')->updateOrInsert(
                [
                    'guide_id'          => $assignment['guide_id'],
                    'tour_departure_id' => $assignment['tour_departure_id'],
                ],
                array_merge($assignment, [
                    'role'        => 'lead',
                    'updated_at'  => $now,
                    'created_at'  => $now,
                    'assigned_by' => null,
                    'assigned_at' => $now,
                    'notes'       => null,
                ])
            );
        }
    }
}
