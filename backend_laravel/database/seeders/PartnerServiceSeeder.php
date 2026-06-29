<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PartnerServiceSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        $services = [
            // Partner 1 - Khách sạn Mường Thanh (khach-san)
            [
                'partner_id'                  => 1,
                'service_name'                => 'Phòng Superior',
                'service_code'                => 'MT-SUP',
                'service_type'                => 'hotel',
                'depart_time'                 => '14:00',
                'arrive_time'                 => '12:00',
                'origin'                      => null,
                'destination'                 => 'Đà Nẵng',
                'vehicle_type'                => null,
                'seat_class'                  => 'Superior',
                'operate_days'                => json_encode([1, 2, 3, 4, 5, 6, 7]),
                'domestic_booking_hours'      => 24,
                'international_booking_hours' => 48,
                'confirmation_time'           => '30 phút',
                'amenities'                   => json_encode(['Bữa sáng', 'WiFi miễn phí', 'Hồ bơi']),
                'status'                      => 'active',
                'created_at'                  => $now,
                'updated_at'                  => $now,
            ],
            [
                'partner_id'                  => 1,
                'service_name'                => 'Phòng Deluxe View Biển',
                'service_code'                => 'MT-DLX',
                'service_type'                => 'hotel',
                'depart_time'                 => '14:00',
                'arrive_time'                 => '12:00',
                'origin'                      => null,
                'destination'                 => 'Đà Nẵng',
                'vehicle_type'                => null,
                'seat_class'                  => 'Deluxe',
                'operate_days'                => json_encode([1, 2, 3, 4, 5, 6, 7]),
                'domestic_booking_hours'      => 24,
                'international_booking_hours' => 48,
                'confirmation_time'           => '30 phút',
                'amenities'                   => json_encode(['Bữa sáng', 'WiFi miễn phí', 'Hồ bơi', 'View biển']),
                'status'                      => 'active',
                'created_at'                  => $now,
                'updated_at'                  => $now,
            ],

            // Partner 2 - Nhà hàng Bữa Việt (nha-hang)
            [
                'partner_id'                  => 2,
                'service_name'                => 'Set ăn đoàn tour 20-30 người',
                'service_code'                => 'BV-SET1',
                'service_type'                => 'restaurant',
                'depart_time'                 => '11:00',
                'arrive_time'                 => '13:00',
                'origin'                      => null,
                'destination'                 => 'Hà Nội',
                'vehicle_type'                => null,
                'seat_class'                  => 'Phòng riêng đoàn',
                'operate_days'                => json_encode([1, 2, 3, 4, 5, 6, 7]),
                'domestic_booking_hours'      => 4,
                'international_booking_hours' => null,
                'confirmation_time'           => '1 giờ',
                'amenities'                   => json_encode(['Đặt món theo yêu cầu', 'Ăn chay theo yêu cầu']),
                'status'                      => 'active',
                'created_at'                  => $now,
                'updated_at'                  => $now,
            ],


            // Partner 4 - Bảo Việt Insurance (bao-hiem)
            [
                'partner_id'                  => 3,
                'service_name'                => 'Bảo hiểm du lịch nội địa',
                'service_code'                => 'BV-DOM',
                'service_type'                => 'insurance',
                'depart_time'                 => null,
                'arrive_time'                 => null,
                'origin'                      => null,
                'destination'                 => null,
                'vehicle_type'                => null,
                'seat_class'                  => null,
                'operate_days'                => json_encode([1, 2, 3, 4, 5, 6, 7]),
                'domestic_booking_hours'      => 1,
                'international_booking_hours' => null,
                'confirmation_time'           => '5 phút',
                'amenities'                   => json_encode(['Tai nạn', 'Hành lý', 'Huỷ chuyến']),
                'status'                      => 'active',
                'created_at'                  => $now,
                'updated_at'                  => $now,
            ],
        ];

        DB::table('partner_services')->insert($services);
    }
}
