<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $provinces = json_decode(
            (string) file_get_contents(database_path('data/vietnam_admin_legacy_2025.json')),
            true,
            512,
            JSON_THROW_ON_ERROR
        );
        $now = now();

        foreach ($provinces as $provinceData) {
            $provinceId = DB::table('provinces')->where('code', $provinceData['code'])->value('id');
            foreach ($provinceData['districts'] as $districtData) {
                $existing = DB::table('districts')
                    ->where('province_id', $provinceId)
                    ->where('code', $districtData['code'])
                    ->first();

                if ($existing) {
                    DB::table('districts')->where('id', $existing->id)->update([
                        'name' => $districtData['name'],
                        'updated_at' => $now,
                    ]);
                } else {
                    DB::table('districts')->insert([
                        'province_id' => $provinceId,
                        'name' => $districtData['name'],
                        'code' => $districtData['code'],
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        // Giữ dữ liệu vì destination_places có thể đã tham chiếu các bản ghi này.
    }
};
