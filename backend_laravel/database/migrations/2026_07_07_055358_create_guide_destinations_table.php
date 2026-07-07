<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('guide_destinations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('guide_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('destination_id')
                ->constrained()
                ->restrictOnDelete();

            $table->timestamps();

            $table->unique(['guide_id', 'destination_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guide_destinations');
    }
};