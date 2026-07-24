<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'support_request_histories',
            function (Blueprint $table) {
                $table->id();

                $table->foreignId('support_request_id')
                    ->constrained('support_requests')
                    ->cascadeOnDelete();

                $table->foreignId('actor_id')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->string('action', 50);

                $table->string('from_status', 30)
                    ->nullable();

                $table->string('to_status', 30)
                    ->nullable();

                $table->text('description')
                    ->nullable();

                $table->json('meta')
                    ->nullable();

                $table->timestamps();

                $table->index([
                    'support_request_id',
                    'created_at',
                ]);
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'support_request_histories'
        );
    }
};