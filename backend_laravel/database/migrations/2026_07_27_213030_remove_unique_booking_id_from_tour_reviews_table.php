<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tour_reviews', function (Blueprint $table) {
            $table->index('booking_id', 'tour_reviews_booking_id_index');
        });

        Schema::table('tour_reviews', function (Blueprint $table) {
            $table->dropUnique('tour_reviews_booking_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('tour_reviews', function (Blueprint $table) {
            $table->unique('booking_id', 'tour_reviews_booking_id_unique');
        });

        Schema::table('tour_reviews', function (Blueprint $table) {
            $table->dropIndex('tour_reviews_booking_id_index');
        });
    }
};
