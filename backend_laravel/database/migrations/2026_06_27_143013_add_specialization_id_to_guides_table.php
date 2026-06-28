<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guides', function (Blueprint $table) {
            // Thêm cột mới
            $table->foreignId('specialization_id')
                ->nullable()
                ->after('guide_code')
                ->constrained('guide_specializations')
                ->onDelete('set null');

            // Xóa cột cũ
            $table->dropColumn('certificate_type');
        });
    }

    public function down(): void
    {
        Schema::table('guides', function (Blueprint $table) {
            $table->dropForeign(['specialization_id']);
            $table->dropColumn('specialization_id');
            $table->string('certificate_type', 100)->nullable();
        });
    }
};
