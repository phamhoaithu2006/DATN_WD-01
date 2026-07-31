<?php

use App\Models\Faq;
use Database\Seeders\FaqSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('faq table contains the required data structure', function () {
    expect(Schema::hasColumns('faqs', [
        'id',
        'category',
        'question',
        'answer',
        'keywords',
        'sort_order',
        'is_active',
        'created_at',
        'updated_at',
    ]))->toBeTrue();
});

test('faq model casts searchable fields and status correctly', function () {
    $faq = Faq::factory()->create([
        'keywords' => ['hoàn tiền', 'hoan tien'],
        'sort_order' => 25,
        'is_active' => false,
    ]);

    expect($faq->keywords)->toBe(['hoàn tiền', 'hoan tien'])
        ->and($faq->sort_order)->toBe(25)
        ->and($faq->is_active)->toBeFalse();
});

test('faq seeder creates fifty active questions across all required categories', function () {
    $this->seed(FaqSeeder::class);

    $categoryCounts = Faq::query()
        ->selectRaw('category, COUNT(*) as total')
        ->groupBy('category')
        ->pluck('total', 'category');

    expect(Faq::query()->count())->toBe(50)
        ->and(Faq::query()->where('is_active', false)->count())->toBe(0)
        ->and($categoryCounts->keys()->sort()->values()->all())
        ->toBe(collect(array_keys(Faq::CATEGORY_LABELS))->sort()->values()->all());

    foreach (array_keys(Faq::CATEGORY_LABELS) as $category) {
        expect((int) $categoryCounts->get($category))->toBe(5);
    }

    expect(Faq::query()->whereJsonLength('keywords', 0)->exists())->toBeFalse()
        ->and(Faq::query()->whereNull('answer')->exists())->toBeFalse();
});

test('faq seeder can be run repeatedly without duplicating content', function () {
    $this->seed(FaqSeeder::class);
    $this->seed(FaqSeeder::class);

    expect(Faq::query()->count())->toBe(50);
});
