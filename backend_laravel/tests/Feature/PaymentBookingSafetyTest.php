<?php

use App\Models\Booking;
use App\Models\Role;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function paymentSafetyRole(string $name): Role
{
    return Role::query()->firstOrCreate(
        ['name' => $name],
        ['description' => ucfirst($name)]
    );
}

function paymentSafetyUser(string $roleName = 'customer'): User
{
    $role = paymentSafetyRole($roleName);

    return User::factory()->create([
        'role_id' => $role->id,
        'status' => 'active',
    ]);
}

function paymentSafetyTour(): Tour
{
    $now = now();

    DB::table('categories')->updateOrInsert(
        ['id' => 1],
        [
            'name' => 'Danh mục thanh toán',
            'slug' => 'danh-muc-thanh-toan',
            'description' => 'Danh mục dùng cho test thanh toán.',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]
    );

    DB::table('destinations')->updateOrInsert(
        ['id' => 1],
        [
            'name' => 'Điểm đến thanh toán',
            'slug' => 'diem-den-thanh-toan',
            'province_city' => 'Hà Nội',
            'country' => 'Việt Nam',
            'description' => 'Điểm đến dùng cho test thanh toán.',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]
    );

    return Tour::query()->create([
        'category_id' => 1,
        'destination_id' => 1,
        'title' => 'Tour thanh toán an toàn',
        'slug' => 'tour-thanh-toan-an-toan-'.fake()->unique()->numberBetween(1000, 9999),
        'duration_days' => 2,
        'duration_nights' => 1,
        'base_price' => 2000000,
        'discount_price' => 1500000,
        'max_slots' => 20,
        'available_slots' => 20,
        'status' => 'published',
    ]);
}

function paymentSafetyDeparture(?Tour $tour = null, array $attributes = []): TourDeparture
{
    $tour ??= paymentSafetyTour();

    return TourDeparture::query()->create(array_merge([
        'tour_id' => $tour->id,
        'departure_date' => now()->addDays(10)->toDateString(),
        'return_date' => now()->addDays(11)->toDateString(),
        'base_price' => 2000000,
        'discount_price' => 1500000,
        'total_slots' => 10,
        'booked_slots' => 0,
        'status' => 'open',
    ], $attributes));
}

function paymentSafetyBooking(array $attributes = []): Booking
{
    $admin = paymentSafetyUser('admin');
    $tour = paymentSafetyTour();
    $departure = paymentSafetyDeparture($tour, [
        'booked_slots' => $attributes['number_of_people'] ?? 2,
    ]);

    $booking = Booking::query()->create(array_merge([
        'booking_code' => 'BK-TEST-'.fake()->unique()->numberBetween(1000, 9999),
        'user_id' => $admin->id,
        'tour_id' => $tour->id,
        'tour_departure_id' => $departure->id,
        'number_of_people' => 2,
        'unit_price' => 1500000,
        'discount_amount' => 0,
        'total_amount' => 3000000,
        'status' => 'pending',
        'payment_status' => 'unpaid',
    ], $attributes));

    $booking->payment()->create([
        'payment_method' => 'cod',
        'amount' => $booking->total_amount,
        'status' => 'pending',
        'paid_at' => null,
    ]);

    return $booking->fresh(['payment', 'tourDeparture']);
}

test('guest and non admin cannot access admin booking and payment routes', function () {
    $this->getJson('/api/admin/bookings')->assertUnauthorized();
    $this->getJson('/api/admin/payments')->assertUnauthorized();

    Sanctum::actingAs(paymentSafetyUser('customer'));

    $this->getJson('/api/admin/bookings')->assertForbidden();
    $this->getJson('/api/admin/payments')->assertForbidden();
});

test('customer booking creates a pending cod payment', function () {
    $customer = paymentSafetyUser('customer');
    $departure = paymentSafetyDeparture();

    Sanctum::actingAs($customer);

    $response = $this->postJson('/api/customer/bookings', [
        'tour_departure_id' => $departure->id,
        'number_of_people' => 1,
        'quantity_summary' => [
            ['rule_id' => null, 'quantity' => 1],
        ],
        'contact' => [
            'contact_name' => 'Nguyễn Văn An',
            'contact_phone' => '0900000000',
            'contact_email' => 'an@example.com',
        ],
        'participants' => [
            [
                'full_name' => 'Nguyễn Văn An',
                'birth_date' => now()->subYears(30)->toDateString(),
                'gender' => 'male',
            ],
        ],
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.payment_status', 'unpaid')
        ->assertJsonPath('data.participants.0.phone', null)
        ->assertJsonPath('data.participants.0.identity_number', null)
        ->assertJsonPath('data.participants.0.participant_type', 'adult');

    $bookingId = $response->json('data.id');

    $this->assertDatabaseHas('payments', [
        'booking_id' => $bookingId,
        'payment_method' => 'cod',
        'amount' => 1500000,
        'status' => 'pending',
    ]);
});

test('customer booking rejects fewer declared participants than selected people', function () {
    $customer = paymentSafetyUser('customer');
    $departure = paymentSafetyDeparture();

    Sanctum::actingAs($customer);

    $response = $this->postJson('/api/customer/bookings', [
        'tour_departure_id' => $departure->id,
        'number_of_people' => 3,
        'quantity_summary' => [
            ['rule_id' => null, 'quantity' => 3],
        ],
        'contact' => [
            'contact_name' => 'Nguyễn Văn An',
            'contact_phone' => '0900000000',
            'contact_email' => 'an@example.com',
        ],
        'participants' => [
            [
                'full_name' => 'Nguyễn Văn An',
                'phone' => '0900000000',
                'birth_date' => now()->subYears(30)->toDateString(),
                'gender' => 'male',
            ],
        ],
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors('participants');
});

test('customer booking rejects missing declared participants', function () {
    $customer = paymentSafetyUser('customer');
    $departure = paymentSafetyDeparture();

    Sanctum::actingAs($customer);

    $response = $this->postJson('/api/customer/bookings', [
        'tour_departure_id' => $departure->id,
        'number_of_people' => 2,
        'quantity_summary' => [
            ['rule_id' => null, 'quantity' => 2],
        ],
        'contact' => [
            'contact_name' => 'Nguyễn Văn An',
            'contact_phone' => '0900000000',
            'contact_email' => 'an@example.com',
        ],
        'participants' => [],
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors('participants');

    $this->assertDatabaseHas('tour_departures', [
        'id' => $departure->id,
        'booked_slots' => 0,
    ]);
});

test('admin booking list includes participant summary for table display', function () {
    Sanctum::actingAs(paymentSafetyUser('admin'));
    $booking = paymentSafetyBooking(['number_of_people' => 2]);
    $booking->participants()->createMany([
        [
            'full_name' => 'Nguyễn Văn An',
            'birth_date' => now()->subYears(30)->toDateString(),
            'gender' => 'male',
            'participant_type' => 'adult',
            'unit_price' => 1500000,
        ],
        [
            'full_name' => 'Trần Thị Bình',
            'birth_date' => now()->subYears(25)->toDateString(),
            'gender' => 'female',
            'participant_type' => 'adult',
            'unit_price' => 1500000,
        ],
    ]);

    $this->getJson('/api/admin/bookings')
        ->assertOk()
        ->assertJsonPath('data.0.id', $booking->id)
        ->assertJsonPath('data.0.participants_count', 2)
        ->assertJsonPath('data.0.participants.0.full_name', 'Nguyễn Văn An')
        ->assertJsonPath('data.0.participants.1.full_name', 'Trần Thị Bình');
});

test('admin payment actions synchronize booking payment status', function () {
    Sanctum::actingAs(paymentSafetyUser('admin'));
    $booking = paymentSafetyBooking();

    $this->patchJson("/api/admin/payments/{$booking->payment->id}/confirm", [
        'transaction_code' => 'MANUAL-001',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'success')
        ->assertJsonPath('data.transaction_code', 'MANUAL-001');

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'payment_status' => 'paid',
    ]);

    $this->patchJson("/api/admin/payments/{$booking->payment->id}/fail")
        ->assertOk()
        ->assertJsonPath('data.status', 'failed');

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'payment_status' => 'failed',
    ]);

    $this->patchJson("/api/admin/payments/{$booking->payment->id}/refund")
        ->assertOk()
        ->assertJsonPath('data.status', 'refunded');

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'payment_status' => 'refunded',
    ]);
});

test('booking update cannot change payment status directly', function () {
    Sanctum::actingAs(paymentSafetyUser('admin'));
    $booking = paymentSafetyBooking();

    $this->putJson("/api/admin/bookings/{$booking->id}", [
        'payment_status' => 'paid',
    ])->assertUnprocessable();

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'payment_status' => 'unpaid',
    ]);
});

test('cancel booking releases slots only once', function () {
    Sanctum::actingAs(paymentSafetyUser('admin'));
    $booking = paymentSafetyBooking(['number_of_people' => 2]);
    $departureId = $booking->tour_departure_id;

    $this->patchJson("/api/admin/bookings/{$booking->id}/cancel")
        ->assertOk();

    $this->assertDatabaseHas('tour_departures', [
        'id' => $departureId,
        'booked_slots' => 0,
    ]);

    $this->patchJson("/api/admin/bookings/{$booking->id}/cancel")
        ->assertOk();

    $this->assertDatabaseHas('tour_departures', [
        'id' => $departureId,
        'booked_slots' => 0,
    ]);
});

test('cannot permanently delete booking before it is cancelled', function () {
    Sanctum::actingAs(paymentSafetyUser('admin'));
    $booking = paymentSafetyBooking();

    $this->deleteJson("/api/admin/bookings/{$booking->id}")
        ->assertStatus(422)
        ->assertJsonPath('message', 'Chỉ có thể xóa vĩnh viễn booking đã hủy.');

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
    ]);
});
