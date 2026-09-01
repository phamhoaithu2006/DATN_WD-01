<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table): void {
            $table->softDeletes();
        });

        Schema::table('payments', function (Blueprint $table): void {
            $table->string('refund_proof_path')->nullable()->after('paid_at');
            $table->timestamp('refunded_at')->nullable()->after('refund_proof_path');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            $table->dropColumn(['refund_proof_path', 'refunded_at']);
        });

        Schema::table('bookings', function (Blueprint $table): void {
            $table->dropSoftDeletes();
        });
    }
};
