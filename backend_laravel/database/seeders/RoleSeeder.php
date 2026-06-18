<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'support staff', 'description' => 'Nhân viên hỗ trợ'],
            ['name' => 'customer', 'description' => 'Khách hàng'],
            ['name' => 'tour guide', 'description' => 'Hướng dẫn viên'],
            ['name' => 'admin', 'description' => 'Quản trị viên'],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(
                ['name' => $role['name']],
                ['description' => $role['description']]
            );
        }
    }
}
