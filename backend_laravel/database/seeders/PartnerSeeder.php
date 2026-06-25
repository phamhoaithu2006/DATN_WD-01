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
            ['name' => 'Khách sạn',          'slug' => 'khach-san',        'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Nhà hàng',           'slug' => 'nha-hang',         'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Vận chuyển',         'slug' => 'van-chuyen',       'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Vui chơi giải trí',  'slug' => 'vui-choi-giai-tri', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Bảo hiểm du lịch',  'slug' => 'bao-hiem-du-lich', 'created_at' => $now, 'updated_at' => $now],
        ];

        DB::table('partner_service_types')->insert($serviceTypes);

        $typeIds = DB::table('partner_service_types')->pluck('id', 'slug');

        $partners = [
            [
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
                'service_type_id' => $typeIds['van-chuyen'],
                'name'            => 'Công ty TNHH Vận tải Sao Việt',
                'contact_person'  => 'Phạm Minh Tuấn',
                'phone'           => '028 3823 5678',
                'email'           => 'saoviet.transport@example.com',
                'address'         => '123 Nguyễn Văn Linh, Quận 7, TP.HCM',
                'website'         => null,
                'description'     => 'Cung cấp xe du lịch 16-45 chỗ chất lượng cao.',
                'logo_url'        => null,
                'status'          => 'active',
                'deleted_at'      => null,
                'created_at'      => $now,
                'updated_at'      => $now,
            ],
            [
                'service_type_id' => $typeIds['bao-hiem-du-lich'],
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
