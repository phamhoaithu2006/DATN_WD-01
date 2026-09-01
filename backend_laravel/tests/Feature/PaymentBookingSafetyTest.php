<?php

use App\Models\Booking;
use App\Models\BookingConfirmationOutbox;
use App\Models\Payment;
use App\Models\Role;
use App\Models\Tour;
use App\Models\TourAgePricingRule;
use App\Models\TourDeparture;
use App\Models\User;
use App\Jobs\DeliverBookingConfirmationEmail;
use App\Mail\BookingConfirmationMail;
use App\Services\BookingInvoicePdfService;
use App\Services\VnpayPaymentLifecycleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
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

    DB::table('provinces')->updateOrInsert(
        ['id' => 1],
        [
            'created_at' => $now,
            'updated_at' => $now,
        ]
    );

    return Tour::query()->create([
        'category_id' => 1,
        'province_id' => 1,
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

function paymentSafetyStandardAgePricingRules(Tour $tour)
{
    return collect(TourAgePricingRule::standardDefinitions())
        ->map(fn (array $definition) => $tour->agePricingRules()->create($definition));
}

function paymentSafetyBooking(array $attributes = []): Booking
{
    $admin = paymentSafetyUser('admin');
    $tour = paymentSafetyTour();
    $numberOfPeople = (int) ($attributes['number_of_people'] ?? 2);
    $slotCommittedAt = array_key_exists('slot_committed_at', $attributes)
        ? $attributes['slot_committed_at']
        : (($attributes['payment_status'] ?? 'unpaid') === 'paid' ? now() : null);
    $departure = paymentSafetyDeparture($tour, [
        'booked_slots' => $slotCommittedAt ? $numberOfPeople : 0,
    ]);

    $booking = Booking::query()->create(array_merge([
        'booking_code' => 'BK-TEST-'.fake()->unique()->numberBetween(1000, 9999),
        'user_id' => $admin->id,
        'tour_id' => $tour->id,
        'tour_departure_id' => $departure->id,
        'number_of_people' => $numberOfPeople,
        'unit_price' => 1500000,
        'discount_amount' => 0,
        'total_amount' => 1500000 * $numberOfPeople,
        'status' => 'pending',
        'payment_status' => 'unpaid',
        'slot_committed_at' => $slotCommittedAt,
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

function deliverBookingConfirmationEmail(BookingConfirmationOutbox $outbox): void
{
    (new DeliverBookingConfirmationEmail($outbox->id))
        ->handle(app(BookingInvoicePdfService::class));
}

test('guest and non admin cannot access admin booking and payment routes', function () {
    $this->getJson('/api/admin/bookings')->assertUnauthorized();
    $this->getJson('/api/admin/payments')->assertUnauthorized();

    Sanctum::actingAs(paymentSafetyUser('customer'));

    $this->getJson('/api/admin/bookings')->assertForbidden();
    $this->getJson('/api/admin/payments')->assertForbidden();
});

test('customer can restore an active pending booking for the current tour', function () {
    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking([
        'user_id' => $customer->id,
    ]);

    Sanctum::actingAs($customer);

    $this->getJson('/api/customer/bookings/active-pending?tour_id='.$booking->tour_id)
        ->assertOk()
        ->assertJsonPath('data.id', $booking->id)
        ->assertJsonPath('data.payment.status', 'pending')
        ->assertJsonPath('data.status', 'pending');
});

test('customer cannot restore another customer pending booking', function () {
    $owner = paymentSafetyUser('customer');
    $otherCustomer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking([
        'user_id' => $owner->id,
    ]);

    Sanctum::actingAs($otherCustomer);

    $this->getJson('/api/customer/bookings/active-pending?tour_id='.$booking->tour_id)
        ->assertOk()
        ->assertJsonPath('data', null);
});

test('customer cannot restore an expired pending booking', function () {
    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking([
        'user_id' => $customer->id,
    ]);
    $booking->payment()->update(['expires_at' => now()->subMinute()]);

    Sanctum::actingAs($customer);

    $this->getJson('/api/customer/bookings/active-pending?tour_id='.$booking->tour_id)
        ->assertOk()
        ->assertJsonPath('data', null);
});

test('admin booking list marks bookings whose departure has started as departed', function () {
    $booking = paymentSafetyBooking([
        'status' => 'confirmed',
    ]);
    $booking->tourDeparture()->update([
        'departure_date' => today()->toDateString(),
        'return_date' => today()->addDay()->toDateString(),
    ]);

    Sanctum::actingAs(paymentSafetyUser('admin'));

    $this->getJson('/api/admin/bookings?status=departed')
        ->assertOk()
        ->assertJsonPath('data.0.id', $booking->id)
        ->assertJsonPath('data.0.status', 'departed');

    expect($booking->fresh()->status)->toBe('departed');
});

test('admin cannot move a booking of a completed departure back to pending', function () {
    $booking = paymentSafetyBooking(['status' => 'completed']);
    $booking->tourDeparture()->update(['status' => 'completed']);

    Sanctum::actingAs(paymentSafetyUser('admin'));

    $this->putJson("/api/admin/bookings/{$booking->id}", ['status' => 'pending'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');

    expect($booking->fresh()->status)->toBe('completed');
});

test('admin cannot move a paid booking back to pending', function () {
    $booking = paymentSafetyBooking([
        'status' => 'confirmed',
        'payment_status' => 'paid',
    ]);

    Sanctum::actingAs(paymentSafetyUser('admin'));

    $this->putJson("/api/admin/bookings/{$booking->id}", ['status' => 'pending'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');

    expect($booking->fresh()->status)->toBe('confirmed');
});

test('customer cannot cancel more than two bookings', function () {
    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $customer->id]);

    foreach ([1, 2] as $index) {
        $previous = paymentSafetyBooking([
            'user_id' => $customer->id,
            'status' => 'cancelled',
        ]);
        $previous->statusHistories()->create([
            'changed_by' => $customer->id,
            'old_status' => 'pending',
            'new_status' => 'cancelled',
            'note' => "Khách hàng tự hủy lần {$index}.",
        ]);
    }

    Sanctum::actingAs($customer);

    $this->patchJson("/api/customer/bookings/{$booking->id}/cancel")
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Bạn đã sử dụng hết giới hạn 2 lần hủy booking theo chính sách ViVuGo.');

    expect($booking->fresh()->status)->toBe('pending');
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

    $this->assertDatabaseHas('tour_departures', [
        'id' => $departure->id,
        'booked_slots' => 0,
    ]);
});

test('customer booking with only free participants is rejected before reaching VNPAY', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');
    $tour = paymentSafetyTour();
    $departure = paymentSafetyDeparture($tour);
    $infantRule = paymentSafetyStandardAgePricingRules($tour)->first();

    Sanctum::actingAs($customer);

    $response = $this->postJson('/api/customer/bookings', [
        'tour_departure_id' => $departure->id,
        'number_of_people' => 1,
        'quantity_summary' => [
            ['rule_id' => $infantRule->id, 'quantity' => 1],
        ],
        'contact' => [
            'contact_name' => 'Nguyễn Văn An',
            'contact_phone' => '0900000000',
        ],
        'participants' => [
            [
                'full_name' => 'Bé An',
                'birth_date' => now()->toDateString(),
                'gender' => 'male',
            ],
        ],
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['participants']);

    $this->assertDatabaseCount('bookings', 0);
    $this->assertDatabaseCount('payments', 0);
});

test('customer booking preview returns the latest available slots before confirmation', function () {
    $customer = paymentSafetyUser('customer');
    $departure = paymentSafetyDeparture(null, [
        'total_slots' => 10,
        'booked_slots' => 8,
    ]);

    Sanctum::actingAs($customer);

    $this->postJson('/api/customer/bookings/preview', [
        'tour_departure_id' => $departure->id,
        'quantity_summary' => [
            ['rule_id' => null, 'quantity' => 2],
        ],
    ])
        ->assertOk()
        ->assertJsonPath('data.available_slots', 2)
        ->assertJsonPath('data.total_people', 2);
});

test('customer booking preview rejects a departure that ran out of slots before confirmation', function () {
    $customer = paymentSafetyUser('customer');
    $departure = paymentSafetyDeparture(null, [
        'total_slots' => 10,
        'booked_slots' => 10,
    ]);

    Sanctum::actingAs($customer);

    $this->postJson('/api/customer/bookings/preview', [
        'tour_departure_id' => $departure->id,
        'quantity_summary' => [
            ['rule_id' => null, 'quantity' => 1],
        ],
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('quantity_summary');

    $this->assertDatabaseCount('bookings', 0);
    $this->assertDatabaseCount('payments', 0);
});

test('customer booking preview applies fixed age prices to the selected departure', function () {
    $customer = paymentSafetyUser('customer');
    $tour = paymentSafetyTour();
    $rules = paymentSafetyStandardAgePricingRules($tour);
    $departure = paymentSafetyDeparture($tour, [
        'base_price' => 6490000,
        'discount_price' => 6190000,
    ]);

    Sanctum::actingAs($customer);

    $response = $this->postJson('/api/customer/bookings/preview', [
        'tour_departure_id' => $departure->id,
        'quantity_summary' => [
            ['rule_id' => $rules[0]->id, 'quantity' => 1],
            ['rule_id' => $rules[1]->id, 'quantity' => 1],
            ['rule_id' => $rules[2]->id, 'quantity' => 1],
        ],
    ])
        ->assertOk();

    expect((float) $response->json('data.adult_price'))->toBe(6190000.0)
        ->and((float) $response->json('data.pricing_groups.0.unit_price'))->toBe(0.0)
        ->and((float) $response->json('data.pricing_groups.1.unit_price'))->toBe(4333000.0)
        ->and((float) $response->json('data.pricing_groups.2.unit_price'))->toBe(6190000.0)
        ->and($response->json('data.total_people'))->toBe(3)
        ->and((float) $response->json('data.total_amount'))->toBe(10523000.0);
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
        'booked_slots' => 0,
    ]);
});

test('customer booking creation is rate limited after three requests per minute', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');

    Sanctum::actingAs($customer);

    $responses = [];
    foreach (range(1, 4) as $index) {
        $departure = paymentSafetyDeparture();
        $responses[] = $this->withHeader('Idempotency-Key', "booking-rate-limit-test-{$index}")
            ->postJson('/api/customer/bookings', customerBookingSafetyPayload(
                $departure,
                sprintf('09000000%02d', $index),
            ));

        if ($responses[$index - 1]->status() === 201) {
            $bookingId = $responses[$index - 1]->json('data.id');
            $this->patchJson(
                "/api/customer/bookings/{$bookingId}/cancel",
                ['reason' => 'Giải phóng đơn để kiểm tra giới hạn request.']
            )->assertOk();

            // Không để thao tác dọn dữ liệu của test chạm giới hạn hủy booking
            // toàn tài khoản; test này chỉ kiểm tra rate limiter tạo booking.
            Booking::query()->whereKey($bookingId)->update(['status' => 'cancelled_by_tour']);
        }
    }

    $responses[0]->assertCreated();
    $responses[1]->assertCreated();
    $responses[2]->assertCreated();
    $responses[3]->assertTooManyRequests();
});

test('customer payment retry is rate limited after five requests per booking per minute', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $customer->id]);
    $expiresAt = $booking->payment->expires_at->toIso8601String();

    Sanctum::actingAs($customer);

    $responses = [];
    foreach (range(1, 6) as $index) {
        $responses[] = $this->postJson("/api/customer/bookings/{$booking->id}/continue-payment");
    }

    foreach (array_slice($responses, 0, 5) as $response) {
        $response->assertOk();
    }
    $responses[5]->assertTooManyRequests();

    expect($booking->fresh()->payment->expires_at->toIso8601String())->toBe($expiresAt);
});

test('customer payment stores the frontend origin and sends VNPAY to the backend callback', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');
    $departure = paymentSafetyDeparture();

    Sanctum::actingAs($customer);

    $response = $this->withHeader('Origin', 'http://localhost:5174')
        ->postJson('/api/customer/bookings', customerBookingSafetyPayload($departure));

    $response->assertCreated();
    $bookingId = $response->json('data.id');
    $payment = Payment::query()->where('booking_id', $bookingId)->firstOrFail();
    parse_str((string) parse_url($response->json('data.checkout_url'), PHP_URL_QUERY), $query);

    expect($payment->frontend_origin)
        ->toBe('http://localhost:5174')
        ->and($query['vnp_ReturnUrl'] ?? null)
        ->toEndWith('/api/vnpay/return');
});

test('VNPAY backend callback processes payment and redirects to the stored frontend origin', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $customer->id]);
    $booking->payment->update(['frontend_origin' => 'http://127.0.0.1:5173']);
    $payload = vnpayIpnPayload($booking->payment);

    $response = $this->get('/api/vnpay/return?'.http_build_query($payload));
    $location = (string) $response->headers->get('Location');

    $response->assertStatus(302);
    expect($location)
        ->toStartWith('http://127.0.0.1:5173/payment/vnpay/return?')
        ->toContain('vnp_TxnRef='.urlencode($payload['vnp_TxnRef']));

    $this->assertDatabaseHas('payments', [
        'id' => $booking->payment->id,
        'status' => 'success',
    ]);
    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'payment_status' => 'paid',
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

test('continuing an expired booking cancels it without changing slots', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $customer->id, 'number_of_people' => 2]);
    $booking->payment->update(['expires_at' => now()->subMinute()]);
    Sanctum::actingAs($customer);

    $this->postJson("/api/customer/bookings/{$booking->id}/continue-payment")
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Đơn hàng đã hết thời gian thanh toán.');

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
        'status' => 'confirmed',
        'payment_status' => 'paid',
    ]);
    $this->assertDatabaseHas('tour_departures', [
        'id' => $booking->tour_departure_id,
        'booked_slots' => $booking->number_of_people,
    ]);
    $this->assertNotNull($booking->fresh()->slot_committed_at);
});

test('successful VNPAY payment commits slots exactly once', function () {
    configureVnpayForTest();
    $booking = paymentSafetyBooking(['number_of_people' => 2]);
    $payload = vnpayIpnPayload($booking->payment);

    $this->getJson('/api/webhooks/vnpay?'.http_build_query($payload))
        ->assertOk()
        ->assertJsonPath('RspCode', '00');

    $this->getJson('/api/webhooks/vnpay?'.http_build_query($payload))
        ->assertOk();

    $this->assertDatabaseHas('tour_departures', [
        'id' => $booking->tour_departure_id,
        'booked_slots' => 2,
    ]);
    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'payment_status' => 'paid',
    ]);
});

test('successful VNPAY payment queues one confirmation email with a PDF invoice', function () {
    configureVnpayForTest();
    Mail::fake();
    Queue::fake();

    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $customer->id]);
    $booking->contact()->create([
        'contact_name' => 'Nguyễn Văn An',
        'contact_email' => 'booking-contact@example.com',
        'contact_phone' => '0900000000',
        'phone_normalized' => '0900000000',
    ]);

    $this->getJson('/api/webhooks/vnpay?'.http_build_query(vnpayIpnPayload($booking->payment)))
        ->assertOk()
        ->assertJsonPath('RspCode', '00');

    $outbox = BookingConfirmationOutbox::query()->where('booking_id', $booking->id)->firstOrFail();

    expect($outbox->recipient_email)->toBe('booking-contact@example.com')
        ->and($outbox->payload['booking_code'])->toBe($booking->booking_code)
        ->and($outbox->processed_at)->toBeNull();

    Queue::assertPushed(DeliverBookingConfirmationEmail::class, 1);
    deliverBookingConfirmationEmail($outbox);

    Mail::assertSent(BookingConfirmationMail::class, function (BookingConfirmationMail $mail) use ($booking): bool {
        $attachment = $mail->attachments()[0];
        $pdfContent = $attachment->attachWith(
            fn (string $path): string => (string) file_get_contents($path),
            fn (\Closure $data): string => $data(),
        );

        return $mail->hasTo('booking-contact@example.com')
            && str_contains($mail->render(), $booking->booking_code)
            && $attachment->as === "hoa-don-{$booking->booking_code}.pdf"
            && $attachment->mime === 'application/pdf'
            && str_starts_with($pdfContent, '%PDF-');
    });
    Mail::assertSentCount(1);

    expect($outbox->fresh()->processed_at)->not->toBeNull();
});

test('repeated VNPAY callbacks do not create a second booking confirmation outbox', function () {
    configureVnpayForTest();
    Mail::fake();
    Queue::fake();

    $booking = paymentSafetyBooking();
    $booking->contact()->create([
        'contact_name' => 'Nguyễn Văn An',
        'contact_email' => 'booking@example.com',
        'contact_phone' => '0900000000',
        'phone_normalized' => '0900000000',
    ]);
    $payload = vnpayIpnPayload($booking->payment);

    $this->getJson('/api/webhooks/vnpay?'.http_build_query($payload))->assertOk();
    $this->getJson('/api/webhooks/vnpay?'.http_build_query($payload))->assertOk();

    expect(BookingConfirmationOutbox::query()->where('booking_id', $booking->id)->count())->toBe(1);

    $outbox = BookingConfirmationOutbox::query()->where('booking_id', $booking->id)->firstOrFail();
    Queue::assertPushed(DeliverBookingConfirmationEmail::class, 1);
    deliverBookingConfirmationEmail($outbox);
    deliverBookingConfirmationEmail($outbox);

    Mail::assertSentCount(1);
    expect($outbox->fresh()->processed_at)->not->toBeNull();
});

test('booking without contact email falls back to the customer account email', function () {
    configureVnpayForTest();
    Mail::fake();
    Queue::fake();

    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $customer->id]);
    $booking->contact()->create([
        'contact_name' => 'Nguyễn Văn An',
        'contact_email' => null,
        'contact_phone' => '0900000000',
        'phone_normalized' => '0900000000',
    ]);

    $this->getJson('/api/webhooks/vnpay?'.http_build_query(vnpayIpnPayload($booking->payment)))
        ->assertOk();

    $outbox = BookingConfirmationOutbox::query()->where('booking_id', $booking->id)->firstOrFail();
    expect($outbox->recipient_email)->toBe($customer->email);

    Queue::assertPushed(DeliverBookingConfirmationEmail::class, 1);
    deliverBookingConfirmationEmail($outbox);

    Mail::assertSent(BookingConfirmationMail::class, fn (BookingConfirmationMail $mail): bool => $mail->hasTo($customer->email));
});

test('admin payment confirmation sends a booking confirmation email', function () {
    Mail::fake();
    Queue::fake();

    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $customer->id]);
    $booking->contact()->create([
        'contact_name' => 'Nguyễn Văn An',
        'contact_email' => 'admin-confirm@example.com',
        'contact_phone' => '0900000000',
        'phone_normalized' => '0900000000',
    ]);

    Sanctum::actingAs(paymentSafetyUser('admin'));

    $this->patchJson("/api/admin/payments/{$booking->payment->id}/confirm", [
        'transaction_code' => 'MANUAL-CONFIRM-001',
    ])->assertOk();

    $outbox = BookingConfirmationOutbox::query()->where('booking_id', $booking->id)->firstOrFail();
    Queue::assertPushed(DeliverBookingConfirmationEmail::class, 1);
    deliverBookingConfirmationEmail($outbox);

    Mail::assertSent(BookingConfirmationMail::class, function (BookingConfirmationMail $mail) use ($booking): bool {
        return $mail->hasTo('admin-confirm@example.com')
            && $mail->invoice['transaction_code'] === 'MANUAL-CONFIRM-001';
    });
});

test('booking creation and paid-but-sold-out flow do not send a false confirmation email', function () {
    configureVnpayForTest();
    Mail::fake();
    Queue::fake();

    $customer = paymentSafetyUser('customer');
    $departure = paymentSafetyDeparture(null, ['total_slots' => 1]);
    Sanctum::actingAs($customer);

    $created = $this->withHeader('Idempotency-Key', 'booking-confirmation-pending-0001')
        ->postJson('/api/customer/bookings', customerBookingSafetyPayload($departure))
        ->assertCreated();

    $firstBooking = Booking::query()->findOrFail($created->json('data.id'));
    expect($firstBooking->status)->toBe('pending')
        ->and(BookingConfirmationOutbox::query()->count())->toBe(0);

    $secondCustomer = paymentSafetyUser('customer');
    Sanctum::actingAs($secondCustomer);
    $secondCreated = $this->withHeader('Idempotency-Key', 'booking-confirmation-sold-out-0001')
        ->postJson('/api/customer/bookings', customerBookingSafetyPayload($departure, '0900000011'))
        ->assertCreated();

    $firstBooking = $firstBooking->fresh(['payment']);
    $secondBooking = Booking::query()->findOrFail($secondCreated->json('data.id'));

    $this->getJson('/api/webhooks/vnpay?'.http_build_query(vnpayIpnPayload($firstBooking->payment)))->assertOk();
    $this->getJson('/api/webhooks/vnpay?'.http_build_query(vnpayIpnPayload($secondBooking->payment)))->assertOk();

    expect(BookingConfirmationOutbox::query()->where('booking_id', $firstBooking->id)->count())->toBe(1)
        ->and(BookingConfirmationOutbox::query()->where('booking_id', $secondBooking->id)->count())->toBe(0)
        ->and($secondBooking->fresh()->payment_status)->toBe('refund_pending');

    $firstOutbox = BookingConfirmationOutbox::query()->where('booking_id', $firstBooking->id)->firstOrFail();
    Queue::assertPushed(DeliverBookingConfirmationEmail::class, 1);
    deliverBookingConfirmationEmail($firstOutbox);
    Mail::assertSentCount(1);
});

test('payment succeeds but booking waits for refund when the last slots are taken first', function () {
    configureVnpayForTest();
    $departure = paymentSafetyDeparture(null, [
        'total_slots' => 1,
        'booked_slots' => 0,
    ]);
    $firstCustomer = paymentSafetyUser('customer');
    $secondCustomer = paymentSafetyUser('customer');

    Sanctum::actingAs($firstCustomer);
    $firstResponse = $this->postJson(
        '/api/customer/bookings',
        customerBookingSafetyPayload($departure, '0900000011')
    )->assertCreated();

    Sanctum::actingAs($secondCustomer);
    $secondResponse = $this->postJson(
        '/api/customer/bookings',
        customerBookingSafetyPayload($departure, '0900000012')
    )->assertCreated();

    $firstBooking = Booking::query()->findOrFail($firstResponse->json('data.id'));
    $secondBooking = Booking::query()->findOrFail($secondResponse->json('data.id'));

    $this->getJson('/api/webhooks/vnpay?'.http_build_query(vnpayIpnPayload($firstBooking->payment)))
        ->assertOk()
        ->assertJsonPath('RspCode', '00');
    $this->getJson('/api/webhooks/vnpay?'.http_build_query(vnpayIpnPayload($secondBooking->payment)))
        ->assertOk()
        ->assertJsonPath('RspCode', '00');

    $this->assertDatabaseHas('tour_departures', [
        'id' => $departure->id,
        'booked_slots' => 1,
    ]);
    $this->assertDatabaseHas('bookings', [
        'id' => $firstBooking->id,
        'payment_status' => 'paid',
    ]);
    expect($firstBooking->fresh()->slot_committed_at)->not->toBeNull();
    $this->assertDatabaseHas('bookings', [
        'id' => $secondBooking->id,
        'status' => 'cancelled',
        'payment_status' => 'refund_pending',
        'cancel_reason' => VnpayPaymentLifecycleService::SOLD_OUT_AFTER_PAYMENT_REASON,
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
        ->assertJsonPath('data.booking_status', 'confirmed')
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
        'booked_slots' => 0,
    ]);
});

test('VNPAY return status keeps booking pending when customer goes back', function () {
    configureVnpayForTest();
    $booking = paymentSafetyBooking(['number_of_people' => 2]);
    $payload = vnpayIpnPayload($booking->payment, [
        'vnp_ResponseCode' => '24',
        'vnp_TransactionStatus' => '02',
    ]);

    $this->getJson('/api/vnpay/return-status?'.http_build_query($payload))
        ->assertOk()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.booking_status', 'pending')
        ->assertJsonPath('data.payment_status', 'unpaid')
        ->assertJsonPath('data.cancel_reason', null)
        ->assertJsonPath('data.last_attempt_status', 'returned');

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

test('customer can explicitly cancel their pending VNPAY payment', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $customer->id]);
    Sanctum::actingAs($customer);

    $this->patchJson("/api/customer/payments/vnpay/{$booking->payment->id}/cancel")
        ->assertOk()
        ->assertJsonPath('data.status', 'failed')
        ->assertJsonPath('data.booking_status', 'cancelled')
        ->assertJsonPath('data.payment_status', 'failed')
        ->assertJsonPath('data.cancel_reason', 'Khách hàng chủ động hủy thanh toán.');

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
        'status' => 'cancelled',
        'payment_status' => 'failed',
        'cancel_reason' => 'Khách hàng chủ động hủy thanh toán.',
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
        'booked_slots' => 0,
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
        'status' => 'confirmed',
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

test('admin booking list shows newest booking first when timestamps are equal', function () {
    Sanctum::actingAs(paymentSafetyUser('admin'));
    $createdAt = now()->subHour()->startOfSecond();
    $olderId = paymentSafetyBooking(['created_at' => $createdAt, 'updated_at' => $createdAt]);
    $newerId = paymentSafetyBooking(['created_at' => $createdAt, 'updated_at' => $createdAt]);

    $this->getJson('/api/admin/bookings')
        ->assertOk()
        ->assertJsonPath('data.0.id', $newerId->id)
        ->assertJsonPath('data.1.id', $olderId->id);
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
        'status' => 'confirmed',
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

test('admin booking update keeps committed departure slots in sync', function () {
    Sanctum::actingAs(paymentSafetyUser('admin'));
    $booking = paymentSafetyBooking([
        'number_of_people' => 2,
        'payment_status' => 'paid',
    ]);

    $this->putJson("/api/admin/bookings/{$booking->id}", [
        'number_of_people' => 4,
    ])->assertOk();

    expect($booking->fresh()->number_of_people)->toBe(4)
        ->and($booking->tourDeparture->fresh()->booked_slots)->toBe(4);

    $this->putJson("/api/admin/bookings/{$booking->id}", [
        'number_of_people' => 1,
    ])->assertOk();

    expect($booking->fresh()->number_of_people)->toBe(1)
        ->and($booking->tourDeparture->fresh()->booked_slots)->toBe(1);
});

test('admin booking update rejects committed guests beyond departure capacity', function () {
    Sanctum::actingAs(paymentSafetyUser('admin'));
    $booking = paymentSafetyBooking([
        'number_of_people' => 2,
        'payment_status' => 'paid',
    ]);

    $this->putJson("/api/admin/bookings/{$booking->id}", [
        'number_of_people' => 11,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('number_of_people');

    expect($booking->fresh()->number_of_people)->toBe(2)
        ->and($booking->tourDeparture->fresh()->booked_slots)->toBe(2);
});

test('cancel booking releases slots once then becomes read only', function () {
    Sanctum::actingAs(paymentSafetyUser('admin'));
    $booking = paymentSafetyBooking(['number_of_people' => 2]);
    $departureId = $booking->tour_departure_id;

    $this->patchJson("/api/admin/bookings/{$booking->id}/cancel")
        ->assertOk();

    $this->assertDatabaseHas('tour_departures', [
        'id' => $departureId,
        'booked_slots' => 0,
    ]);

    $this->assertDatabaseHas('booking_status_histories', [
        'booking_id' => $booking->id,
        'old_status' => 'pending',
        'new_status' => 'cancelled',
    ]);

    $this->getJson("/api/admin/bookings/{$booking->id}")
        ->assertOk()
        ->assertJsonPath('data.status_histories.0.new_status', 'cancelled')
        ->assertJsonStructure(['data' => ['status_histories', 'disruption_requests']]);

    $this->patchJson("/api/admin/bookings/{$booking->id}/cancel")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');

    $this->assertDatabaseHas('tour_departures', [
        'id' => $departureId,
        'booked_slots' => 0,
    ]);
});

test('only cancelled booking can be permanently deleted with related payment', function () {
    Sanctum::actingAs(paymentSafetyUser('admin'));
    $booking = paymentSafetyBooking();

    $this->deleteJson("/api/admin/bookings/{$booking->id}")
        ->assertStatus(422)
        ->assertJsonPath('message', 'Chỉ có thể xóa vĩnh viễn booking đã hủy.');

    $this->assertDatabaseHas('bookings', [
        'id' => $booking->id,
    ]);

    $booking->update(['status' => 'cancelled']);

    $this->deleteJson("/api/admin/bookings/{$booking->id}")
        ->assertOk()
        ->assertJsonPath('message', 'Đã xóa booking vĩnh viễn.');

    $this->assertDatabaseMissing('bookings', [
        'id' => $booking->id,
    ]);

    $this->assertDatabaseMissing('payments', [
        'booking_id' => $booking->id,
    ]);
});

function customerBookingSafetyPayload(TourDeparture $departure, string $contactPhone = '0900000000', ?string $participantPhone = null): array
{
    return [
        'tour_departure_id' => $departure->id,
        'number_of_people' => 1,
        'quantity_summary' => [
            ['rule_id' => null, 'quantity' => 1],
        ],
        'contact' => [
            'contact_name' => 'Nguyễn Văn An',
            'contact_email' => 'an@example.com',
            'contact_phone' => $contactPhone,
        ],
        'participants' => [
            [
                'full_name' => 'Nguyễn Văn An',
                'phone' => $participantPhone,
                'birth_date' => now()->subYears(30)->toDateString(),
                'gender' => 'male',
            ],
        ],
    ];
}

test('customer booking reuses the booking for a repeated idempotency key', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');
    $departure = paymentSafetyDeparture();
    $idempotencyKey = 'booking-safety-idempotency-0001';

    Sanctum::actingAs($customer);

    $first = $this->withHeader('Idempotency-Key', $idempotencyKey)
        ->postJson('/api/customer/bookings', customerBookingSafetyPayload($departure));
    $second = $this->withHeader('Idempotency-Key', $idempotencyKey)
        ->postJson('/api/customer/bookings', customerBookingSafetyPayload($departure));

    $first->assertCreated();
    $second->assertOk()
        ->assertJsonPath('data.id', $first->json('data.id'));

    $this->assertDatabaseCount('bookings', 1);
    $this->assertDatabaseHas('tour_departures', [
        'id' => $departure->id,
        'booked_slots' => 0,
    ]);
});

test('customer cannot create another booking while an existing payment is pending', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');
    $firstDeparture = paymentSafetyDeparture();
    $secondDeparture = paymentSafetyDeparture();

    Sanctum::actingAs($customer);

    $first = $this->withHeader('Idempotency-Key', 'booking-active-pending-first-0001')
        ->postJson('/api/customer/bookings', customerBookingSafetyPayload($firstDeparture));
    $second = $this->withHeader('Idempotency-Key', 'booking-active-pending-second-0001')
        ->postJson('/api/customer/bookings', customerBookingSafetyPayload(
            $secondDeparture,
            '0900000011',
            '0900000012',
        ));

    $first->assertCreated();
    $second->assertStatus(409)
        ->assertJsonPath('code', 'ACTIVE_PENDING_BOOKING')
        ->assertJsonPath('data.booking_id', $first->json('data.id'))
        ->assertJsonPath('data.payment_id', $first->json('data.payment.id'));

    expect(Booking::query()->where('user_id', $customer->id)->count())->toBe(1)
        ->and(Payment::query()->count())->toBe(1);

    $this->assertDatabaseHas('tour_departures', [
        'id' => $firstDeparture->id,
        'booked_slots' => 0,
    ]);
    $this->assertDatabaseHas('tour_departures', [
        'id' => $secondDeparture->id,
        'booked_slots' => 0,
    ]);
});

test('customer can create a new booking after the previous pending payment expires', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');
    $firstDeparture = paymentSafetyDeparture();
    $secondDeparture = paymentSafetyDeparture();

    Sanctum::actingAs($customer);

    $first = $this->withHeader('Idempotency-Key', 'booking-expired-pending-first-0001')
        ->postJson('/api/customer/bookings', customerBookingSafetyPayload($firstDeparture));
    $first->assertCreated();

    $firstBooking = Booking::query()->findOrFail($first->json('data.id'));
    $firstBooking->payment()->update(['expires_at' => now()->subMinute()]);

    $second = $this->withHeader('Idempotency-Key', 'booking-expired-pending-second-0001')
        ->postJson('/api/customer/bookings', customerBookingSafetyPayload(
            $secondDeparture,
            '0900000021',
            '0900000022',
        ));

    $second->assertCreated();

    expect($firstBooking->fresh()->status)->toBe('cancelled')
        ->and($firstBooking->fresh()->payment_status)->toBe('failed')
        ->and(Booking::query()->where('user_id', $customer->id)->count())->toBe(2);

    $this->assertDatabaseHas('tour_departures', [
        'id' => $firstDeparture->id,
        'booked_slots' => 0,
    ]);
});

test('customer booking rejects a phone duplicated across contact and passenger of active booking', function () {
    configureVnpayForTest();
    $tour = paymentSafetyTour();
    $departure = paymentSafetyDeparture($tour);
    $existing = Booking::query()->create([
        'booking_code' => 'BK-PHONE-SAFETY',
        'user_id' => paymentSafetyUser('customer')->id,
        'tour_id' => $tour->id,
        'tour_departure_id' => $departure->id,
        'number_of_people' => 1,
        'unit_price' => 1500000,
        'discount_amount' => 0,
        'total_amount' => 1500000,
        'status' => 'confirmed',
        'payment_status' => 'paid',
    ]);
    $existing->contact()->create([
        'contact_name' => 'Khách đã đặt',
        'contact_email' => 'existing@example.com',
        'contact_phone' => '0901111111',
        'phone_normalized' => '0901111111',
    ]);

    Sanctum::actingAs(paymentSafetyUser('customer'));

    $this->postJson(
        '/api/customer/bookings',
        customerBookingSafetyPayload($departure, '0902222222', '0901111111')
    )
        ->assertUnprocessable()
        ->assertJsonValidationErrors('contact.contact_phone');
});

test('customer booking derives participant type and price from age at departure', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');
    $tour = paymentSafetyTour();
    $departure = paymentSafetyDeparture($tour);
    $rules = paymentSafetyStandardAgePricingRules($tour);
    $infantRule = $rules[0];
    $adultRule = $rules[2];

    Sanctum::actingAs($customer);

    $response = $this->postJson('/api/customer/bookings', [
        'tour_departure_id' => $departure->id,
        'number_of_people' => 2,
        'quantity_summary' => [
            ['rule_id' => $infantRule->id, 'quantity' => 1],
            ['rule_id' => $adultRule->id, 'quantity' => 1],
        ],
        'contact' => [
            'contact_name' => 'Nguyễn Văn An',
            'contact_email' => 'an@example.com',
            'contact_phone' => '0900000000',
        ],
        'participants' => [
            [
                'full_name' => 'Bé An',
                'birth_date' => $departure->departure_date->copy()->subYears(1)->toDateString(),
                'gender' => 'male',
            ],
            [
                'full_name' => 'Người lớn An',
                'birth_date' => $departure->departure_date->copy()->subYears(30)->toDateString(),
                'gender' => 'male',
            ],
        ],
    ]);

    $response->assertCreated();
    $booking = Booking::query()->with('participants')->findOrFail($response->json('data.id'));
    $participants = $booking->participants->keyBy('full_name');

    expect($participants->get('Người lớn An')->participant_type)
        ->toBe('adult')
        ->and((float) $participants->get('Người lớn An')->unit_price)
        ->toBe(1500000.0)
        ->and((float) $participants->get('Người lớn An')->pricing_value)
        ->toBe(100.0)
        ->and($participants->get('Bé An')->participant_type)
        ->toBe('infant')
        ->and((float) $participants->get('Bé An')->unit_price)
        ->toBe(0.0);
});

test('customer booking rejects participants whose age groups exceed the selected quantities', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');
    $tour = paymentSafetyTour();
    $departure = paymentSafetyDeparture($tour);
    $rules = paymentSafetyStandardAgePricingRules($tour);
    $childRule = $rules[1];
    $adultRule = $rules[2];

    Sanctum::actingAs($customer);

    $response = $this->postJson('/api/customer/bookings', [
        'tour_departure_id' => $departure->id,
        'number_of_people' => 3,
        'quantity_summary' => [
            ['rule_id' => $childRule->id, 'quantity' => 1],
            ['rule_id' => $adultRule->id, 'quantity' => 2],
        ],
        'contact' => [
            'contact_name' => 'Nguyễn Văn An',
            'contact_email' => 'an@example.com',
            'contact_phone' => '0900000000',
        ],
        'participants' => [
            [
                'full_name' => 'Người lớn An',
                'birth_date' => $departure->departure_date->copy()->subYears(30)->toDateString(),
                'gender' => 'male',
            ],
            [
                'full_name' => 'Bé An 1',
                'birth_date' => $departure->departure_date->copy()->subYears(5)->toDateString(),
                'gender' => 'male',
            ],
            [
                'full_name' => 'Bé An 2',
                'birth_date' => $departure->departure_date->copy()->subYears(6)->toDateString(),
                'gender' => 'male',
            ],
        ],
    ]);

    $response
        ->assertUnprocessable()
        ->assertJsonValidationErrors([
            'participants.2.birth_date',
        ]);

    expect($response->json('errors'))->toBe([
        'participants.2.birth_date' => ['Ngày sinh không hợp lệ.'],
    ]);

    $this->assertDatabaseCount('bookings', 0);
    $this->assertDatabaseCount('payments', 0);
    $this->assertDatabaseHas('tour_departures', [
        'id' => $departure->id,
        'booked_slots' => 0,
    ]);
});

test('customer booking rejects a birth date older than 120 years with the generic message', function () {
    configureVnpayForTest();
    $customer = paymentSafetyUser('customer');
    $tour = paymentSafetyTour();
    $departure = paymentSafetyDeparture($tour);

    Sanctum::actingAs($customer);

    $payload = customerBookingSafetyPayload($departure);
    $payload['participants'][0]['birth_date'] = $departure->departure_date
        ->copy()
        ->subYears(121)
        ->toDateString();

    $response = $this->postJson('/api/customer/bookings', $payload);

    $response
        ->assertUnprocessable()
        ->assertJsonValidationErrors('participants.0.birth_date');

    expect($response->json('errors'))->toBe([
        'participants.0.birth_date' => ['Ngày sinh không hợp lệ.'],
    ]);

    $this->assertDatabaseCount('bookings', 0);
    $this->assertDatabaseCount('payments', 0);
    $this->assertDatabaseHas('tour_departures', [
        'id' => $departure->id,
        'booked_slots' => 0,
    ]);
});

test('customer can update allowed booking information and the change is audited', function () {
    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking([
        'user_id' => $customer->id,
        'status' => 'confirmed',
        'payment_status' => 'paid',
    ]);
    $booking->contact()->create([
        'contact_name' => 'Nguyễn Văn An',
        'contact_email' => 'an@example.com',
        'contact_phone' => '0900000000',
        'phone_normalized' => '0900000000',
    ]);
    $participant = $booking->participants()->create([
        'full_name' => 'Nguyễn Văn An',
        'phone' => '0900000000',
        'phone_normalized' => '0900000000',
        'birth_date' => now()->subYears(30)->toDateString(),
        'gender' => 'male',
        'participant_type' => 'adult',
    ]);

    Sanctum::actingAs($customer);

    $this->patchJson("/api/customer/bookings/{$booking->id}/information", [
        'contact' => [
            'contact_name' => 'Nguyễn Văn Bình',
            'contact_email' => 'binh@example.com',
            'contact_phone' => '+84 901 234 567',
            'address' => 'Hà Nội',
            'special_request' => 'Ăn chay',
        ],
        'participants' => [[
            'id' => $participant->id,
            'full_name' => 'Nguyễn Văn Bình',
            'phone' => '0901234567',
            'gender' => 'male',
            'identity_number' => '001234567890',
        ]],
    ])
        ->assertOk()
        ->assertJsonPath('data.contact.contact_phone', '0901234567');

    $this->assertDatabaseHas('booking_participants', [
        'id' => $participant->id,
        'birth_date' => now()->subYears(30)->toDateString(),
    ]);

    $this->assertDatabaseHas('booking_information_change_histories', [
        'booking_id' => $booking->id,
        'changed_by' => $customer->id,
    ]);
});

test('customer cannot update booking information in the final two days before departure', function () {
    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $customer->id]);
    $booking->tourDeparture()->update([
        'departure_date' => today('Asia/Ho_Chi_Minh')->addDays(2)->toDateString(),
    ]);
    $booking->contact()->create([
        'contact_name' => 'Nguyễn Văn An',
        'contact_email' => 'an@example.com',
        'contact_phone' => '0900000000',
        'phone_normalized' => '0900000000',
    ]);
    $participant = $booking->participants()->create([
        'full_name' => 'Nguyễn Văn An',
        'birth_date' => now()->subYears(30)->toDateString(),
        'gender' => 'male',
        'participant_type' => 'adult',
    ]);

    Sanctum::actingAs($customer);

    $this->patchJson("/api/customer/bookings/{$booking->id}/information", [
        'contact' => [
            'contact_name' => 'Nguyễn Văn An',
            'contact_email' => 'an@example.com',
            'contact_phone' => '0900000000',
        ],
        'participants' => [[
            'id' => $participant->id,
            'full_name' => 'Nguyễn Văn An',
            'gender' => 'male',
        ]],
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('booking');
});

test('legacy customer information endpoints keep the same final two day restriction', function () {
    $customer = paymentSafetyUser('customer');
    $booking = paymentSafetyBooking(['user_id' => $customer->id]);
    $booking->tourDeparture()->update([
        'departure_date' => today('Asia/Ho_Chi_Minh')->addDays(2)->toDateString(),
    ]);
    $booking->contact()->create([
        'contact_name' => 'Nguyễn Văn An',
        'contact_email' => 'an@example.com',
        'contact_phone' => '0900000000',
        'phone_normalized' => '0900000000',
    ]);
    $participant = $booking->participants()->create([
        'full_name' => 'Nguyễn Văn An',
        'birth_date' => now()->subYears(30)->toDateString(),
        'gender' => 'male',
        'participant_type' => 'adult',
    ]);

    Sanctum::actingAs($customer);

    $this->patchJson("/api/customer/bookings/{$booking->id}/contact", [
        'contact_name' => 'Nguyễn Văn Bình',
        'contact_email' => 'binh@example.com',
        'contact_phone' => '0901234567',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('booking');

    $this->patchJson("/api/customer/bookings/{$booking->id}/participants", [
        'participants' => [[
            'id' => $participant->id,
            'full_name' => 'Nguyễn Văn Bình',
            'phone' => '0901234567',
            'gender' => 'male',
        ]],
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('booking');
});
