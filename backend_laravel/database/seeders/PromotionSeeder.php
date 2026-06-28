<?php
// database/seeders/PromotionSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PromotionSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        DB::table('promotions')->insert([
            [
                'code'                => 'SUMMER2026',
                'name'                => 'Khuyến mãi hè 2026',
                'description'         => 'Giảm giá đặc biệt mùa hè cho tất cả tour.',
                'discount_type' => 'percent',
                'discount_value'      => 10,
                'max_discount_amount' => 500000,
                'min_order_amount'    => 2000000,
                'usage_limit'         => 100,
                'used_count'          => 12,
                'start_date'          => '2026-06-01',
                'end_date'            => '2026-08-31',
                'status'              => 'active',
                'deleted_at'          => null,
                'created_at'          => $now,
                'updated_at'          => $now,
            ],
            [
                'code'                => 'WELCOME50',
                'name'                => 'Chào mừng khách mới',
                'description'         => 'Giảm 50,000đ cho lần đặt tour đầu tiên.',
                'discount_type'       => 'fixed',
                'discount_value'      => 50000,
                'max_discount_amount' => 50000,
                'min_order_amount'    => 1000000,
                'usage_limit'         => 200,
                'used_count'          => 45,
                'start_date'          => '2026-01-01',
                'end_date'            => '2026-12-31',
                'status'              => 'active',
                'deleted_at'          => null,
                'created_at'          => $now,
                'updated_at'          => $now,
            ],
            [
                'code'                => 'FAMILY2026',
                'name'                => 'Ưu đãi gia đình',
                'description'         => 'Giảm 15% cho tour từ 4 người trở lên.',
                'discount_type' => 'percent',
                'discount_value'      => 15,
                'max_discount_amount' => 1000000,
                'min_order_amount'    => 5000000,
                'usage_limit'         => 50,
                'used_count'          => 8,
                'start_date'          => '2026-05-01',
                'end_date'            => '2026-09-30',
                'status'              => 'active',
                'deleted_at'          => null,
                'created_at'          => $now,
                'updated_at'          => $now,
            ],
            [
                'code'                => 'EARLYBIRD',
                'name'                => 'Đặt sớm giảm ngay',
                'description'         => 'Giảm 200,000đ khi đặt trước 30 ngày.',
                'discount_type'       => 'fixed',
                'discount_value'      => 200000,
                'max_discount_amount' => 200000,
                'min_order_amount'    => 3000000,
                'usage_limit'         => 80,
                'used_count'          => 20,
                'start_date'          => '2026-01-01',
                'end_date'            => '2026-12-31',
                'status'              => 'active',
                'deleted_at'          => null,
                'created_at'          => $now,
                'updated_at'          => $now,
            ],
            [
                'code'                => 'EXPIRED2025',
                'name'                => 'Khuyến mãi cuối năm 2025',
                'description'         => 'Đã hết hạn.',
                'discount_type' => 'percent',
                'discount_value'      => 20,
                'max_discount_amount' => 800000,
                'min_order_amount'    => 4000000,
                'usage_limit'         => 30,
                'used_count'          => 30,
                'start_date'          => '2025-11-01',
                'end_date'            => '2025-12-31',
                'status'              => 'inactive',
                'deleted_at'          => null,
                'created_at'          => $now,
                'updated_at'          => $now,
            ],
        ]);

        $this->command->info('✅ Seed 5 promotions thành công!');
    }
}
