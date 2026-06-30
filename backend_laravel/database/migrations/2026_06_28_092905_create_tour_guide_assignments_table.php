<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tour_guide_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guide_id')
                ->constrained('guides')
                ->onDelete('cascade');
            $table->foreignId('tour_departure_id')
                ->constrained('tour_departures')
                ->onDelete('cascade');
            $table->enum('status', ['assigned', 'confirmed', 'completed', 'cancelled'])
                ->default('assigned');
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique(['guide_id', 'tour_departure_id']);
            $table->index('guide_id');
            $table->index('tour_departure_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tour_guide_assignments');
    }
};
