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
    Schema::table('notifications', function (Blueprint $table) {
        // Ví dụ: Bạn muốn thêm cột mới hoặc thay đổi kiểu dữ liệu
        // Nếu muốn đổi kiểu dữ liệu, hãy cài thêm package 'doctrine/dbal'
        // composer require doctrine/dbal
        
        // Ví dụ: Thêm cột 'status' nếu chưa có
        $table->string('status')->default('unread'); 
        
        // Ví dụ: Thay đổi độ dài của title
        $table->string('title', 500)->change(); 
    });
}

public function down(): void
{
    Schema::table('notifications', function (Blueprint $table) {
        $table->dropColumn('status');
    });
}
};
