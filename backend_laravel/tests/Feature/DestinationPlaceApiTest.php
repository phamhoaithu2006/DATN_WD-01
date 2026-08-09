<?php

use App\Models\Destination;
use App\Models\DestinationPlace;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('admin manages destination places within a selected destination', function () {
    Sanctum::actingAs(createDestinationPlaceAdmin());
    $destination = Destination::factory()->create(['name' => 'Đà Nẵng']);
    $otherDestination = Destination::factory()->create(['name' => 'Thanh Hóa']);

    $createResponse = $this->postJson('/api/admin/destination-places', [
        'destination_id' => $destination->id,
        'name' => 'Bà Nà Hills',
        'address' => 'Hòa Vang, Đà Nẵng',
        'description' => 'Khu du lịch trên núi.',
        'status' => 'active',
    ]);

    $createResponse
        ->assertCreated()
        ->assertJsonPath('data.destination_id', $destination->id)
        ->assertJsonPath('data.name', 'Bà Nà Hills');

    DestinationPlace::factory()->create([
        'destination_id' => $otherDestination->id,
        'name' => 'Pù Luông',
    ]);

    $this->getJson('/api/admin/destination-places?destination_id='.$destination->id)
        ->assertOk()
        ->assertJsonCount(1, 'data.data')
        ->assertJsonPath('data.data.0.name', 'Bà Nà Hills');

    $place = DestinationPlace::query()->where('name', 'Bà Nà Hills')->firstOrFail();

    $this->putJson('/api/admin/destination-places/'.$place->id, [
        'destination_id' => $destination->id,
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

test('destination place names are unique inside the same destination only', function () {
    Sanctum::actingAs(createDestinationPlaceAdmin());
    $destination = Destination::factory()->create();
    $otherDestination = Destination::factory()->create();

    DestinationPlace::factory()->create([
        'destination_id' => $destination->id,
        'name' => 'Biển Mỹ Khê',
    ]);

    $this->postJson('/api/admin/destination-places', [
        'destination_id' => $destination->id,
        'name' => 'Biển Mỹ Khê',
        'status' => 'active',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('name');

    $this->postJson('/api/admin/destination-places', [
        'destination_id' => $otherDestination->id,
        'name' => 'Biển Mỹ Khê',
        'status' => 'active',
    ])->assertCreated();
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
