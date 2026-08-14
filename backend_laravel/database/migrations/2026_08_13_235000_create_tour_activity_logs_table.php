<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tour_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tour_id')->nullable()->constrained('tours')->nullOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 50)->index();
            $table->string('tour_title');
            $table->text('description');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['tour_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tour_activity_logs');
    }
};
