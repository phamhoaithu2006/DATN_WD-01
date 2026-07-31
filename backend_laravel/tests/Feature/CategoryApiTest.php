<?php

use App\Models\Category;
use App\Models\Destination;
use App\Models\Role;
use App\Models\Tour;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('admin category list supports status filters pagination and statistics', function () {
    $admin = createCategoryApiAdmin();

    Category::query()->create([
        'name' => 'Biển đảo',
        'slug' => 'bien-dao-category-test',
        'status' => 'active',
    ]);
    Category::query()->create([
        'name' => 'Nghỉ dưỡng',
        'slug' => 'nghi-duong-category-test',
        'status' => 'inactive',
    ]);

    Sanctum::actingAs($admin);

    $this->getJson('/api/admin/categories?status=all&per_page=1')
        ->assertOk()
        ->assertJsonPath('pagination.total', 2)
        ->assertJsonPath('pagination.per_page', 1)
        ->assertJsonPath('statistics.total', 2)
        ->assertJsonPath('statistics.active', 1)
        ->assertJsonPath('statistics.inactive', 1)
        ->assertJsonCount(1, 'data');

    $this->getJson('/api/admin/categories?status=inactive')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Nghỉ dưỡng');
});

test('admin can view an inactive category directly', function () {
    $admin = createCategoryApiAdmin();
    $category = Category::query()->create([
        'name' => 'Tour nội bộ',
        'slug' => 'tour-noi-bo-category-test',
        'status' => 'inactive',
    ]);

    Sanctum::actingAs($admin);

    $this->getJson('/api/admin/categories/'.$category->id)
        ->assertOk()
        ->assertJsonPath('data.id', $category->id)
        ->assertJsonPath('data.status', 'inactive')
        ->assertJsonPath('data.tours_count', 0);
});

test('admin cannot delete a category that has tours', function () {
    $admin = createCategoryApiAdmin();
    $category = Category::query()->create([
        'name' => 'Mạo hiểm',
        'slug' => 'mao-hiem-category-test',
        'status' => 'active',
    ]);
    $destination = Destination::query()->create([
        'name' => 'Đà Nẵng',
        'slug' => 'da-nang-category-test',
        'status' => 'active',
    ]);

    Tour::query()->create([
        'category_id' => $category->id,
        'destination_id' => $destination->id,
        'title' => 'Tour mạo hiểm test',
        'slug' => 'tour-mao-hiem-category-test',
        'duration_days' => 2,
        'duration_nights' => 1,
        'base_price' => 1000000,
        'max_slots' => 10,
        'available_slots' => 10,
        'status' => 'published',
    ]);

    Sanctum::actingAs($admin);

    $this->deleteJson('/api/admin/categories/'.$category->id)
        ->assertUnprocessable()
        ->assertJsonPath('tour_count', 1)
        ->assertJsonPath('message', 'Không thể xóa loại tour đang được sử dụng bởi 1 tour.');

    expect(Category::query()->find($category->id))->not->toBeNull();
});

test('admin can create replace and remove a category thumbnail', function () {
    Storage::fake('public');
    $admin = createCategoryApiAdmin();
    Sanctum::actingAs($admin);

    $createResponse = $this->post('/api/admin/categories', [
        'name' => 'Ảnh đại diện',
        'thumbnail_image' => UploadedFile::fake()->image('category.jpg'),
        'thumbnail_alt_text' => 'Ảnh biển đảo',
    ], ['Accept' => 'application/json']);

    $createResponse
        ->assertCreated()
        ->assertJsonPath('data.thumbnail_alt_text', 'Ảnh biển đảo');

    $category = Category::query()->where('name', 'Ảnh đại diện')->firstOrFail();
    $oldPath = parse_url($category->thumbnail_url, PHP_URL_PATH);
    $oldStoragePath = str_replace('/storage/', '', $oldPath);

    Storage::disk('public')->assertExists($oldStoragePath);

    $this->post('/api/admin/categories/'.$category->id, [
        '_method' => 'PUT',
        'name' => 'Ảnh đại diện',
        'thumbnail_image' => UploadedFile::fake()->image('category-new.jpg'),
        'thumbnail_alt_text' => 'Ảnh mới',
    ], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('data.thumbnail_alt_text', 'Ảnh mới');

    expect(Storage::disk('public')->exists($oldStoragePath))->toBeFalse();

    $this->post('/api/admin/categories/'.$category->id, [
        '_method' => 'PUT',
        'remove_thumbnail' => '1',
    ], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('data.thumbnail_url', null)
        ->assertJsonPath('data.thumbnail_alt_text', null);
});

function createCategoryApiAdmin(): User
{
    $role = Role::query()->firstOrCreate(
        ['name' => 'admin'],
        ['description' => 'Quản trị viên kiểm thử']
    );

    return User::query()->create([
        'role_id' => $role->id,
        'full_name' => 'Quản trị viên kiểm thử',
        'email' => 'category-api-admin-'.uniqid().'@vivugo.test',
        'password' => Hash::make('password'),
        'status' => 'active',
    ]);
}
