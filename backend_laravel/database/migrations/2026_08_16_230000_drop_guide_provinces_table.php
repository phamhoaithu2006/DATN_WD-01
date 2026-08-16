<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('guide_provinces');
    }

    public function down(): void
    {
        Schema::create('guide_provinces', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('guide_id')->constrained('guides')->cascadeOnDelete();
            $table->foreignId('province_id')->constrained('provinces')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['guide_id', 'province_id']);
        });
    }
};
