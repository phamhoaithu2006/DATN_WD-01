<?php

namespace Database\Seeders;

use App\Models\Certificate;
use Illuminate\Database\Seeder;

class CertificateSeeder extends Seeder
{
    public function run(): void
    {
        $certificates = [
            ['name' => 'Thẻ hướng dẫn viên du lịch nội địa', 'issued_by' => 'Cục Du lịch Quốc gia Việt Nam'],
            ['name' => 'Thẻ hướng dẫn viên du lịch quốc tế', 'issued_by' => 'Cục Du lịch Quốc gia Việt Nam'],
            ['name' => 'Thẻ hướng dẫn viên du lịch tại điểm', 'issued_by' => 'Sở Du lịch'],
            ['name' => 'Chứng chỉ nghiệp vụ hướng dẫn du lịch', 'issued_by' => 'Cơ sở đào tạo du lịch'],
            ['name' => 'Chứng chỉ sơ cứu, cấp cứu', 'issued_by' => 'Hội Chữ thập đỏ Việt Nam'],
            ['name' => 'Chứng chỉ an toàn du lịch', 'issued_by' => 'Sở Du lịch'],
            ['name' => 'Chứng chỉ du lịch bền vững', 'issued_by' => 'Cơ sở đào tạo du lịch'],
            ['name' => 'Chứng chỉ nghiệp vụ lữ hành', 'issued_by' => 'Cơ sở đào tạo du lịch'],
        ];

        foreach ($certificates as $certificate) {
            Certificate::query()->updateOrCreate(
                ['name' => $certificate['name']],
                ['issued_by' => $certificate['issued_by']],
            );
        }
    }
}
