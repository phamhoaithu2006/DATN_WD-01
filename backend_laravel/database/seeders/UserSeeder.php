<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $adminRole = Role::where('name', 'admin')->firstOrFail();
        $customerRole = Role::where('name', 'customer')->firstOrFail();
        $supportStaffRole = Role::where('name', 'support staff')->firstOrFail();
        $tourGuideRole = Role::where('name', 'tour guide')->firstOrFail();


        $users = [
            [
                'role_id' => $adminRole->id,
                'full_name' => 'Quản trị viên ViVuGo',
                'email' => 'admin@vivugo.vn',
                'phone' => '0901000001',
                'password' => Hash::make('password'),
                'status' => 'active',
            ],
            [
                'role_id' => $customerRole->id,
                'full_name' => 'Nguyễn Minh Anh',
                'email' => 'customer@vivugo.vn',
                'phone' => '0901000002',
                'password' => Hash::make('password'),
                'status' => 'active',
            ],
            [
                'role_id' => $supportStaffRole->id,
                'full_name' => 'Lê Thị Hương',
                'email' => 'support@vivugo.vn',
                'phone' => '0901000003',
                'password' => Hash::make('Support@123'),
                'status' => 'active',
            ],
            [
                'role_id' => $tourGuideRole->id,
                'full_name' => 'Phạm Quốc Đạt',
                'email' => 'guide@vivugo.vn',
                'phone' => '0901000004',
                'password' => Hash::make('Guide@123'),
                'status' => 'active',
            ],
            [
                'role_id'   => $tourGuideRole->id,
                'full_name' => 'Trần Văn Hùng',
                'email'     => 'hung.tv@vivugo.vn',
                'phone'     => '0912111222',
                'password'  => Hash::make('Guide@123'),
                'status'    => 'active',
            ],
            [
                'role_id'   => $tourGuideRole->id,
                'full_name' => 'Nguyễn Thị Mai',
                'email'     => 'mai.nt@vivugo.vn',
                'phone'     => '0912111333',
                'password'  => Hash::make('Guide@123'),
                'status'    => 'active',
            ],
            [
                'role_id'   => $tourGuideRole->id,
                'full_name' => 'Hoàng Văn Đức',
                'email'     => 'duc.hv@vivugo.vn',
                'phone'     => '0912111444',
                'password'  => Hash::make('Guide@123'),
                'status'    => 'active',
            ],
        ];

        $sampleSupportStaff = [
            ['full_name' => 'Nguyễn Hoàng Anh', 'email' => 'support01@vivugo.vn', 'phone' => '0901000101', 'status' => 'active'],
            ['full_name' => 'Trần Thị Bích Ngọc', 'email' => 'support02@vivugo.vn', 'phone' => '0901000102', 'status' => 'active'],
            ['full_name' => 'Lê Minh Khang', 'email' => 'support03@vivugo.vn', 'phone' => '0901000103', 'status' => 'active'],
            ['full_name' => 'Phạm Thu Hà', 'email' => 'support04@vivugo.vn', 'phone' => '0901000104', 'status' => 'active'],
            ['full_name' => 'Hoàng Gia Bảo', 'email' => 'support05@vivugo.vn', 'phone' => '0901000105', 'status' => 'active'],
            ['full_name' => 'Vũ Thảo Vy', 'email' => 'support06@vivugo.vn', 'phone' => '0901000106', 'status' => 'inactive'],
            ['full_name' => 'Đặng Quốc Huy', 'email' => 'support07@vivugo.vn', 'phone' => '0901000107', 'status' => 'active'],
            ['full_name' => 'Bùi Ngọc Linh', 'email' => 'support08@vivugo.vn', 'phone' => '0901000108', 'status' => 'active'],
            ['full_name' => 'Đỗ Hải Nam', 'email' => 'support09@vivugo.vn', 'phone' => '0901000109', 'status' => 'active'],
            ['full_name' => 'Võ Thanh Tâm', 'email' => 'support10@vivugo.vn', 'phone' => '0901000110', 'status' => 'active'],
            ['full_name' => 'Phan Mai Phương', 'email' => 'support11@vivugo.vn', 'phone' => '0901000111', 'status' => 'inactive'],
            ['full_name' => 'Huỳnh Đức Anh', 'email' => 'support12@vivugo.vn', 'phone' => '0901000112', 'status' => 'active'],
            ['full_name' => 'Nguyễn Thị Mỹ Duyên', 'email' => 'support13@vivugo.vn', 'phone' => '0901000113', 'status' => 'active'],
            ['full_name' => 'Trương Văn Toàn', 'email' => 'support14@vivugo.vn', 'phone' => '0901000114', 'status' => 'active'],
            ['full_name' => 'Lâm Khánh Chi', 'email' => 'support15@vivugo.vn', 'phone' => '0901000115', 'status' => 'active'],
            ['full_name' => 'Cao Minh Quân', 'email' => 'support16@vivugo.vn', 'phone' => '0901000116', 'status' => 'active'],
            ['full_name' => 'Mai Hoài An', 'email' => 'support17@vivugo.vn', 'phone' => '0901000117', 'status' => 'active'],
            ['full_name' => 'Dương Nhật Minh', 'email' => 'support18@vivugo.vn', 'phone' => '0901000118', 'status' => 'inactive'],
            ['full_name' => 'Tạ Phương Thảo', 'email' => 'support19@vivugo.vn', 'phone' => '0901000119', 'status' => 'active'],
            ['full_name' => 'Hà Tuấn Kiệt', 'email' => 'support20@vivugo.vn', 'phone' => '0901000120', 'status' => 'active'],
        ];

        foreach ($sampleSupportStaff as $supportUser) {
            $users[] = array_merge([
                'role_id' => $supportStaffRole->id,
                'password' => Hash::make('Support@123'),
            ], $supportUser);
        }

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                $user
            );
        }
    }
}
