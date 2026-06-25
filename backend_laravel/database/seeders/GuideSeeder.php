<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Guide;
use App\Models\Language;
use App\Models\LanguageLevel;
use App\Models\Certificate;

class GuideSeeder extends Seeder
{
    public function run(): void
    {
        // Lấy ID từ bảng master (đã seed trước)
        $english  = Language::where('name', 'Tiếng Anh')->first();
        $french   = Language::where('name', 'Tiếng Pháp')->first();
        $chinese  = Language::where('name', 'Tiếng Trung')->first();

        $c2 = LanguageLevel::where('language_id', $english->id)->where('level_name', 'C2')->first();
        $b2French = LanguageLevel::where('language_id', $french->id)->where('level_name', 'B2')->first();
        $c1 = LanguageLevel::where('language_id', $english->id)->where('level_name', 'C1')->first();
        $b2Chinese = LanguageLevel::where('language_id', $chinese->id)->where('level_name', 'B2')->first();
        $c1French = LanguageLevel::where('language_id', $french->id)->where('level_name', 'C1')->first();

        $certQuocTe = Certificate::where('name', 'Thẻ HDV Quốc Tế')->first();
        $certNoiDia = Certificate::where('name', 'Thẻ HDV Nội Địa')->first();
        $certSoCuu  = Certificate::where('name', 'Chứng chỉ Sơ Cứu Khẩn Cấp')->first();
        $certIelts  = Certificate::where('name', 'Chứng chỉ Tiếng Anh IELTS 8.0')->first();

        $guidesData = [
            [
                'user_id'          => 3, // Trần Văn Hùng
                'guide_code'       => 'HDV001',
                'certificate_type' => 'Thẻ HDV Quốc Tế',
                'experience_years' => 8,
                'average_rating'   => 4.90,
                'review_count'     => 42,
                'status'           => 'active',
                'languages' => [
                    ['language_id' => $english->id, 'level_id' => $c2->id],
                    ['language_id' => $french->id,  'level_id' => $b2French->id],
                ],
                'experiences' => [
                    ['certificate_id' => $certQuocTe->id, 'issued_year' => 2016],
                    ['certificate_id' => $certSoCuu->id,  'issued_year' => 2022],
                ],
            ],
            [
                'user_id'          => 4, // Nguyễn Thị Mai
                'guide_code'       => 'HDV002',
                'certificate_type' => 'Thẻ HDV Nội Địa',
                'experience_years' => 5,
                'average_rating'   => 4.80,
                'review_count'     => 31,
                'status'           => 'active',
                'languages' => [
                    ['language_id' => $english->id,  'level_id' => $c1->id],
                    ['language_id' => $chinese->id, 'level_id' => $b2Chinese->id],
                ],
                'experiences' => [
                    ['certificate_id' => $certNoiDia->id, 'issued_year' => 2019],
                ],
            ],
            [
                'user_id'          => 5, // Hoàng Văn Đức
                'guide_code'       => 'HDV003',
                'certificate_type' => 'Thẻ HDV Quốc Tế',
                'experience_years' => 10,
                'average_rating'   => 5.00,
                'review_count'     => 56,
                'status'           => 'active',
                'languages' => [
                    ['language_id' => $english->id, 'level_id' => $c2->id],
                    ['language_id' => $french->id,  'level_id' => $c1French->id],
                ],
                'experiences' => [
                    ['certificate_id' => $certQuocTe->id, 'issued_year' => 2014],
                    ['certificate_id' => $certIelts->id,  'issued_year' => 2015],
                ],
            ],
        ];

        foreach ($guidesData as $data) {
            // Xóa guide cũ nếu tồn tại (để seed lại sạch)
            Guide::withTrashed()->where('guide_code', $data['guide_code'])->forceDelete();

            $guide = Guide::create([
                'user_id'          => $data['user_id'],
                'guide_code'       => $data['guide_code'],
                'certificate_type' => $data['certificate_type'],
                'experience_years' => $data['experience_years'],
                'average_rating'   => $data['average_rating'],
                'review_count'     => $data['review_count'],
                'status'           => $data['status'],
            ]);

            foreach ($data['languages'] as $lang) {
                $guide->languages()->create($lang);
            }

            foreach ($data['experiences'] as $exp) {
                $guide->experiences()->create($exp);
            }
        }
    }
}
