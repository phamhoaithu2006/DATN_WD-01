<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('language_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('language_id')->constrained('languages')->onDelete('cascade');
            $table->string('level_name', 20); // A1, A2, B1, B2, C1, C2, Native
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('language_levels');
    }
};
