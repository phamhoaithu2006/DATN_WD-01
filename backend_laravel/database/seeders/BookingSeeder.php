<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class BookingSeeder extends Seeder
{
    /**
     * Giữ tương thích với lệnh seed cũ của thành viên trong nhóm.
     * DatabaseSeeder gọi DemoWorkflowSeeder sau khi đã tạo đủ dữ liệu nền.
     */
    public function run(): void
    {
        $this->call(DemoWorkflowSeeder::class);
    }
}
