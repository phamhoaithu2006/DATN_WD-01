<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! $this->indexExists()) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->unique('booking_code', 'bookings_booking_code_unique');
            });
        }
    }

    public function down(): void
    {
        if ($this->indexExists()) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->dropUnique('bookings_booking_code_unique');
            });
        }
    }

    private function indexExists(): bool
    {
        if (DB::getDriverName() === 'sqlite') {
            return collect(DB::select("PRAGMA index_list('bookings')"))
                ->contains(fn (object $index): bool => $index->name === 'bookings_booking_code_unique');
        }

        return DB::table('information_schema.statistics')
            ->where('table_schema', DB::getDatabaseName())
            ->where('table_name', 'bookings')
            ->where('index_name', 'bookings_booking_code_unique')
            ->exists();
    }
};
