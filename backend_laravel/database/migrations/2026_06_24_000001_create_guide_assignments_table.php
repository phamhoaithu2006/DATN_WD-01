<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guide_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guide_id')->constrained('guides')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('tour_departure_id')->constrained('tour_departures')->cascadeOnDelete()->cascadeOnUpdate();
            $table->enum('status', ['assigned', 'accepted', 'completed', 'cancelled'])->default('assigned')->index();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();

            $table->unique(['guide_id', 'tour_departure_id']);
            $table->index(['guide_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guide_assignments');
    }
};
