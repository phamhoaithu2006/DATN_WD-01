<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::table('users', function (Blueprint $table) {
        $table->string('otp')->nullable(); // Lưu mã OTP
        $table->timestamp('otp_expires_at')->nullable(); // Lưu thời gian hết hạn
    });
}

public function down()
{
    Schema::table('users', function (Blueprint $table) {
        $table->dropColumn(['otp', 'otp_expires_at']);
    });
}
};
