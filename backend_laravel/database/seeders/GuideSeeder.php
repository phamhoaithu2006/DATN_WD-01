<?php

namespace Database\Seeders;

use App\Models\Guide;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class GuideSeeder extends Seeder
{
    public function run(): void
    {
        $guides = [
            [
                'user' => [
                    'role_id'   => 3, // role hướng dẫn viên
                    'full_name' => 'Trần Văn Hùng',
                    'email'     => 'hung.tv@vivugo.vn',
                    'phone'     => '0912111222',
                    'password'  => Hash::make('123456'),
                    'status'    => 'active',
                ],
                'guide' => [
                    'guide_code'       => 'HDV001',
                    'certificate_type' => 'Thẻ HDV Quốc Tế',
                    'experience_years' => 8,
                    'average_rating'   => 4.9,
                    'status'           => 'active',
                ],
                'languages' => [
                    ['language' => 'Tiếng Anh', 'level' => 'C2'],
                    ['language' => 'Tiếng Pháp', 'level' => 'B2'],
                ],
                'experiences' => [
                    ['certificate_name' => 'Thẻ HDV Quốc Tế', 'issued_by' => 'Tổng Cục Du Lịch Việt Nam', 'issued_year' => 2016],
                    ['certificate_name' => 'Chứng chỉ Sơ Cứu Khẩn Cấp', 'issued_by' => 'Hội Chữ Thập Đỏ VN', 'issued_year' => 2022],
                ],
            ],
            [
                'user' => [
                    'role_id'   => 3,
                    'full_name' => 'Nguyễn Thị Mai',
                    'email'     => 'mai.nt@vivugo.vn',
                    'phone'     => '0912111333',
                    'password'  => Hash::make('123456'),
                    'status'    => 'active',
                ],
                'guide' => [
                    'guide_code'       => 'HDV002',
                    'certificate_type' => 'Thẻ HDV Nội Địa',
                    'experience_years' => 5,
                    'average_rating'   => 4.8,
                    'status'           => 'active',
                ],
                'languages' => [
                    ['language' => 'Tiếng Anh', 'level' => 'C1'],
                    ['language' => 'Tiếng Trung', 'level' => 'B2'],
                ],
                'experiences' => [
                    ['certificate_name' => 'Thẻ HDV Nội Địa', 'issued_by' => 'Tổng Cục Du Lịch Việt Nam', 'issued_year' => 2019],
                ],
            ],
            [
                'user' => [
                    'role_id'   => 3,
                    'full_name' => 'Hoàng Văn Đức',
                    'email'     => 'duc.hv@vivugo.vn',
                    'phone'     => '0912111444',
                    'password'  => Hash::make('123456'),
                    'status'    => 'active',
                ],
                'guide' => [
                    'guide_code'       => 'HDV003',
                    'certificate_type' => 'Thẻ HDV Quốc Tế',
                    'experience_years' => 10,
                    'average_rating'   => 5.0,
                    'status'           => 'active',
                ],
                'languages' => [
                    ['language' => 'Tiếng Anh', 'level' => 'C2'],
                    ['language' => 'Tiếng Pháp', 'level' => 'C1'],
                ],
                'experiences' => [
                    ['certificate_name' => 'Thẻ HDV Quốc Tế', 'issued_by' => 'Tổng Cục Du Lịch Việt Nam', 'issued_year' => 2014],
                    ['certificate_name' => 'Chứng chỉ Tiếng Anh IELTS 8.0', 'issued_by' => 'British Council', 'issued_year' => 2015],
                ],
            ],
        ];

        foreach ($guides as $data) {
            $user  = User::create($data['user']);
            $guide = Guide::create(array_merge($data['guide'], ['user_id' => $user->id]));

            foreach ($data['languages'] as $lang) {
                $guide->languages()->create($lang);
            }

            foreach ($data['experiences'] as $exp) {
                $guide->experiences()->create($exp);
            }
        }
    }
}
