<?php

use App\Models\SupportRequest;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\SupportRequestSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('seeder tạo dữ liệu Form hỗ trợ đủ trạng thái và lịch sử workflow', function () {
    $this->seed(DatabaseSeeder::class);

    $tickets = SupportRequest::query()
        ->where('ticket_code', 'like', 'SUP-VV-%')
        ->get()
        ->keyBy('ticket_code');

    $support01 = User::query()->where('email', 'support01@gmail.com')->firstOrFail();
    $support03 = User::query()->where('email', 'support03@gmail.com')->firstOrFail();
    $admin = User::query()->where('email', 'admin@gmail.com')->firstOrFail();

    expect($tickets)->toHaveCount(12)
        ->and($tickets->where('status', 'pending')->where('needs_more_info', false)->count())->toBe(4)
        ->and($tickets->where('status', 'pending')->where('needs_more_info', true)->count())->toBe(2)
        ->and($tickets->where('status', 'in_progress')->count())->toBe(4)
        ->and($tickets->where('status', 'resolved')->count())->toBe(2);

    expect($tickets['SUP-VV-05']->assigned_to)->toBe($support01->id)
        ->and($tickets['SUP-VV-05']->info_request_message)->not->toBeNull()
        ->and($tickets['SUP-VV-09']->assigned_to)->toBe($support03->id)
        ->and($tickets['SUP-VV-09']->admin_request_status)->toBe('pending')
        ->and($tickets['SUP-VV-10']->admin_request_status)->toBe('processed')
        ->and($tickets['SUP-VV-10']->admin_processed_by)->toBe($admin->id);

    Sanctum::actingAs($support01);

    $this->getJson('/api/support/requests')
        ->assertOk()
        ->assertJsonPath('counts.pending', 4)
        ->assertJsonPath('counts.needs_more_info', 1)
        ->assertJsonPath('counts.in_progress', 1)
        ->assertJsonPath('data.total', 12);

    $ticketIds = $tickets->pluck('id');

    expect(DB::table('support_request_messages')->whereIn('support_request_id', $ticketIds)->count())->toBeGreaterThanOrEqual(12)
        ->and(DB::table('support_request_histories')->whereIn('support_request_id', $ticketIds)->count())->toBeGreaterThanOrEqual(12);
});

test('seeder Form hỗ trợ chạy lặp không tạo bản ghi trùng', function () {
    $this->seed(DatabaseSeeder::class);

    $countsBefore = [
        'tickets' => DB::table('support_requests')->where('ticket_code', 'like', 'SUP-VV-%')->count(),
        'messages' => DB::table('support_request_messages')->whereIn(
            'support_request_id',
            DB::table('support_requests')->where('ticket_code', 'like', 'SUP-VV-%')->pluck('id')
        )->count(),
        'histories' => DB::table('support_request_histories')->whereIn(
            'support_request_id',
            DB::table('support_requests')->where('ticket_code', 'like', 'SUP-VV-%')->pluck('id')
        )->count(),
    ];

    $this->seed(SupportRequestSeeder::class);

    expect([
        'tickets' => DB::table('support_requests')->where('ticket_code', 'like', 'SUP-VV-%')->count(),
        'messages' => DB::table('support_request_messages')->whereIn(
            'support_request_id',
            DB::table('support_requests')->where('ticket_code', 'like', 'SUP-VV-%')->pluck('id')
        )->count(),
        'histories' => DB::table('support_request_histories')->whereIn(
            'support_request_id',
            DB::table('support_requests')->where('ticket_code', 'like', 'SUP-VV-%')->pluck('id')
        )->count(),
    ])->toBe($countsBefore);
});
