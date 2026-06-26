<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Certificate;

class CertificateSeeder extends Seeder
{
    public function run(): void
    {
        $certificates = [
            ['name' => 'Thẻ HDV Quốc Tế',               'issued_by' => 'Tổng Cục Du Lịch Việt Nam'],
            ['name' => 'Thẻ HDV Nội Địa',                'issued_by' => 'Tổng Cục Du Lịch Việt Nam'],
            ['name' => 'Chứng chỉ Sơ Cứu Khẩn Cấp',     'issued_by' => 'Hội Chữ Thập Đỏ Việt Nam'],
            ['name' => 'Chứng chỉ Tiếng Anh IELTS 8.0',  'issued_by' => 'British Council'],
            ['name' => 'Chứng chỉ Nghiệp vụ Du lịch',    'issued_by' => 'Trường Cao đẳng Du lịch Hà Nội'],
            ['name' => 'Chứng chỉ Hướng dẫn viên Mạo hiểm', 'issued_by' => 'Liên đoàn Thể thao mạo hiểm'],
        ];

        foreach ($certificates as $cert) {
            Certificate::firstOrCreate(
                ['name' => $cert['name']],
                ['issued_by' => $cert['issued_by']]
            );
        }
    }
}
