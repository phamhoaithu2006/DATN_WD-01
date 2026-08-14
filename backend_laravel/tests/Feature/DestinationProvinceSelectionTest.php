<?php

use App\Models\Province;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('admin can load provinces synced into the administrative catalog', function () {
    Sanctum::actingAs(destinationProvinceSelectionAdmin());
    $provinceId = Province::query()->value('id');

    $this->getJson('/api/admin/administrative/provinces')
        ->assertOk()
        ->assertJsonFragment(['id' => $provinceId]);
});

test('province place counts follow the selected activity and only include active places', function () {
    Sanctum::actingAs(destinationProvinceSelectionAdmin());
    $province = Province::query()->where('name', 'Đà Nẵng')->firstOrFail();

    $this->postJson('/api/admin/destination-places', [
        'province_id' => $province->id,
        'name' => 'Địa điểm tham quan đang hoạt động',
        'activity_types' => ['sightseeing'],
        'status' => 'active',
    ])->assertCreated();

    $this->postJson('/api/admin/destination-places', [
        'province_id' => $province->id,
        'name' => 'Nhà hàng đang hoạt động',
        'activity_types' => ['meal'],
        'status' => 'active',
    ])->assertCreated();

    $this->postJson('/api/admin/destination-places', [
        'province_id' => $province->id,
        'name' => 'Nhà hàng đang tạm ẩn',
        'activity_types' => ['meal'],
        'status' => 'inactive',
    ])->assertCreated();

    $mealResponse = $this->getJson('/api/admin/administrative/provinces?activity_type=meal')
        ->assertOk();
    $mealProvince = collect($mealResponse->json('data'))->firstWhere('id', $province->id);

    expect($mealProvince['places_count'])->toBe(1);

    $sightseeingResponse = $this->getJson('/api/admin/administrative/provinces?activity_type=sightseeing')
        ->assertOk();
    $sightseeingProvince = collect($sightseeingResponse->json('data'))->firstWhere('id', $province->id);

    expect($sightseeingProvince['places_count'])->toBe(1);
});

test('legacy destination catalog endpoint is no longer available', function () {
    Sanctum::actingAs(destinationProvinceSelectionAdmin());

    $this->getJson('/api/admin/destinations')->assertNotFound();
});

test('province options expose the synced province as the only geographic catalog', function () {
    Sanctum::actingAs(destinationProvinceSelectionAdmin());

    $this->getJson('/api/admin/guides/province-options')
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'name']]]);
});

function destinationProvinceSelectionAdmin(): User
{
    $role = Role::query()->firstOrCreate(
        ['name' => 'admin'],
        ['description' => 'Quản trị viên'],
    );

    return User::query()->create([
        'role_id' => $role->id,
        'full_name' => 'Quản trị viên kiểm thử',
        'email' => 'destination-province-admin@vivugo.test',
        'password' => Hash::make('password'),
        'status' => 'active',
    ]);
}
