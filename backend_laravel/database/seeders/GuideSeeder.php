<?php

namespace Database\Seeders;

use App\Models\Certificate;
use App\Models\Guide;
use App\Models\GuideSpecialization;
use App\Models\Language;
use App\Models\LanguageLevel;
use Illuminate\Database\Seeder;

class GuideSeeder extends Seeder
{
    public function run(): void
    {
        $userHung = \App\Models\User::where('email', 'hung.tv@vivugo.vn')->first();
        $userMai  = \App\Models\User::where('email', 'mai.nt@vivugo.vn')->first();
        $userDuc  = \App\Models\User::where('email', 'duc.hv@vivugo.vn')->first();

        if (!$userHung || !$userMai || !$userDuc) {
            $this->command->warn('Thiếu user HDV! Hãy chạy UserSeeder trước.');
            return;
        }

        $english  = Language::where('name', 'Tiếng Anh')->first();
        $french   = Language::where('name', 'Tiếng Pháp')->first();
        $chinese  = Language::where('name', 'Tiếng Trung')->first();

        $c2        = LanguageLevel::where('language_id', $english->id)->where('level_name', 'C2')->first();
        $b2French  = LanguageLevel::where('language_id', $french->id)->where('level_name', 'B2')->first();
        $c1        = LanguageLevel::where('language_id', $english->id)->where('level_name', 'C1')->first();
        $b2Chinese = LanguageLevel::where('language_id', $chinese->id)->where('level_name', 'B2')->first();
        $c1French  = LanguageLevel::where('language_id', $french->id)->where('level_name', 'C1')->first();

        $specNoiDia = GuideSpecialization::where('name', 'Nội địa')->first();
        $specQuocTe = GuideSpecialization::where('name', 'Quốc tế')->first();

        $certSoCuu = Certificate::where('name', 'Chứng chỉ Sơ Cứu Khẩn Cấp')->first();
        $certIelts = Certificate::where('name', 'Chứng chỉ Tiếng Anh IELTS 8.0')->first();

        $guidesData = [
            [
                'user_id'             => $userHung->id,
                'guide_code'          => 'HDV001',
                'specialization_ids'  => [$specQuocTe->id, $specNoiDia->id], // vừa quốc tế vừa nội địa
                'experience_years'    => 8,
                'average_rating'      => 4.90,
                'review_count'        => 42,
                'status'              => 'active',
                'languages' => [
                    ['language_id' => $english->id, 'level_id' => $c2->id],
                    ['language_id' => $french->id,  'level_id' => $b2French->id],
                ],
                'experiences' => [
                    ['certificate_id' => $certSoCuu->id, 'issued_year' => 2022],
                ],
            ],
            [
                'user_id'             => $userMai->id,
                'guide_code'          => 'HDV002',
                'specialization_ids'  => [$specNoiDia->id], // chỉ nội địa
                'experience_years'    => 5,
                'average_rating'      => 4.80,
                'review_count'        => 31,
                'status'              => 'active',
                'languages' => [
                    ['language_id' => $english->id, 'level_id' => $c1->id],
                    ['language_id' => $chinese->id, 'level_id' => $b2Chinese->id],
                ],
                'experiences' => [],
            ],
            [
                'user_id'             => $userDuc->id,
                'guide_code'          => 'HDV003',
                'specialization_ids'  => [$specQuocTe->id], // chỉ quốc tế
                'experience_years'    => 10,
                'average_rating'      => 5.00,
                'review_count'        => 56,
                'status'              => 'active',
                'languages' => [
                    ['language_id' => $english->id, 'level_id' => $c2->id],
                    ['language_id' => $french->id,  'level_id' => $c1French->id],
                ],
                'experiences' => [
                    ['certificate_id' => $certIelts->id, 'issued_year' => 2015],
                ],
            ],
        ];

        foreach ($guidesData as $data) {
            $guide = Guide::updateOrCreate(
                ['guide_code' => $data['guide_code']],
                [
                    'user_id'          => $data['user_id'],
                    'experience_years' => $data['experience_years'],
                    'average_rating'   => $data['average_rating'],
                    'review_count'     => $data['review_count'],
                    'status'           => $data['status'],
                ]
            );

            $guide->specializations()->sync($data['specialization_ids']);

            $guide->languages()->delete();
            foreach ($data['languages'] as $lang) {
                $guide->languages()->create($lang);
            }

            $guide->experiences()->delete();
            foreach ($data['experiences'] as $exp) {
                $guide->experiences()->create($exp);
            }
        }
    }
}
