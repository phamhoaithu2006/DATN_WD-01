<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->dropUnique('attendance_sessions_departure_boundary_unique');
            $table->foreignId('tour_itinerary_id')
                ->nullable()
                ->after('tour_departure_id')
                ->constrained('tour_itineraries')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->date('scheduled_date')->nullable()->after('tour_itinerary_id')->index();
            $table->unique(
                ['tour_departure_id', 'tour_itinerary_id'],
                'attendance_sessions_departure_itinerary_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->dropUnique('attendance_sessions_departure_itinerary_unique');
            $table->dropConstrainedForeignId('tour_itinerary_id');
            $table->dropColumn('scheduled_date');
            $table->unique(
                ['tour_departure_id', 'boundary'],
                'attendance_sessions_departure_boundary_unique'
            );
        });
    }
};
