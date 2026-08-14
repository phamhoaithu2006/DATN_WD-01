<?php

use App\Models\Category;
use App\Models\Province;
use App\Models\Tour;
use App\Models\TourDeparture;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function tourFilterCategory(string $name): Category
{
    return Category::query()->create([
        'name' => $name,
        'slug' => Str::slug($name).'-'.Str::random(5),
        'status' => 'active',
    ]);
}

function tourFilterDestination(string $name): Province
{
    return Province::query()->firstOrCreate([
        'name' => $name,
    ]);
}

/**
 * @param  array<string, mixed>  $attributes
 */
function tourFilterTour(Category $category, Province $destination, array $attributes = []): Tour
{
    $title = $attributes['title'] ?? 'Tour '.Str::random(8);

    $tour = Tour::query()->create(array_merge([
        'category_id' => $category->id,
        'province_id' => $destination->id,
        'title' => $title,
        'slug' => Str::slug($title).'-'.Str::random(5),
        'duration_days' => 3,
        'duration_nights' => 2,
        'base_price' => 5000000,
        'max_slots' => 30,
        'available_slots' => 30,
        'status' => 'published',
        'average_rating' => 0,
        'review_count' => 0,
    ], $attributes));

    TourDeparture::query()->create([
        'tour_id' => $tour->id,
        'departure_date' => $attributes['departure_date'] ?? now()->addDays(10)->toDateString(),
        'return_date' => now()->addDays(13)->toDateString(),
        'total_slots' => 30,
        'booked_slots' => 0,
        'status' => 'open',
    ]);

    return $tour;
}

function tourFilterIds($response): array
{
    return collect($response->json('data'))->pluck('id')->all();
}

test('filters tours by price range using effective departure price', function () {
    $category = tourFilterCategory('Biển');
    $destination = tourFilterDestination('Hạ Long');

    $cheap = tourFilterTour($category, $destination, ['base_price' => 2000000]);
    $mid = tourFilterTour($category, $destination, ['base_price' => 6000000, 'discount_price' => 4500000]);
    $expensive = tourFilterTour($category, $destination, ['base_price' => 15000000]);

    $response = $this->getJson('/api/tours?price_min=3000000&price_max=10000000')->assertOk();

    expect(tourFilterIds($response))->toBe([$mid->id])
        ->and(tourFilterIds($response))->not->toContain($cheap->id, $expensive->id);
});

test('filters tours by multiple provinces', function () {
    $category = tourFilterCategory('Biển');
    $haLong = tourFilterDestination('Hạ Long');
    $daNang = tourFilterDestination('Đà Nẵng');
    $sapa = tourFilterDestination('Sa Pa');

    $tourHaLong = tourFilterTour($category, $haLong);
    $tourDaNang = tourFilterTour($category, $daNang);
    $tourSapa = tourFilterTour($category, $sapa);

    $response = $this->getJson('/api/tours?provinces[]='.$haLong->id.'&provinces[]='.$daNang->id)
        ->assertOk();

    expect(tourFilterIds($response))
        ->toHaveCount(2)
        ->toContain($tourHaLong->id, $tourDaNang->id)
        ->not->toContain($tourSapa->id);
});

test('filters tours by multiple categories', function () {
    $sea = tourFilterCategory('Biển');
    $mountain = tourFilterCategory('Núi');
    $culture = tourFilterCategory('Văn hóa');
    $destination = tourFilterDestination('Hà Nội');

    $tourSea = tourFilterTour($sea, $destination);
    tourFilterTour($mountain, $destination);
    $tourCulture = tourFilterTour($culture, $destination);

    $response = $this->getJson('/api/tours?categories[]='.$sea->id.'&categories[]='.$culture->id)
        ->assertOk();

    expect(tourFilterIds($response))->toHaveCount(2)
        ->toContain($tourSea->id, $tourCulture->id);
});

test('filters tours by duration buckets', function () {
    $category = tourFilterCategory('Biển');
    $destination = tourFilterDestination('Phú Quốc');

    $short = tourFilterTour($category, $destination, ['duration_days' => 2]);
    $medium = tourFilterTour($category, $destination, ['duration_days' => 5]);
    $long = tourFilterTour($category, $destination, ['duration_days' => 10]);

    $response = $this->getJson('/api/tours?duration[]=1-3&duration[]=8%2B')->assertOk();

    expect(tourFilterIds($response))->toHaveCount(2)
        ->toContain($short->id, $long->id)
        ->not->toContain($medium->id);
});

test('filters tours by departure date range', function () {
    $category = tourFilterCategory('Biển');
    $destination = tourFilterDestination('Nha Trang');

    $august = tourFilterTour($category, $destination, [
        'departure_date' => now()->addDays(5)->toDateString(),
    ]);
    $december = tourFilterTour($category, $destination, [
        'departure_date' => now()->addDays(60)->toDateString(),
    ]);

    $response = $this->getJson(sprintf(
        '/api/tours?date_from=%s&date_to=%s',
        now()->addDays(3)->toDateString(),
        now()->addDays(10)->toDateString(),
    ))->assertOk();

    expect(tourFilterIds($response))->toBe([$august->id])
        ->not->toContain($december->id);
});

test('filters tours by minimum rating', function () {
    $category = tourFilterCategory('Biển');
    $destination = tourFilterDestination('Huế');

    tourFilterTour($category, $destination, ['average_rating' => 3.2, 'review_count' => 5]);
    $good = tourFilterTour($category, $destination, ['average_rating' => 4.5, 'review_count' => 12]);
    $top = tourFilterTour($category, $destination, ['average_rating' => 5, 'review_count' => 3]);

    $response = $this->getJson('/api/tours?rating_min=4')->assertOk();

    expect(tourFilterIds($response))->toHaveCount(2)
        ->toContain($good->id, $top->id);
});

test('combines price, destination and rating filters', function () {
    $category = tourFilterCategory('Biển');
    $haLong = tourFilterDestination('Hạ Long');
    $daNang = tourFilterDestination('Đà Nẵng');

    $match = tourFilterTour($category, $haLong, [
        'base_price' => 5000000,
        'average_rating' => 4.8,
    ]);
    tourFilterTour($category, $haLong, ['base_price' => 5000000, 'average_rating' => 3.0]);
    tourFilterTour($category, $daNang, ['base_price' => 5000000, 'average_rating' => 4.9]);
    tourFilterTour($category, $haLong, ['base_price' => 20000000, 'average_rating' => 4.9]);

    $response = $this->getJson(
        '/api/tours?price_min=1000000&price_max=9000000&destinations[]='.$haLong->id.'&rating_min=4',
    )->assertOk();

    expect(tourFilterIds($response))->toBe([$match->id]);
});

test('sorts by popularity using review count', function () {
    $category = tourFilterCategory('Biển');
    $destination = tourFilterDestination('Cần Thơ');

    $quiet = tourFilterTour($category, $destination, ['review_count' => 2, 'average_rating' => 5]);
    $popular = tourFilterTour($category, $destination, ['review_count' => 50, 'average_rating' => 4.2]);

    $response = $this->getJson('/api/tours?sort=popular')->assertOk();

    expect(tourFilterIds($response))->toBe([$popular->id, $quiet->id]);
});

test('discount sort returns only discounted tours ordered by effective discount rate', function () {
    $category = tourFilterCategory('Nghỉ dưỡng');
    $destination = tourFilterDestination('Đà Nẵng');

    $regular = tourFilterTour($category, $destination, ['base_price' => 5000000]);
    $smallDiscount = tourFilterTour($category, $destination, [
        'base_price' => 5000000,
        'discount_price' => 4500000,
    ]);
    $largeDiscount = tourFilterTour($category, $destination, [
        'base_price' => 5000000,
        'discount_price' => 3500000,
    ]);

    $response = $this->getJson('/api/tours?sort=discount')->assertOk();

    expect(tourFilterIds($response))->toBe([$largeDiscount->id, $smallDiscount->id])
        ->not->toContain($regular->id);
});

test('legacy single-value parameters keep working', function () {
    $category = tourFilterCategory('Biển');
    $other = tourFilterCategory('Núi');
    $destination = tourFilterDestination('Đà Lạt');

    $match = tourFilterTour($category, $destination, ['duration_days' => 4]);
    tourFilterTour($other, $destination, ['duration_days' => 4]);
    tourFilterTour($category, $destination, ['duration_days' => 9]);

    $response = $this->getJson(
        '/api/tours?category_id='.$category->id.'&destination_id='.$destination->id.'&duration_days=4',
    )->assertOk();

    expect(tourFilterIds($response))->toBe([$match->id]);
});

test('rejects invalid filter combinations with 422', function () {
    $this->getJson('/api/tours?price_min=5000000&price_max=1000000')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('price_max');

    $this->getJson('/api/tours?date_from=2026-09-10&date_to=2026-09-01')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('date_to');

    $this->getJson('/api/tours?rating_min=6')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('rating_min');

    $this->getJson('/api/tours?sort=khong-hop-le')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('sort');

    $this->getJson('/api/tours?duration[]=2-5')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('duration.0');

    $this->getJson('/api/tours?per_page=100')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('per_page');
});

test('unknown destination or category ids return empty result instead of error', function () {
    $category = tourFilterCategory('Biển');
    $destination = tourFilterDestination('Hạ Long');
    tourFilterTour($category, $destination);

    $this->getJson('/api/tours?destinations[]=999999')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('hidden and draft tours never appear in filtered results', function () {
    $category = tourFilterCategory('Biển');
    $destination = tourFilterDestination('Hạ Long');

    $published = tourFilterTour($category, $destination);
    tourFilterTour($category, $destination, ['status' => 'hidden']);
    tourFilterTour($category, $destination, ['status' => 'draft']);

    $response = $this->getJson('/api/tours')->assertOk();

    expect(tourFilterIds($response))->toBe([$published->id]);
});

test('pagination keeps filter parameters in links', function () {
    $category = tourFilterCategory('Biển');
    $destination = tourFilterDestination('Hạ Long');

    foreach (range(1, 15) as $i) {
        tourFilterTour($category, $destination, ['average_rating' => 4.5]);
    }

    $response = $this->getJson('/api/tours?rating_min=4&per_page=12')->assertOk();

    expect($response->json('meta.total'))->toBe(15)
        ->and($response->json('meta.last_page'))->toBe(2)
        ->and($response->json('links.next'))->toContain('rating_min=4');
});

test('filter options endpoint returns price range, option counts and caches result', function () {
    Cache::forget(Tour::FILTER_OPTIONS_CACHE_KEY);

    $sea = tourFilterCategory('Biển');
    $mountain = tourFilterCategory('Núi');
    $haLong = tourFilterDestination('Hạ Long');
    $sapa = tourFilterDestination('Sa Pa');

    tourFilterTour($sea, $haLong, ['base_price' => 2000000, 'duration_days' => 2]);
    tourFilterTour($sea, $haLong, ['base_price' => 8000000, 'discount_price' => 7000000, 'duration_days' => 5]);
    tourFilterTour($mountain, $sapa, ['base_price' => 12000000, 'duration_days' => 9]);
    tourFilterTour($mountain, $sapa, ['base_price' => 9000000, 'status' => 'draft']);

    $response = $this->getJson('/api/tours/filter-options')->assertOk();

    $options = $response->json('data');

    expect($options['price']['min'])->toEqual(2000000)
        ->and($options['price']['max'])->toEqual(12000000)
        ->and(collect($options['categories'])->firstWhere('id', $sea->id)['tours_count'])->toBe(2)
        ->and(collect($options['categories'])->firstWhere('id', $mountain->id)['tours_count'])->toBe(1)
        ->and(collect($options['provinces'])->firstWhere('id', $haLong->id)['tours_count'])->toBe(2)
        ->and(collect($options['durations'])->firstWhere('value', '1-3')['tours_count'])->toBe(1)
        ->and(collect($options['durations'])->firstWhere('value', '4-7')['tours_count'])->toBe(1)
        ->and(collect($options['durations'])->firstWhere('value', '8+')['tours_count'])->toBe(1);

    expect(Cache::has(Tour::FILTER_OPTIONS_CACHE_KEY))->toBeTrue();
});

test('filter options cache is cleared when a tour changes', function () {
    Cache::forget(Tour::FILTER_OPTIONS_CACHE_KEY);

    $category = tourFilterCategory('Biển');
    $destination = tourFilterDestination('Hạ Long');
    $tour = tourFilterTour($category, $destination);

    $this->getJson('/api/tours/filter-options')->assertOk();
    expect(Cache::has(Tour::FILTER_OPTIONS_CACHE_KEY))->toBeTrue();

    $tour->update(['status' => 'hidden']);

    expect(Cache::has(Tour::FILTER_OPTIONS_CACHE_KEY))->toBeFalse();
});
