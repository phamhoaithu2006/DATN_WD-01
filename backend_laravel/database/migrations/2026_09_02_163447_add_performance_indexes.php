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
        Schema::table('tours', function (Blueprint $table) {
            $table->index('status');
            $table->index('category_id');
            $table->index('province_id');
        });

        Schema::table('tour_departures', function (Blueprint $table) {
            $table->index('tour_id');
            $table->index('departure_date');
            $table->index('status');
        });

        Schema::table('tour_reviews', function (Blueprint $table) {
            $table->index('tour_id');
            $table->index('rating');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->index('tour_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tours', function (Blueprint $table) {
            $table->dropIndex('tours_status_index');
            $table->dropIndex('tours_category_id_index');
            $table->dropIndex('tours_province_id_index');
        });

        Schema::table('tour_departures', function (Blueprint $table) {
            $table->dropIndex('tour_departures_tour_id_index');
            $table->dropIndex('tour_departures_departure_date_index');
            $table->dropIndex('tour_departures_status_index');
        });

        Schema::table('tour_reviews', function (Blueprint $table) {
            $table->dropIndex('tour_reviews_tour_id_index');
            $table->dropIndex('tour_reviews_rating_index');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('bookings_tour_id_index');
            $table->dropIndex('bookings_status_index');
        });
    }
};
