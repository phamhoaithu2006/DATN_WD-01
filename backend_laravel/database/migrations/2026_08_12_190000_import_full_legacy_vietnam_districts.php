<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $path = database_path('data/vietnam_admin_legacy_2025.json');
        $provinces = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        $now = now();

        foreach ($provinces as $provinceData) {
            DB::table('provinces')->updateOrInsert(
                ['name' => $provinceData['name']],
                ['code' => $provinceData['code'], 'updated_at' => $now, 'created_at' => $now]
            );

            $provinceId = DB::table('provinces')->where('name', $provinceData['name'])->value('id');

            // Ghép dữ liệu seed thử với tên hành chính đầy đủ để không sinh bản ghi trùng.
            $sourceByShortName = [];
            foreach ($provinceData['districts'] as $district) {
                $shortName = preg_replace('/^(Quận|Huyện|Thị xã|Thành phố)\s+/u', '', $district['name']);
                $sourceByShortName[$shortName][] = $district['name'];
            }
            foreach (DB::table('districts')->where('province_id', $provinceId)->whereNull('code')->get(['id', 'name']) as $existing) {
                $shortName = preg_replace('/^(Quận|Huyện|Thị xã|Thành phố)\s+/u', '', $existing->name);
                if (count($sourceByShortName[$shortName] ?? []) === 1) {
                    DB::table('districts')->where('id', $existing->id)->update(['name' => $sourceByShortName[$shortName][0], 'updated_at' => $now]);
                }
            }

            foreach (array_chunk($provinceData['districts'], 100) as $districtChunk) {
                $rows = array_map(fn (array $district): array => [
                    'province_id' => $provinceId,
                    'name' => $district['name'],
                    'code' => $district['code'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $districtChunk);

                DB::table('districts')->upsert($rows, ['province_id', 'name'], ['code', 'updated_at']);
            }
        }

        // Tự gắn tỉnh cho các điểm đến cũ dựa trên province_city.
        foreach (DB::table('destinations')->get(['id', 'province_city']) as $destination) {
            $provinceId = DB::table('provinces')->where('name', $destination->province_city)->value('id');
            if ($provinceId) {
                DB::table('destination_province')->insertOrIgnore([
                    'destination_id' => $destination->id,
                    'province_id' => $provinceId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        // Gắn district_id cho dữ liệu điểm đến chi tiết cũ khi tên khớp.
        foreach (DB::table('destination_places')->whereNull('district_id')->whereNotNull('district_name')->get(['id', 'destination_id', 'district_name']) as $place) {
            $provinceIds = DB::table('destination_province')->where('destination_id', $place->destination_id)->pluck('province_id');
            $districtId = DB::table('districts')->whereIn('province_id', $provinceIds)->where('name', $place->district_name)->value('id');
            if ($districtId) DB::table('destination_places')->where('id', $place->id)->update(['district_id' => $districtId]);
        }
    }

    public function down(): void
    {
        // Không xóa dữ liệu hành chính khi rollback để tránh làm mất liên kết địa điểm đã tạo.
    }
};
