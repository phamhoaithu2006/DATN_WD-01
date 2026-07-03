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
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tour_departure_id')->constrained('tour_departures')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 150);
            $table->text('note')->nullable();
            $table->enum('status', ['active', 'closed'])->default('active')->index();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();
            $table->timestamps();

            $table->index(['tour_departure_id', 'created_at']);
        });

        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_session_id')->constrained('attendance_sessions')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('booking_participant_id')->constrained('booking_participants')->cascadeOnDelete()->cascadeOnUpdate();
            $table->timestamp('checked_in_at')->nullable();
            $table->foreignId('checked_in_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamp('checked_out_at')->nullable();
            $table->foreignId('checked_out_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->enum('status', ['not_checked_in', 'checked_in', 'absent', 'checked_out'])->default('not_checked_in')->index();
            $table->text('note')->nullable();
            $table->foreignId('note_updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamps();

            $table->unique(['attendance_session_id', 'booking_participant_id'], 'attendances_session_participant_unique');
            $table->index(['booking_participant_id', 'status']);
        });

        Schema::create('tour_departure_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tour_departure_id')->constrained('tour_departures')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('tour_itinerary_id')->nullable()->constrained('tour_itineraries')->nullOnDelete()->cascadeOnUpdate();
            $table->unsignedInteger('day_number');
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('type', 50)->nullable();
            $table->string('title', 255);
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending')->index();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['tour_departure_id', 'tour_itinerary_id'], 'departure_stage_itinerary_unique');
            $table->index(['tour_departure_id', 'day_number', 'sort_order'], 'td_stages_departure_day_sort_idx');
        });

        Schema::table('tour_departures', function (Blueprint $table) {
            $table->foreignId('current_stage_id')
                ->nullable()
                ->after('status')
                ->constrained('tour_departure_stages')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tour_departures', function (Blueprint $table) {
            $table->dropConstrainedForeignId('current_stage_id');
        });

        Schema::dropIfExists('tour_departure_stages');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('attendance_sessions');
    }
};
