<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            CategorySeeder::class,
            DestinationSeeder::class,
            BannerSeeder::class,
            SettingSeeder::class,
            UserSeeder::class,
            LanguageSeeder::class,
            CertificateSeeder::class,
            GuideSeeder::class,
            TourSeeder::class,
            BookingSeeder::class,
        ]);
    }
}
