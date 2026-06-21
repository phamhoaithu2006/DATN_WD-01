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
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                $user
            );
        }
    }
}
