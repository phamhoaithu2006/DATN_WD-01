<?php

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Role;
use App\Models\Tour;
use App\Models\TourAgePricingRule;
use App\Models\TourDeparture;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function abRegressionRole(string $name): Role
{
    return Role::query()->firstOrCreate(
        ['name' => $name],
        ['description' => ucfirst($name)]
    );
}

function abRegressionUser(string $roleName = 'customer'): User
{
    $role = abRegressionRole($roleName);

    return User::factory()->create([
        'role_id' => $role->id,
        'status' => 'active',
    ]);
}

function abRegressionTour(): Tour
{
    $now = now();

    DB::table('categories')->updateOrInsert(
        ['id' => 1],
        [
            'name' => 'Danh mục kiểm thử nghiệp vụ',
            'slug' => 'danh-muc-kiem-thu-nghiep-vu',
            'description' => 'Danh mục dùng cho test hồi quy nghiệp vụ.',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]
    );

    DB::table('destinations')->updateOrInsert(
        ['id' => 1],
        [
            'name' => 'Điểm đến kiểm thử nghiệp vụ',
            'slug' => 'diem-den-kiem-thu-nghiep-vu',
            'province_city' => 'Hà Nội',
            'country' => 'Việt Nam',
            'description' => 'Điểm đến dùng cho test hồi quy nghiệp vụ.',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]
    );

    return Tour::query()->create([
        'category_id' => 1,
        'destination_id' => 1,
        'title' => 'Tour kiểm thử nghiệp vụ',
        'slug' => 'tour-kiem-thu-nghiep-vu-'.fake()->unique()->numberBetween(1000, 9999),
        'duration_days' => 2,
        'duration_nights' => 1,
        'base_price' => 2000000,
        'discount_price' => 1500000,
        'max_slots' => 20,
        'available_slots' => 20,
        'status' => 'published',
    ]);
}

function abRegressionDeparture(?Tour $tour = null): TourDeparture
{
    $tour ??= abRegressionTour();

    return TourDeparture::query()->create([
        'tour_id' => $tour->id,
        'departure_date' => now()->addDays(10)->toDateString(),
        'return_date' => now()->addDays(11)->toDateString(),
        'base_price' => 2000000,
        'discount_price' => 1500000,
        'total_slots' => 10,
        'booked_slots' => 0,
        'status' => 'open',
    ]);
}

function abRegressionBookingPayload(TourDeparture $departure): array
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
            'contact_phone' => '0900000000',
            'address' => 'Hà Nội',
        ],
        'participants' => [
            [
                'full_name' => 'Nguyễn Văn An',
                'phone' => '0900000000',
                'birth_date' => now()->subYears(30)->toDateString(),
                'gender' => 'male',
                'identity_number' => '012345678901',
            ],
        ],
    ];
}

function abRegressionConfigureVnpay(): void
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

function abRegressionPayment(string $status): Payment
{
    $bookingPaymentStatus = match ($status) {
        'success' => 'paid',
        'failed' => 'failed',
        'refunded' => 'refunded',
        default => 'unpaid',
    };
    $tour = abRegressionTour();
    $departure = abRegressionDeparture($tour);
    $customer = abRegressionUser('customer');

    $booking = Booking::query()->create([
        'booking_code' => 'BK-AB-'.fake()->unique()->numberBetween(1000, 9999),
        'user_id' => $customer->id,
        'tour_id' => $tour->id,
        'tour_departure_id' => $departure->id,
        'number_of_people' => 1,
        'unit_price' => 1500000,
        'discount_amount' => 0,
        'total_amount' => 1500000,
        'status' => 'pending',
        'payment_status' => $bookingPaymentStatus,
    ]);

    return $booking->payment()->create([
        'payment_method' => 'vnpay',
        'amount' => 1500000,
        'status' => $status,
        'paid_at' => in_array($status, ['success', 'refunded'], true) ? now() : null,
        'expires_at' => now()->addMinutes(15),
    ]);
}

test('đăng ký từ chối chuỗi dài hơn giới hạn cột users', function (string $field, string $value) {
    abRegressionRole('customer');

    $payload = [
        'full_name' => 'Nguyễn Văn An',
        'email' => 'an@example.com',
        'phone' => '0900000000',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ];
    $payload[$field] = $value;

    $this->postJson('/api/auth/register', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'full_name dài 151 ký tự' => ['full_name', str_repeat('A', 151)],
    'email dài hơn 150 ký tự' => [
        'email',
        str_repeat('a', 63).'@'.str_repeat('b', 63).'.'.str_repeat('c', 20).'.com',
    ],
    'phone dài 21 ký tự' => ['phone', str_repeat('1', 21)],
]);

test('cập nhật hồ sơ từ chối họ tên dài hơn giới hạn cột users', function () {
    Sanctum::actingAs(abRegressionUser('customer'));

    $this->putJson('/api/profile/update', [
        'full_name' => str_repeat('A', 151),
        'phone' => '0900000000',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('full_name');
});

test('cập nhật hồ sơ chấp nhận số điện thoại đúng giới hạn cột users', function () {
    $customer = abRegressionUser('customer');
    Sanctum::actingAs($customer);

    $this->putJson('/api/profile/update', [
        'full_name' => $customer->full_name,
        'phone' => str_repeat('1', 20),
    ])->assertOk();

    $this->assertDatabaseHas('users', [
        'id' => $customer->id,
        'phone' => str_repeat('1', 20),
    ]);
});

test('cập nhật hồ sơ từ chối số điện thoại dài hơn giới hạn cột users', function () {
    Sanctum::actingAs(abRegressionUser('customer'));

    $this->putJson('/api/profile/update', [
        'full_name' => 'Nguyễn Văn An',
        'phone' => str_repeat('1', 21),
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('phone');
});

test('đặt tour từ chối chuỗi dài hơn giới hạn cột booking', function (string $field, string $value) {
    Sanctum::actingAs(abRegressionUser('customer'));
    $payload = abRegressionBookingPayload(abRegressionDeparture());
    data_set($payload, $field, $value);

    $this->postJson('/api/customer/bookings', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'contact_name dài 151 ký tự' => ['contact.contact_name', str_repeat('A', 151)],
    'contact_email dài hơn 150 ký tự' => [
        'contact.contact_email',
        str_repeat('a', 63).'@'.str_repeat('b', 63).'.'.str_repeat('c', 20).'.com',
    ],
    'contact_phone dài 21 ký tự' => ['contact.contact_phone', str_repeat('1', 21)],
    'address dài 256 ký tự' => ['contact.address', str_repeat('A', 256)],
    'participant full_name dài 151 ký tự' => ['participants.0.full_name', str_repeat('A', 151)],
    'participant phone dài 21 ký tự' => ['participants.0.phone', str_repeat('1', 21)],
    'identity_number dài 31 ký tự' => ['participants.0.identity_number', str_repeat('1', 31)],
]);

test('đặt tour cho phép bỏ contact email và lưu null', function () {
    abRegressionConfigureVnpay();
    Sanctum::actingAs(abRegressionUser('customer'));
    $payload = abRegressionBookingPayload(abRegressionDeparture());
    unset($payload['contact']['contact_email']);

    $response = $this->postJson('/api/customer/bookings', $payload)
        ->assertCreated();

    $this->assertDatabaseHas('booking_contacts', [
        'booking_id' => $response->json('data.id'),
        'contact_email' => null,
    ]);
});

test('rollback contact email nullable giữ lại bản ghi bằng chuỗi rỗng', function () {
    $payment = abRegressionPayment('pending');
    $contact = $payment->booking->contact()->create([
        'contact_name' => 'Nguyễn Văn An',
        'contact_email' => null,
        'contact_phone' => '0900000000',
    ]);
    $migration = require database_path('migrations/2026_07_22_010000_make_booking_contact_email_nullable.php');

    try {
        $migration->down();

        expect($contact->fresh()->contact_email)->toBe('');
    } finally {
        $migration->up();
    }
});

test('tổng tiền booking và payment được tính từ ngày sinh hành khách', function () {
    abRegressionConfigureVnpay();
    Sanctum::actingAs(abRegressionUser('customer'));
    $tour = abRegressionTour();
    $departure = abRegressionDeparture($tour);
    $freeChildRule = TourAgePricingRule::query()->create([
        'tour_id' => $tour->id,
        'label' => 'Trẻ nhỏ miễn phí',
        'min_age' => 0,
        'max_age' => 4,
        'pricing_type' => 'free',
        'price_value' => 0,
        'sort_order' => 1,
        'is_active' => true,
    ]);
    $payload = abRegressionBookingPayload($departure);
    $payload['quantity_summary'] = [
        ['rule_id' => $freeChildRule->id, 'quantity' => 1],
    ];

    $response = $this->postJson('/api/customer/bookings', $payload)
        ->assertCreated();
    $bookingId = $response->json('data.id');

    $this->assertDatabaseHas('booking_participants', [
        'booking_id' => $bookingId,
        'participant_type' => 'adult',
        'unit_price' => 1500000,
    ]);
    $this->assertDatabaseHas('bookings', [
        'id' => $bookingId,
        'total_amount' => 1500000,
    ]);
    $this->assertDatabaseHas('payments', [
        'booking_id' => $bookingId,
        'amount' => 1500000,
    ]);
});

test('admin chỉ thực hiện được chuyển trạng thái thanh toán hợp lệ', function (
    string $currentStatus,
    string $action,
    string $expectedPaymentStatus,
    string $expectedBookingStatus,
) {
    Sanctum::actingAs(abRegressionUser('admin'));
    $payment = abRegressionPayment($currentStatus);

    $this->patchJson("/api/admin/payments/{$payment->id}/{$action}")
        ->assertOk()
        ->assertJsonPath('data.status', $expectedPaymentStatus)
        ->assertJsonPath('data.booking.payment_status', $expectedBookingStatus);

    $this->assertDatabaseHas('payments', [
        'id' => $payment->id,
        'status' => $expectedPaymentStatus,
    ]);
    $this->assertDatabaseHas('bookings', [
        'id' => $payment->booking_id,
        'payment_status' => $expectedBookingStatus,
    ]);
})->with([
    'pending sang success' => ['pending', 'confirm', 'success', 'paid'],
    'pending sang failed' => ['pending', 'fail', 'failed', 'failed'],
    'failed sang success' => ['failed', 'confirm', 'success', 'paid'],
    'success sang refunded' => ['success', 'refund', 'refunded', 'refunded'],
]);

test('admin bị từ chối khi chuyển trạng thái thanh toán không hợp lệ', function (
    string $currentStatus,
    string $action,
) {
    Sanctum::actingAs(abRegressionUser('admin'));
    $payment = abRegressionPayment($currentStatus);
    $bookingPaymentStatus = $payment->booking->payment_status;

    $this->patchJson("/api/admin/payments/{$payment->id}/{$action}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');

    $this->assertDatabaseHas('payments', [
        'id' => $payment->id,
        'status' => $currentStatus,
    ]);
    $this->assertDatabaseHas('bookings', [
        'id' => $payment->booking_id,
        'payment_status' => $bookingPaymentStatus,
    ]);
})->with([
    'pending sang refunded' => ['pending', 'refund'],
    'failed sang failed' => ['failed', 'fail'],
    'failed sang refunded' => ['failed', 'refund'],
    'success sang success' => ['success', 'confirm'],
    'success sang failed' => ['success', 'fail'],
    'refunded sang success' => ['refunded', 'confirm'],
    'refunded sang failed' => ['refunded', 'fail'],
    'refunded sang refunded' => ['refunded', 'refund'],
]);
