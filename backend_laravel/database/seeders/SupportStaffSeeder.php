<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SupportStaffSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faker = fake('vi_VN');
        $now = now();
        $roles = ['technical', 'customer_service', 'billing'];
        $statuses = [
            'active',
            'active',
            'active',
            'active',
            'active',
            'active',
            'active',
            'active',
            'active',
            'active',
            'active',
            'active',
            'active',
            'active',
            'inactive',
            'inactive',
            'inactive',
            'inactive',
        ];

        shuffle($statuses);

        $supportStaff = [];

        foreach (range(1, 18) as $index) {
            $supportStaff[] = [
                'name' => $faker->name(),
                'email' => $faker->unique()->safeEmail(),
                'role' => $faker->randomElement($roles),
                'status' => $statuses[$index - 1],
                'performance_rating' => number_format($faker->randomFloat(2, 3.5, 5), 2, '.', ''),
                'hidden_at' => null,
                'deleted_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('support_staff')->insert($supportStaff);
    }
}
