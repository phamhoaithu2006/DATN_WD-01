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
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('description', 255)->nullable();
            $table->timestamps();
        });

        $now = now();

        DB::table('roles')->insertOrIgnore([
            ['name' => 'support staff', 'description' => 'nhân ', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'customer', 'description' => 'Khách hàng', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'tour guide', 'description' => 'Hướng dẫn viên', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'admin', 'description' => 'Quản trị viên', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
