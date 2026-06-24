<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150)->unique(); // Thẻ HDV Quốc Tế, Chứng chỉ Sơ Cứu...
            $table->string('issued_by', 150)->nullable(); // Tổng Cục Du Lịch...
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificates');
    }
};
