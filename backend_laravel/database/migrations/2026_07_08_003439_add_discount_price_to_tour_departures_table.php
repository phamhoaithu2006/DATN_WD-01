<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tour_departures', function (Blueprint $table) {
            $table->decimal('discount_price', 15, 2)
                ->nullable()
                ->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('tour_departures', function (Blueprint $table) {
            $table->dropColumn('discount_price');
        });
    }
};