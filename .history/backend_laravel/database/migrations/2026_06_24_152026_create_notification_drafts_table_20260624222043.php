<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_drafts', function (Blueprint $table) {
            $table->id();
            $table->string('title'); // Tiêu đề thông báo
            $table->text('message'); // Nội dung chi tiết
            
            // Loại đối tượng gửi: 'all', 'role', hoặc 'specific'
            $table->string('target_type'); 
            
            // Lưu mảng ID dưới dạng JSON (Ví dụ: [1, 5, 10] hoặc [2, 3])
            $table->json('target_ids')->nullable(); 
            
            // Trạng thái để quản lý nháp và đã gửi
            $table->enum('status', ['draft', 'sent'])->default('draft');
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_drafts');
    }
};