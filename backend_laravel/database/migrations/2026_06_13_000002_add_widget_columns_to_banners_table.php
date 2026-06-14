<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->string('display_title', 255)->nullable()->after('title');
            $table->enum('type', ['image', 'html'])->default('image')->after('display_title')->index();
            $table->longText('html_content')->nullable()->after('image_url');
            $table->json('display_pages')->nullable()->after('position');
        });
    }

    public function down(): void
    {
        Schema::table('banners', function (Blueprint $table) {
            $table->dropColumn([
                'display_title',
                'type',
                'html_content',
                'display_pages',
            ]);
        });
    }
};
