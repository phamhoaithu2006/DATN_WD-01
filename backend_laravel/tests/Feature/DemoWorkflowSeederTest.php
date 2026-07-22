<?php

use App\Models\Booking;
use App\Models\TourDeparture;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoWorkflowSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('demo workflow seeder creates complete repeatable data for every major role', function () {
    $this->seed(DatabaseSeeder::class);

    $demoBookings = Booking::query()
        ->where('booking_code', 'like', 'BK-DEMO-%')
        ->with(['contact', 'participants', 'payment'])
        ->get()
        ->keyBy('booking_code');

    expect($demoBookings)->toHaveCount(6)
        ->and($demoBookings['BK-DEMO-PENDING']->status)->toBe('pending')
        ->and($demoBookings['BK-DEMO-PENDING']->payment_status)->toBe('unpaid')
        ->and($demoBookings['BK-DEMO-PENDING']->payment->status)->toBe('pending')
        ->and($demoBookings['BK-DEMO-PENDING']->payment->expires_at->isFuture())->toBeTrue()
        ->and($demoBookings['BK-DEMO-PAID']->payment_status)->toBe('paid')
        ->and($demoBookings['BK-DEMO-ONGOING']->status)->toBe('confirmed')
        ->and($demoBookings['BK-DEMO-COMPLETED']->status)->toBe('completed')
        ->and($demoBookings['BK-DEMO-CANCELLED']->payment_status)->toBe('refunded')
        ->and($demoBookings['BK-DEMO-EXPIRED']->payment_status)->toBe('failed');

    foreach ($demoBookings as $booking) {
        expect($booking->contact)->not->toBeNull()
            ->and($booking->payment)->not->toBeNull()
            ->and($booking->participants)->toHaveCount($booking->number_of_people);
    }

    $ongoingBooking = $demoBookings['BK-DEMO-ONGOING'];
    $attendanceSession = DB::table('attendance_sessions')
        ->where('tour_departure_id', $ongoingBooking->tour_departure_id)
        ->where('name', 'Điểm danh demo check-in/check-out')
        ->first();

    expect($attendanceSession)->not->toBeNull()
        ->and(DB::table('attendances')->where('attendance_session_id', $attendanceSession->id)->pluck('status')->sort()->values()->all())
        ->toBe(['absent', 'checked_in', 'checked_out', 'not_checked_in']);

    Sanctum::actingAs(User::query()->where('email', 'guide@vivugo.vn')->firstOrFail());
    $this->getJson("/api/guide/tours/{$ongoingBooking->tour_departure_id}/attendance/statistics?attendance_session_id={$attendanceSession->id}")
        ->assertOk()
        ->assertJsonPath('data.total_customers', 4)
        ->assertJsonPath('data.checked_in', 1)
        ->assertJsonPath('data.not_checked_in', 1)
        ->assertJsonPath('data.absent', 1)
        ->assertJsonPath('data.checked_out', 1);

    expect(DB::table('users')->where('email', 'guide@vivugo.vn')->whereExists(function ($query) {
        $query->selectRaw('1')->from('guides')->whereColumn('guides.user_id', 'users.id');
    })->exists())->toBeTrue()
        ->and(DB::table('support_requests')->where('ticket_code', 'like', 'SUP-DEMO-%')->count())->toBe(3)
        ->and(DB::table('chat_conversations')->where('session_id', 'demo-customer-conversation')->count())->toBe(1)
        ->and(DB::table('guide_leave_requests')->count())->toBeGreaterThanOrEqual(4)
        ->and(DB::table('guide_replacement_requests')->where('status', 'pending')->count())->toBeGreaterThanOrEqual(1)
        ->and(DB::table('partners')->where('partner_code', 'like', 'DT-%')->count())->toBe(3);

    TourDeparture::query()->each(function (TourDeparture $departure): void {
        $expected = Booking::query()
            ->where('tour_departure_id', $departure->id)
            ->whereIn('status', ['pending', 'confirmed', 'completed'])
            ->sum('number_of_people');

        expect($departure->booked_slots)->toBe(min($expected, $departure->total_slots));
    });

    $countsBeforeRepeat = [
        'bookings' => DB::table('bookings')->count(),
        'payments' => DB::table('payments')->count(),
        'support_requests' => DB::table('support_requests')->count(),
        'leave_requests' => DB::table('guide_leave_requests')->count(),
        'partners' => DB::table('partners')->count(),
    ];

    $this->seed(DemoWorkflowSeeder::class);

    expect([
        'bookings' => DB::table('bookings')->count(),
        'payments' => DB::table('payments')->count(),
        'support_requests' => DB::table('support_requests')->count(),
        'leave_requests' => DB::table('guide_leave_requests')->count(),
        'partners' => DB::table('partners')->count(),
    ])->toBe($countsBeforeRepeat);
});
