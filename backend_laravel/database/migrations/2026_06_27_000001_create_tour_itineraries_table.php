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
        Schema::create('tour_itineraries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tour_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->unsignedInteger('day_number');
            $table->unsignedInteger('sort_order')->default(0);
            $table->enum('type', [
                'departure',
                'transport',
                'sightseeing',
                'meal',
                'free_time',
                'return',
            ])->default('sightseeing')->index();
            $table->string('title', 255);
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('duration', 100)->nullable();
            $table->string('transport', 255)->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['tour_id', 'day_number', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tour_itineraries');
    }
};
