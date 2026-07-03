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
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('id');
            $table->string('full_name', 150)->nullable()->after('role_id');
            $table->string('phone', 20)->nullable()->after('email');
            $table->string('avatar_url', 500)->nullable()->after('password');
            $table->enum('status', ['active', 'locked', 'inactive'])->default('active')->after('avatar_url')->index();
            $table->softDeletes();
        });

        $customerRoleId = DB::table('roles')->where('name', 'customer')->value('id');

        if ($customerRoleId !== null) {
            DB::table('users')->whereNull('role_id')->update(['role_id' => $customerRoleId]);
        }

        DB::statement('UPDATE users SET full_name = COALESCE(NULLIF(full_name, ""), email) WHERE full_name IS NULL OR full_name = ""');

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE users MODIFY role_id BIGINT UNSIGNED NOT NULL');
            DB::statement('ALTER TABLE users MODIFY full_name VARCHAR(150) NOT NULL');
            DB::statement('ALTER TABLE users MODIFY email VARCHAR(150) NOT NULL');
        }

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('role_id')->references('id')->on('roles')->restrictOnDelete()->cascadeOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropIndex(['status']);
            $table->dropSoftDeletes();
            $table->dropColumn(['role_id', 'full_name', 'phone', 'avatar_url', 'status']);
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE users MODIFY email VARCHAR(255) NOT NULL');
        }
    }
};
