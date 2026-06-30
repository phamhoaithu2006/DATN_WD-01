<?php

use App\Models\PartnerServiceType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    Schema::dropIfExists('partners');
    Schema::dropIfExists('partner_service_types');
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

    Schema::create('partner_service_types', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('slug')->unique();
        $table->timestamps();
    });

    Schema::create('partners', function (Blueprint $table) {
        $table->id();
        $table->foreignId('service_type_id');
        $table->string('partner_code', 20)->unique()->nullable();
        $table->string('name', 150);
        $table->string('contact_person', 100)->nullable();
        $table->string('phone', 20)->nullable();
        $table->string('email', 150)->nullable();
        $table->string('address', 255)->nullable();
        $table->string('website', 255)->nullable();
        $table->text('description')->nullable();
        $table->string('logo_url', 500)->nullable();
        $table->decimal('average_rating', 3, 1)->default(0);
        $table->date('contract_start')->nullable();
        $table->date('contract_end')->nullable();
        $table->boolean('is_visible')->default(true);
        $table->enum('status', ['active', 'inactive'])->default('active');
        $table->timestamps();
        $table->softDeletes();
    });
});

function createPartnerAdminUser(): User
{
    $role = Role::query()->firstOrCreate(
        ['name' => 'admin'],
        ['description' => 'Administrator']
    );

    return User::factory()->create([
        'role_id' => $role->id,
        'status' => 'active',
    ]);
}

test('admin can create partner with auto generated code', function () {
    Sanctum::actingAs(createPartnerAdminUser());

    $serviceType = PartnerServiceType::query()->create([
        'name' => 'Khách sạn',
        'slug' => 'khach-san',
    ]);

    $response = $this->postJson('/api/admin/partners', [
        'service_type_id' => $serviceType->id,
        'name' => 'Khách sạn Mới',
        'contact_person' => 'Nguyễn Văn A',
        'phone' => '0901234567',
        'email' => 'contact@example.com',
        'website' => 'https://example.com',
        'logo_url' => 'https://example.com/logo.png',
        'contract_start' => '2026-07-01',
        'contract_end' => '2026-12-31',
        'description' => 'Đối tác thử nghiệm',
        'status' => 'active',
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.name', 'Khách sạn Mới')
        ->assertJsonPath('data.partner_code', 'PTN0001')
        ->assertJsonPath('data.contract_start', '2026-07-01T00:00:00.000000Z')
        ->assertJsonPath('data.contract_end', '2026-12-31T00:00:00.000000Z')
        ->assertJsonPath('data.average_rating', 0)
        ->assertJsonPath('data.is_visible', true);

    $this->assertDatabaseHas('partners', [
        'name' => 'Khách sạn Mới',
        'partner_code' => 'PTN0001',
        'contract_start' => '2026-07-01 00:00:00',
        'contract_end' => '2026-12-31 00:00:00',
        'average_rating' => 0,
        'is_visible' => 1,
    ]);
});
