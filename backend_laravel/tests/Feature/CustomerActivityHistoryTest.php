<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('allows an admin to view a customer activity history', function () {
    $adminRole = Role::query()->firstOrCreate(['name' => 'admin'], ['description' => 'Administrator']);
    $customerRole = Role::query()->firstOrCreate(['name' => 'customer'], ['description' => 'Customer']);
    $admin = User::factory()->create(['role_id' => $adminRole->id]);
    $customer = User::factory()->create(['role_id' => $customerRole->id]);

    Sanctum::actingAs($admin);

    $this->getJson("/api/admin/customers/{$customer->id}/activity-history")
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.customer.id', $customer->id)
        ->assertJsonPath('data.customer.name', $customer->full_name)
        ->assertJsonPath('data.activity_summary.total_actions', 0)
        ->assertJsonCount(0, 'data.activities');
});

it('does not return activity history for a non-customer account', function () {
    $adminRole = Role::query()->firstOrCreate(['name' => 'admin'], ['description' => 'Administrator']);
    $admin = User::factory()->create(['role_id' => $adminRole->id]);
    $otherAdmin = User::factory()->create(['role_id' => $adminRole->id]);

    Sanctum::actingAs($admin);

    $this->getJson("/api/admin/customers/{$otherAdmin->id}/activity-history")
        ->assertNotFound();
});
