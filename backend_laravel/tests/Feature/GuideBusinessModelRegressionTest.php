<?php

use App\Http\Controllers\Api\Admin\AdminGuideLeaveRequestController;
use App\Http\Controllers\Api\Guide\GuideLeaveRequestController;
use App\Models\Guide;
use App\Models\GuideLeaveRequest;
use App\Models\Role;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\TourGuideAssignment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow('2026-07-22 10:00:00');
});

afterEach(function () {
    Carbon::setTestNow();
});

function guideAuditUser(string $roleName): User
{
    $role = Role::query()->firstOrCreate(
        ['name' => $roleName],
        ['description' => $roleName]
    );

    return User::factory()->create([
        'role_id' => $role->id,
        'status' => 'active',
    ]);
}

function guideAuditProfile(User $user, array $attributes = []): Guide
{
    return Guide::query()->create(array_merge([
        'user_id' => $user->id,
        'guide_code' => 'HDV-'.Str::upper(Str::random(10)),
        'experience_years' => 5,
        'status' => 'active',
    ], $attributes));
}

/**
 * @return array{tour: Tour, departure: TourDeparture}
 */
function guideAuditDeparture(string $departureDate, ?string $returnDate = null): array
{
    $suffix = Str::lower(Str::random(10));
    $now = now();

    $categoryId = DB::table('categories')->insertGetId([
        'name' => "Danh mục HDV {$suffix}",
        'slug' => "danh-muc-hdv-{$suffix}",
        'status' => 'active',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $destinationId = DB::table('destinations')->insertGetId([
        'name' => "Điểm đến HDV {$suffix}",
        'slug' => "diem-den-hdv-{$suffix}",
        'province_city' => 'Hà Nội',
        'country' => 'Việt Nam',
        'status' => 'active',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $tour = Tour::query()->create([
        'category_id' => $categoryId,
        'destination_id' => $destinationId,
        'title' => "Tour kiểm thử HDV {$suffix}",
        'slug' => "tour-kiem-thu-hdv-{$suffix}",
        'duration_days' => 2,
        'duration_nights' => 1,
        'base_price' => 1_000_000,
        'max_slots' => 20,
        'available_slots' => 20,
        'status' => 'published',
    ]);

    $departure = TourDeparture::query()->create([
        'tour_id' => $tour->id,
        'departure_date' => $departureDate,
        'return_date' => $returnDate ?? Carbon::parse($departureDate)->addDay()->toDateString(),
        'total_slots' => 20,
        'booked_slots' => 0,
        'status' => 'open',
    ]);

    return compact('tour', 'departure');
}

function guideAuditLeaveRequest(Guide $guide, string $status = 'pending'): GuideLeaveRequest
{
    return GuideLeaveRequest::query()->create([
        'guide_id' => $guide->id,
        'user_id' => $guide->user_id,
        'start_date' => now()->addDays(7)->toDateString(),
        'end_date' => now()->addDays(8)->toDateString(),
        'reason' => 'Lý do xin nghỉ hợp lệ để kiểm thử.',
        'status' => $status,
    ]);
}

test('guide cập nhật và đọc lại loại thẻ hướng dẫn viên tối đa 100 ký tự', function () {
    expect(Schema::hasColumn('guides', 'certificate_type'))->toBeTrue();

    $guideUser = guideAuditUser('tour guide');
    $guide = guideAuditProfile($guideUser, [
        'certificate_type' => 'Nội địa',
    ]);

    Sanctum::actingAs($guideUser);

    $certificateType = str_repeat('A', 100);

    $this->putJson('/api/guide/profile', [
        'certificate_type' => $certificateType,
    ])->assertOk()
        ->assertJsonPath('data.certificate_type', $certificateType);

    $this->assertDatabaseHas('guides', [
        'id' => $guide->id,
        'certificate_type' => $certificateType,
    ]);

    $this->getJson('/api/guide/profile')
        ->assertOk()
        ->assertJsonPath('data.certificate_type', $certificateType);

    $this->putJson('/api/guide/profile', [
        'certificate_type' => str_repeat('B', 101),
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('certificate_type');

    expect($guide->fresh()->certificate_type)->toBe($certificateType);
});

test('mọi API phân công đều chặn lịch khởi hành bắt đầu hôm nay', function () {
    $admin = guideAuditUser('admin');
    $guideUser = guideAuditUser('tour guide');
    $guide = guideAuditProfile($guideUser);
    ['departure' => $departure] = guideAuditDeparture(now()->toDateString());

    $assignment = TourGuideAssignment::query()->create([
        'tour_departure_id' => $departure->id,
        'guide_id' => $guide->id,
        'role' => 'lead',
        'status' => 'assigned',
        'assigned_by' => $admin->id,
        'assigned_at' => now(),
    ]);

    Sanctum::actingAs($admin);

    $responses = [
        $this->getJson("/api/admin/tour-departures/{$departure->id}/guide-candidates"),
        $this->postJson("/api/admin/tour-departures/{$departure->id}/auto-assign-guide"),
        $this->postJson("/api/admin/tour-departures/{$departure->id}/assign-guide", [
            'guide_id' => $guide->id,
        ]),
        $this->patchJson(
            "/api/admin/tour-departures/{$departure->id}/guide-assignments/{$assignment->id}/cancel"
        ),
        $this->getJson("/api/admin/tour-departures/{$departure->id}/direct-guide-candidates"),
        $this->postJson("/api/admin/tour-departures/{$departure->id}/direct-assign-guide", [
            'guide_id' => $guide->id,
            'force_area_mismatch' => true,
        ]),
    ];

    foreach ($responses as $response) {
        $response->assertUnprocessable()
            ->assertJsonValidationErrors('departure');
    }

    $this->assertDatabaseHas('tour_guide_assignments', [
        'id' => $assignment->id,
    ]);
});

test('admin vẫn hoàn tác được phân công của lịch khởi hành tương lai', function () {
    $admin = guideAuditUser('admin');
    $guide = guideAuditProfile(guideAuditUser('tour guide'));
    ['departure' => $departure] = guideAuditDeparture(now()->addDay()->toDateString());

    $assignment = TourGuideAssignment::query()->create([
        'tour_departure_id' => $departure->id,
        'guide_id' => $guide->id,
        'role' => 'lead',
        'status' => 'assigned',
        'assigned_by' => $admin->id,
        'assigned_at' => now(),
    ]);

    Sanctum::actingAs($admin);

    $this->patchJson(
        "/api/admin/tour-departures/{$departure->id}/guide-assignments/{$assignment->id}/cancel"
    )->assertOk();

    $this->assertDatabaseMissing('tour_guide_assignments', [
        'id' => $assignment->id,
    ]);
});

test('đơn nghỉ giao nhau chỉ tạo một bản ghi active', function () {
    $guideUser = guideAuditUser('tour guide');
    $guide = guideAuditProfile($guideUser);
    guideAuditUser('admin');

    Sanctum::actingAs($guideUser);

    $firstPayload = [
        'start_date' => now()->addDays(7)->toDateString(),
        'end_date' => now()->addDays(9)->toDateString(),
        'reason' => 'Lý do xin nghỉ hợp lệ lần thứ nhất.',
    ];

    $this->postJson('/api/guide/leave-requests', $firstPayload)
        ->assertCreated();

    $this->postJson('/api/guide/leave-requests', [
        'start_date' => now()->addDays(8)->toDateString(),
        'end_date' => now()->addDays(10)->toDateString(),
        'reason' => 'Lý do xin nghỉ hợp lệ lần thứ hai.',
    ])->assertUnprocessable();

    expect(GuideLeaveRequest::query()
        ->where('guide_id', $guide->id)
        ->whereIn('status', ['pending', 'approved'])
        ->count())->toBe(1);
});

test('leave controller tái đọc trạng thái đã đổi thay vì ghi đè model cũ', function () {
    $guideUser = guideAuditUser('tour guide');
    $guide = guideAuditProfile($guideUser);
    $admin = guideAuditUser('admin');

    $leaveForGuide = guideAuditLeaveRequest($guide);
    $staleGuideLeave = GuideLeaveRequest::query()->findOrFail($leaveForGuide->id);
    GuideLeaveRequest::query()->whereKey($leaveForGuide->id)->update([
        'status' => 'approved',
    ]);

    $guideRequest = Request::create('/api/guide/leave-requests/cancel', 'PATCH');
    $guideRequest->setUserResolver(fn () => $guideUser);

    $guideResponse = app(GuideLeaveRequestController::class)
        ->cancel($guideRequest, $staleGuideLeave);

    expect($guideResponse->getStatusCode())->toBe(422)
        ->and($leaveForGuide->fresh()->status)->toBe('approved');

    $leaveForAdmin = guideAuditLeaveRequest($guide);
    $staleAdminLeave = GuideLeaveRequest::query()->findOrFail($leaveForAdmin->id);
    GuideLeaveRequest::query()->whereKey($leaveForAdmin->id)->update([
        'status' => 'cancelled',
        'cancelled_at' => now(),
    ]);

    $adminRequest = Request::create('/api/admin/guide-leave-requests/approve', 'POST');
    $adminRequest->setUserResolver(fn () => $admin);

    $adminResponse = app(AdminGuideLeaveRequestController::class)
        ->approve($adminRequest, $staleAdminLeave);

    expect($adminResponse->getStatusCode())->toBe(422)
        ->and($leaveForAdmin->fresh()->status)->toBe('cancelled');
});

test('admin vẫn đổi được quyết định của đơn nghỉ chưa hết hạn', function () {
    $admin = guideAuditUser('admin');
    $guide = guideAuditProfile(guideAuditUser('tour guide'));
    $leaveRequest = guideAuditLeaveRequest($guide, 'approved');

    Sanctum::actingAs($admin);

    $this->patchJson("/api/admin/guide-leave-requests/{$leaveRequest->id}/decision", [
        'status' => 'rejected',
        'admin_note' => 'Điều chỉnh quyết định sau khi kiểm tra lại.',
    ])->assertOk();

    expect($leaveRequest->fresh()->status)->toBe('rejected');
});

test('guide chỉ tạo một yêu cầu thay thế pending cho cùng lịch', function () {
    $guideUser = guideAuditUser('tour guide');
    $guide = guideAuditProfile($guideUser);
    guideAuditUser('admin');
    ['departure' => $departure] = guideAuditDeparture(now()->addDays(10)->toDateString());

    TourGuideAssignment::query()->create([
        'tour_departure_id' => $departure->id,
        'guide_id' => $guide->id,
        'role' => 'lead',
        'status' => 'assigned',
        'assigned_at' => now(),
    ]);

    Sanctum::actingAs($guideUser);

    $payload = [
        'reason' => 'Lý do yêu cầu đổi hướng dẫn viên hợp lệ.',
    ];

    $this->postJson("/api/guide/tours/{$departure->id}/replacement-requests", $payload)
        ->assertCreated();

    $this->postJson("/api/guide/tours/{$departure->id}/replacement-requests", $payload)
        ->assertConflict()
        ->assertJsonPath('code', 'REPLACEMENT_REQUEST_PENDING');

    expect(DB::table('guide_replacement_requests')
        ->where('tour_departure_id', $departure->id)
        ->where('current_guide_id', $guide->id)
        ->where('status', 'pending')
        ->count())->toBe(1);
});

test('replacement request đã duyệt không bị action từ chối sau đó ghi đè', function () {
    $admin = guideAuditUser('admin');
    $currentGuide = guideAuditProfile(guideAuditUser('tour guide'));
    $replacementGuide = guideAuditProfile(guideAuditUser('tour guide'));
    ['departure' => $departure] = guideAuditDeparture(now()->addDays(10)->toDateString());

    TourGuideAssignment::query()->create([
        'tour_departure_id' => $departure->id,
        'guide_id' => $currentGuide->id,
        'role' => 'lead',
        'status' => 'assigned',
        'assigned_by' => $admin->id,
        'assigned_at' => now(),
    ]);

    $requestId = DB::table('guide_replacement_requests')->insertGetId([
        'tour_departure_id' => $departure->id,
        'current_guide_id' => $currentGuide->id,
        'requested_by' => $currentGuide->user_id,
        'reason' => 'Lý do yêu cầu đổi hướng dẫn viên hợp lệ.',
        'status' => 'pending',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    Sanctum::actingAs($admin);

    $this->postJson("/api/admin/guide-replacement-requests/{$requestId}/approve")
        ->assertOk()
        ->assertJsonPath('data.replacement_guide_id', $replacementGuide->id);

    $notificationCount = DB::table('notifications')->count();

    $this->postJson("/api/admin/guide-replacement-requests/{$requestId}/reject")
        ->assertConflict();

    $replacementRequest = DB::table('guide_replacement_requests')
        ->where('id', $requestId)
        ->first();

    expect($replacementRequest->status)->toBe('approved')
        ->and((int) $replacementRequest->replacement_guide_id)->toBe($replacementGuide->id)
        ->and(TourGuideAssignment::query()
            ->where('tour_departure_id', $departure->id)
            ->where('guide_id', $currentGuide->id)
            ->value('status'))->toBe('cancelled')
        ->and(TourGuideAssignment::query()
            ->where('tour_departure_id', $departure->id)
            ->where('guide_id', $replacementGuide->id)
            ->value('status'))->toBe('assigned')
        ->and(DB::table('notifications')->count())->toBe($notificationCount);
});
