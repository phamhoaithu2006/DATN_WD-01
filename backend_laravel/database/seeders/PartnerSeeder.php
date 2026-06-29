<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PartnerSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        $serviceTypes = [
            ['name' => 'Khách sạn',          'slug' => 'khach-san',         'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Nhà hàng',           'slug' => 'nha-hang',          'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Điểm tham quan',  'slug' => 'diem-tham-quan', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Bảo hiểm',  'slug' => 'bao-hiem',  'created_at' => $now, 'updated_at' => $now],
        ];

        DB::table('partner_service_types')->insert($serviceTypes);

        $typeIds = DB::table('partner_service_types')->pluck('id', 'slug');

        $partners = [
            [
                'partner_code'    => 'PTN001',
                'service_type_id' => $typeIds['khach-san'],
                'name'            => 'Khách sạn Mường Thanh Grand Đà Nẵng',
                'contact_person'  => 'Nguyễn Thị Lan',
                'phone'           => '0236 3899 999',
                'email'           => 'muongthanh.danang@example.com',
                'address'         => '960 Điện Biên Phủ, Đà Nẵng',
                'website'         => 'https://muongthanh.com',
                'description'     => 'Đối tác khách sạn 5 sao tại Đà Nẵng.',
                'logo_url'        => null,
                'status'          => 'active',
                'deleted_at'      => null,
                'created_at'      => $now,
                'updated_at'      => $now,
            ],
            [
                'partner_code'    => 'PTN002',
                'service_type_id' => $typeIds['nha-hang'],
                'name'            => 'Nhà hàng Bữa Việt',
                'contact_person'  => 'Lê Hoàng Nam',
                'phone'           => '024 3823 1234',
                'email'           => 'buaviet.hn@example.com',
                'address'         => '15 Hàng Bài, Hoàn Kiếm, Hà Nội',
                'website'         => null,
                'description'     => 'Chuyên ẩm thực Việt Nam truyền thống cho đoàn tour.',
                'logo_url'        => null,
                'status'          => 'active',
                'deleted_at'      => null,
                'created_at'      => $now,
                'updated_at'      => $now,
            ],

            [
                'partner_code'    => 'PTN004',
                'service_type_id' => $typeIds['bao-hiem'],
                'name'            => 'Bảo Việt Travel Insurance',
                'contact_person'  => 'Vũ Thị Hoa',
                'phone'           => '1800 599 970',
                'email'           => 'travel@baoviet.com.vn',
                'address'         => '8 Lê Thái Tổ, Hoàn Kiếm, Hà Nội',
                'website'         => 'https://baoviet.com.vn',
                'description'     => 'Bảo hiểm du lịch trong và ngoài nước.',
                'logo_url'        => null,
                'status'          => 'inactive',
                'deleted_at'      => null,
                'created_at'      => $now,
                'updated_at'      => $now,
            ],
        ];

        DB::table('partners')->insert($partners);
    }
}
