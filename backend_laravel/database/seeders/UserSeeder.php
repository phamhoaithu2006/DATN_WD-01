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
                'password' => Hash::make('Admin@123'),
                'status' => 'active',
            ],
            [
                'role_id' => $customerRole->id,
                'full_name' => 'Nguyễn Minh Anh',
                'email' => '
                customer@vivugo.vn',
                'phone' => '0901000002',
                'password' => Hash::make('Customer@123'),
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
        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                $user
            );
        }
    }
}
