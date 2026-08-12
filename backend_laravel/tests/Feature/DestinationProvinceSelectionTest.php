<?php

use App\Models\Province;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('destination accepts exactly one province', function () {
    Sanctum::actingAs(destinationProvinceSelectionAdmin());
    $provinceId = Province::query()->value('id');

    $this->postJson('/api/admin/destinations', destinationPayload([$provinceId]))
        ->assertCreated();

    $this->assertDatabaseCount('destination_province', 1);
    $this->assertDatabaseHas('destination_province', ['province_id' => $provinceId]);
});

test('destination rejects multiple provinces', function () {
    Sanctum::actingAs(destinationProvinceSelectionAdmin());
    $provinceIds = Province::query()->limit(2)->pluck('id')->all();

    $this->postJson('/api/admin/destinations', destinationPayload($provinceIds))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('province_ids');

    $this->assertDatabaseCount('destinations', 0);
});

test('destination requires a province', function () {
    Sanctum::actingAs(destinationProvinceSelectionAdmin());

    $this->postJson('/api/admin/destinations', destinationPayload([]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('province_ids');

    $this->assertDatabaseCount('destinations', 0);
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

/**
 * @param  list<int>  $provinceIds
 * @return array<string, mixed>
 */
function destinationPayload(array $provinceIds): array
{
    return [
        'name' => 'Điểm đến kiểm thử',
        'slug' => 'diem-den-kiem-thu',
        'province_city' => 'Hà Nội',
        'country' => 'Việt Nam',
        'status' => 'active',
        'province_ids' => $provinceIds,
    ];
}
