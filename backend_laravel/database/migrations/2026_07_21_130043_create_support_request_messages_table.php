<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_request_messages', function (Blueprint $table) {
            $table->id();

            $table->foreignId('support_request_id')
                ->constrained('support_requests')
                ->cascadeOnDelete();

            $table->foreignId('sender_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->enum('sender_type', [
                'customer',
                'support_staff',
                'system',
            ])->default('system');

            $table->text('message')->nullable();

            $table->timestamps();

            $table->index([
                'support_request_id',
                'created_at',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_request_messages');
    }
};