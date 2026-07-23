<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_conversations', function (Blueprint $table) {
            // 'ai' = AI đang trả lời, 'pending_human' = khách đang chờ nhân viên,
            // 'human' = nhân viên đang xử lý
            $table->enum('mode', ['ai', 'pending_human', 'human'])
                ->default('ai')
                ->after('user_id');

            $table->foreignId('assigned_staff_id')
                ->nullable()
                ->after('mode')
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('handoff_requested_at')->nullable()->after('assigned_staff_id');
            $table->timestamp('handoff_closed_at')->nullable()->after('handoff_requested_at');

            // Đếm số lần AI trả lời fallback liên tiếp -> dùng để tự động gợi ý gặp nhân viên
            $table->unsignedTinyInteger('consecutive_fallback_count')->default(0)->after('handoff_closed_at');
        });

        Schema::table('chat_messages', function (Blueprint $table) {
            // Mở rộng role để có thêm 'staff' (nhân viên gõ trực tiếp)
            DB::statement("ALTER TABLE chat_messages MODIFY role ENUM('user', 'assistant', 'staff') NOT NULL");
        });
    }

    public function down(): void
    {
        Schema::table('chat_conversations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('assigned_staff_id');
            $table->dropColumn(['mode', 'handoff_requested_at', 'handoff_closed_at', 'consecutive_fallback_count']);
        });

        DB::statement("ALTER TABLE chat_messages MODIFY role ENUM('user', 'assistant') NOT NULL");
    }
};
