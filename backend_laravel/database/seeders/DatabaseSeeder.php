<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $now = now();

        DB::table('roles')->insertOrIgnore([
            ['name' => 'support staff', 'description' => 'Nhan vien ho tro', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'customer', 'description' => 'Khach hang', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'tour guide', 'description' => 'Huong dan vien', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'admin', 'description' => 'Quan tri vien', 'created_at' => $now, 'updated_at' => $now],
        ]);

        $adminRoleId = DB::table('roles')->where('name', 'admin')->value('id');

        User::updateOrCreate([
            'email' => 'admin@vivugo.vn',
        ], [
            'role_id' => $adminRoleId,
            'name' => 'ViVuGo Admin',
            'full_name' => 'ViVuGo Admin',
            'phone' => '0900000000',
            'password' => Hash::make('Admin@123'),
            'status' => 'active',
        ]);
    }
}
