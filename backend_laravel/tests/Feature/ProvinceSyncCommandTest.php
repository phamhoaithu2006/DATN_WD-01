<?php

use App\Models\Province;
use App\Services\ProvinceSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

test('province sync creates normalized provinces and is idempotent', function () {
    Http::fake([
        '*' => Http::response([
            ['name' => 'Thành phố Kiểm Thử A', 'code' => 998],
            ['name' => 'Tỉnh Kiểm Thử B', 'code' => 999],
        ]),
    ]);

    $service = app(ProvinceSyncService::class);

    expect($service->sync())->toBe(['created' => 2, 'updated' => 0, 'skipped' => 0]);
    expect($service->sync())->toBe(['created' => 0, 'updated' => 0, 'skipped' => 2]);

    $this->assertDatabaseHas('provinces', ['name' => 'Kiểm Thử A', 'code' => '998']);
    $this->assertDatabaseHas('provinces', ['name' => 'Kiểm Thử B', 'code' => '999']);
});

test('province sync assigns an API code to an existing normalized province name', function () {
    $province = Province::query()->create(['name' => 'Dữ Liệu Cũ']);

    Http::fake([
        '*' => Http::response([
            ['name' => 'Tỉnh Dữ Liệu Cũ', 'code' => 997],
        ]),
    ]);

    $result = app(ProvinceSyncService::class)->sync();

    expect($result)->toBe(['created' => 0, 'updated' => 1, 'skipped' => 0]);
    expect(Province::query()->findOrFail($province->id)->code)->toBe('997');
    expect(Province::query()->where('name', 'Dữ Liệu Cũ')->count())->toBe(1);
});

test('province sync leaves existing data unchanged when the API response is invalid', function () {
    Province::query()->create(['name' => 'Dữ Liệu Không Đổi', 'code' => '996']);

    Http::fake([
        '*' => Http::response([
            ['name' => 'Tỉnh Dữ Liệu Không Đổi'],
        ]),
    ]);

    expect(fn () => app(ProvinceSyncService::class)->sync())
        ->toThrow(RuntimeException::class, 'Dữ liệu tỉnh/thành từ Provinces Open API không hợp lệ.');

    $this->assertDatabaseHas('provinces', ['name' => 'Dữ Liệu Không Đổi', 'code' => '996']);
});

test('province sync command reports the synchronization result', function () {
    Http::fake([
        '*' => Http::response([
            ['name' => 'Thành phố Lệnh Kiểm Thử', 'code' => 995],
        ]),
    ]);

    $this->artisan('provinces:sync')
        ->expectsOutputToContain('tạo mới 1, cập nhật 0, không đổi 0')
        ->assertSuccessful();
});
