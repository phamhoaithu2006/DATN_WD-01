<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $indexExists = DB::table('information_schema.statistics')
            ->where('table_schema', DB::getDatabaseName())
            ->where('table_name', 'bookings')
            ->where('index_name', 'bookings_booking_code_unique')
            ->exists();

        if (! $indexExists) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->unique('booking_code', 'bookings_booking_code_unique');
            });
        }
    }

    public function down(): void
    {
        $indexExists = DB::table('information_schema.statistics')
            ->where('table_schema', DB::getDatabaseName())
            ->where('table_name', 'bookings')
            ->where('index_name', 'bookings_booking_code_unique')
            ->exists();

        if ($indexExists) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->dropUnique('bookings_booking_code_unique');
            });
        }
    }
};