<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->string('kind', 50)->nullable();
            $table->foreignId('support_request_id')->nullable()
                ->constrained('support_requests')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeign(['support_request_id']);
            $table->dropColumn(['kind', 'support_request_id']);
        });
    }
};
