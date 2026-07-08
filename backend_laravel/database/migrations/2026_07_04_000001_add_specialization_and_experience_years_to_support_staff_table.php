<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_staff', function (Blueprint $table) {
            $table->string('specialization', 50)->nullable()->after('role');
            $table->unsignedInteger('experience_years')->default(0)->after('specialization');
        });
    }

    public function down(): void
    {
        Schema::table('support_staff', function (Blueprint $table) {
            $table->dropColumn(['specialization', 'experience_years']);
        });
    }
};
