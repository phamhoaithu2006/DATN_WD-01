<?php

use App\Models\Category;
use App\Models\Destination;
use App\Models\Tour;
use App\Models\TourReview;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropIfExists('tour_reviews');
    Schema::dropIfExists('reviews');
    Schema::dropIfExists('bookings');
    Schema::dropIfExists('tour_images');
    Schema::dropIfExists('tour_departures');
    Schema::dropIfExists('tours');
    Schema::dropIfExists('users');
    Schema::dropIfExists('categories');
    Schema::dropIfExists('destinations');

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

    Schema::create('destinations', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('slug')->unique();
        $table->string('province_city')->nullable();
        $table->string('country')->nullable();
        $table->string('thumbnail_url')->nullable();
        $table->string('status')->default('active');
        $table->timestamps();
        $table->softDeletes();
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
        $table->unsignedBigInteger('destination_id');
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
    Destination::query()->create([
        'name' => 'Đà Nẵng',
        'slug' => 'da-nang',
        'province_city' => 'Đà Nẵng',
        'country' => 'Việt Nam',
        'status' => 'active',
    ]);
    Destination::query()->create([
        'name' => 'Nội bộ',
        'slug' => 'noi-bo',
        'country' => 'Việt Nam',
        'status' => 'inactive',
    ]);

    $this->getJson('/api/catalog/categories')
        ->assertOk()
        ->assertJsonPath('status', 'success')
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'bien-dao');

    $this->getJson('/api/catalog/destinations')
        ->assertOk()
        ->assertJsonPath('status', 'success')
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'da-nang');
});

test('home returns only bookable content and visible customer reviews', function () {
    $category = Category::query()->create([
        'name' => 'Nghỉ dưỡng',
        'slug' => 'nghi-duong',
        'status' => 'active',
    ]);
    $destination = Destination::query()->create([
        'name' => 'Đà Nẵng',
        'slug' => 'da-nang-home',
        'province_city' => 'Đà Nẵng',
        'country' => 'Việt Nam',
        'status' => 'active',
    ]);
    $tour = Tour::query()->create([
        'category_id' => $category->id,
        'destination_id' => $destination->id,
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
