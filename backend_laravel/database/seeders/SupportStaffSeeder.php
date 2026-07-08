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

        $profiles = [
            'support@vivugo.vn' => ['role' => 'customer_service', 'status' => 'active', 'performance_rating' => 5.00],
            'support01@vivugo.vn' => ['role' => 'customer_service', 'status' => 'active', 'performance_rating' => 4.85],
            'support02@vivugo.vn' => ['role' => 'billing', 'status' => 'active', 'performance_rating' => 4.70],
            'support03@vivugo.vn' => ['role' => 'technical', 'status' => 'active', 'performance_rating' => 4.90],
            'support04@vivugo.vn' => ['role' => 'customer_service', 'status' => 'active', 'performance_rating' => 4.65],
            'support05@vivugo.vn' => ['role' => 'booking_support', 'status' => 'active', 'performance_rating' => 4.75],
            'support06@vivugo.vn' => ['role' => 'customer_service', 'status' => 'inactive', 'performance_rating' => 4.10],
            'support07@vivugo.vn' => ['role' => 'technical', 'status' => 'active', 'performance_rating' => 4.55],
            'support08@vivugo.vn' => ['role' => 'billing', 'status' => 'hidden', 'performance_rating' => 4.30],
            'support09@vivugo.vn' => ['role' => 'customer_service', 'status' => 'active', 'performance_rating' => 4.95],
            'support10@vivugo.vn' => ['role' => 'booking_support', 'status' => 'active', 'performance_rating' => 4.60],
            'support11@vivugo.vn' => ['role' => 'customer_service', 'status' => 'inactive', 'performance_rating' => 4.20],
            'support12@vivugo.vn' => ['role' => 'technical', 'status' => 'active', 'performance_rating' => 4.80],
            'support13@vivugo.vn' => ['role' => 'billing', 'status' => 'active', 'performance_rating' => 4.45],
            'support14@vivugo.vn' => ['role' => 'customer_service', 'status' => 'hidden', 'performance_rating' => 4.35],
            'support15@vivugo.vn' => ['role' => 'booking_support', 'status' => 'active', 'performance_rating' => 4.88],
            'support16@vivugo.vn' => ['role' => 'technical', 'status' => 'active', 'performance_rating' => 4.52],
            'support17@vivugo.vn' => ['role' => 'billing', 'status' => 'active', 'performance_rating' => 4.68],
            'support18@vivugo.vn' => ['role' => 'customer_service', 'status' => 'inactive', 'performance_rating' => 4.15],
            'support19@vivugo.vn' => ['role' => 'booking_support', 'status' => 'active', 'performance_rating' => 4.72],
            'support20@vivugo.vn' => ['role' => 'customer_service', 'status' => 'active', 'performance_rating' => 4.92],
        ];

        $supportUsers = User::query()
            ->whereHas('role', fn ($query) => $query->where('name', 'support staff'))
            ->get();

        foreach ($supportUsers as $user) {
            $profile = $profiles[strtolower($user->email)] ?? [];
            $status = $profile['status'] ?? ($user->status === 'inactive' ? 'inactive' : 'active');

            SupportStaff::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => $user->full_name,
                    'email' => $user->email,

                    'role' => $profile['role'] ?? 'customer_service',
                  
                    'specialization' => 'noi_dia',
                    'experience_years' => 0,
                  
                    'status' => $status,
                    'performance_rating' => $profile['performance_rating'] ?? 5,
                    'hidden_at' => $status === 'hidden' ? $now : null,

                    
                   
                    

                ],
            );
        }
    }
}
