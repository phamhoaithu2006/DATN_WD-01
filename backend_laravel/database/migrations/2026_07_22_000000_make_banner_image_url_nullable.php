<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->string('image_url', 500)->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('banners')
            ->whereNull('image_url')
            ->update(['image_url' => '']);

        Schema::table('banners', function (Blueprint $table) {
            $table->string('image_url', 500)->nullable(false)->change();
        });
    }
};
