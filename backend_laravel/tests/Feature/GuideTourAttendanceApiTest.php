<?php

use App\Models\AttendanceSession;
use App\Models\Booking;
use App\Models\BookingContact;
use App\Models\BookingParticipant;
use App\Models\Guide;
use App\Models\Role;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\TourGuideAssignment;
use App\Models\TourItinerary;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function guideAttendanceRole(string $name): Role
{
    return Role::query()->firstOrCreate(
        ['name' => $name],
        ['description' => $name]
    );
}

function guideAttendanceUser(string $roleName): User
{
    $role = guideAttendanceRole($roleName);

    return User::factory()->create([
        'role_id' => $role->id,
        'status' => 'active',
    ]);
}

function guideAttendanceTour(): Tour
{
    $now = now();

    DB::table('categories')->updateOrInsert(
        ['id' => 1],
        [
            'name' => 'Guide attendance category',
            'slug' => 'guide-attendance-category',
            'description' => 'Category for guide attendance tests.',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]
    );

    DB::table('destinations')->updateOrInsert(
        ['id' => 1],
        [
            'name' => 'Guide attendance destination',
            'slug' => 'guide-attendance-destination',
            'province_city' => 'Ha Noi',
            'country' => 'Viet Nam',
            'description' => 'Destination for guide attendance tests.',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]
    );

    return Tour::query()->create([
        'category_id' => 1,
        'destination_id' => 1,
        'title' => 'Tour diem danh HDV',
        'slug' => 'tour-diem-danh-hdv-'.fake()->unique()->numberBetween(1000, 9999),
        'summary' => 'Tour dung cho feature test diem danh HDV.',
        'duration_days' => 3,
        'duration_nights' => 2,
        'base_price' => 3000000,
        'discount_price' => 2500000,
        'max_slots' => 20,
        'available_slots' => 20,
        'status' => 'published',
    ]);
}

function guideAttendanceScenario(): array
{
    $guideUser = guideAttendanceUser('tour guide');
    $guide = Guide::query()->create([
        'user_id' => $guideUser->id,
        'guide_code' => 'HDV'.fake()->unique()->numberBetween(1000, 9999),
        'experience_years' => 4,
        'status' => 'active',
    ]);

    $customer = guideAttendanceUser('customer');
    $tour = guideAttendanceTour();
    $dayOneMorning = TourItinerary::query()->create([
        'tour_id' => $tour->id, 'day_number' => 1, 'sort_order' => 1,
        'type' => 'departure', 'title' => 'Tập trung khởi hành', 'start_time' => '07:00',
    ]);
    $dayOneAfternoon = TourItinerary::query()->create([
        'tour_id' => $tour->id, 'day_number' => 1, 'sort_order' => 2,
        'type' => 'sightseeing', 'title' => 'Tham quan buổi chiều', 'start_time' => '14:00',
    ]);
    $dayTwo = TourItinerary::query()->create([
        'tour_id' => $tour->id, 'day_number' => 2, 'sort_order' => 3,
        'type' => 'return', 'title' => 'Trả khách', 'start_time' => '16:00',
    ]);

    $ongoing = TourDeparture::query()->create([
        'tour_id' => $tour->id,
        'departure_date' => now()->toDateString(),
        'return_date' => now()->addDay()->toDateString(),
        'total_slots' => 10,
        'booked_slots' => 1,
        'status' => 'open',
    ]);

    $upcoming = TourDeparture::query()->create([
        'tour_id' => $tour->id,
        'departure_date' => now()->addDays(5)->toDateString(),
        'return_date' => now()->addDays(7)->toDateString(),
        'total_slots' => 10,
        'booked_slots' => 0,
        'status' => 'open',
    ]);

    $completed = TourDeparture::query()->create([
        'tour_id' => $tour->id,
        'departure_date' => now()->subDays(7)->toDateString(),
        'return_date' => now()->subDays(5)->toDateString(),
        'total_slots' => 10,
        'booked_slots' => 0,
        'status' => 'completed',
    ]);

    foreach ([$ongoing, $upcoming, $completed] as $departure) {
        TourGuideAssignment::query()->create([
            'guide_id' => $guide->id,
            'tour_departure_id' => $departure->id,
            'status' => $departure->is($completed) ? 'completed' : 'assigned',
        ]);
    }

    $booking = Booking::query()->create([
        'booking_code' => 'BK-GA-'.fake()->unique()->numberBetween(1000, 9999),
        'user_id' => $customer->id,
        'tour_id' => $tour->id,
        'tour_departure_id' => $ongoing->id,
        'number_of_people' => 1,
        'unit_price' => 2500000,
        'discount_amount' => 0,
        'total_amount' => 2500000,
        'status' => 'confirmed',
        'payment_status' => 'paid',
        'note' => 'Khach an chay.',
    ]);

    BookingContact::query()->create([
        'booking_id' => $booking->id,
        'contact_name' => 'Nguyen Van A',
        'contact_email' => 'a@example.test',
        'contact_phone' => '0900000001',
        'special_request' => 'Di ung hai san.',
    ]);

    $participant = BookingParticipant::query()->create([
        'booking_id' => $booking->id,
        'full_name' => 'Nguyen Van A',
        'phone' => '0911111111',
        'participant_type' => 'adult',
    ]);

    return compact('guideUser', 'guide', 'customer', 'tour', 'dayOneMorning', 'dayOneAfternoon', 'dayTwo', 'ongoing', 'upcoming', 'completed', 'booking', 'participant');
}

test('guide tour list exposes status aware actions', function () {
    $scenario = guideAttendanceScenario();
    Sanctum::actingAs($scenario['guideUser']);

    $this->getJson('/api/guide/tours')
        ->assertOk()
        ->assertJsonPath('data.data.0.id', $scenario['ongoing']->id)
        ->assertJsonPath('data.data.0.guide_status', 'ongoing')
        ->assertJsonPath('data.data.0.actions.take_attendance.enabled', true)
        ->assertJsonPath('data.data.1.guide_status', 'upcoming')
        ->assertJsonPath('data.data.1.actions.take_attendance.enabled', false)
        ->assertJsonPath('data.data.2.guide_status', 'completed')
        ->assertJsonPath('data.data.2.actions.view_attendance_history.enabled', true);
});

test('guide replacement request follows the inclusive five calendar day deadline', function () {
    Carbon::setTestNow('2026-04-21 10:00:00');
    $scenario = guideAttendanceScenario();
    Sanctum::actingAs($scenario['guideUser']);
    $endpoint = "/api/guide/tours/{$scenario['ongoing']->id}/replacement-requests";
    $payload = ['reason' => 'Can doi huong dan vien de kiem thu.'];

    $scenario['ongoing']->update([
        'departure_date' => '2026-04-24',
        'return_date' => '2026-04-26',
    ]);
    $this->postJson($endpoint, $payload)
        ->assertUnprocessable()
        ->assertJsonPath('code', 'REPLACEMENT_REQUEST_TOO_LATE');

    Carbon::setTestNow('2026-04-20 10:00:00');
    $this->postJson($endpoint, $payload)->assertCreated();

    Carbon::setTestNow();
});

test('admin can review a replacement request one day before departure', function () {
    Carbon::setTestNow('2026-06-08 10:00:00');
    $scenario = guideAttendanceScenario();
    $admin = guideAttendanceUser('admin');
    Sanctum::actingAs($admin);
    $scenario['ongoing']->update([
        'departure_date' => '2026-06-09',
        'return_date' => '2026-06-11',
    ]);
    $requestId = DB::table('guide_replacement_requests')->insertGetId([
        'tour_departure_id' => $scenario['ongoing']->id,
        'current_guide_id' => $scenario['guide']->id,
        'requested_by' => $scenario['guideUser']->id,
        'reason' => 'Can doi huong dan vien de kiem thu.',
        'status' => 'pending',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $endpoint = "/api/admin/guide-replacement-requests/{$requestId}/approve";

    $this->postJson($endpoint)
        ->assertUnprocessable()
        ->assertJsonPath('code', 'NO_REPLACEMENT_GUIDE_AVAILABLE');

    Carbon::setTestNow('2026-06-09 00:00:00');
    $this->postJson($endpoint)
        ->assertUnprocessable()
        ->assertJsonPath('code', 'REPLACEMENT_REQUEST_TOO_LATE');

    Carbon::setTestNow();
});

test('only ongoing tours can create attendance sessions', function () {
    Carbon::setTestNow('2026-07-20 09:00:00');
    $scenario = guideAttendanceScenario();
    Sanctum::actingAs($scenario['guideUser']);

    $this->postJson("/api/guide/tours/{$scenario['upcoming']->id}/attendance-sessions", [
        'tour_itinerary_id' => $scenario['dayOneMorning']->id,
    ])->assertUnprocessable();

    $this->postJson("/api/guide/tours/{$scenario['completed']->id}/attendance-sessions", [
        'tour_itinerary_id' => $scenario['dayOneMorning']->id,
    ])->assertUnprocessable();

    $this->postJson("/api/guide/tours/{$scenario['ongoing']->id}/attendance-sessions")
        ->assertCreated()
        ->assertJsonPath('data.tour_itinerary_id', null)
        ->assertJsonPath('data.boundary', 'departure')
        ->assertJsonPath('data.name', 'Điểm danh ngày khởi hành');
});

test('only one attendance session is generated on the departure date', function () {
    Carbon::setTestNow('2026-07-20 09:00:00');
    $scenario = guideAttendanceScenario();
    Sanctum::actingAs($scenario['guideUser']);

    $this->getJson("/api/guide/tours/{$scenario['ongoing']->id}/attendance-sessions")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.tour_itinerary_id', null)
        ->assertJsonPath('data.0.boundary', 'departure')
        ->assertJsonPath('data.0.can_take_attendance', true);

    Carbon::setTestNow();
});

test('guide customer list includes phone and health notes', function () {
    $scenario = guideAttendanceScenario();
    Sanctum::actingAs($scenario['guideUser']);

    AttendanceSession::query()->create([
        'tour_departure_id' => $scenario['ongoing']->id,
        'tour_itinerary_id' => $scenario['dayOneMorning']->id,
        'scheduled_date' => now()->toDateString(),
        'name' => 'Ngay 1 - Len xe',
        'created_by' => $scenario['guideUser']->id,
    ]);

    $this->getJson("/api/guide/tours/{$scenario['ongoing']->id}/customers")
        ->assertOk()
        ->assertJsonPath('data.0.full_name', 'Nguyen Van A')
        ->assertJsonPath('data.0.phone', '0911111111')
        ->assertJsonPath('data.0.contact_phone', '0900000001')
        ->assertJsonPath('data.0.customer_note', 'Khach an chay.')
        ->assertJsonPath('data.0.health_note', 'Di ung hai san.');
});

test('departure attendance remains available throughout the departure date', function () {
    Carbon::setTestNow('2026-07-20 13:59:00');
    $scenario = guideAttendanceScenario();
    Sanctum::actingAs($scenario['guideUser']);
    $endpoint = "/api/guide/tours/{$scenario['ongoing']->id}/attendance-sessions";

    $this->getJson($endpoint)
        ->assertJsonPath('data.0.can_take_attendance', true);

    Carbon::setTestNow('2026-07-20 14:00:00');
    $this->getJson($endpoint)
        ->assertJsonPath('data.0.can_take_attendance', true);

    Carbon::setTestNow('2026-07-20 23:29:59');
    $this->getJson($endpoint)->assertJsonPath('data.0.can_take_attendance', true);

    Carbon::setTestNow('2026-07-20 23:30:00');
    $this->getJson($endpoint)->assertJsonPath('data.0.can_take_attendance', true);

    Carbon::setTestNow();
});

test('attendance actions are only allowed on the departure date', function () {
    Carbon::setTestNow('2026-07-19 09:00:00');
    $scenario = guideAttendanceScenario();
    Sanctum::actingAs($scenario['guideUser']);

    $departureSessionId = $this->postJson("/api/guide/tours/{$scenario['ongoing']->id}/attendance-sessions", [
        'tour_itinerary_id' => $scenario['dayOneMorning']->id,
    ])->assertCreated()->json('data.id');

    Carbon::setTestNow('2026-07-20 16:00:00');

    $this->postJson("/api/guide/tours/{$scenario['ongoing']->id}/attendance-sessions/{$departureSessionId}/check-in", [
        'participant_id' => $scenario['participant']->id,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('boundary');

    $this->postJson("/api/guide/tours/{$scenario['ongoing']->id}/attendance-sessions")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('boundary');

    Carbon::setTestNow();
});

test('guide can check in every customer with one request', function () {
    Carbon::setTestNow('2026-07-19 09:00:00');
    $scenario = guideAttendanceScenario();
    Sanctum::actingAs($scenario['guideUser']);

    $departureSessionId = $this->postJson("/api/guide/tours/{$scenario['ongoing']->id}/attendance-sessions", [
        'tour_itinerary_id' => $scenario['dayOneMorning']->id,
    ])->assertCreated()->json('data.id');

    $this->postJson("/api/guide/tours/{$scenario['ongoing']->id}/attendance-sessions/{$departureSessionId}/check-in-all")
        ->assertOk()
        ->assertJsonPath('data.checked_in', 1)
        ->assertJsonPath('data.total_customers', 1);

    $this->getJson("/api/guide/tours/{$scenario['ongoing']->id}/customers?attendance_session_id={$departureSessionId}")
        ->assertOk()
        ->assertJsonPath('data.0.attendance_status', 'checked_in');

    Carbon::setTestNow();
});
