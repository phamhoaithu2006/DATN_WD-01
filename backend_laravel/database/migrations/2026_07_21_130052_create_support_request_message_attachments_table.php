<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'support_request_message_attachments',
            function (Blueprint $table) {
                $table->id();

                // Tạo cột khóa ngoại
                $table->unsignedBigInteger(
                    'support_request_message_id'
                );

                $table->string(
                    'original_name'
                );

                $table->string(
                    'file_path'
                );

                $table->string(
                    'mime_type'
                )->nullable();

                $table->unsignedBigInteger(
                    'size'
                )->nullable();

                $table->timestamps();

                /*
                 * Đặt tên foreign key ngắn thủ công.
                 * Nếu để Laravel tự tạo tên sẽ vượt quá
                 * giới hạn 64 ký tự của MySQL.
                 */
                $table->foreign(
                    'support_request_message_id',
                    'srm_attachment_message_fk'
                )
                    ->references('id')
                    ->on('support_request_messages')
                    ->cascadeOnDelete();
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'support_request_message_attachments'
        );
    }
};