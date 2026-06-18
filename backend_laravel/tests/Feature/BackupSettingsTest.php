<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    createBackupFeatureSchema();
});

test('admin can save backup settings', function () {
    Sanctum::actingAs(createBackupFeatureUser('admin'));

    $response = $this->putJson('/api/admin/settings', [
        'auto_backup_enabled' => true,
        'backup_frequency' => 'daily',
        'backup_time' => '02:00',
        'backup_retention_days' => 7,
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('data.backup_frequency', 'daily')
        ->assertJsonPath('data.backup_time', '02:00')
        ->assertJsonPath('data.backup_retention_days', '7');

    $this->assertDatabaseHas('settings', [
        'key' => 'auto_backup_enabled',
        'group' => 'backup',
    ]);
});

test('backup settings are validated', function () {
    Sanctum::actingAs(createBackupFeatureUser('admin'));

    $this->putJson('/api/admin/settings', [
        'backup_frequency' => 'yearly',
        'backup_time' => '25:00',
        'backup_retention_days' => 0,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors([
            'backup_frequency',
            'backup_time',
            'backup_retention_days',
        ]);
});

function createBackupFeatureSchema(): void
{
    Schema::dropIfExists('settings');
    Schema::dropIfExists('users');
    Schema::dropIfExists('roles');

    Schema::create('roles', function (Blueprint $table) {
        $table->id();
        $table->string('name')->unique();
        $table->string('description')->nullable();
        $table->timestamps();
    });

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->foreignId('role_id');
        $table->string('full_name');
        $table->string('email')->unique();
        $table->timestamp('email_verified_at')->nullable();
        $table->string('password');
        $table->string('phone')->nullable();
        $table->string('avatar_url')->nullable();
        $table->string('status')->default('active');
        $table->rememberToken();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('settings', function (Blueprint $table) {
        $table->id();
        $table->string('key')->unique();
        $table->longText('value')->nullable();
        $table->string('group')->default('general');
        $table->timestamps();
    });
}

function createBackupFeatureUser(string $roleName): User
{
    $role = Role::query()->create([
        'name' => $roleName,
        'description' => $roleName,
    ]);

    return User::query()->create([
        'role_id' => $role->id,
        'full_name' => 'Test '.$roleName,
        'email' => $roleName.'@vivugo.test',
        'password' => 'password',
        'status' => 'active',
    ]);
}
