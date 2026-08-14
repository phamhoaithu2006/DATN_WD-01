<?php

namespace Database\Seeders;

use App\Models\DestinationPlace;
use App\Models\Province;
use App\Models\TourItinerary;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProvinceDestinationPlaceSeeder extends Seeder
{
    public function run(): void
    {
        Province::query()
            ->orderBy('id')
            ->each(function (Province $province): void {
                if ($province->places()->exists()) {
                    return;
                }

                $place = DestinationPlace::query()->create([
                    'province_id' => $province->id,
                    'name' => "Điểm du lịch tiêu biểu {$province->name}",
                    'slug' => Str::slug("diem-du-lich-tieu-bieu-{$province->name}").'-'.$province->id,
                    'address' => $province->name,
                    'description' => "Địa điểm du lịch mẫu của {$province->name}, dùng để xây dựng lịch trình tour theo tỉnh/thành phố.",
                    'status' => 'active',
                ]);

                $place->activityTypeLinks()->create([
                    'activity_type' => TourItinerary::ACTIVITY_SIGHTSEEING,
                ]);
            });
    }
}
