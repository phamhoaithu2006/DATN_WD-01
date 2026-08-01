<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tour_departures', function (Blueprint $table): void {
            $table->timestamp('departure_at')->nullable()->after('departure_date')->index();
            $table->string('cancellation_reason', 100)->nullable()->after('status');
        });

        Schema::table('bookings', function (Blueprint $table): void {
            $table->string('cancellation_reason', 100)->nullable()->after('cancel_reason');
            $table->string('resolution_status', 50)->nullable()->after('cancellation_reason')->index();
            $table->foreignId('source_booking_id')->nullable()->after('tour_departure_id')
                ->constrained('bookings')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('tour_departure_status_histories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tour_departure_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->string('old_status', 50)->nullable();
            $table->string('new_status', 50);
            $table->string('reason', 100)->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });

        Schema::create('tour_finalization_outbox', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tour_departure_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->string('event_type', 100);
            $table->json('payload');
            $table->timestamp('processed_at')->nullable()->index();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['tour_departure_id', 'event_type']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE tour_departures MODIFY status ENUM('open','closed','confirmed','in_progress','completed','cancelled') NOT NULL DEFAULT 'open'");
            DB::statement("ALTER TABLE bookings MODIFY status ENUM('pending','confirmed','departed','completed','cancelled','cancelled_by_tour') NOT NULL DEFAULT 'pending'");
        }

        $departureAtExpression = DB::getDriverName() === 'sqlite'
            ? "departure_date || ' 00:00:00'"
            : "CONCAT(departure_date, ' 00:00:00')";
        DB::table('tour_departures')->whereNull('departure_at')->update([
            'departure_at' => DB::raw($departureAtExpression),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tour_finalization_outbox');
        Schema::dropIfExists('tour_departure_status_histories');
        Schema::table('bookings', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('source_booking_id');
            $table->dropColumn(['cancellation_reason', 'resolution_status']);
        });
        Schema::table('tour_departures', function (Blueprint $table): void {
            $table->dropColumn(['departure_at', 'cancellation_reason']);
        });
    }
};
