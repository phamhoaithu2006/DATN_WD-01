<?php

use App\Models\Category;
use App\Models\Province;
use App\Models\Tour;
use App\Models\TourReview;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropIfExists('tour_reviews');
    Schema::dropIfExists('reviews');
    Schema::dropIfExists('bookings');
    Schema::dropIfExists('tour_itinerary_images');
    Schema::dropIfExists('tour_itineraries');
    Schema::dropIfExists('destination_places');
    Schema::dropIfExists('tour_images');
    Schema::dropIfExists('tour_departures');
    Schema::dropIfExists('tours');
    Schema::dropIfExists('users');
    Schema::dropIfExists('categories');
    Schema::dropIfExists('provinces');

    Schema::create('categories', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('slug')->unique();
        $table->text('description')->nullable();
        $table->string('thumbnail_url')->nullable();
        $table->string('status')->default('active');
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('provinces', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('code')->nullable()->unique();
        $table->timestamps();
    });

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('full_name');
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('tours', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('category_id');
        $table->unsignedBigInteger('province_id');
        $table->string('title');
        $table->string('slug')->unique();
        $table->string('summary')->nullable();
        $table->text('description')->nullable();
        $table->unsignedInteger('duration_days')->default(1);
        $table->unsignedInteger('duration_nights')->default(0);
        $table->decimal('base_price', 12, 2)->default(0);
        $table->decimal('discount_price', 12, 2)->nullable();
        $table->unsignedInteger('max_slots')->default(1);
        $table->unsignedInteger('available_slots')->default(1);
        $table->string('status')->default('published');
        $table->decimal('average_rating', 3, 2)->default(0);
        $table->unsignedInteger('review_count')->default(0);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('tour_departures', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('tour_id');
        $table->date('departure_date');
        $table->date('return_date')->nullable();
        $table->decimal('price', 12, 2)->nullable();
        $table->decimal('base_price', 12, 2)->nullable();
        $table->decimal('discount_price', 12, 2)->nullable();
        $table->unsignedInteger('total_slots');
        $table->unsignedInteger('booked_slots')->default(0);
        $table->string('status')->default('open');
        $table->unsignedBigInteger('current_stage_id')->nullable();
        $table->timestamps();
    });

    Schema::create('tour_images', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('tour_id');
        $table->string('image_url');
        $table->string('alt_text')->nullable();
        $table->boolean('is_thumbnail')->default(false);
        $table->unsignedInteger('sort_order')->default(0);
        $table->timestamps();
    });

    Schema::create('destination_places', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('province_id');
        $table->string('name');
        $table->string('slug')->unique();
        $table->string('thumbnail_url')->nullable();
        $table->string('status')->default('active');
        $table->softDeletes();
        $table->timestamps();
    });

    Schema::create('tour_itineraries', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('tour_id');
        $table->unsignedBigInteger('destination_place_id')->nullable();
        $table->unsignedInteger('day_number')->default(1);
        $table->unsignedInteger('sort_order')->default(0);
        $table->string('type')->default('sightseeing');
        $table->string('title');
        $table->timestamps();
    });

    Schema::create('tour_itinerary_images', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('tour_itinerary_id');
        $table->string('image_url');
        $table->string('alt_text')->nullable();
        $table->unsignedInteger('sort_order')->default(0);
        $table->timestamps();
    });

    Schema::create('bookings', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('tour_id');
        $table->string('status')->default('confirmed');
        $table->timestamps();
    });

    Schema::create('reviews', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('tour_id');
        $table->unsignedBigInteger('booking_id')->nullable();
        $table->unsignedTinyInteger('rating');
        $table->text('comment')->nullable();
        $table->string('status')->default('visible');
        $table->timestamps();
    });

    Schema::create('tour_reviews', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('tour_id');
        $table->unsignedBigInteger('booking_id')->nullable()->unique();
        $table->unsignedBigInteger('tour_departure_id')->nullable();
        $table->unsignedTinyInteger('rating');
        $table->text('comment')->nullable();
        $table->string('status')->default('visible');
        $table->unsignedBigInteger('moderated_by')->nullable();
        $table->timestamp('moderated_at')->nullable();
        $table->timestamps();
    });
});

test('public catalog returns only active categories and destinations', function () {
    Category::query()->create([
        'name' => 'Biển đảo',
        'slug' => 'bien-dao',
        'status' => 'active',
    ]);
    Category::query()->create([
        'name' => 'Tạm ẩn',
        'slug' => 'tam-an',
        'status' => 'inactive',
    ]);
    Province::query()->create([
        'name' => 'Đà Nẵng',
    ]);
    Province::query()->create([
        'name' => 'Nội bộ',
    ]);

    $this->getJson('/api/catalog/categories')
        ->assertOk()
        ->assertJsonPath('status', 'success')
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'bien-dao');

    $this->getJson('/api/catalog/destinations')
        ->assertOk()
        ->assertJsonPath('status', 'success')
        ->assertJsonCount(2, 'data')
        ->assertJsonFragment(['slug' => 'da-nang'])
        ->assertJsonFragment(['slug' => 'noi-bo']);
});

test('catalog destinations with_tours filters out provinces without bookable tours', function () {
    $category = Category::query()->create([
        'name' => 'Biển đảo',
        'slug' => 'bien-dao',
        'status' => 'active',
    ]);
    $provinceWithValidTour = Province::query()->create([
        'name' => 'Đà Nẵng',
    ]);
    $provinceWithDraftTour = Province::query()->create([
        'name' => 'Hà Nội',
    ]);
    $provinceWithNoDepartures = Province::query()->create([
        'name' => 'Hải Phòng',
    ]);
    $provinceWithExpiredDeparture = Province::query()->create([
        'name' => 'Nha Trang',
    ]);
    Province::query()->create([
        'name' => 'Cần Thơ',
    ]);

    // Tour hợp lệ: published + departure open trong tương lai + còn slot
    $validTour = Tour::query()->create([
        'category_id' => $category->id,
        'province_id' => $provinceWithValidTour->id,
        'title' => 'Tour Đà Nẵng',
        'slug' => 'tour-da-nang',
        'status' => 'published',
    ]);
    DB::table('tour_departures')->insert([
        'tour_id' => $validTour->id,
        'departure_date' => now()->addWeek()->toDateString(),
        'return_date' => now()->addDays(9)->toDateString(),
        'base_price' => 3000000,
        'total_slots' => 20,
        'booked_slots' => 2,
        'status' => 'open',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Tour nháp (draft)
    Tour::query()->create([
        'category_id' => $category->id,
        'province_id' => $provinceWithDraftTour->id,
        'title' => 'Tour Hà Nội Draft',
        'slug' => 'tour-ha-noi-draft',
        'status' => 'draft',
    ]);

    // Tour published nhưng không có lịch khởi hành
    Tour::query()->create([
        'category_id' => $category->id,
        'province_id' => $provinceWithNoDepartures->id,
        'title' => 'Tour Hải Phòng No Departure',
        'slug' => 'tour-hai-phong-no-departure',
        'status' => 'published',
    ]);

    // Tour published nhưng lịch khởi hành đã quá hạn
    $expiredTour = Tour::query()->create([
        'category_id' => $category->id,
        'province_id' => $provinceWithExpiredDeparture->id,
        'title' => 'Tour Nha Trang Expired',
        'slug' => 'tour-nha-trang-expired',
        'status' => 'published',
    ]);
    DB::table('tour_departures')->insert([
        'tour_id' => $expiredTour->id,
        'departure_date' => now()->subDay()->toDateString(),
        'return_date' => now()->toDateString(),
        'base_price' => 2000000,
        'total_slots' => 20,
        'booked_slots' => 0,
        'status' => 'open',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // 1. Mặc định không truyền with_tours: trả về tất cả 5 tỉnh
    $this->getJson('/api/catalog/destinations')
        ->assertOk()
        ->assertJsonCount(5, 'data');

    // 2. Truyền with_tours=1: chỉ trả về tỉnh có tour hợp lệ (Đà Nẵng)
    $this->getJson('/api/catalog/destinations?with_tours=1')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'da-nang')
        ->assertJsonPath('data.0.name', 'Đà Nẵng');
});

test('home returns only bookable content and visible customer reviews', function () {
    $category = Category::query()->create([
        'name' => 'Nghỉ dưỡng',
        'slug' => 'nghi-duong',
        'status' => 'active',
    ]);
    $destination = Province::query()->create([
        'name' => 'Đà Nẵng',
    ]);
    $tour = Tour::query()->create([
        'category_id' => $category->id,
        'province_id' => $destination->id,
        'title' => 'Đà Nẵng cuối tuần',
        'slug' => 'da-nang-cuoi-tuan',
        'duration_days' => 3,
        'duration_nights' => 2,
        'base_price' => 3000000,
        'max_slots' => 20,
        'available_slots' => 20,
        'status' => 'published',
        'average_rating' => 4.8,
        'review_count' => 1,
    ]);

    DB::table('tour_departures')->insert([
        'tour_id' => $tour->id,
        'departure_date' => now()->addWeek()->toDateString(),
        'return_date' => now()->addDays(9)->toDateString(),
        'base_price' => 3000000,
        'total_slots' => 20,
        'booked_slots' => 3,
        'status' => 'open',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('tour_images')->insert([
        'tour_id' => $tour->id,
        'image_url' => 'tours/da-nang.jpg',
        'alt_text' => 'Bãi biển Đà Nẵng',
        'is_thumbnail' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $userId = DB::table('users')->insertGetId([
        'full_name' => 'Nguyễn Văn An',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    TourReview::query()->create([
        'user_id' => $userId,
        'tour_id' => $tour->id,
        'rating' => 5,
        'comment' => 'Lịch trình rõ ràng và hỗ trợ chu đáo.',
        'status' => 'visible',
    ]);

    $this->getJson('/api/home')
        ->assertOk()
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.statistics.available_tours', 1)
        ->assertJsonPath('data.statistics.categories', 1)
        ->assertJsonPath('data.statistics.destinations', 1)
        ->assertJsonCount(1, 'data.featured_tours')
        ->assertJsonPath('data.featured_tours.0.slug', 'da-nang-cuoi-tuan')
        ->assertJsonPath('data.categories.0.tour_count', 1)
        ->assertJsonPath('data.destinations.0.tour_count', 1)
        ->assertJsonPath('data.reviews.0.reviewer_name', 'N. V. A.')
        ->assertJsonPath('data.reviews.0.tour_slug', 'da-nang-cuoi-tuan');
});

test('home returns a random destination image with the expected source priority', function () {
    $category = Category::query()->create([
        'name' => 'Khám phá',
        'slug' => 'kham-pha',
        'status' => 'active',
    ]);
    $province = Province::query()->create([
        'name' => 'Đà Nẵng',
        'code' => '48',
    ]);
    $tour = Tour::query()->create([
        'category_id' => $category->id,
        'province_id' => $province->id,
        'title' => 'Đà Nẵng trải nghiệm',
        'slug' => 'da-nang-trai-nghiem',
        'duration_days' => 3,
        'duration_nights' => 2,
        'base_price' => 3000000,
        'max_slots' => 20,
        'available_slots' => 20,
        'status' => 'published',
    ]);

    DB::table('tour_departures')->insert([
        'tour_id' => $tour->id,
        'departure_date' => now()->addWeek()->toDateString(),
        'return_date' => now()->addDays(9)->toDateString(),
        'base_price' => 3000000,
        'total_slots' => 20,
        'booked_slots' => 0,
        'status' => 'open',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('tour_images')->insert([
        'tour_id' => $tour->id,
        'image_url' => 'tours/da-nang-fallback.jpg',
        'alt_text' => 'Ảnh tour Đà Nẵng',
        'is_thumbnail' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $placeId = DB::table('destination_places')->insertGetId([
        'province_id' => $province->id,
        'name' => 'Bà Nà Hills',
        'slug' => 'ba-na-hills',
        'thumbnail_url' => 'places/ba-na-hills.jpg',
        'status' => 'active',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $itineraryId = DB::table('tour_itineraries')->insertGetId([
        'tour_id' => $tour->id,
        'destination_place_id' => $placeId,
        'day_number' => 1,
        'sort_order' => 1,
        'type' => 'sightseeing',
        'title' => 'Khám phá Bà Nà Hills',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('tour_itinerary_images')->insert([
        'tour_itinerary_id' => $itineraryId,
        'image_url' => 'itineraries/ba-na-cau-vang.jpg',
        'alt_text' => 'Cầu Vàng tại Bà Nà Hills',
        'sort_order' => 1,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->getJson('/api/home')
        ->assertOk()
        ->assertJsonPath('data.destinations.0.thumbnail_url', 'itineraries/ba-na-cau-vang.jpg')
        ->assertJsonPath('data.destinations.0.thumbnail_alt_text', 'Cầu Vàng tại Bà Nà Hills')
        ->assertJsonPath('data.destinations.0.place_name', 'Bà Nà Hills');

    DB::table('tour_itinerary_images')->delete();

    $this->getJson('/api/home')
        ->assertOk()
        ->assertJsonPath('data.destinations.0.thumbnail_url', 'places/ba-na-hills.jpg')
        ->assertJsonPath('data.destinations.0.place_name', 'Bà Nà Hills');

    DB::table('destination_places')->where('id', $placeId)->update(['thumbnail_url' => null]);

    $this->getJson('/api/home')
        ->assertOk()
        ->assertJsonPath('data.destinations.0.thumbnail_url', 'tours/da-nang-fallback.jpg')
        ->assertJsonPath('data.destinations.0.place_name', null);
});

test('home returns the five categories with the most bookable tours', function () {
    $destination = Province::query()->create([
        'name' => 'Đà Nẵng',
    ]);

    for ($categoryIndex = 1; $categoryIndex <= 6; $categoryIndex++) {
        $category = Category::query()->create([
            'name' => "Loại hình {$categoryIndex}",
            'slug' => "loai-hinh-{$categoryIndex}",
            'status' => 'active',
        ]);

        $tourCount = 7 - $categoryIndex;

        for ($tourIndex = 1; $tourIndex <= $tourCount; $tourIndex++) {
            $tour = Tour::query()->create([
                'category_id' => $category->id,
                'province_id' => $destination->id,
                'title' => "Tour {$categoryIndex}-{$tourIndex}",
                'slug' => "tour-{$categoryIndex}-{$tourIndex}",
                'duration_days' => 3,
                'duration_nights' => 2,
                'base_price' => 3000000,
                'max_slots' => 20,
                'available_slots' => 20,
                'status' => 'published',
            ]);

            DB::table('tour_departures')->insert([
                'tour_id' => $tour->id,
                'departure_date' => now()->addWeek()->toDateString(),
                'return_date' => now()->addDays(9)->toDateString(),
                'base_price' => 3000000,
                'total_slots' => 20,
                'booked_slots' => 0,
                'status' => 'open',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    $this->getJson('/api/home')
        ->assertOk()
        ->assertJsonCount(5, 'data.categories')
        ->assertJsonPath('data.categories.0.slug', 'loai-hinh-1')
        ->assertJsonPath('data.categories.0.tour_count', 6)
        ->assertJsonPath('data.categories.4.slug', 'loai-hinh-5')
        ->assertJsonPath('data.categories.4.tour_count', 2);
});
