<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('destination_places', function (Blueprint $table) {
            $table->string('district_name', 150)->nullable()->after('slug')->index();
        });
    }

    public function down(): void
    {
        Schema::table('destination_places', function (Blueprint $table) {
            $table->dropIndex(['district_name']);
            $table->dropColumn('district_name');
        });
    }
};
