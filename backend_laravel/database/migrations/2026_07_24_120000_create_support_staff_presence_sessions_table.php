<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'support_staff_presence_sessions',
            function (Blueprint $table) {
                $table->id();

                $table
                    ->foreignId('user_id')
                    ->constrained('users')
                    ->cascadeOnDelete();

                $table->timestamp('started_at');
                $table->timestamp('last_seen_at');
                $table->timestamp('ended_at')->nullable();

                $table
                    ->unsignedBigInteger('duration_seconds')
                    ->default(0);

                $table
                    ->string('ip_address', 45)
                    ->nullable();

                $table
                    ->text('user_agent')
                    ->nullable();

                $table->timestamps();

                $table->index([
                    'user_id',
                    'last_seen_at',
                ]);

                $table->index([
                    'user_id',
                    'ended_at',
                ]);
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'support_staff_presence_sessions'
        );
    }
};