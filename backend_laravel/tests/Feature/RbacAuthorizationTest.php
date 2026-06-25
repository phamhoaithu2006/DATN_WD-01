<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    createRbacFeatureSchema();
});

test('admin customer APIs require authentication', function () {
    $this->getJson('/api/admin/customers')->assertUnauthorized();
});

test('customer cannot access admin customer APIs', function () {
    Sanctum::actingAs(createRbacFeatureUser('customer'));

    $this->getJson('/api/admin/customers')
        ->assertForbidden()
        ->assertJsonPath('message', 'Bạn không có quyền truy cập chức năng này.');
});

test('admin can access admin customer APIs', function () {
    Sanctum::actingAs(createRbacFeatureUser('admin'));

    $this->getJson('/api/admin/customers')
        ->assertOk()
        ->assertJsonPath('status', 'success');
});

test('locked and inactive users cannot login', function (string $status) {
    createRbacFeatureUser('customer', [
        'email' => $status.'@vivugo.test',
        'status' => $status,
    ]);

    $this->postJson('/api/auth/login', [
        'email' => $status.'@vivugo.test',
        'password' => 'password',
    ])->assertForbidden();
})->with(['locked', 'inactive']);

test('auth me returns the authenticated user with role', function () {
    $user = createRbacFeatureUser('admin');
    Sanctum::actingAs($user);

    $this->getJson('/api/auth/me')
        ->assertOk()
        ->assertJsonPath('user.id', $user->id)
        ->assertJsonPath('user.role.name', 'admin');
});

test('public routes remain public', function () {
    $this->getJson('/api/settings/public')->assertOk();
    $this->getJson('/api/widgets')->assertOk();
    $this->getJson('/api/tours')->assertOk();
});

function createRbacFeatureSchema(): void
{
    Schema::dropIfExists('banners');
    Schema::dropIfExists('tours');
    Schema::dropIfExists('destinations');
    Schema::dropIfExists('categories');
    Schema::dropIfExists('settings');
    Schema::dropIfExists('bookings');
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

    Schema::create('bookings', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id');
        $table->timestamps();
    });

    Schema::create('settings', function (Blueprint $table) {
        $table->id();
        $table->string('key')->unique();
        $table->longText('value')->nullable();
        $table->string('group')->default('general');
        $table->timestamps();
    });

    Schema::create('categories', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('slug')->unique();
        $table->string('status')->default('active');
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('destinations', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('slug')->unique();
        $table->string('status')->default('active');
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('tours', function (Blueprint $table) {
        $table->id();
        $table->foreignId('category_id');
        $table->foreignId('destination_id');
        $table->string('title');
        $table->string('slug')->unique();
        $table->string('summary')->nullable();
        $table->text('description')->nullable();
        $table->text('itinerary')->nullable();
        $table->unsignedInteger('duration_days')->default(1);
        $table->unsignedInteger('duration_nights')->default(0);
        $table->decimal('base_price', 12, 2)->default(0);
        $table->decimal('discount_price', 12, 2)->nullable();
        $table->unsignedInteger('max_slots')->default(1);
        $table->unsignedInteger('available_slots')->default(1);
        $table->string('status')->default('published');
        $table->decimal('average_rating', 3, 2)->default(0);
        $table->unsignedInteger('review_count')->default(0);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('banners', function (Blueprint $table) {
        $table->id();
        $table->string('title');
        $table->string('display_title')->nullable();
        $table->string('type')->default('image');
        $table->string('image_url')->nullable();
        $table->text('html_content')->nullable();
        $table->string('link_url')->nullable();
        $table->string('position')->nullable();
        $table->json('display_pages')->nullable();
        $table->unsignedInteger('sort_order')->default(0);
        $table->timestamp('start_date')->nullable();
        $table->timestamp('end_date')->nullable();
        $table->string('status')->default('active');
        $table->timestamps();
    });
}

function createRbacFeatureUser(string $roleName, array $overrides = []): User
{
    $role = Role::query()->firstOrCreate(
        ['name' => $roleName],
        ['description' => $roleName]
    );

    return User::query()->create(array_merge([
        'role_id' => $role->id,
        'full_name' => 'Test '.$roleName,
        'email' => $roleName.'-rbac@vivugo.test',
        'password' => Hash::make('password'),
        'status' => 'active',
    ], $overrides));
}
