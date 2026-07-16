<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_requests', function (Blueprint $table) {
            $table->id();

            // Mã ticket, ví dụ SUP-20260716-ABC123
            $table->string('ticket_code')->unique();

            // Khách hàng gửi yêu cầu
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Thông tin định danh
            $table->string('full_name');
            $table->string('email');
            $table->string('phone', 20)->nullable();

            // Phân loại
            // technical | payment | account | feedback | general
            $table->string('category', 50);

            // low | medium | high
            $table->string('priority', 20)->default('medium');

            // Nội dung
            $table->string('subject');
            $table->text('description');

            // pending = Chưa hỗ trợ
            // in_progress = Đang hỗ trợ
            // resolved = Đã hỗ trợ
            $table->string('status', 30)->default('pending');

            // Nhân viên đang xử lý
            $table->foreignId('assigned_to')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('resolved_at')->nullable();

            $table->timestamps();

            $table->index('status');
            $table->index('category');
            $table->index('priority');
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_requests');
    }
};
