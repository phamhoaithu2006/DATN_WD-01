<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            CategorySeeder::class,
            DestinationSeeder::class,
            BannerSeeder::class,
            SettingSeeder::class,
            UserSeeder::class,
            GuideSpecializationSeeder::class,
            LanguageSeeder::class,
            CertificateSeeder::class,
            GuideSeeder::class,
            TourSeeder::class,
            TourGuideAssignmentSeeder::class,
            BookingSeeder::class,
            PartnerSeeder::class,
            PromotionSeeder::class,
            PartnerServiceSeeder::class,
        ]);
    }
}
