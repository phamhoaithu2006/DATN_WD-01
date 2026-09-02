<?php

use App\Models\SupportRequest;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\SupportNotificationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('seeder tạo thông báo liên kết ticket cho nhân viên hỗ trợ', function () {
    $this->seed(DatabaseSeeder::class);

    $supportUsers = User::query()
        ->whereHas('role', fn ($query) => $query->where('name', 'support staff'))
        ->whereHas('supportStaff', fn ($query) => $query->where('status', 'active'))
        ->get();
    $newTicketIds = SupportRequest::query()
        ->whereIn('ticket_code', ['SUP-VV-01', 'SUP-VV-02', 'SUP-VV-03', 'SUP-VV-04'])
        ->pluck('id');
    $newRequestNotifications = DB::table('notifications')
        ->whereIn('user_id', $supportUsers->pluck('id'))
        ->where('kind', 'support_request_new')
        ->whereIn('support_request_id', $newTicketIds)
        ->get();

    expect($supportUsers)->toHaveCount(10)
        ->and($newRequestNotifications)->toHaveCount(40)
        ->and($newRequestNotifications->every(fn ($notification): bool => $notification->status === 'unread'
            && $notification->read_at === null
        ))->toBeTrue();

    $support04 = User::query()->where('email', 'support04@gmail.com')->firstOrFail();
    $processedTicketId = SupportRequest::query()
        ->where('ticket_code', 'SUP-VV-10')
        ->value('id');
    $processedNotification = DB::table('notifications')
        ->where('user_id', $support04->id)
        ->where('kind', 'support_request_admin_processed')
        ->where('support_request_id', $processedTicketId)
        ->first();
    $metadata = json_decode((string) $processedNotification?->data, true, flags: JSON_THROW_ON_ERROR);

    expect($processedNotification)->not->toBeNull()
        ->and($metadata['seed_source'])->toBe('support_notification_seeder')
        ->and($metadata['ticket_code'])->toBe('SUP-VV-10');

    Sanctum::actingAs($support04);

    $this->getJson('/api/notifications/support')
        ->assertOk()
        ->assertJsonPath('data.total', 5);
});

test('seeder thông báo chạy lặp không tạo bản ghi trùng', function () {
    $this->seed(DatabaseSeeder::class);

    $countBefore = DB::table('notifications')
        ->where('data->seed_source', 'support_notification_seeder')
        ->count();

    $this->seed(SupportNotificationSeeder::class);

    expect(DB::table('notifications')
        ->where('data->seed_source', 'support_notification_seeder')
        ->count())->toBe($countBefore);
});
