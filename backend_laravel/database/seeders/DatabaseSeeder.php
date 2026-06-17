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
            UserSeeder::class,
            SettingSeeder::class,
            BannerSeeder::class,
            CategorySeeder::class,
            DestinationSeeder::class,
            TourSeeder::class,
            GuideSeeder::class,
        ]);
    }
}
