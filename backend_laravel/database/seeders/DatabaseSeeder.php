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
            ServiceCategorySeeder::class,
            DestinationSeeder::class,
            BannerSeeder::class,
            SettingSeeder::class,
            UserSeeder::class,
            SupportStaffSeeder::class,
            GuideSpecializationSeeder::class,
            LanguageSeeder::class,
            CertificateSeeder::class,

            GuideSeeder::class,
            TourSeeder::class,
            PromotionSeeder::class,
            TourGuideAssignmentSeeder::class,
            GuideReviewSeeder::class,
            TourTestingDataSeeder::class,
            DemoWorkflowSeeder::class,
        ]);
    }
}
