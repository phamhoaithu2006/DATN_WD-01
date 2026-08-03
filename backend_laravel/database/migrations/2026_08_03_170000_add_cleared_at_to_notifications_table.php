<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table): void {
            $table->timestamp('cleared_at')->nullable()->after('read_at')->index();
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table): void {
            $table->dropIndex(['cleared_at']);
            $table->dropColumn('cleared_at');
        });
    }
};
