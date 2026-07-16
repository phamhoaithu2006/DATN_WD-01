<?php

use App\Models\Category;
use App\Models\Destination;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropIfExists('categories');
    Schema::dropIfExists('destinations');

    Schema::create('categories', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('slug')->unique();
        $table->text('description')->nullable();
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
