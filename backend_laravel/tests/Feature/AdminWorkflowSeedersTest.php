<?php

use App\Models\Booking;
use App\Models\SupportRequest;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\User;
use Database\Seeders\AdminSystemNotificationSeeder;
use Database\Seeders\BookingRefundSeeder;
use Database\Seeders\CancelledTourSeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\GuideReplacementRequestSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('seeder tạo booking chờ hoàn tiền, yêu cầu đổi HDV và thông báo cho Admin', function () {
    $this->seed(DatabaseSeeder::class);

    $admin = User::query()->where('email', 'admin@gmail.com')->firstOrFail();
    $booking = Booking::query()
        ->where('booking_code', BookingRefundSeeder::BOOKING_CODE)
        ->with('payment')
        ->firstOrFail();
    $replacementRequest = DB::table('guide_replacement_requests')
        ->where('reason', GuideReplacementRequestSeeder::SEED_REASON)
        ->first();
    $supportRequest = SupportRequest::query()
        ->where('ticket_code', 'SUP-VV-09')
        ->firstOrFail();
    $cancelledTour = Tour::query()
        ->where('slug', CancelledTourSeeder::TOUR_SLUG)
        ->firstOrFail();
    $cancelledDeparture = TourDeparture::query()
        ->where('tour_id', $cancelledTour->id)
        ->where('departure_date', CancelledTourSeeder::DEPARTURE_DATE)
        ->firstOrFail();

    expect($booking->status)->toBe('cancelled')
        ->and($booking->payment_status)->toBe('refund_pending')
        ->and($booking->resolution_status)->toBe('refund_pending')
        ->and($booking->payment?->status)->toBe('success')
        ->and($booking->participants()->count())->toBe(2)
        ->and(Booking::query()->whereIn('booking_code', BookingRefundSeeder::BOOKING_CODES)->count())->toBe(4)
        ->and($booking->statusHistories()->where('new_status', 'cancelled')->exists())->toBeTrue()
        ->and($booking->auditLogs()->where('action', 'payment_refund_pending')->exists())->toBeTrue()
        ->and($replacementRequest)->not->toBeNull()
        ->and($replacementRequest?->status)->toBe('pending')
        ->and($replacementRequest?->current_guide_id)->not->toBeNull()
        ->and($cancelledTour->status)->toBe('cancelled')
        ->and($cancelledDeparture->status)->toBe('cancelled')
        ->and($cancelledDeparture->cancellation_reason)->toBe('weather_disaster')
        ->and($cancelledDeparture->statusHistories()->where('new_status', 'cancelled')->exists())->toBeTrue();

    $adminNotificationCount = DB::table('notifications')
        ->where('user_id', $admin->id)
        ->where('data->seed_source', 'admin_system_notification_seeder')
        ->count();

    expect($adminNotificationCount)->toBe(5);

    $supportNotification = DB::table('notifications')
        ->where('user_id', $admin->id)
        ->where('data->seed_key', 'support-admin-request-pending')
        ->first();
    $supportMetadata = json_decode((string) $supportNotification?->data, true, flags: JSON_THROW_ON_ERROR);

    expect($supportNotification)->not->toBeNull()
        ->and($supportNotification?->kind)->toBe('support_admin_request')
        ->and($supportNotification?->support_request_id)->toBe($supportRequest->id)
        ->and($supportNotification?->status)->toBe('unread')
        ->and($supportNotification?->read_at)->toBeNull()
        ->and($supportMetadata['ticket_code'])->toBe('SUP-VV-09');

    Sanctum::actingAs($admin);

    $this->getJson('/api/admin/booking-refunds?status=refund_pending')
        ->assertOk()
        ->assertJsonFragment([
            'booking_code' => BookingRefundSeeder::BOOKING_CODE,
            'payment_status' => 'refund_pending',
        ])
        ->assertJsonPath('summary.refund_pending_count', 4);

    $this->getJson('/api/admin/guide-replacement-requests?status=pending')
        ->assertOk()
        ->assertJsonFragment([
            'id' => $replacementRequest->id,
            'status' => 'pending',
        ]);

    $this->getJson('/api/admin/tours?status=cancelled')
        ->assertOk()
        ->assertJsonFragment([
            'slug' => CancelledTourSeeder::TOUR_SLUG,
            'status' => 'cancelled',
        ]);

    $this->getJson('/api/admin/notification-bell')
        ->assertOk()
        ->assertJsonPath('data.total', 5);

    $this->getJson('/api/admin/received-notifications?notification_filter=support_admin_request')
        ->assertOk()
        ->assertJsonFragment([
            'support_request_id' => $supportRequest->id,
        ]);
});

test('các seeder workflow chạy lặp không tạo dữ liệu mẫu trùng', function () {
    $this->seed(DatabaseSeeder::class);

    $countsBefore = [
        'cancelled_tours' => Tour::query()
            ->where('slug', CancelledTourSeeder::TOUR_SLUG)
            ->count(),
        'cancelled_departures' => TourDeparture::query()
            ->where('departure_date', CancelledTourSeeder::DEPARTURE_DATE)
            ->whereHas('tour', fn ($query) => $query->where('slug', CancelledTourSeeder::TOUR_SLUG))
            ->count(),
        'refund_bookings' => Booking::query()
            ->whereIn('booking_code', BookingRefundSeeder::BOOKING_CODES)
            ->count(),
        'replacement_requests' => DB::table('guide_replacement_requests')
            ->where('reason', GuideReplacementRequestSeeder::SEED_REASON)
            ->count(),
        'admin_notifications' => DB::table('notifications')
            ->where('data->seed_source', 'admin_system_notification_seeder')
            ->count(),
    ];

    $this->seed([
        CancelledTourSeeder::class,
        BookingRefundSeeder::class,
        GuideReplacementRequestSeeder::class,
        AdminSystemNotificationSeeder::class,
    ]);

    expect([
        'cancelled_tours' => Tour::query()
            ->where('slug', CancelledTourSeeder::TOUR_SLUG)
            ->count(),
        'cancelled_departures' => TourDeparture::query()
            ->where('departure_date', CancelledTourSeeder::DEPARTURE_DATE)
            ->whereHas('tour', fn ($query) => $query->where('slug', CancelledTourSeeder::TOUR_SLUG))
            ->count(),
        'refund_bookings' => Booking::query()
            ->whereIn('booking_code', BookingRefundSeeder::BOOKING_CODES)
            ->count(),
        'replacement_requests' => DB::table('guide_replacement_requests')
            ->where('reason', GuideReplacementRequestSeeder::SEED_REASON)
            ->count(),
        'admin_notifications' => DB::table('notifications')
            ->where('data->seed_source', 'admin_system_notification_seeder')
            ->count(),
    ])->toBe($countsBefore);
});
