<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->foreignId('guide_id')
                ->nullable()
                ->after('booking_id')
                ->constrained('guides')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->foreignId('tour_departure_id')
                ->nullable()
                ->after('guide_id')
                ->constrained('tour_departures')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->unique(['booking_id', 'guide_id'], 'reviews_booking_guide_unique');
            $table->index(['guide_id', 'status'], 'reviews_guide_status_index');
            $table->index('tour_departure_id', 'reviews_tour_departure_id_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropUnique('reviews_booking_guide_unique');
            $table->dropIndex('reviews_guide_status_index');
            $table->dropIndex('reviews_tour_departure_id_index');
            $table->dropConstrainedForeignId('guide_id');
            $table->dropConstrainedForeignId('tour_departure_id');
        });
    }
};
