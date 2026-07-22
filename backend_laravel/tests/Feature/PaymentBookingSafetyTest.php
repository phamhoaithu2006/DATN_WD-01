<?php

use App\Models\Booking;
use App\Models\Payment;
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
        'payment_method' => 'vnpay',
        'amount' => $booking->total_amount,
        'status' => 'pending',
        'paid_at' => null,
        'expires_at' => now()->addMinutes(15),
    ]);

    return $booking->fresh(['payment', 'tourDeparture']);
}

function configureVnpayForTest(): void
{
    $settings = [
        'VNPAY_TMN_CODE' => 'TESTCODE',
        'VNPAY_HASH_SECRET' => 'test-vnpay-hash-secret',
        'VNPAY_PAYMENT_URL' => 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        'VNPAY_RETURN_URL' => 'http://127.0.0.1:5173/payment/vnpay/return',
    ];

    foreach ($settings as $key => $value) {
        putenv("{$key}={$value}");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}

function vnpaySignature(array $params): string
{
    unset($params['vnp_SecureHash'], $params['vnp_SecureHashType']);
    ksort($params);

    $signatureData = collect($params)
        ->filter(fn ($value, string $key) => str_starts_with($key, 'vnp_') && $value !== null && $value !== '')
        ->map(fn ($value, string $key) => urlencode($key).'='.urlencode((string) $value))
        ->implode('&');

    return hash_hmac('sha512', $signatureData, (string) env('VNPAY_HASH_SECRET'));
}

function vnpayIpnPayload(Payment $payment, array $overrides = []): array
{
    $payload = array_merge([
        'vnp_Amount' => (string) ((int) round((float) $payment->amount * 100)),
        'vnp_ResponseCode' => '00',
        'vnp_TmnCode' => (string) env('VNPAY_TMN_CODE'),
        'vnp_TransactionNo' => '1234567890',
        'vnp_TransactionStatus' => '00',
        'vnp_TxnRef' => (string) $payment->id,
    ], $overrides);

    $payload['vnp_SecureHash'] = vnpaySignature($payload);

    return $payload;
}

function transactionReferenceFromCheckoutUrl(string $checkoutUrl): string
{
    parse_str((string) parse_url($checkoutUrl, PHP_URL_QUERY), $query);

    return (string) ($query['vnp_TxnRef'] ?? '');
}

test('guest and non admin cannot access admin booking and payment routes', function () {
    $this->getJson('/api/admin/bookings')->assertUnauthorized();
    $this->getJson('/api/admin/payments')->assertUnauthorized();

    Sanctum::actingAs(paymentSafetyUser('customer'));

    $this->getJson('/api/admin/bookings')->assertForbidden();
    $this->getJson('/api/admin/payments')->assertForbidden();
});

test('customer booking creates a pending VNPAY payment with checkout url', function () {
    configureVnpayForTest();
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
        ->assertJsonPath('data.payment.payment_method', 'vnpay')
        ->assertJsonPath('data.participants.0.phone', null)
        ->assertJsonPath('data.participants.0.identity_number', null)
        ->assertJsonPath('data.participants.0.participant_type', 'adult');

    $bookingId = $response->json('data.id');

    $this->assertDatabaseHas('payments', [
        'booking_id' => $bookingId,
        'payment_method' => 'vnpay',
        'amount' => 1500000,
        'status' => 'pending',
    ]);

    $checkoutUrl = $response->json('data.checkout_url');
    $payment = Payment::query()->where('booking_id', $bookingId)->firstOrFail();
    parse_str((string) parse_url($checkoutUrl, PHP_URL_QUERY), $checkoutQuery);

    expect($checkoutUrl)
        ->toContain('sandbox.vnpayment.vn/paymentv2/vpcpay.html')
        ->toContain('vnp_TxnRef=')
        ->and(transactionReferenceFromCheckoutUrl($checkoutUrl))
        ->toMatch('/^P'.$response->json('data.payment.id').'A[A-Z0-9]{20}$/')
        ->and($response->json('data.expires_at'))
        ->toBe($payment->expires_at->toIso8601String())
        ->and($checkoutQuery['vnp_ExpireDate'] ?? null)
        ->toBe($payment->expires_at->copy()->setTimezone('Asia/Ho_Chi_Minh')->format('YmdHis'));
});

test('customer booking list includes payment and departure needed for pending actions', function () {
    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $customer->id]);
    Sanctum::actingAs($customer);

    $this->getJson('/api/profile/bookings')
        ->assertOk()
        ->assertJsonPath('data.0.id', $booking->id)
        ->assertJsonPath('data.0.payment.id', $booking->payment->id)
        ->assertJsonPath('data.0.payment.status', 'pending')
        ->assertJsonPath('data.0.tour_departure.id', $booking->tour_departure_id)
        ->assertJsonPath('data.0.payment_status', 'unpaid');
});

test('customer can retry a pending payment with a new transaction reference without holding more slots', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $customer->id]);
    Sanctum::actingAs($customer);

    $firstResponse = $this->postJson("/api/customer/bookings/{$booking->id}/continue-payment")
        ->assertOk()
        ->assertJsonPath('data.booking_id', $booking->id)
        ->assertJsonPath('data.payment_id', $booking->payment->id)
        ->assertJsonPath('data.expires_at', $booking->payment->expires_at->toIso8601String())
        ->assertJsonPath('success', true)
        ->assertJson(fn ($json) => $json
            ->whereType('data.checkout_url', 'string')
            ->etc());

    $secondResponse = $this->postJson("/api/customer/bookings/{$booking->id}/continue-payment")
        ->assertOk();

    $firstTransactionReference = transactionReferenceFromCheckoutUrl($firstResponse->json('data.checkout_url'));
    $secondTransactionReference = transactionReferenceFromCheckoutUrl($secondResponse->json('data.checkout_url'));

    expect($firstTransactionReference)
        ->toMatch('/^P'.$booking->payment->id.'A[A-Z0-9]{20}$/')
        ->not->toBe($secondTransactionReference);

    expect(Booking::query()->count())->toBe(1)
        ->and(Payment::query()->count())->toBe(1);

    $this->assertDatabaseHas('tour_departures', [
        'id' => $booking->tour_departure_id,
        'booked_slots' => $booking->number_of_people,
    ]);
});

test('customer cannot continue or cancel another customers booking', function () {
    configureVnpayForTest();
    $owner = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $owner->id]);
    Sanctum::actingAs(paymentSafetyUser('customer'));

    $this->postJson("/api/customer/bookings/{$booking->id}/continue-payment")
        ->assertNotFound();
    $this->patchJson("/api/customer/bookings/{$booking->id}/cancel")
        ->assertNotFound();

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'status' => 'pending',
        'payment_status' => 'unpaid',
    ]);
});

test('continuing an expired booking cancels it and releases slots', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $customer->id, 'number_of_people' => 2]);
    $booking->payment->update(['expires_at' => now()->subMinute()]);
    Sanctum::actingAs($customer);

    $this->postJson("/api/customer/bookings/{$booking->id}/continue-payment")
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Đơn hàng đã hết thời gian giữ chỗ thanh toán.');

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'status' => 'cancelled',
        'payment_status' => 'failed',
    ]);
    $this->assertDatabaseHas('tour_departures', [
        'id' => $booking->tour_departure_id,
        'booked_slots' => 0,
    ]);
});

test('customer can cancel a pending booking and slots are released only once', function () {
    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $customer->id, 'number_of_people' => 2]);
    Sanctum::actingAs($customer);

    $this->patchJson("/api/customer/bookings/{$booking->id}/cancel")
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled')
        ->assertJsonPath('data.payment_status', 'failed')
        ->assertJsonPath('data.payment.status', 'failed');

    $this->patchJson("/api/customer/bookings/{$booking->id}/cancel")
        ->assertOk()
        ->assertJsonPath('data.status', 'cancelled');

    $this->assertDatabaseHas('tour_departures', [
        'id' => $booking->tour_departure_id,
        'booked_slots' => 0,
    ]);
    $this->assertDatabaseHas('booking_status_histories', [
        'booking_id' => $booking->id,
        'old_status' => 'pending',
        'new_status' => 'cancelled',
        'note' => 'Khách hàng chủ động hủy đơn chờ thanh toán.',
    ]);
    expect($booking->statusHistories()->count())->toBe(1);
});

test('customer cannot continue or cancel a paid booking', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking([
        'user_id' => $customer->id,
        'payment_status' => 'paid',
    ]);
    $booking->payment->update(['status' => 'success', 'paid_at' => now()]);
    Sanctum::actingAs($customer);

    $this->postJson("/api/customer/bookings/{$booking->id}/continue-payment")
        ->assertUnprocessable();
    $this->patchJson("/api/customer/bookings/{$booking->id}/cancel")
        ->assertUnprocessable();

    $this->assertDatabaseHas('tour_departures', [
        'id' => $booking->tour_departure_id,
        'booked_slots' => $booking->number_of_people,
    ]);
});

test('VNPAY IPN marks the matching booking paid', function () {
    configureVnpayForTest();
    $booking = paymentSafetyBooking();
    $payload = vnpayIpnPayload($booking->payment);

    $this->getJson('/api/webhooks/vnpay?'.http_build_query($payload))
        ->assertOk()
        ->assertJsonPath('RspCode', '00');

    $this->assertDatabaseHas('payments', [
        'id' => $booking->payment->id,
        'status' => 'success',
        'transaction_code' => '1234567890',
    ]);
    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'status' => 'pending',
        'payment_status' => 'paid',
    ]);
});

test('VNPAY IPN with invalid signature does not update payment', function () {
    configureVnpayForTest();
    $booking = paymentSafetyBooking();
    $payload = vnpayIpnPayload($booking->payment);
    $payload['vnp_SecureHash'] = 'invalid';

    $this->getJson('/api/webhooks/vnpay?'.http_build_query($payload))
        ->assertOk()
        ->assertJsonPath('RspCode', '97');

    $this->assertDatabaseHas('payments', [
        'id' => $booking->payment->id,
        'status' => 'pending',
    ]);
});

test('VNPAY return status confirms successful payment without requiring customer token', function () {
    configureVnpayForTest();
    $booking = paymentSafetyBooking();
    $payload = vnpayIpnPayload($booking->payment);

    $this->getJson('/api/vnpay/return-status?'.http_build_query($payload))
        ->assertOk()
        ->assertJsonPath('data.id', $booking->payment->id)
        ->assertJsonPath('data.status', 'success')
        ->assertJsonPath('data.payment_status', 'paid');

    $this->assertDatabaseHas('payments', [
        'id' => $booking->payment->id,
        'status' => 'success',
    ]);
});

test('VNPAY return status rejects payload with invalid signature', function () {
    configureVnpayForTest();
    $booking = paymentSafetyBooking();
    $payload = vnpayIpnPayload($booking->payment);
    $payload['vnp_SecureHash'] = 'invalid';

    $this->getJson('/api/vnpay/return-status?'.http_build_query($payload))
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Dữ liệu trả về từ VNPAY không hợp lệ.');

    $this->assertDatabaseHas('payments', [
        'id' => $booking->payment->id,
        'status' => 'pending',
    ]);
});

test('VNPAY return status keeps a failed attempt available for retry', function () {
    configureVnpayForTest();
    $booking = paymentSafetyBooking(['number_of_people' => 2]);
    $payload = vnpayIpnPayload($booking->payment, [
        'vnp_ResponseCode' => '51',
        'vnp_TransactionStatus' => '02',
    ]);

    $this->getJson('/api/vnpay/return-status?'.http_build_query($payload))
        ->assertOk()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.booking_status', 'pending')
        ->assertJsonPath('data.payment_status', 'unpaid')
        ->assertJsonPath('data.last_attempt_status', 'failed');

    $this->assertDatabaseHas('tour_departures', [
        'id' => $booking->tour_departure_id,
        'booked_slots' => 2,
    ]);
});

test('VNPAY return status cancels booking when customer cancels payment', function () {
    configureVnpayForTest();
    $booking = paymentSafetyBooking(['number_of_people' => 2]);
    $payload = vnpayIpnPayload($booking->payment, [
        'vnp_ResponseCode' => '24',
        'vnp_TransactionStatus' => '02',
    ]);

    $this->getJson('/api/vnpay/return-status?'.http_build_query($payload))
        ->assertOk()
        ->assertJsonPath('data.status', 'failed')
        ->assertJsonPath('data.booking_status', 'cancelled')
        ->assertJsonPath('data.payment_status', 'failed')
        ->assertJsonPath('data.cancel_reason', 'Khách hàng hủy thanh toán trên VNPAY.');

    $this->assertDatabaseHas('tour_departures', [
        'id' => $booking->tour_departure_id,
        'booked_slots' => 0,
    ]);

    $this->getJson('/api/vnpay/return-status?'.http_build_query($payload))->assertOk();

    $this->assertDatabaseHas('tour_departures', [
        'id' => $booking->tour_departure_id,
        'booked_slots' => 0,
    ]);
});

test('VNPAY IPN cancels booking when payment gateway reports timeout', function () {
    configureVnpayForTest();
    $booking = paymentSafetyBooking(['number_of_people' => 2]);
    $payload = vnpayIpnPayload($booking->payment, [
        'vnp_ResponseCode' => '11',
        'vnp_TransactionStatus' => '02',
    ]);

    $this->getJson('/api/webhooks/vnpay?'.http_build_query($payload))
        ->assertOk()
        ->assertJsonPath('RspCode', '00');

    $this->assertDatabaseHas('payments', [
        'id' => $booking->payment->id,
        'status' => 'failed',
    ]);
    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'status' => 'cancelled',
        'payment_status' => 'failed',
        'cancel_reason' => 'Giao dịch VNPAY đã hết hạn thanh toán.',
    ]);
    $this->assertDatabaseHas('tour_departures', [
        'id' => $booking->tour_departure_id,
        'booked_slots' => 0,
    ]);
});

test('VNPAY return status does not accept payment after expiry', function () {
    configureVnpayForTest();
    $booking = paymentSafetyBooking(['number_of_people' => 2]);
    $booking->payment->update(['expires_at' => now()->subMinute()]);
    $payload = vnpayIpnPayload($booking->payment->fresh());

    $this->getJson('/api/vnpay/return-status?'.http_build_query($payload))
        ->assertOk()
        ->assertJsonPath('data.status', 'failed')
        ->assertJsonPath('data.booking_status', 'cancelled');

    $this->assertDatabaseHas('tour_departures', [
        'id' => $booking->tour_departure_id,
        'booked_slots' => 0,
    ]);
});

test('VNPAY IPN rejects an amount different from the payment record', function () {
    configureVnpayForTest();
    $booking = paymentSafetyBooking();
    $payload = vnpayIpnPayload($booking->payment, ['vnp_Amount' => '1']);

    $this->getJson('/api/webhooks/vnpay?'.http_build_query($payload))
        ->assertOk()
        ->assertJsonPath('RspCode', '04');

    $this->assertDatabaseHas('payments', [
        'id' => $booking->payment->id,
        'status' => 'pending',
    ]);
});

test('VNPAY failed attempt keeps the booking pending and accepts a later successful retry', function () {
    configureVnpayForTest();
    $booking = paymentSafetyBooking(['number_of_people' => 2]);
    $payload = vnpayIpnPayload($booking->payment, [
        'vnp_ResponseCode' => '51',
        'vnp_TransactionStatus' => '02',
    ]);

    $this->getJson('/api/webhooks/vnpay?'.http_build_query($payload))
        ->assertOk()
        ->assertJsonPath('RspCode', '00');

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'status' => 'pending',
        'payment_status' => 'unpaid',
    ]);
    $this->assertDatabaseHas('tour_departures', [
        'id' => $booking->tour_departure_id,
        'booked_slots' => 2,
    ]);

    $successfulRetryPayload = vnpayIpnPayload($booking->payment->fresh(), [
        'vnp_TxnRef' => 'P'.$booking->payment->id.'ARETRY123456789012345',
    ]);

    $this->getJson('/api/webhooks/vnpay?'.http_build_query($successfulRetryPayload))
        ->assertOk()
        ->assertJsonPath('RspCode', '00');

    $this->assertDatabaseHas('payments', [
        'id' => $booking->payment->id,
        'status' => 'success',
    ]);
    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'status' => 'pending',
        'payment_status' => 'paid',
    ]);
});

test('expired VNPAY payment releases booked slots exactly once', function () {
    configureVnpayForTest();
    $booking = paymentSafetyBooking(['number_of_people' => 2]);
    $booking->payment->update(['expires_at' => now()->subMinute()]);

    $this->artisan('vnpay:expire-pending-payments')->assertExitCode(0);

    $this->assertDatabaseHas('payments', [
        'id' => $booking->payment->id,
        'status' => 'failed',
    ]);
    $this->assertDatabaseHas('tour_departures', [
        'id' => $booking->tour_departure_id,
        'booked_slots' => 0,
    ]);

    $this->artisan('vnpay:expire-pending-payments')->assertExitCode(0);
    $this->assertDatabaseHas('tour_departures', [
        'id' => $booking->tour_departure_id,
        'booked_slots' => 0,
    ]);
});

test('customer can only see status of their own VNPAY payment', function () {
    configureVnpayForTest();
    $owner = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $owner->id]);
    Sanctum::actingAs($owner);

    $this->getJson("/api/customer/payments/vnpay/{$booking->payment->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $booking->payment->id)
        ->assertJsonPath('data.status', 'pending');

    Sanctum::actingAs(paymentSafetyUser('customer'));

    $this->getJson("/api/customer/payments/vnpay/{$booking->payment->id}")->assertNotFound();
});

test('customer booking is rejected before holding a slot when VNPAY is not configured', function () {
    foreach (['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET', 'VNPAY_RETURN_URL'] as $key) {
        putenv("{$key}=");
        $_ENV[$key] = '';
        $_SERVER[$key] = '';
    }

    $customer = paymentSafetyUser('customer');
    $departure = paymentSafetyDeparture();
    Sanctum::actingAs($customer);

    $this->postJson('/api/customer/bookings', [
        'tour_departure_id' => $departure->id,
        'number_of_people' => 1,
        'quantity_summary' => [
            ['rule_id' => null, 'quantity' => 1],
        ],
        'contact' => [
            'contact_name' => 'Nguyễn Văn An',
            'contact_phone' => '0900000000',
        ],
        'participants' => [
            [
                'full_name' => 'Nguyễn Văn An',
                'birth_date' => now()->subYears(30)->toDateString(),
                'gender' => 'male',
            ],
        ],
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('payment');

    $this->assertDatabaseHas('tour_departures', [
        'id' => $departure->id,
        'booked_slots' => 0,
    ]);

    configureVnpayForTest();
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

    $this->patchJson("/api/admin/payments/{$booking->payment->id}/refund")
        ->assertOk()
        ->assertJsonPath('data.status', 'refunded');

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'payment_status' => 'refunded',
    ]);

    $failedBooking = paymentSafetyBooking();

    $this->patchJson("/api/admin/payments/{$failedBooking->payment->id}/fail")
        ->assertOk()
        ->assertJsonPath('data.status', 'failed');

    $this->assertDatabaseHas('bookings', [
        'id' => $failedBooking->id,
        'payment_status' => 'failed',
    ]);

    $this->patchJson("/api/admin/payments/{$failedBooking->payment->id}/confirm")
        ->assertOk()
        ->assertJsonPath('data.status', 'success');

    $this->assertDatabaseHas('bookings', [
        'id' => $failedBooking->id,
        'payment_status' => 'paid',
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
