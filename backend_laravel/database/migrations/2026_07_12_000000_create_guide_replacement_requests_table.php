<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guide_replacement_requests', function (Blueprint $table) {
            $table->id();

            $table->foreignId('tour_departure_id')
                ->constrained('tour_departures')
                ->cascadeOnDelete();

            $table->foreignId('current_guide_id')
                ->constrained('guides')
                ->cascadeOnDelete();

            $table->foreignId('requested_by')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->text('reason');
            $table->string('evidence_path')->nullable();

            $table->string('status', 30)->default('pending');
            $table->foreignId('replacement_guide_id')
                ->nullable()
                ->constrained('guides')
                ->nullOnDelete();

            $table->foreignId('reviewed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('reviewed_at')->nullable();
            $table->text('admin_note')->nullable();

            $table->timestamps();

            $table->index(['tour_departure_id', 'status']);
            $table->index(['current_guide_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guide_replacement_requests');
    }
};