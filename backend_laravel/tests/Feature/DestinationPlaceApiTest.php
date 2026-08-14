<?php

use App\Models\DestinationPlace;
use App\Models\Province;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('admin manages destination places within a selected province', function () {
    Sanctum::actingAs(createDestinationPlaceAdmin());
    $province = Province::query()->where('name', 'Đà Nẵng')->firstOrFail();
    $otherProvince = Province::query()->where('name', 'Thanh Hóa')->firstOrFail();

    $createResponse = $this->postJson('/api/admin/destination-places', [
        'province_id' => $province->id,
        'name' => 'Bà Nà Hills',
        'address' => 'Hòa Vang, Đà Nẵng',
        'description' => 'Khu du lịch trên núi.',
        'status' => 'active',
    ]);

    $createResponse
        ->assertCreated()
        ->assertJsonPath('data.province_id', $province->id)
        ->assertJsonPath('data.name', 'Bà Nà Hills');

    DestinationPlace::factory()->create([
        'province_id' => $otherProvince->id,
        'name' => 'Pù Luông',
    ]);

    $this->getJson('/api/admin/destination-places?province_id='.$province->id)
        ->assertOk()
        ->assertJsonCount(1, 'data.data')
        ->assertJsonPath('data.data.0.name', 'Bà Nà Hills');

    $place = DestinationPlace::query()->where('name', 'Bà Nà Hills')->firstOrFail();

    $this->putJson('/api/admin/destination-places/'.$place->id, [
        'province_id' => $province->id,
        'name' => 'Sun World Bà Nà Hills',
        'status' => 'inactive',
    ])->assertOk()
        ->assertJsonPath('data.name', 'Sun World Bà Nà Hills')
        ->assertJsonPath('data.status', 'inactive');

    $this->deleteJson('/api/admin/destination-places/'.$place->id)
        ->assertOk();

    expect(DestinationPlace::query()->find($place->id))->toBeNull();
    expect(DestinationPlace::withTrashed()->find($place->id))->not->toBeNull();
});

test('destination place names are unique inside the same province only', function () {
    Sanctum::actingAs(createDestinationPlaceAdmin());
    $province = Province::query()->where('name', 'Đà Nẵng')->firstOrFail();
    $otherProvince = Province::query()->where('name', 'Hà Nội')->firstOrFail();

    DestinationPlace::factory()->create([
        'province_id' => $province->id,
        'name' => 'Biển Mỹ Khê',
    ]);

    $this->postJson('/api/admin/destination-places', [
        'province_id' => $province->id,
        'name' => 'Biển Mỹ Khê',
        'status' => 'active',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('name');

    $this->postJson('/api/admin/destination-places', [
        'province_id' => $otherProvince->id,
        'name' => 'Biển Mỹ Khê',
        'status' => 'active',
    ])->assertCreated();
});

test('admin manages a place directly under a synced province and filters by activity type', function () {
    Sanctum::actingAs(createDestinationPlaceAdmin());
    $province = Province::query()->where('name', 'Đà Nẵng')->firstOrFail();
    $otherProvince = Province::query()->where('name', 'Hà Nội')->firstOrFail();

    $this->postJson('/api/admin/destination-places', [
        'province_id' => $province->id,
        'name' => 'Nhà hàng ven sông',
        'activity_types' => ['meal', 'sightseeing'],
        'status' => 'active',
    ])->assertCreated()
        ->assertJsonPath('data.province_id', $province->id)
        ->assertJsonPath('data.activity_types.0', 'meal')
        ->assertJsonPath('data.activity_types.1', 'sightseeing');

    $this->postJson('/api/admin/destination-places', [
        'province_id' => $otherProvince->id,
        'name' => 'Nhà hàng ven sông',
        'activity_types' => ['meal'],
        'status' => 'active',
    ])->assertCreated();

    $this->getJson('/api/admin/destination-places?province_id='.$province->id.'&activity_type=meal')
        ->assertOk()
        ->assertJsonCount(1, 'data.data')
        ->assertJsonPath('data.data.0.name', 'Nhà hàng ven sông');

    $this->getJson('/api/admin/destination-places?province_id='.$province->id.'&activity_type=departure')
        ->assertOk()
        ->assertJsonCount(0, 'data.data');

    $this->postJson('/api/admin/destination-places', [
        'province_id' => $province->id,
        'name' => 'Nhà hàng ven sông',
        'status' => 'active',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('name');
});

function createDestinationPlaceAdmin(): User
{
    $role = Role::query()->firstOrCreate(
        ['name' => 'admin'],
        ['description' => 'Quản trị viên kiểm thử']
    );

    return User::query()->create([
        'role_id' => $role->id,
        'full_name' => 'Quản trị viên kiểm thử',
        'email' => 'destination-place-'.uniqid().'@vivugo.test',
        'password' => Hash::make('password'),
        'status' => 'active',
    ]);
}
