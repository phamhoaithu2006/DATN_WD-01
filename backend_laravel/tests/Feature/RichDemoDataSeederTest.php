<?php

use App\Models\Booking;
use App\Models\Tour;
use App\Models\TourDeparture;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RichDemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('rich demo data seeder creates a large consistent operational dataset', function () {
    $this->seed(DatabaseSeeder::class);

    $bookingIds = Booking::query()
        ->where('booking_code', 'like', 'BK-VV-%')
        ->pluck('id');

    // 12 tour × 6 lịch khởi hành, mỗi lịch 2–4 booking.
    expect(Tour::query()->where('slug', 'like', '%-vv%')->orWhere('slug', 'hue-kinh-thanh-3n2d')->count())->toBeGreaterThanOrEqual(1)
        ->and(Tour::query()->whereIn('slug', ['hue-kinh-thanh-3n2d', 'nha-trang-vinpearl-4n3d', 'da-nang-ba-na-hills-8n7d'])->count())->toBe(3)
        ->and($bookingIds->count())->toBeGreaterThanOrEqual(150)
        ->and(DB::table('booking_contacts')->whereIn('booking_id', $bookingIds)->count())->toBe($bookingIds->count())
        ->and(DB::table('payments')->whereIn('booking_id', $bookingIds)->count())->toBe($bookingIds->count())
        ->and(DB::table('booking_participants')->whereIn('booking_id', $bookingIds)->count())->toBeGreaterThanOrEqual($bookingIds->count());

    // Payment amount luôn khớp booking total.
    $mismatch = DB::table('payments')
        ->join('bookings', 'bookings.id', '=', 'payments.booking_id')
        ->whereIn('payments.booking_id', $bookingIds)
        ->whereColumn('payments.amount', '!=', 'bookings.total_amount')
        ->count();

    expect($mismatch)->toBe(0);

    // Có đủ trạng thái booking cho báo cáo.
    $statuses = Booking::query()
        ->where('booking_code', 'like', 'BK-VV-%')
        ->distinct()
        ->pluck('status')
        ->sort()
        ->values()
        ->all();

    expect($statuses)->toBe(['cancelled', 'completed', 'confirmed', 'pending']);

    // Đánh giá tour + HDV có dữ liệu và rating tour được tính lại.
    $hueTour = Tour::query()->where('slug', 'hue-kinh-thanh-3n2d')->firstOrFail();

    expect(DB::table('tour_reviews')->whereIn('booking_id', $bookingIds)->count())->toBeGreaterThanOrEqual(40)
        ->and(DB::table('reviews')->whereIn('booking_id', $bookingIds)->count())->toBeGreaterThanOrEqual(20)
        ->and((float) $hueTour->average_rating)->toBeGreaterThan(0);

    // booked_slots không vượt total_slots và khớp tổng khách của booking active.
    TourDeparture::query()
        ->whereIn('tour_id', Tour::query()->where('slug', 'hue-kinh-thanh-3n2d')->pluck('id'))
        ->each(function (TourDeparture $departure): void {
            $expected = Booking::query()
                ->where('tour_departure_id', $departure->id)
                ->whereIn('status', ['pending', 'confirmed', 'completed'])
                ->sum('number_of_people');

            expect($departure->booked_slots)->toBe(min($expected, $departure->total_slots));
        });

    // Hỗ trợ + điểm danh + nghỉ phép được seed.
    expect(DB::table('support_requests')->where('ticket_code', 'like', 'SUP-VV-%')->count())->toBe(12)
        ->and(DB::table('attendance_sessions')->where('name', 'like', '%RICH-DEMO%')->count())->toBe(4)
        ->and(DB::table('attendances')->count())->toBeGreaterThan(10)
        ->and(DB::table('guide_leave_requests')->count())->toBeGreaterThanOrEqual(7)
        ->and(DB::table('notifications')->where('title', 'like', '%BK-VV-%')->count())->toBeGreaterThanOrEqual(30)
        ->and(DB::table('wishlists')->count())->toBeGreaterThanOrEqual(40);
});

test('rich demo data seeder is idempotent across repeated runs', function () {
    $this->seed(DatabaseSeeder::class);

    $countsBefore = [
        'bookings' => DB::table('bookings')->count(),
        'payments' => DB::table('payments')->count(),
        'booking_contacts' => DB::table('booking_contacts')->count(),
        'booking_participants' => DB::table('booking_participants')->count(),
        'tour_reviews' => DB::table('tour_reviews')->count(),
        'reviews' => DB::table('reviews')->count(),
        'tours' => DB::table('tours')->count(),
        'tour_departures' => DB::table('tour_departures')->count(),
        'notifications' => DB::table('notifications')->count(),
        'support_requests' => DB::table('support_requests')->count(),
        'attendances' => DB::table('attendances')->count(),
        'wishlists' => DB::table('wishlists')->count(),
        'users' => DB::table('users')->count(),
    ];

    $this->seed(RichDemoDataSeeder::class);

    $countsAfter = array_map(
        fn (string $table) => DB::table($table)->count(),
        array_combine(array_keys($countsBefore), array_keys($countsBefore)),
    );

    expect($countsAfter)->toBe($countsBefore);
});
