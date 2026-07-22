<?php

use App\Models\Banner;
use App\Models\Booking;
use App\Models\Notification;
use App\Models\NotificationDraft;
use App\Models\Role;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function auditBugRole(string $name): Role
{
    return Role::query()->firstOrCreate(
        ['name' => $name],
        ['description' => $name]
    );
}

function auditBugUser(string $roleName): User
{
    return User::factory()->create([
        'role_id' => auditBugRole($roleName)->id,
        'status' => 'active',
    ]);
}

/**
 * @return array{booking: Booking, departure: TourDeparture}
 */
function auditBugBookingScenario(User $user): array
{
    $suffix = Str::lower(Str::random(10));
    $now = now();

    $categoryId = DB::table('categories')->insertGetId([
        'name' => "Danh mục audit {$suffix}",
        'slug' => "danh-muc-audit-{$suffix}",
        'description' => 'Dữ liệu kiểm thử lỗi hoàn chỗ.',
        'status' => 'active',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $destinationId = DB::table('destinations')->insertGetId([
        'name' => "Điểm đến audit {$suffix}",
        'slug' => "diem-den-audit-{$suffix}",
        'province_city' => 'Hà Nội',
        'country' => 'Việt Nam',
        'description' => 'Dữ liệu kiểm thử lỗi hoàn chỗ.',
        'status' => 'active',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $tour = Tour::query()->create([
        'category_id' => $categoryId,
        'destination_id' => $destinationId,
        'created_by' => $user->id,
        'title' => "Tour audit {$suffix}",
        'slug' => "tour-audit-{$suffix}",
        'duration_days' => 2,
        'duration_nights' => 1,
        'base_price' => 1_000_000,
        'max_slots' => 20,
        'available_slots' => 20,
        'status' => 'published',
    ]);

    $departure = TourDeparture::query()->create([
        'tour_id' => $tour->id,
        'departure_date' => now()->addDays(10)->toDateString(),
        'return_date' => now()->addDays(11)->toDateString(),
        'base_price' => 1_000_000,
        'total_slots' => 10,
        'booked_slots' => 8,
        'status' => 'open',
    ]);

    $booking = Booking::query()->create([
        'booking_code' => 'BK-AUDIT-'.Str::upper(Str::random(8)),
        'user_id' => $user->id,
        'tour_id' => $tour->id,
        'tour_departure_id' => $departure->id,
        'number_of_people' => 2,
        'unit_price' => 1_000_000,
        'discount_amount' => 0,
        'total_amount' => 2_000_000,
        'status' => 'confirmed',
        'payment_status' => 'unpaid',
    ]);

    return compact('booking', 'departure');
}

test('nhân viên hỗ trợ gửi được thông báo hợp lệ tới toàn bộ admin', function () {
    $support = auditBugUser('support staff');
    $admins = collect([
        auditBugUser('admin'),
        auditBugUser('admin'),
    ]);
    auditBugUser('customer');

    Sanctum::actingAs($support);

    $this->postJson('/api/notifications/support/send', [
        'title' => 'Yêu cầu hỗ trợ vận hành',
        'message' => 'Vui lòng kiểm tra yêu cầu mới.',
    ])->assertOk();

    $notifications = Notification::query()
        ->whereIn('user_id', $admins->pluck('id'))
        ->orderBy('user_id')
        ->get();

    expect($notifications)->toHaveCount(2);

    foreach ($notifications as $notification) {
        expect($notification->type)->toBe('support')
            ->and($notification->status)->toBe('unread');

        $metadata = json_decode((string) $notification->data, true, flags: JSON_THROW_ON_ERROR);

        expect($metadata['source'])->toBe('support_to_admin')
            ->and($metadata['sender_role'])->toBe('support staff')
            ->and($metadata['sender_user_id'])->toBe($support->id);
    }
});

test('admin tạo được widget HTML mà không cần URL hình ảnh', function () {
    Sanctum::actingAs(auditBugUser('admin'));

    $this->postJson('/api/admin/widgets', [
        'title' => 'Thông báo HTML',
        'type' => 'html',
        'html_content' => '<p>Nội dung widget</p>',
        'position' => 'home_middle',
        'display_pages' => ['home'],
        'status' => 'active',
    ])->assertCreated()
        ->assertJsonPath('data.type', 'html')
        ->assertJsonPath('data.image_url', null);

    $widget = Banner::query()->sole();

    expect($widget->type)->toBe('html')
        ->and($widget->image_url)->toBeNull()
        ->and($widget->html_content)->toBe('<p>Nội dung widget</p>');
});

test('rollback cột ảnh widget giữ lại bản ghi HTML bằng chuỗi rỗng', function () {
    $widget = Banner::query()->create([
        'title' => 'Widget HTML cần rollback',
        'type' => 'html',
        'image_url' => null,
        'html_content' => '<p>Nội dung cần giữ</p>',
        'status' => 'active',
    ]);
    $migration = require database_path('migrations/2026_07_22_000000_make_banner_image_url_nullable.php');

    try {
        $migration->down();

        expect($widget->fresh()->image_url)->toBe('')
            ->and($widget->fresh()->html_content)->toBe('<p>Nội dung cần giữ</p>');
    } finally {
        $migration->up();
    }
});

test('booking đã hủy không thể mở lại và không hoàn chỗ lần thứ hai', function () {
    $admin = auditBugUser('admin');
    ['booking' => $booking, 'departure' => $departure] = auditBugBookingScenario($admin);

    Sanctum::actingAs($admin);

    $this->patchJson("/api/admin/bookings/{$booking->id}/cancel")
        ->assertOk();

    expect($departure->fresh()->booked_slots)->toBe(6);

    $this->putJson("/api/admin/bookings/{$booking->id}", [
        'status' => 'confirmed',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('status');

    $this->patchJson("/api/admin/bookings/{$booking->id}/cancel")
        ->assertOk();

    expect($departure->fresh()->booked_slots)->toBe(6)
        ->and($booking->fresh()->status)->toBe('cancelled');
});

test('một bản nháp chỉ tạo một thông báo cho mỗi người nhận', function () {
    $admin = auditBugUser('admin');
    $recipient = auditBugUser('customer');
    $draft = NotificationDraft::query()->create([
        'title' => 'Thông báo hệ thống',
        'message' => 'Nội dung thông báo.',
        'target_type' => 'specific',
        'target_ids' => [$recipient->id],
        'status' => 'draft',
    ]);

    Sanctum::actingAs($admin);

    $this->postJson("/api/admin/notifications/send/{$draft->id}")
        ->assertOk();

    $this->postJson("/api/admin/notifications/send/{$draft->id}")
        ->assertNotFound();

    expect(Notification::query()
        ->where('draft_id', $draft->id)
        ->where('user_id', $recipient->id)
        ->count())->toBe(1)
        ->and($draft->fresh()->status)->toBe('sent');
});

test('admin tải ảnh đại diện lên public storage qua API hồ sơ', function () {
    Storage::fake('public');
    $admin = auditBugUser('admin');
    Sanctum::actingAs($admin);

    $response = $this->put('/api/admin/profile', [
        'avatar' => UploadedFile::fake()->image('anh-dai-dien.jpg', 100, 100),
    ], [
        'Accept' => 'application/json',
    ])->assertOk();

    $avatarUrl = (string) $response->json('data.avatar_url');
    $avatarPath = Str::after((string) parse_url($avatarUrl, PHP_URL_PATH), '/storage/');

    expect($avatarUrl)->toContain('/storage/avatars/');
    Storage::disk('public')->assertExists($avatarPath);
    expect($admin->fresh()->avatar_url)->toBe($avatarUrl);
});

test('admin không thể gửi đồng thời file avatar và avatar URL', function () {
    Storage::fake('public');
    $admin = auditBugUser('admin');
    Sanctum::actingAs($admin);

    $this->put('/api/admin/profile', [
        'avatar_url' => 'https://example.test/avatar.jpg',
        'avatar' => UploadedFile::fake()->image('anh-dai-dien.jpg', 100, 100),
    ], [
        'Accept' => 'application/json',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('avatar');

    expect($admin->fresh()->avatar_url)->toBeNull();
    Storage::disk('public')->assertDirectoryEmpty('avatars');
});

test('avatar admin vượt quá 5120 KB bị từ chối', function () {
    Storage::fake('public');
    $admin = auditBugUser('admin');
    Sanctum::actingAs($admin);

    $this->put('/api/admin/profile', [
        'avatar' => UploadedFile::fake()
            ->image('anh-qua-lon.jpg', 100, 100)
            ->size(5121),
    ], [
        'Accept' => 'application/json',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('avatar');

    expect($admin->fresh()->avatar_url)->toBeNull();
});
