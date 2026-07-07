<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tour_departures', function (Blueprint $table) {
            $table->decimal('base_price', 12, 2)->nullable()->after('price');
            $table->decimal('discount_price', 12, 2)->nullable()->after('base_price');
        });

        DB::table('tour_departures')
            ->whereNotNull('price')
            ->whereNull('base_price')
            ->update([
                'base_price' => DB::raw('price'),
            ]);
    }

    public function down(): void
    {
        Schema::table('tour_departures', function (Blueprint $table) {
            $table->dropColumn(['base_price', 'discount_price']);
        });
    }
};
