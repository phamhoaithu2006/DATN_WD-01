<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->string('thumbnail_url', 500)->nullable()->after('description');
            $table->string('thumbnail_alt_text', 255)->nullable()->after('thumbnail_url');
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn(['thumbnail_url', 'thumbnail_alt_text']);
        });
    }
};
