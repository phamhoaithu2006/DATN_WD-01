<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('records a customer heartbeat and exposes the online state to admins', function () {
    $customerRole = Role::query()->create(['name' => 'customer', 'description' => 'Customer']);
    $adminRole = Role::query()->create(['name' => 'admin', 'description' => 'Administrator']);
    $customer = User::factory()->create(['role_id' => $customerRole->id]);
    $admin = User::factory()->create(['role_id' => $adminRole->id]);

    Sanctum::actingAs($customer);

    $this->postJson('/api/customer/presence/heartbeat')
        ->assertOk()
        ->assertJsonPath('data.is_online', true);

    Sanctum::actingAs($admin);

    $this->getJson('/api/admin/customers/presence')
        ->assertOk()
        ->assertJsonPath("data.{$customer->id}.is_online", true);
});
