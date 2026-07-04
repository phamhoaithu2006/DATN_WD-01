<?php

namespace Database\Seeders;

use App\Models\SupportStaff;
use App\Models\User;
use Illuminate\Database\Seeder;

class SupportStaffSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = now();

        $supportUsers = User::query()
            ->whereHas('role', fn ($query) => $query->where('name', 'support staff'))
            ->get();

        foreach ($supportUsers as $user) {
            SupportStaff::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => $user->full_name,
                    'email' => $user->email,
                    'role' => 'customer_service',
                    'specialization' => 'noi_dia',
                    'experience_years' => 0,
                    'status' => $user->status === 'inactive' ? 'inactive' : 'active',
                    'performance_rating' => 5,
                    'hidden_at' => $user->status === 'inactive' ? $now : null,
                ],
            );
        }
    }
}
