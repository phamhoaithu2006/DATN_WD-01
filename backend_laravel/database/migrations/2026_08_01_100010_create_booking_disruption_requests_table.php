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
        Schema::create('booking_disruption_requests', function (Blueprint $table) {
            $table->id();

            $table->foreignId('booking_id')
                ->constrained()
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            // refund: hoàn tiền | retain: bảo lưu | transfer: chuyển sang lịch khởi hành khác
            $table->enum('type', ['refund', 'retain', 'transfer']);

            $table->enum('status', ['pending', 'approved', 'rejected'])
                ->default('pending')
                ->index();

            // Lý do khách mô tả (VD: mô tả tình huống mưa bão)
            $table->text('reason')->nullable();

            // Chỉ dùng khi type = transfer
            $table->foreignId('requested_tour_departure_id')
                ->nullable()
                ->constrained('tour_departures')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->text('admin_note')->nullable();

            $table->foreignId('processed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->timestamp('processed_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_disruption_requests');
    }
};
