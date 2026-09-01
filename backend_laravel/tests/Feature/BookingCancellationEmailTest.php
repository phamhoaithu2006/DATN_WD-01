<?php

use App\Jobs\DeliverBookingCancellationEmail;
use App\Mail\BookingCancellationMail;
use App\Models\Booking;
use App\Models\BookingCancellationOutbox;
use App\Models\BookingDisruptionRequest;
use App\Models\Role;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\User;
use App\Services\BookingCancellationEmailService;
use App\Services\VnpayPaymentLifecycleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function cancellationEmailRole(string $name): Role
{
    return Role::query()->firstOrCreate(
        ['name' => $name],
        ['description' => ucfirst($name)],
    );
}

function cancellationEmailUser(string $role = 'customer', array $attributes = []): User
{
    return User::factory()->create(array_merge([
        'role_id' => cancellationEmailRole($role)->id,
        'status' => 'active',
    ], $attributes));
}

function cancellationEmailTour(): Tour
{
    $now = now();

    DB::table('categories')->updateOrInsert(
        ['id' => 1],
        [
            'name' => 'Danh mục email hủy',
            'slug' => 'danh-muc-email-huy',
            'description' => 'Danh mục dùng cho test email hủy tour.',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ],
    );

    DB::table('provinces')->updateOrInsert(
        ['id' => 1],
        [
            'created_at' => $now,
            'updated_at' => $now,
        ],
    );

    return Tour::query()->create([
        'category_id' => 1,
        'province_id' => 1,
        'title' => 'Tour kiểm thử email hủy',
        'slug' => 'tour-kiem-thu-email-huy-'.fake()->unique()->numberBetween(1000, 9999),
        'duration_days' => 2,
        'duration_nights' => 1,
        'base_price' => 2000000,
        'discount_price' => 1500000,
        'max_slots' => 20,
        'available_slots' => 20,
        'status' => 'published',
    ]);
}

function cancellationEmailDeparture(Tour $tour, array $attributes = []): TourDeparture
{
    return TourDeparture::query()->create(array_merge([
        'tour_id' => $tour->id,
        'departure_date' => now()->addDays(10)->toDateString(),
        'return_date' => now()->addDays(11)->toDateString(),
        'departure_location' => 'Hà Nội',
        'base_price' => 2000000,
        'discount_price' => 1500000,
        'total_slots' => 20,
        'booked_slots' => 0,
        'status' => 'open',
    ], $attributes));
}

function cancellationEmailBooking(
    User $customer,
    Tour $tour,
    TourDeparture $departure,
    array $attributes = [],
): Booking {
    $numberOfPeople = (int) ($attributes['number_of_people'] ?? 2);
    $paymentStatus = $attributes['payment_status'] ?? 'paid';
    $withPayment = (bool) ($attributes['with_payment'] ?? true);
    $contact = $attributes['contact'] ?? null;

    unset($attributes['with_payment'], $attributes['contact']);

    $booking = Booking::query()->create(array_merge([
        'booking_code' => 'BK-CANCEL-'.fake()->unique()->numberBetween(1000, 9999),
        'user_id' => $customer->id,
        'tour_id' => $tour->id,
        'tour_departure_id' => $departure->id,
        'number_of_people' => $numberOfPeople,
        'unit_price' => 1500000,
        'discount_amount' => 0,
        'total_amount' => 1500000 * $numberOfPeople,
        'status' => 'confirmed',
        'payment_status' => $paymentStatus,
        'slot_committed_at' => $paymentStatus === 'paid' ? now() : null,
    ], $attributes));

    if ($contact !== null) {
        $booking->contact()->create(array_merge([
            'contact_name' => 'Nguyễn Văn Hủy',
            'contact_email' => $customer->email,
            'contact_phone' => '0901234567',
        ], $contact));
    }

    if ($withPayment) {
        $paymentRecordStatus = match ($paymentStatus) {
            'paid' => 'success',
            'refunded' => 'refunded',
            'failed' => 'failed',
            default => 'pending',
        };

        $booking->payment()->create([
            'payment_method' => 'vnpay',
            'amount' => $booking->total_amount,
            'status' => $paymentRecordStatus,
            'paid_at' => $paymentRecordStatus === 'success' ? now() : null,
            'expires_at' => now()->addMinutes(15),
        ]);
    }

    return $booking->fresh(['payment', 'contact', 'tourDeparture']);
}

function deliverCancellationEmail(BookingCancellationOutbox $outbox): void
{
    (new DeliverBookingCancellationEmail($outbox->id))->handle();
}

test('customer direct cancellation queues one summary email and is idempotent', function () {
    Mail::fake();
    Queue::fake();

    $customer = cancellationEmailUser('customer', ['email' => 'account@example.com']);
    $tour = cancellationEmailTour();
    $departure = cancellationEmailDeparture($tour, ['booked_slots' => 2]);
    $booking = cancellationEmailBooking($customer, $tour, $departure, [
        'contact' => [
            'contact_email' => 'contact@example.com',
        ],
    ]);

    Sanctum::actingAs($customer);

    $this->patchJson("/api/customer/bookings/{$booking->id}/cancel", [
        'reason' => 'Khách đổi kế hoạch cá nhân.',
    ])->assertOk()
        ->assertJsonPath('data.status', 'cancelled')
        ->assertJsonPath('data.payment_status', 'refund_pending');

    $outbox = BookingCancellationOutbox::query()
        ->where('booking_id', $booking->id)
        ->firstOrFail();

    expect($outbox->recipient_email)->toBe('contact@example.com')
        ->and($outbox->payload['refund_status'])->toBe('refund_pending')
        ->and($outbox->payload['reason'])->toBe('Khách đổi kế hoạch cá nhân.')
        ->and($outbox->processed_at)->toBeNull();

    Queue::assertPushed(DeliverBookingCancellationEmail::class, 1);
    deliverCancellationEmail($outbox);
    deliverCancellationEmail($outbox);

    Mail::assertSent(BookingCancellationMail::class, function (BookingCancellationMail $mail): bool {
        return $mail->hasTo('contact@example.com')
            && $mail->cancellation['mail_subject'] === 'Xác nhận hủy tour'
            && str_contains($mail->render(), 'Khách đổi kế hoạch cá nhân.')
            && str_contains($mail->render(), 'Đang chờ xử lý hoàn tiền');
    });
    Mail::assertSentCount(1);
    expect($outbox->fresh()->processed_at)->not->toBeNull();

    $this->patchJson("/api/customer/bookings/{$booking->id}/cancel", [
        'reason' => 'Khách gửi lại yêu cầu hủy.',
    ])->assertOk();

    expect(BookingCancellationOutbox::query()->where('booking_id', $booking->id)->count())->toBe(1);
    Queue::assertPushed(DeliverBookingCancellationEmail::class, 1);
});

test('customer can cancel an unpaid booking and the email says no refund is due', function () {
    Mail::fake();
    Queue::fake();

    $customer = cancellationEmailUser();
    $tour = cancellationEmailTour();
    $departure = cancellationEmailDeparture($tour);
    $booking = cancellationEmailBooking($customer, $tour, $departure, [
        'status' => 'pending',
        'payment_status' => 'unpaid',
        'with_payment' => false,
        'contact' => [],
    ]);

    Sanctum::actingAs($customer);

    $this->patchJson("/api/customer/bookings/{$booking->id}/cancel", [
        'reason' => 'Khách không còn nhu cầu đặt tour.',
    ])->assertOk();

    $outbox = BookingCancellationOutbox::query()->where('booking_id', $booking->id)->firstOrFail();

    expect($booking->fresh()->status)->toBe('cancelled')
        ->and($outbox->payload['refund_status'])->toBe('unpaid')
        ->and($outbox->payload['refund_status_label'])->toBe('Không phát sinh hoàn tiền');

    deliverCancellationEmail($outbox);
    Mail::assertSent(BookingCancellationMail::class, fn (BookingCancellationMail $mail): bool => $mail->hasTo($customer->email)
        && str_contains($mail->render(), 'Không phát sinh hoàn tiền'));
});

test('customer cancelling a pending VNPAY payment queues a cancellation email', function () {
    Mail::fake();
    Queue::fake();

    $customer = cancellationEmailUser();
    $tour = cancellationEmailTour();
    $departure = cancellationEmailDeparture($tour);
    $booking = cancellationEmailBooking($customer, $tour, $departure, [
        'status' => 'pending',
        'payment_status' => 'unpaid',
        'contact' => [],
    ]);

    Sanctum::actingAs($customer);

    $this->patchJson("/api/customer/payments/vnpay/{$booking->payment->id}/cancel")
        ->assertOk();

    $outbox = BookingCancellationOutbox::query()->where('booking_id', $booking->id)->firstOrFail();

    expect($booking->fresh()->status)->toBe('cancelled')
        ->and($booking->fresh()->payment_status)->toBe('failed')
        ->and($outbox->recipient_email)->toBe($customer->email)
        ->and($outbox->payload['refund_status'])->toBe('failed')
        ->and($outbox->payload['refund_status_label'])->toBe('Không phát sinh hoàn tiền');
    Queue::assertPushed(DeliverBookingCancellationEmail::class, 1);
});

test('approved customer refund request queues a cancellation email but request creation does not', function () {
    Mail::fake();
    Queue::fake();

    $customer = cancellationEmailUser();
    $admin = cancellationEmailUser('admin');
    $tour = cancellationEmailTour();
    $departure = cancellationEmailDeparture($tour, ['booked_slots' => 2]);
    $booking = cancellationEmailBooking($customer, $tour, $departure, [
        'contact' => [],
    ]);

    Sanctum::actingAs($customer);

    $request = $this->postJson("/api/customer/bookings/{$booking->id}/disruption-requests", [
        'type' => 'refund',
        'reason' => 'Khách có việc đột xuất cần hủy tour.',
    ])->assertCreated()
        ->json('data');

    expect(BookingCancellationOutbox::query()->count())->toBe(0);

    Sanctum::actingAs($admin);

    $this->patchJson("/api/admin/booking-disruption-requests/{$request['id']}/approve", [
        'admin_note' => 'Đã tiếp nhận yêu cầu hoàn tiền.',
    ])->assertOk();

    $outbox = BookingCancellationOutbox::query()->where('booking_id', $booking->id)->firstOrFail();

    expect($booking->fresh()->status)->toBe('cancelled')
        ->and($booking->fresh()->payment_status)->toBe('refund_pending')
        ->and($outbox->payload['cancellation_source'])->toBe('customer_request_approved')
        ->and($outbox->payload['refund_status'])->toBe('refund_pending');
    Queue::assertPushed(DeliverBookingCancellationEmail::class, 1);
});

test('rejected and withdrawn customer cancellation requests do not queue an email', function () {
    Mail::fake();
    Queue::fake();

    $customer = cancellationEmailUser();
    $admin = cancellationEmailUser('admin');
    $tour = cancellationEmailTour();
    $departure = cancellationEmailDeparture($tour);
    $booking = cancellationEmailBooking($customer, $tour, $departure, ['contact' => []]);

    Sanctum::actingAs($customer);

    $withdrawnRequest = $this->postJson("/api/customer/bookings/{$booking->id}/disruption-requests", [
        'type' => 'refund',
        'reason' => 'Khách muốn xem lại lịch trình trước khi hủy.',
    ])->assertCreated()->json('data');

    $this->deleteJson("/api/customer/booking-disruption-requests/{$withdrawnRequest['id']}")
        ->assertOk();

    $rejectedRequest = BookingDisruptionRequest::query()->create([
        'booking_id' => $booking->id,
        'type' => 'refund',
        'status' => 'pending',
        'reason' => 'Khách gửi lại yêu cầu để kiểm tra chính sách.',
    ]);

    Sanctum::actingAs($admin);

    $this->patchJson("/api/admin/booking-disruption-requests/{$rejectedRequest->id}/reject", [
        'admin_note' => 'Chưa đủ thông tin để xử lý yêu cầu.',
    ])->assertOk();

    expect(BookingCancellationOutbox::query()->count())->toBe(0);
    Queue::assertNothingPushed();
});

test('admin departure cancellation queues one email for every affected customer', function () {
    Mail::fake();
    Queue::fake();

    $admin = cancellationEmailUser('admin');
    $customerOne = cancellationEmailUser('customer', ['email' => 'one@example.com']);
    $customerTwo = cancellationEmailUser('customer', ['email' => 'two@example.com']);
    $tour = cancellationEmailTour();
    $departure = cancellationEmailDeparture($tour, [
        'status' => 'confirmed',
        'booked_slots' => 4,
    ]);
    $bookingOne = cancellationEmailBooking($customerOne, $tour, $departure, [
        'contact' => [],
        'number_of_people' => 2,
    ]);
    $bookingTwo = cancellationEmailBooking($customerTwo, $tour, $departure, [
        'contact' => [],
        'number_of_people' => 2,
    ]);

    Sanctum::actingAs($admin);

    $this->postJson("/api/admin/tours/departures/{$departure->id}/cancel", [
        'cancellation_reason' => 'weather_disaster',
        'customer_message' => 'Lịch khởi hành bị hủy do thời tiết xấu.',
    ])->assertOk();

    expect($bookingOne->fresh()->status)->toBe('cancelled_by_tour')
        ->and($bookingTwo->fresh()->status)->toBe('cancelled_by_tour')
        ->and(BookingCancellationOutbox::query()->count())->toBe(2);

    Queue::assertPushed(DeliverBookingCancellationEmail::class, 2);

    BookingCancellationOutbox::query()->orderBy('id')->get()->each(function (BookingCancellationOutbox $item): void {
        deliverCancellationEmail($item);
    });

    Mail::assertSent(BookingCancellationMail::class, 2);
    Mail::assertSent(BookingCancellationMail::class, fn (BookingCancellationMail $mail): bool => $mail->hasTo('one@example.com')
        && $mail->cancellation['refund_status'] === 'pending_selection'
        && str_contains($mail->render(), 'Thông báo tour bị hủy'));
    Mail::assertSent(BookingCancellationMail::class, fn (BookingCancellationMail $mail): bool => $mail->hasTo('two@example.com'));
});

test('admin cancelling an individual booking does not queue a cancellation email', function () {
    Mail::fake();
    Queue::fake();

    $admin = cancellationEmailUser('admin');
    $customer = cancellationEmailUser();
    $tour = cancellationEmailTour();
    $departure = cancellationEmailDeparture($tour, ['booked_slots' => 2]);
    $booking = cancellationEmailBooking($customer, $tour, $departure, ['contact' => []]);

    Sanctum::actingAs($admin);

    $this->patchJson("/api/admin/bookings/{$booking->id}/cancel")
        ->assertOk();

    expect($booking->fresh()->status)->toBe('cancelled')
        ->and(BookingCancellationOutbox::query()->count())->toBe(0);
    Queue::assertNothingPushed();
});

test('admin cancelling a departure without bookings does not create a cancellation email', function () {
    Mail::fake();
    Queue::fake();

    $admin = cancellationEmailUser('admin');
    $tour = cancellationEmailTour();
    $departure = cancellationEmailDeparture($tour);

    Sanctum::actingAs($admin);

    $this->postJson("/api/admin/tours/departures/{$departure->id}/cancel", [
        'cancellation_reason' => 'other',
    ])->assertOk();

    expect($departure->fresh()->status)->toBe('cancelled')
        ->and(BookingCancellationOutbox::query()->count())->toBe(0);
    Queue::assertNotPushed(DeliverBookingCancellationEmail::class);
    Mail::assertNothingSent();
});

test('invalid contact email falls back to the customer account email', function () {
    Mail::fake();
    Queue::fake();

    $customer = cancellationEmailUser('customer', ['email' => 'account-fallback@example.com']);
    $tour = cancellationEmailTour();
    $departure = cancellationEmailDeparture($tour);
    $booking = cancellationEmailBooking($customer, $tour, $departure, [
        'contact' => [
            'contact_email' => 'invalid-contact-email',
        ],
    ]);

    Sanctum::actingAs($customer);

    $this->patchJson("/api/customer/bookings/{$booking->id}/cancel", [
        'reason' => 'Khách chuyển sang lịch khác.',
    ])->assertOk();

    expect(BookingCancellationOutbox::query()->where('booking_id', $booking->id)->value('recipient_email'))
        ->toBe('account-fallback@example.com');
});

test('cancellation email maps refunded and retained payment states correctly', function () {
    Mail::fake();
    Queue::fake();

    $refundedCustomer = cancellationEmailUser('customer', ['email' => 'refunded@example.com']);
    $retainedCustomer = cancellationEmailUser('customer', ['email' => 'retained@example.com']);
    $tour = cancellationEmailTour();
    $departure = cancellationEmailDeparture($tour);
    $refundedBooking = cancellationEmailBooking($refundedCustomer, $tour, $departure, [
        'status' => 'cancelled',
        'payment_status' => 'refunded',
        'cancelled_at' => now(),
        'contact' => [],
    ]);
    $retainedBooking = cancellationEmailBooking($retainedCustomer, $tour, $departure, [
        'status' => 'cancelled',
        'payment_status' => 'paid',
        'resolution_status' => 'retained_manual',
        'cancelled_at' => now(),
        'contact' => [],
    ]);

    $service = app(BookingCancellationEmailService::class);
    $service->enqueueForCancelledBooking(
        $refundedBooking,
        BookingCancellationEmailService::SOURCE_CUSTOMER_DIRECT,
    );
    $service->enqueueForCancelledBooking(
        $retainedBooking,
        BookingCancellationEmailService::SOURCE_CUSTOMER_REQUEST_APPROVED,
    );

    $refundedOutbox = BookingCancellationOutbox::query()->where('booking_id', $refundedBooking->id)->firstOrFail();
    $retainedOutbox = BookingCancellationOutbox::query()->where('booking_id', $retainedBooking->id)->firstOrFail();

    expect($refundedOutbox->payload['refund_status'])
        ->toBe('refunded')
        ->and($retainedOutbox->payload['refund_status'])
        ->toBe('retained_manual');
    Queue::assertPushed(DeliverBookingCancellationEmail::class, 2);
});

test('missing valid email does not block customer cancellation or queue a job', function () {
    Mail::fake();
    Queue::fake();

    $customer = cancellationEmailUser('customer', ['email' => 'invalid-account-email']);
    $tour = cancellationEmailTour();
    $departure = cancellationEmailDeparture($tour);
    $booking = cancellationEmailBooking($customer, $tour, $departure, [
        'contact' => [
            'contact_email' => 'invalid-contact-email',
        ],
    ]);

    Sanctum::actingAs($customer);

    $this->patchJson("/api/customer/bookings/{$booking->id}/cancel", [
        'reason' => 'Khách không thể tiếp tục chuyến đi.',
    ])->assertOk();

    expect($booking->fresh()->status)->toBe('cancelled')
        ->and(BookingCancellationOutbox::query()->count())->toBe(0);
    Queue::assertNothingPushed();
});

test('automatic pending payment failure does not queue a customer cancellation email', function () {
    Mail::fake();
    Queue::fake();

    $customer = cancellationEmailUser();
    $tour = cancellationEmailTour();
    $departure = cancellationEmailDeparture($tour);
    $booking = cancellationEmailBooking($customer, $tour, $departure, [
        'status' => 'pending',
        'payment_status' => 'unpaid',
        'contact' => [],
    ]);

    DB::transaction(function () use ($booking): void {
        app(VnpayPaymentLifecycleService::class)->failPendingPayment(
            $booking->payment,
            'Booking đã hết hạn thanh toán VNPAY sau 15 phút.',
        );
    });

    expect($booking->fresh()->status)->toBe('cancelled')
        ->and(BookingCancellationOutbox::query()->count())->toBe(0);
    Queue::assertNothingPushed();
});

test('cancellation outbox is rolled back when the surrounding transaction fails', function () {
    Mail::fake();
    Queue::fake();

    $customer = cancellationEmailUser();
    $tour = cancellationEmailTour();
    $departure = cancellationEmailDeparture($tour);
    $booking = cancellationEmailBooking($customer, $tour, $departure, ['contact' => []]);

    expect(fn () => DB::transaction(function () use ($booking): void {
        $booking->update([
            'status' => 'cancelled',
            'payment_status' => 'refund_pending',
            'cancel_reason' => 'Giao dịch kiểm tra rollback.',
            'cancelled_at' => now(),
        ]);

        app(BookingCancellationEmailService::class)
            ->enqueueForCancelledBooking(
                $booking,
                BookingCancellationEmailService::SOURCE_CUSTOMER_DIRECT,
            );

        throw new RuntimeException('rollback cancellation email test');
    }))->toThrow(RuntimeException::class, 'rollback cancellation email test');

    expect($booking->fresh()->status)->toBe('confirmed')
        ->and(BookingCancellationOutbox::query()->count())->toBe(0);
});
