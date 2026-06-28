<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guide_specialization', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guide_id')->constrained('guides')->onDelete('cascade');
            $table->foreignId('specialization_id')->constrained('guide_specializations')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['guide_id', 'specialization_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guide_specialization');
    }
};
