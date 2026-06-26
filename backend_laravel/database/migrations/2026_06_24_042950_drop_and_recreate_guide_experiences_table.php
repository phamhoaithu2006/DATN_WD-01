<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('guide_experiences');

        Schema::create('guide_experiences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guide_id')->constrained('guides')->onDelete('cascade');
            $table->foreignId('certificate_id')->constrained('certificates')->onDelete('cascade');
            $table->year('issued_year')->nullable();
            $table->timestamps();

            $table->unique(['guide_id', 'certificate_id']); // mỗi HDV không lặp chứng chỉ
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guide_experiences');
    }
};
