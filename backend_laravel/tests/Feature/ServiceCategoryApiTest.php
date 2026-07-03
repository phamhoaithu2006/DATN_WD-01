<?php

use App\Models\Role;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    createServiceCategoryFeatureSchema();
});

test('admin can view service category list', function () {
    Sanctum::actingAs(createServiceCategoryFeatureUser('admin'));

    ServiceCategory::query()->create([
        'name' => 'Khách sạn',
        'description' => 'Dịch vụ lưu trú',
        'status' => true,
    ]);

    $this->getJson('/api/admin/service-categories')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.pagination.total', 1)
        ->assertJsonPath('data.items.0.name', 'Khách sạn')
        ->assertJsonPath('data.items.0.slug', 'khach-san');
});

test('non admin user receives forbidden response', function () {
    Sanctum::actingAs(createServiceCategoryFeatureUser('customer'));

    $this->getJson('/api/admin/service-categories')
        ->assertForbidden()
        ->assertJsonPath('success', false)
        ->assertJsonPath('message', 'Bạn không có quyền truy cập chức năng này.')
        ->assertJsonPath('errors', []);
});

test('admin can create service category with generated slug', function () {
    Sanctum::actingAs(createServiceCategoryFeatureUser('admin'));

    $this->postJson('/api/admin/service-categories', [
        'name' => 'Khách sạn',
        'slug' => 'client-slug',
        'description' => 'Dịch vụ lưu trú',
        'status' => true,
    ])
        ->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.name', 'Khách sạn')
        ->assertJsonPath('data.slug', 'khach-san')
        ->assertJsonPath('data.status', true);

    $this->assertDatabaseHas('service_categories', [
        'name' => 'Khách sạn',
        'slug' => 'khach-san',
        'status' => 1,
    ]);

    $this->assertDatabaseMissing('service_categories', [
        'slug' => 'client-slug',
    ]);
});

test('service category name must be unique including soft deleted records', function () {
    Sanctum::actingAs(createServiceCategoryFeatureUser('admin'));

    ServiceCategory::query()->create([
        'name' => 'Bảo hiểm',
        'description' => 'Dịch vụ bảo hiểm',
        'status' => true,
    ])->delete();

    $this->postJson('/api/admin/service-categories', [
        'name' => 'Bảo hiểm',
        'description' => 'Dịch vụ bảo hiểm khác',
        'status' => true,
    ])
        ->assertUnprocessable()
        ->assertJsonPath('success', false)
        ->assertJsonValidationErrors('name');
});

test('updating service category name changes slug', function () {
    Sanctum::actingAs(createServiceCategoryFeatureUser('admin'));

    $serviceCategory = ServiceCategory::query()->create([
        'name' => 'Khách sạn',
        'description' => 'Dịch vụ lưu trú',
        'status' => true,
    ]);

    $this->putJson("/api/admin/service-categories/{$serviceCategory->id}", [
        'name' => 'Khách sạn cao cấp',
        'slug' => 'client-update-slug',
        'description' => 'Dịch vụ lưu trú tiêu chuẩn cao',
        'status' => true,
    ])
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.name', 'Khách sạn cao cấp')
        ->assertJsonPath('data.slug', 'khach-san-cao-cap');

    $this->assertDatabaseHas('service_categories', [
        'id' => $serviceCategory->id,
        'slug' => 'khach-san-cao-cap',
    ]);
});

test('generated slug avoids duplicates after normalization', function () {
    Sanctum::actingAs(createServiceCategoryFeatureUser('admin'));

    $this->postJson('/api/admin/service-categories', [
        'name' => 'A & B',
        'description' => null,
        'status' => true,
    ])->assertCreated()
        ->assertJsonPath('data.slug', 'a-b');

    $this->postJson('/api/admin/service-categories', [
        'name' => 'A - B',
        'description' => null,
        'status' => true,
    ])->assertCreated()
        ->assertJsonPath('data.slug', 'a-b-2');
});

test('search by name works', function () {
    Sanctum::actingAs(createServiceCategoryFeatureUser('admin'));

    ServiceCategory::query()->create(['name' => 'Hotel Service', 'status' => true]);
    ServiceCategory::query()->create(['name' => 'Transport Service', 'status' => true]);

    $this->getJson('/api/admin/service-categories?search=Hotel')
        ->assertOk()
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.name', 'Hotel Service');
});

test('status filters work for active and inactive service categories', function () {
    Sanctum::actingAs(createServiceCategoryFeatureUser('admin'));

    ServiceCategory::query()->create(['name' => 'Đang bật', 'status' => true]);
    ServiceCategory::query()->create(['name' => 'Đang tắt', 'status' => false]);

    $this->getJson('/api/admin/service-categories?status=1')
        ->assertOk()
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.name', 'Đang bật')
        ->assertJsonPath('data.items.0.status', true);

    $this->getJson('/api/admin/service-categories?status=0')
        ->assertOk()
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.name', 'Đang tắt')
        ->assertJsonPath('data.items.0.status', false);
});

test('pagination works', function () {
    Sanctum::actingAs(createServiceCategoryFeatureUser('admin'));

    foreach (range(1, 15) as $index) {
        ServiceCategory::query()->create([
            'name' => sprintf('Loại dịch vụ %02d', $index),
            'status' => true,
        ]);
    }

    $this->getJson('/api/admin/service-categories?page=2&per_page=5')
        ->assertOk()
        ->assertJsonCount(5, 'data.items')
        ->assertJsonPath('data.pagination.current_page', 2)
        ->assertJsonPath('data.pagination.per_page', 5)
        ->assertJsonPath('data.pagination.total', 15);
});

test('delete uses soft delete', function () {
    Sanctum::actingAs(createServiceCategoryFeatureUser('admin'));

    $serviceCategory = ServiceCategory::query()->create([
        'name' => 'Vé tham quan',
        'status' => true,
    ]);

    $this->deleteJson("/api/admin/service-categories/{$serviceCategory->id}")
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data', null);

    $this->assertSoftDeleted('service_categories', [
        'id' => $serviceCategory->id,
    ]);
});

test('show returns not found after soft delete', function () {
    Sanctum::actingAs(createServiceCategoryFeatureUser('admin'));

    $serviceCategory = ServiceCategory::query()->create([
        'name' => 'Giải trí',
        'status' => true,
    ]);
    $serviceCategory->delete();

    $this->getJson("/api/admin/service-categories/{$serviceCategory->id}")
        ->assertNotFound()
        ->assertJsonPath('success', false)
        ->assertJsonPath('message', 'Không tìm thấy loại dịch vụ');
});

test('force delete endpoint is not available', function () {
    Sanctum::actingAs(createServiceCategoryFeatureUser('admin'));

    $serviceCategory = ServiceCategory::query()->create([
        'name' => 'Khác',
        'status' => true,
    ]);

    $this->deleteJson("/api/admin/service-categories/{$serviceCategory->id}/force")
        ->assertNotFound();

    $this->assertDatabaseHas('service_categories', [
        'id' => $serviceCategory->id,
        'deleted_at' => null,
    ]);
});

function createServiceCategoryFeatureSchema(): void
{
    Schema::dropIfExists('service_categories');
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

    Schema::create('service_categories', function (Blueprint $table) {
        $table->id();
        $table->string('name')->unique();
        $table->string('slug')->unique();
        $table->text('description')->nullable();
        $table->boolean('status')->default(true)->index();
        $table->timestamps();
        $table->softDeletes();

        $table->index('created_at');
    });
}

function createServiceCategoryFeatureUser(string $roleName): User
{
    $role = Role::query()->firstOrCreate(
        ['name' => $roleName],
        ['description' => $roleName]
    );

    return User::query()->create([
        'role_id' => $role->id,
        'full_name' => 'Test '.$roleName,
        'email' => $roleName.'-service-category@vivugo.test',
        'password' => Hash::make('password'),
        'status' => 'active',
    ]);
}
