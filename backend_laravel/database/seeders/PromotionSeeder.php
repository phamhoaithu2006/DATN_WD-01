<?php

// database/seeders/PromotionSeeder.php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PromotionSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        $promotions = [
            [
                'code' => 'SUMMER2026',
                'name' => 'Khuyến mãi hè 2026',
                'description' => 'Giảm giá đặc biệt mùa hè cho tất cả tour.',
                'discount_type' => 'percent',
                'discount_value' => 10,
                'max_discount_amount' => 500000,
                'min_order_amount'    => 2000000,
                'usage_limit'         => 100,
                'used_count'          => 0,
                'start_date'          => $now->copy()->subMonth()->toDateString(),
                'end_date'            => $now->copy()->addMonths(2)->toDateString(),
                'status'              => 'active',
                'deleted_at'          => null,
                'created_at'          => $now,
                'updated_at'          => $now,
            ],
            [
                'code' => 'WELCOME50',
                'name' => 'Chào mừng khách mới',
                'description' => 'Giảm 50,000đ cho lần đặt tour đầu tiên.',
                'discount_type' => 'fixed',
                'discount_value' => 50000,
                'max_discount_amount' => 50000,
                'min_order_amount'    => 1000000,
                'usage_limit'         => 200,
                'used_count'          => 0,
                'start_date'          => $now->copy()->startOfYear()->toDateString(),
                'end_date'            => $now->copy()->addYear()->endOfYear()->toDateString(),
                'status'              => 'active',
                'deleted_at'          => null,
                'created_at'          => $now,
                'updated_at'          => $now,
            ],
            [
                'code' => 'FAMILY2026',
                'name' => 'Ưu đãi gia đình',
                'description' => 'Giảm 15% cho tour từ 4 người trở lên.',
                'discount_type' => 'percent',
                'discount_value' => 15,
                'max_discount_amount' => 1000000,
                'min_order_amount'    => 5000000,
                'usage_limit'         => 50,
                'used_count'          => 0,
                'start_date'          => $now->copy()->subMonths(2)->toDateString(),
                'end_date'            => $now->copy()->addMonths(3)->toDateString(),
                'status'              => 'active',
                'deleted_at'          => null,
                'created_at'          => $now,
                'updated_at'          => $now,
            ],
            [
                'code' => 'EARLYBIRD',
                'name' => 'Đặt sớm giảm ngay',
                'description' => 'Giảm 200,000đ khi đặt trước 30 ngày.',
                'discount_type' => 'fixed',
                'discount_value' => 200000,
                'max_discount_amount' => 200000,
                'min_order_amount'    => 3000000,
                'usage_limit'         => 80,
                'used_count'          => 0,
                'start_date'          => $now->copy()->startOfYear()->toDateString(),
                'end_date'            => $now->copy()->addYear()->endOfYear()->toDateString(),
                'status'              => 'active',
                'deleted_at'          => null,
                'created_at'          => $now,
                'updated_at'          => $now,
            ],
            [
                'code' => 'EXPIRED2025',
                'name' => 'Khuyến mãi cuối năm 2025',
                'description' => 'Đã hết hạn.',
                'discount_type' => 'percent',
                'discount_value' => 20,
                'max_discount_amount' => 800000,
                'min_order_amount'    => 4000000,
                'usage_limit'         => 30,
                'used_count'          => 0,
                'start_date'          => $now->copy()->subYears(2)->startOfYear()->toDateString(),
                'end_date'            => $now->copy()->subYear()->endOfYear()->toDateString(),
                'status'              => 'inactive',
                'deleted_at'          => null,
                'created_at'          => $now,
                'updated_at'          => $now,
            ],
        ];

        foreach ($promotions as $promotion) {
            DB::table('promotions')->updateOrInsert(
                ['code' => $promotion['code']],
                $promotion
            );
        }

        $this->command->info('✅ Seed 5 promotions thành công!');
    }
}
