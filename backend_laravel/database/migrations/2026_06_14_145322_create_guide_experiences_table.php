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
        Schema::create('guide_experiences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guide_id')->constrained('guides')->onDelete('cascade');
            $table->string('certificate_name', 150); // Thẻ HDV Quốc Tế, Chứng chỉ Sơ Cứu...
            $table->string('issued_by', 150)->nullable(); // Tổng Cục Du Lịch, Hội Chữ Thập Đỏ...
            $table->year('issued_year')->nullable(); // 2016, 2022...
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('guide_experiences');
    }
};
