<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('guide_languages');

        Schema::create('guide_languages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guide_id')->constrained('guides')->onDelete('cascade');
            $table->foreignId('language_id')->constrained('languages')->onDelete('cascade');
            $table->foreignId('level_id')->nullable()->constrained('language_levels')->onDelete('set null');
            $table->timestamps();

            $table->unique(['guide_id', 'language_id']); // mỗi HDV không lặp ngôn ngữ
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guide_languages');
    }
};
