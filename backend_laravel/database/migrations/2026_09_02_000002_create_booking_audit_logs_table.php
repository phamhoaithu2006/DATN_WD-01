<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('booking_id')->nullable()->constrained('bookings')->nullOnDelete()->cascadeOnUpdate();
            $table->string('booking_code', 50)->index();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->string('actor_name', 150)->nullable();
            $table->string('action', 60)->index();
            $table->string('status_before', 50)->nullable();
            $table->string('status_after', 50)->nullable();
            $table->string('payment_status_before', 50)->nullable();
            $table->string('payment_status_after', 50)->nullable();
            $table->text('reason')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['booking_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_audit_logs');
    }
};
