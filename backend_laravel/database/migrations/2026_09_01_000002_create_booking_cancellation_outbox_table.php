<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_cancellation_outbox', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('booking_id')
                ->unique()
                ->constrained()
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->string('recipient_email', 255);
            $table->json('payload');
            $table->timestamp('processed_at')->nullable()->index();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_cancellation_outbox');
    }
};
