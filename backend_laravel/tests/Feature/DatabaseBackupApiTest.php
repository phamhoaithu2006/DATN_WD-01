<?php

use App\Models\Role;
use App\Models\User;
use App\Services\DatabaseBackupService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    createDatabaseBackupApiSchema();
});

afterEach(function () {
    File::delete(storage_path('app/backups/vivugo-backup-20260101-010101.sql'));
});

test('backup APIs require authentication', function () {
    $this->getJson('/api/admin/backups')->assertUnauthorized();
});

test('backup APIs require admin role', function () {
    Sanctum::actingAs(createDatabaseBackupApiUser('customer'));

    $this->getJson('/api/admin/backups')->assertForbidden();
});

test('admin can list download and delete backup files', function () {
    Sanctum::actingAs(createDatabaseBackupApiUser('admin'));

    File::ensureDirectoryExists(storage_path('app/backups'));
    File::put(storage_path('app/backups/vivugo-backup-20260101-010101.sql'), '-- backup');

    $this->getJson('/api/admin/backups')
        ->assertOk()
        ->assertJsonPath('data.0.filename', 'vivugo-backup-20260101-010101.sql');

    $this->get('/api/admin/backups/vivugo-backup-20260101-010101.sql/download')
        ->assertOk();

    $this->deleteJson('/api/admin/backups/vivugo-backup-20260101-010101.sql')
        ->assertOk();

    expect(File::exists(storage_path('app/backups/vivugo-backup-20260101-010101.sql')))->toBeFalse();
});

test('admin cannot access invalid backup filenames', function () {
    Sanctum::actingAs(createDatabaseBackupApiUser('admin'));

    $this->getJson('/api/admin/backups/not-a-backup.sql/download')
        ->assertNotFound();
});

test('admin can create a manual backup', function () {
    Sanctum::actingAs(createDatabaseBackupApiUser('admin'));

    $service = Mockery::mock(DatabaseBackupService::class);
    $service->shouldReceive('createBackup')
        ->once()
        ->andReturn([
            'filename' => 'vivugo-backup-20260101-010101.sql',
            'size' => 100,
            'created_at' => '2026-01-01T01:01:01+00:00',
        ]);
    $service->shouldReceive('pruneOldBackups')
        ->once()
        ->with(7)
        ->andReturn(0);

    app()->instance(DatabaseBackupService::class, $service);

    $this->postJson('/api/admin/backups')
        ->assertCreated()
        ->assertJsonPath('data.filename', 'vivugo-backup-20260101-010101.sql');
});

function createDatabaseBackupApiSchema(): void
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

function createDatabaseBackupApiUser(string $roleName): User
{
    $role = Role::query()->create([
        'name' => $roleName,
        'description' => $roleName,
    ]);

    return User::query()->create([
        'role_id' => $role->id,
        'full_name' => 'Test '.$roleName,
        'email' => $roleName.'-backup@vivugo.test',
        'password' => 'password',
        'status' => 'active',
    ]);
}
