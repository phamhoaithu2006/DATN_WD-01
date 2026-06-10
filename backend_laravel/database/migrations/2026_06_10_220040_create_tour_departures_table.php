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
        Schema::create('tour_departures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tour_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->date('departure_date')->index();
            $table->date('return_date')->nullable();
            $table->decimal('price', 12, 2)->nullable();
            $table->unsignedInteger('total_slots');
            $table->unsignedInteger('booked_slots')->default(0);
            $table->enum('status', ['open', 'closed', 'completed', 'cancelled'])->default('open')->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tour_departures');
    }
};
