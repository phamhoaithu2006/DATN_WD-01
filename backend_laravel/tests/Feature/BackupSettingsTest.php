<?php

use App\Models\Role;
use App\Models\Setting;
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

test('admin can save security and locale settings', function () {
    Sanctum::actingAs(createBackupFeatureUser('admin'));

    $response = $this->putJson('/api/admin/settings', [
        'password_min_length' => 10,
        'require_2fa' => true,
        'session_timeout_minutes' => 45,
        'allow_remember_login' => false,
        'default_language' => 'vi',
        'timezone' => 'Asia/Ho_Chi_Minh',
        'date_format' => 'dd/mm/yyyy',
        'currency' => 'VND',
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('data.password_min_length', '10')
        ->assertJsonPath('data.require_2fa', '1')
        ->assertJsonPath('data.session_timeout_minutes', '45')
        ->assertJsonPath('data.allow_remember_login', '0')
        ->assertJsonPath('data.default_language', 'vi')
        ->assertJsonPath('data.timezone', 'Asia/Ho_Chi_Minh')
        ->assertJsonPath('data.date_format', 'dd/mm/yyyy')
        ->assertJsonPath('data.currency', 'VND');

    $this->assertDatabaseHas('settings', [
        'key' => 'require_2fa',
        'group' => 'security',
    ]);

    $this->assertDatabaseHas('settings', [
        'key' => 'currency',
        'group' => 'locale',
    ]);
});

test('security and locale settings are validated', function () {
    Sanctum::actingAs(createBackupFeatureUser('admin'));

    $this->putJson('/api/admin/settings', [
        'password_min_length' => 4,
        'session_timeout_minutes' => 10,
        'default_language' => 'jp',
        'timezone' => 'Europe/Paris',
        'date_format' => 'd-m-Y',
        'currency' => 'JPY',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors([
            'password_min_length',
            'session_timeout_minutes',
            'default_language',
            'timezone',
            'date_format',
            'currency',
        ]);
});

test('public settings do not expose security configuration', function () {
    Setting::query()->create([
        'key' => 'require_2fa',
        'value' => '1',
        'group' => 'security',
    ]);

    Setting::query()->create([
        'key' => 'currency',
        'value' => 'VND',
        'group' => 'locale',
    ]);

    $this->getJson('/api/settings/public')
        ->assertOk()
        ->assertJsonPath('data.currency', 'VND')
        ->assertJsonMissingPath('data.require_2fa');
});

test('password minimum setting is used when changing password', function () {
    $user = createBackupFeatureUser('customer');
    Sanctum::actingAs($user);

    Setting::query()->create([
        'key' => 'password_min_length',
        'value' => '10',
        'group' => 'security',
    ]);

    $this->putJson('/api/profile/change-password', [
        'current_password' => 'password',
        'new_password' => 'Short123',
        'new_password_confirmation' => 'Short123',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('new_password');

    $this->putJson('/api/profile/change-password', [
        'current_password' => 'password',
        'new_password' => 'Longpass123',
        'new_password_confirmation' => 'Longpass123',
    ])->assertOk();
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
