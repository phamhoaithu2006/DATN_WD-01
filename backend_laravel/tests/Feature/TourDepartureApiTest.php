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

// Hàm helper để tạo admin user nhanh chóng
function createAdminUser(): User
{
    ensureTourReferenceData();

    $role = Role::firstOrCreate(['name' => 'admin'], ['description' => 'Admin Role']);

    return User::factory()->create([
        'role_id' => $role->id,
        'status' => 'active',
    ]);
}

// Hàm helper để tạo Tour nhanh chóng
function createTestTour(array $attributes = []): Tour
{
    ensureTourReferenceData();

    return Tour::create(array_merge([
        'category_id' => 1,
        'destination_id' => 1,
        'title' => 'Tour Hà Nội Hạ Long 2 Ngày 1 Đêm',
        'slug' => 'tour-ha-noi-ha-long-2-ngay-1-dem',
        'base_price' => 2500000,
        'discount_price' => 2200000,
        'max_slots' => 20,
        'available_slots' => 20,
        'duration_days' => 2,
        'duration_nights' => 1,
        'status' => 'published',
    ], $attributes));
}

function ensureTourReferenceData(): void
{
    $now = now();

    DB::table('categories')->updateOrInsert(
        ['id' => 1],
        [
            'name' => 'Danh mục test',
            'slug' => 'danh-muc-test',
            'description' => 'Danh mục dùng cho feature test.',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]
    );

    DB::table('destinations')->updateOrInsert(
        ['id' => 1],
        [
            'name' => 'Điểm đến test',
            'slug' => 'diem-den-test',
            'province_city' => 'Hà Nội',
            'country' => 'Việt Nam',
            'description' => 'Điểm đến dùng cho feature test.',
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ]
    );
}

/*
|--------------------------------------------------------------------------
| Test 1: Lấy danh sách Lịch khởi hành & Logic Price Fallback
|--------------------------------------------------------------------------
*/
test('admin can retrieve tour departures with price fallback', function () {
    $admin = createAdminUser();
    Sanctum::actingAs($admin);

    $tour = createTestTour();

    // Tạo đợt khởi hành có price = null (để test fallback sang discount_price của Tour)
    $departure = TourDeparture::create([
        'tour_id' => $tour->id,
        'departure_date' => now()->addDays(5)->format('Y-m-d'),
        'return_date' => now()->addDays(7)->format('Y-m-d'),
        'price' => null,
        'total_slots' => 10,
        'booked_slots' => 0,
        'status' => 'open',
    ]);

    $response = $this->getJson("/api/admin/tours/{$tour->id}/departures");

    $response->assertOk()
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.0.price', 2200000.0); // Bằng discount_price của tour
});

/*
|--------------------------------------------------------------------------
| Test 2: Thêm mới Lịch khởi hành & Validation
|--------------------------------------------------------------------------
*/
test('admin can retrieve tour detail', function () {
    $admin = createAdminUser();
    Sanctum::actingAs($admin);

    $tour = createTestTour(['created_by' => $admin->id]);
    $itinerary = $tour->itineraries()->create([
        'day_number' => 1,
        'sort_order' => 0,
        'type' => 'departure',
        'title' => 'Khoi hanh',
        'description' => 'Tap trung va bat dau hanh trinh.',
    ]);
    $itinerary->images()->create([
        'image_url' => 'https://example.com/khoi-hanh.jpg',
        'alt_text' => 'Anh khoi hanh',
        'sort_order' => 0,
    ]);
    $tour->departures()->create([
        'departure_date' => '2026-07-10',
        'return_date' => '2026-07-12',
        'price' => 2100000,
        'total_slots' => 15,
        'booked_slots' => 3,
        'status' => 'open',
    ]);

    $response = $this->getJson("/api/admin/tours/{$tour->id}");

    $response->assertOk()
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.id', $tour->id)
        ->assertJsonPath('data.title', $tour->title)
        ->assertJsonPath('data.itinerary.0.title', 'Khoi hanh')
        ->assertJsonPath('data.itinerary.0.images.0.image_url', 'https://example.com/khoi-hanh.jpg')
        ->assertJsonPath('data.departures.0.price', 2100000.0);
});

test('admin can create tour without duration_nights and backend calculates it', function () {
    $admin = createAdminUser();
    Sanctum::actingAs($admin);

    $payload = [
        'category_id' => 1,
        'destination_id' => 1,
        'title' => 'Tour Auto Duration Nights',
        'duration_days' => 4,
        'base_price' => 1000000,
        'max_slots' => 10,
        'status' => 'draft',
    ];

    $response = $this->postJson('/api/admin/tours', $payload);

    $response->assertStatus(201)
        ->assertJsonPath('data.duration_days', 4)
        ->assertJsonPath('data.duration_nights', 3);

    $this->assertDatabaseHas('tours', [
        'title' => 'Tour Auto Duration Nights',
        'duration_days' => 4,
        'duration_nights' => 3,
    ]);
});

test('admin can create departure with valid data', function () {
    $admin = createAdminUser();
    Sanctum::actingAs($admin);

    $tour = createTestTour();

    $payload = [
        'departure_date' => now()->addDays(2)->format('Y-m-d'),
        'return_date' => now()->addDays(10)->format('Y-m-d'),
        'base_price' => 2000000,
        'discount_price' => 1800000,
        'total_slots' => 15,
        'status' => 'open',
    ];

    $response = $this->postJson("/api/admin/tours/{$tour->id}/departures", $payload);

    $response->assertStatus(201)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.return_date', now()->addDays(3)->format('Y-m-d'))
        ->assertJsonPath('data.price', 1800000.0)
        ->assertJsonPath('data.base_price', 2000000.0)
        ->assertJsonPath('data.discount_price', 1800000.0)
        ->assertJsonPath('data.total_slots', 15);

    $this->assertDatabaseHas('tour_departures', [
        'tour_id' => $tour->id,
        'base_price' => 2000000,
        'discount_price' => 1800000,
        'total_slots' => 15,
    ]);
});

test('departure without own price inherits tour base and discount price', function () {
    $admin = createAdminUser();
    Sanctum::actingAs($admin);

    $tour = createTestTour([
        'base_price' => 10000000,
        'discount_price' => 8000000,
    ]);

    $payload = [
        'departure_date' => now()->addDays(3)->format('Y-m-d'),
        'total_slots' => 12,
        'status' => 'open',
    ];

    $response = $this->postJson("/api/admin/tours/{$tour->id}/departures", $payload);

    $response->assertStatus(201)
        ->assertJsonPath('data.base_price', 10000000.0)
        ->assertJsonPath('data.discount_price', 8000000.0)
        ->assertJsonPath('data.price', 8000000.0)
        ->assertJsonPath('data.departure_base_price', null)
        ->assertJsonPath('data.departure_discount_price', null)
        ->assertJsonPath('data.uses_tour_price', true);

    $this->assertDatabaseHas('tour_departures', [
        'tour_id' => $tour->id,
        'base_price' => null,
        'discount_price' => null,
    ]);
});

test('create departure validation fails with invalid dates', function () {
    $admin = createAdminUser();
    Sanctum::actingAs($admin);

    $tour = createTestTour();

    // Ngày đi ở quá khứ, ngày về trước ngày đi
    $payload = [
        'departure_date' => now()->subDay()->format('Y-m-d'),
        'return_date' => now()->subDays(2)->format('Y-m-d'),
        'total_slots' => 10,
        'status' => 'open',
    ];

    $response = $this->postJson("/api/admin/tours/{$tour->id}/departures", $payload);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['departure_date']);
});

/*
|--------------------------------------------------------------------------
| Test 3: Cập nhật Lịch khởi hành & Ràng buộc động (Date + Slots)
|--------------------------------------------------------------------------
*/
test('update departure ignores submitted return_date and recalculates from tour duration', function () {
    $admin = createAdminUser();
    Sanctum::actingAs($admin);

    $tour = createTestTour([
        'duration_days' => 3,
        'duration_nights' => 2,
    ]);

    $originalDepartureDate = now()->addDays(5)->startOfDay();
    $updatedDepartureDate = now()->addDays(10)->startOfDay();

    $departure = TourDeparture::create([
        'tour_id' => $tour->id,
        'departure_date' => $originalDepartureDate->toDateString(),
        'return_date' => $originalDepartureDate->copy()->addDays(2)->toDateString(),
        'total_slots' => 10,
        'booked_slots' => 2,
        'status' => 'open',
    ]);

    $response = $this->putJson("/api/admin/tours/departures/{$departure->id}", [
        'departure_date' => $updatedDepartureDate->toDateString(),
        'return_date' => $originalDepartureDate->toDateString(),
        'change_reason' => 'Điều chỉnh lịch khởi hành',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.departure_date', $updatedDepartureDate->toDateString())
        ->assertJsonPath('data.return_date', $updatedDepartureDate->copy()->addDays(2)->toDateString());

    $this->assertDatabaseHas('tour_departures', [
        'id' => $departure->id,
        'departure_date' => $updatedDepartureDate->toDateTimeString(),
        'return_date' => $updatedDepartureDate->copy()->addDays(2)->toDateTimeString(),
    ]);
});

test('update departure total_slots cannot be less than booked_slots', function () {
    $admin = createAdminUser();
    Sanctum::actingAs($admin);

    $tour = createTestTour();

    $departureDate = now()->addDays(5)->startOfDay();

    $departure = TourDeparture::create([
        'tour_id' => $tour->id,
        'departure_date' => $departureDate->toDateString(),
        'return_date' => $departureDate->copy()->addDays(2)->toDateString(),
        'total_slots' => 10,
        'booked_slots' => 6, // Đã đặt 6 chỗ
        'status' => 'open',
    ]);

    // Update total_slots xuống 5 (nhỏ hơn booked_slots = 6)
    $response = $this->putJson("/api/admin/tours/departures/{$departure->id}", [
        'total_slots' => 5,
        'change_reason' => 'Giảm số chỗ còn trống',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['total_slots']);
});

/*
|--------------------------------------------------------------------------
| Test 4: Xóa Lịch khởi hành & Chặn khi có booking
|--------------------------------------------------------------------------
*/
test('cannot delete departure if it has active bookings', function () {
    $admin = createAdminUser();
    Sanctum::actingAs($admin);

    $tour = createTestTour();

    $departureDate = now()->addDays(5)->startOfDay();

    $departure = TourDeparture::create([
        'tour_id' => $tour->id,
        'departure_date' => $departureDate->toDateString(),
        'return_date' => $departureDate->copy()->addDays(2)->toDateString(),
        'total_slots' => 10,
        'booked_slots' => 1,
        'status' => 'open',
    ]);

    // Tạo booking liên kết với đợt đi
    Booking::create([
        'booking_code' => 'BK123456',
        'user_id' => $admin->id,
        'tour_id' => $tour->id,
        'tour_departure_id' => $departure->id,
        'number_of_people' => 1,
        'unit_price' => 2200000,
        'total_amount' => 2200000,
        'status' => 'confirmed',
        'payment_status' => 'paid',
    ]);

    $response = $this->deleteJson("/api/admin/tours/departures/{$departure->id}");

    $response->assertStatus(422)
        ->assertJsonPath('status', 'error')
        ->assertJsonPath('message', 'Không thể xóa lịch khởi hành này vì đã có booking liên kết. Vui lòng hủy hoặc chuyển các booking trước khi xóa.');

    $this->assertDatabaseHas('tour_departures', ['id' => $departure->id]);
});

/*
|--------------------------------------------------------------------------
| Test 5: Tour Itinerary Table Sync
|--------------------------------------------------------------------------
*/
test('admin can create tour with detailed itinerary records and images', function () {
    $admin = createAdminUser();
    Sanctum::actingAs($admin);

    $payload = [
        'category_id' => 1,
        'destination_id' => 1,
        'created_by' => $admin->id,
        'title' => 'Tour Test Lịch Trình',
        'duration_days' => 2,
        'duration_nights' => 1,
        'base_price' => 1000000,
        'max_slots' => 10,
        'status' => 'draft',
        'itinerary' => [
            [
                'day_number' => 1,
                'sort_order' => 0,
                'type' => 'departure',
                'title' => 'Khởi hành từ Hà Nội',
                'start_time' => '08:00',
                'transport' => 'Xe du lịch',
                'description' => 'Tập trung tại điểm hẹn và khởi hành.',
                'images' => [
                    [
                        'image_url' => 'https://example.com/lich-trinh-1.jpg',
                        'alt_text' => 'Điểm khởi hành',
                        'sort_order' => 0,
                    ],
                ],
            ],
            [
                'day_number' => 1,
                'sort_order' => 1,
                'type' => 'sightseeing',
                'title' => 'Tham quan phố cổ',
                'duration' => '2 giờ',
                'description' => 'Đi bộ tham quan các điểm nổi bật.',
            ],
        ],
    ];

    $response = $this->postJson('/api/admin/tours', $payload);

    $response->assertStatus(201)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.itinerary.0.title', 'Khởi hành từ Hà Nội')
        ->assertJsonPath('data.itinerary.0.images.0.image_url', 'https://example.com/lich-trinh-1.jpg');

    $this->assertDatabaseHas('tour_itineraries', [
        'title' => 'Tham quan phố cổ',
        'type' => 'sightseeing',
        'sort_order' => 1,
    ]);

    $this->assertDatabaseHas('tour_itinerary_images', [
        'image_url' => 'https://example.com/lich-trinh-1.jpg',
        'alt_text' => 'Điểm khởi hành',
    ]);
});

test('admin can update tour and resync itinerary records', function () {
    $admin = createAdminUser();
    Sanctum::actingAs($admin);

    $tour = createTestTour(['created_by' => $admin->id]);
    $oldItinerary = $tour->itineraries()->create([
        'day_number' => 1,
        'sort_order' => 0,
        'type' => 'sightseeing',
        'title' => 'Lịch trình cũ',
        'description' => 'Nội dung cũ',
    ]);
    $oldItinerary->images()->create([
        'image_url' => 'https://example.com/cu.jpg',
        'sort_order' => 0,
    ]);

    $response = $this->putJson("/api/admin/tours/{$tour->id}", [
        'title' => 'Tour đã cập nhật lịch trình',
        'itinerary' => [
            [
                'day_number' => 2,
                'sort_order' => 0,
                'type' => 'return',
                'title' => 'Trở về Hà Nội',
                'transport' => 'Máy bay',
                'description' => 'Kết thúc chuyến đi.',
            ],
        ],
    ]);

    $response->assertOk()
        ->assertJsonPath('data.itinerary.0.title', 'Trở về Hà Nội');

    $this->assertDatabaseMissing('tour_itineraries', [
        'title' => 'Lịch trình cũ',
    ]);

    $this->assertDatabaseMissing('tour_itinerary_images', [
        'image_url' => 'https://example.com/cu.jpg',
    ]);

    $this->assertDatabaseHas('tour_itineraries', [
        'tour_id' => $tour->id,
        'day_number' => 2,
        'type' => 'return',
        'title' => 'Trở về Hà Nội',
        'transport' => 'Máy bay',
    ]);
});

test('store tour validates detailed itinerary structure', function () {
    $admin = createAdminUser();
    Sanctum::actingAs($admin);

    $payload = [
        'category_id' => 1,
        'destination_id' => 1,
        'created_by' => $admin->id,
        'title' => 'Tour Test Itinerary',
        'duration_days' => 2,
        'duration_nights' => 1,
        'base_price' => 1000000,
        'max_slots' => 10,
        'status' => 'draft',
        'itinerary' => [
            [
                'day_number' => 1,
                'type' => 'invalid_type',
            ],
        ],
    ];

    $response = $this->postJson('/api/admin/tours', $payload);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['itinerary.0.type', 'itinerary.0.title']);
});
