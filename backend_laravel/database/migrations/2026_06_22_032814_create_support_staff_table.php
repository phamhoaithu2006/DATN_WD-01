<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('support_staff', function (Blueprint $table) { 
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('role'); // Ví dụ: technical, customer_service, billing
            $table->string('status')->default('active'); // active, inactive, hidden
            $table->decimal('performance_rating', 3, 2)->default(5.00); // Điểm hiệu suất (VD: 4.50)
            $table->timestamp('hidden_at')->nullable();
            $table->softDeletes(); // Tính năng Soft Delete phục vụ đồ án 
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('support_staff');
    }
};
