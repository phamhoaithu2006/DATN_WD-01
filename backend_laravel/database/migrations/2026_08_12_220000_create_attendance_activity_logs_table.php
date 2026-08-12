<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_session_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('booking_participant_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();
            $table->string('action', 50);
            $table->string('description');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['attendance_session_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_activity_logs');
    }
};
