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
        Schema::create('tour_refund_outbox', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->restrictOnDelete();
            $table->foreignId('refund_request_id')->constrained('refund_requests')->restrictOnDelete();
            $table->json('payload')->nullable();
            $table->timestamp('processed_at')->nullable()->index();
            $table->timestamp('created_at')->useCurrent();
            $table->unique('refund_request_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tour_refund_outbox');
    }
};
