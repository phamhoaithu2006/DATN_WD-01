<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->enum('boundary', ['departure', 'return'])
                ->nullable()
                ->after('tour_departure_id');
            $table->unique(['tour_departure_id', 'boundary'], 'attendance_sessions_departure_boundary_unique');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->dropUnique('attendance_sessions_departure_boundary_unique');
            $table->dropColumn('boundary');
        });
    }
};
