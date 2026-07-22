<?php

use App\Http\Controllers\Api\Admin\AdminGuideLeaveRequestController;
use App\Http\Controllers\Api\Admin\AdminGuideReplacementRequestController;
use App\Http\Controllers\Api\Admin\BookingController as AdminBookingController;
use App\Http\Controllers\Api\Admin\NotificationController as AdminNotificationController;
use App\Http\Controllers\Api\Guide\GuideLeaveRequestController;
use App\Http\Controllers\Api\Guide\GuideTourController;
use App\Http\Requests\StoreGuideReplacementRequest;
use App\Models\Booking;
use App\Models\Guide;
use App\Models\GuideLeaveRequest;
use App\Models\Notification;
use App\Models\NotificationDraft;
use App\Models\Role;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\TourGuideAssignment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Redirector;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

beforeEach(function () {
    if (DB::getDriverName() !== 'mysql') {
        $this->markTestSkipped('Test concurrency này chỉ chạy trên MySQL.');
    }

    if (! function_exists('pcntl_fork')) {
        $this->markTestSkipped('Môi trường PHP không có extension pcntl.');
    }
});

function mysqlAuditUser(string $roleName): User
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

function mysqlAuditGuide(User $user): Guide
{
    return Guide::query()->create([
        'user_id' => $user->id,
        'guide_code' => 'HDV-MYSQL-'.Str::upper(Str::random(10)),
        'experience_years' => 5,
        'status' => 'active',
    ]);
}

/**
 * @return array{tour: Tour, departure: TourDeparture}
 */
function mysqlAuditDeparture(int $daysUntilDeparture = 10, int $bookedSlots = 0): array
{
    $suffix = Str::lower(Str::random(12));
    $now = now();

    $categoryId = DB::table('categories')->insertGetId([
        'name' => "Danh mục concurrency {$suffix}",
        'slug' => "danh-muc-concurrency-{$suffix}",
        'status' => 'active',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $destinationId = DB::table('destinations')->insertGetId([
        'name' => "Điểm đến concurrency {$suffix}",
        'slug' => "diem-den-concurrency-{$suffix}",
        'province_city' => 'Hà Nội',
        'country' => 'Việt Nam',
        'status' => 'active',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $tour = Tour::query()->create([
        'category_id' => $categoryId,
        'destination_id' => $destinationId,
        'title' => "Tour concurrency {$suffix}",
        'slug' => "tour-concurrency-{$suffix}",
        'duration_days' => 2,
        'duration_nights' => 1,
        'base_price' => 1_000_000,
        'max_slots' => 20,
        'available_slots' => 20,
        'status' => 'published',
    ]);

    $departureDate = now()->addDays($daysUntilDeparture)->startOfDay();
    $departure = TourDeparture::query()->create([
        'tour_id' => $tour->id,
        'departure_date' => $departureDate->toDateString(),
        'return_date' => $departureDate->copy()->addDay()->toDateString(),
        'base_price' => 1_000_000,
        'total_slots' => 20,
        'booked_slots' => $bookedSlots,
        'status' => 'open',
    ]);

    return compact('tour', 'departure');
}

/**
 * @param  array<int, Closure(): mixed>  $actions
 * @return array<int, int>
 */
function mysqlAuditRunConcurrently(array $actions): array
{
    $directory = sys_get_temp_dir().'/vivugo-mysql-concurrency-'.bin2hex(random_bytes(8));

    if (! mkdir($directory, 0700) && ! is_dir($directory)) {
        throw new RuntimeException('Không thể tạo thư mục tạm cho test concurrency.');
    }

    DB::disconnect();
    $processIds = [];

    foreach ($actions as $index => $action) {
        $processId = pcntl_fork();

        if ($processId === -1) {
            throw new RuntimeException('Không thể tạo process test concurrency.');
        }

        if ($processId === 0) {
            $result = [];

            try {
                DB::purge();
                file_put_contents("{$directory}/ready-{$index}", '1');

                $deadline = microtime(true) + 10;
                while (! file_exists("{$directory}/go") && microtime(true) < $deadline) {
                    usleep(10_000);
                }

                if (! file_exists("{$directory}/go")) {
                    throw new RuntimeException('Hết thời gian chờ barrier concurrency.');
                }

                $response = $action();
                $result['status'] = $response->getStatusCode();
            } catch (Throwable $exception) {
                $result['error'] = $exception::class.': '.$exception->getMessage();
            } finally {
                DB::disconnect();
            }

            file_put_contents(
                "{$directory}/result-{$index}.json",
                json_encode($result, JSON_THROW_ON_ERROR)
            );

            exit(0);
        }

        $processIds[] = $processId;
    }

    $readyDeadline = microtime(true) + 10;
    do {
        $readyCount = count(glob("{$directory}/ready-*") ?: []);

        if ($readyCount === count($actions)) {
            break;
        }

        usleep(10_000);
    } while (microtime(true) < $readyDeadline);

    file_put_contents("{$directory}/go", '1');

    foreach ($processIds as $processId) {
        pcntl_waitpid($processId, $status);
    }

    $statuses = [];
    $errors = [];

    foreach (array_keys($actions) as $index) {
        $resultPath = "{$directory}/result-{$index}.json";

        if (! file_exists($resultPath)) {
            $errors[] = "Process {$index} không trả kết quả.";

            continue;
        }

        $result = json_decode((string) file_get_contents($resultPath), true, flags: JSON_THROW_ON_ERROR);

        if (isset($result['error'])) {
            $errors[] = $result['error'];
        } else {
            $statuses[] = (int) $result['status'];
        }
    }

    foreach (glob("{$directory}/*") ?: [] as $temporaryFile) {
        unlink($temporaryFile);
    }
    rmdir($directory);

    if ($errors !== []) {
        throw new RuntimeException(implode(PHP_EOL, $errors));
    }

    sort($statuses);

    return $statuses;
}

function mysqlAuditRequest(string $method, string $uri, array $payload, int $userId): Request
{
    $request = Request::create($uri, $method, $payload);
    $request->headers->set('Accept', 'application/json');
    $request->setUserResolver(fn () => User::query()->findOrFail($userId));

    return $request;
}

function mysqlAuditReplacementRequest(string $uri, array $payload, int $userId): StoreGuideReplacementRequest
{
    $request = StoreGuideReplacementRequest::create($uri, 'POST', $payload);
    $request->headers->set('Accept', 'application/json');
    $request->setContainer(app());
    $request->setRedirector(app(Redirector::class));
    $request->setUserResolver(fn () => User::query()->findOrFail($userId));
    $request->validateResolved();

    return $request;
}

test('MySQL chỉ cho phép một đơn nghỉ giao nhau được tạo khi hai request chạy đồng thời', function () {
    $guideUser = mysqlAuditUser('tour guide');
    $guide = mysqlAuditGuide($guideUser);
    mysqlAuditUser('admin');

    $firstPayload = [
        'start_date' => now()->addDays(7)->toDateString(),
        'end_date' => now()->addDays(9)->toDateString(),
        'reason' => 'Lý do xin nghỉ hợp lệ cho request thứ nhất.',
    ];
    $secondPayload = [
        'start_date' => now()->addDays(8)->toDateString(),
        'end_date' => now()->addDays(10)->toDateString(),
        'reason' => 'Lý do xin nghỉ hợp lệ cho request thứ hai.',
    ];

    $statuses = mysqlAuditRunConcurrently([
        function () use ($firstPayload, $guideUser) {
            $request = mysqlAuditRequest('POST', '/api/guide/leave-requests', $firstPayload, $guideUser->id);

            return app(GuideLeaveRequestController::class)->store($request);
        },
        function () use ($secondPayload, $guideUser) {
            $request = mysqlAuditRequest('POST', '/api/guide/leave-requests', $secondPayload, $guideUser->id);

            return app(GuideLeaveRequestController::class)->store($request);
        },
    ]);

    expect($statuses)->toBe([201, 422])
        ->and(GuideLeaveRequest::query()
            ->where('guide_id', $guide->id)
            ->whereIn('status', ['pending', 'approved'])
            ->count())->toBe(1);
});

test('MySQL chỉ cho phép cancel hoặc admin decision thắng trên cùng đơn nghỉ', function () {
    $guideUser = mysqlAuditUser('tour guide');
    $guide = mysqlAuditGuide($guideUser);
    $admin = mysqlAuditUser('admin');
    $leaveRequest = GuideLeaveRequest::query()->create([
        'guide_id' => $guide->id,
        'user_id' => $guideUser->id,
        'start_date' => now()->addDays(7)->toDateString(),
        'end_date' => now()->addDays(8)->toDateString(),
        'reason' => 'Lý do xin nghỉ hợp lệ để kiểm thử cạnh tranh.',
        'status' => 'pending',
    ]);

    $statuses = mysqlAuditRunConcurrently([
        function () use ($guideUser, $leaveRequest) {
            $request = mysqlAuditRequest(
                'PATCH',
                "/api/guide/leave-requests/{$leaveRequest->id}/cancel",
                ['cancel_reason' => 'Hủy để kiểm thử cạnh tranh.'],
                $guideUser->id
            );

            return app(GuideLeaveRequestController::class)->cancel(
                $request,
                GuideLeaveRequest::query()->findOrFail($leaveRequest->id)
            );
        },
        function () use ($admin, $leaveRequest) {
            $request = mysqlAuditRequest(
                'POST',
                "/api/admin/guide-leave-requests/{$leaveRequest->id}/approve",
                [],
                $admin->id
            );

            return app(AdminGuideLeaveRequestController::class)->approve(
                $request,
                GuideLeaveRequest::query()->findOrFail($leaveRequest->id)
            );
        },
    ]);

    expect($statuses)->toBe([200, 422])
        ->and($leaveRequest->fresh()->status)->toBeIn(['approved', 'cancelled']);
});

test('MySQL chỉ tạo một replacement request pending khi hai request chạy đồng thời', function () {
    $guideUser = mysqlAuditUser('tour guide');
    $guide = mysqlAuditGuide($guideUser);
    mysqlAuditUser('admin');
    ['departure' => $departure] = mysqlAuditDeparture();

    TourGuideAssignment::query()->create([
        'tour_departure_id' => $departure->id,
        'guide_id' => $guide->id,
        'role' => 'lead',
        'status' => 'assigned',
        'assigned_at' => now(),
    ]);

    $uri = "/api/guide/tours/{$departure->id}/replacement-requests";
    $payload = ['reason' => 'Lý do yêu cầu đổi hướng dẫn viên hợp lệ.'];
    $action = function () use ($uri, $payload, $guideUser, $departure) {
        $request = mysqlAuditReplacementRequest($uri, $payload, $guideUser->id);

        return app(GuideTourController::class)->requestReplacement(
            $request,
            TourDeparture::query()->findOrFail($departure->id)
        );
    };

    $statuses = mysqlAuditRunConcurrently([$action, $action]);

    expect($statuses)->toBe([201, 409])
        ->and(DB::table('guide_replacement_requests')
            ->where('tour_departure_id', $departure->id)
            ->where('current_guide_id', $guide->id)
            ->where('status', 'pending')
            ->count())->toBe(1);
});

test('MySQL không cho approve và reject ghi đè cùng replacement request', function () {
    $admin = mysqlAuditUser('admin');
    $currentGuide = mysqlAuditGuide(mysqlAuditUser('tour guide'));
    mysqlAuditGuide(mysqlAuditUser('tour guide'));
    ['departure' => $departure] = mysqlAuditDeparture();

    TourGuideAssignment::query()->create([
        'tour_departure_id' => $departure->id,
        'guide_id' => $currentGuide->id,
        'role' => 'lead',
        'status' => 'assigned',
        'assigned_by' => $admin->id,
        'assigned_at' => now(),
    ]);

    $replacementRequestId = DB::table('guide_replacement_requests')->insertGetId([
        'tour_departure_id' => $departure->id,
        'current_guide_id' => $currentGuide->id,
        'requested_by' => $currentGuide->user_id,
        'reason' => 'Lý do yêu cầu đổi hướng dẫn viên hợp lệ.',
        'status' => 'pending',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $statuses = mysqlAuditRunConcurrently([
        function () use ($admin, $replacementRequestId) {
            $request = mysqlAuditRequest(
                'POST',
                "/api/admin/guide-replacement-requests/{$replacementRequestId}/approve",
                [],
                $admin->id
            );

            return app(AdminGuideReplacementRequestController::class)
                ->approve($request, $replacementRequestId);
        },
        function () use ($admin, $replacementRequestId) {
            $request = mysqlAuditRequest(
                'POST',
                "/api/admin/guide-replacement-requests/{$replacementRequestId}/reject",
                [],
                $admin->id
            );

            return app(AdminGuideReplacementRequestController::class)
                ->reject($request, $replacementRequestId);
        },
    ]);

    $replacementRequest = DB::table('guide_replacement_requests')
        ->where('id', $replacementRequestId)
        ->first();

    expect($statuses)->toBe([200, 409])
        ->and($replacementRequest->status)->toBeIn(['approved', 'rejected']);

    if ($replacementRequest->status === 'approved') {
        expect(TourGuideAssignment::query()
            ->where('tour_departure_id', $departure->id)
            ->where('status', 'assigned')
            ->count())->toBe(1)
            ->and(TourGuideAssignment::query()
                ->where('tour_departure_id', $departure->id)
                ->where('guide_id', $currentGuide->id)
                ->value('status'))->toBe('cancelled');
    } else {
        expect(TourGuideAssignment::query()
            ->where('tour_departure_id', $departure->id)
            ->where('guide_id', $currentGuide->id)
            ->value('status'))->toBe('assigned');
    }
});

test('MySQL chỉ hoàn booked slots một lần khi hai request cùng hủy booking', function () {
    $customer = mysqlAuditUser('customer');
    ['tour' => $tour, 'departure' => $departure] = mysqlAuditDeparture(bookedSlots: 8);
    $booking = Booking::query()->create([
        'booking_code' => 'BK-MYSQL-'.Str::upper(Str::random(10)),
        'user_id' => $customer->id,
        'tour_id' => $tour->id,
        'tour_departure_id' => $departure->id,
        'number_of_people' => 2,
        'unit_price' => 1_000_000,
        'discount_amount' => 0,
        'total_amount' => 2_000_000,
        'status' => 'confirmed',
        'payment_status' => 'unpaid',
    ]);

    $action = fn () => app(AdminBookingController::class)->softDelete($booking->id);
    $statuses = mysqlAuditRunConcurrently([$action, $action]);

    expect($statuses)->toBe([200, 200])
        ->and($booking->fresh()->status)->toBe('cancelled')
        ->and($departure->fresh()->booked_slots)->toBe(6);
});

test('MySQL chỉ gửi một bộ notification khi hai request cùng gửi một draft', function () {
    mysqlAuditUser('admin');
    $recipient = mysqlAuditUser('customer');
    $draft = NotificationDraft::query()->create([
        'title' => 'Thông báo concurrency',
        'message' => 'Nội dung kiểm thử gửi đồng thời.',
        'target_type' => 'specific',
        'target_ids' => [$recipient->id],
        'status' => 'draft',
    ]);

    $action = fn () => app(AdminNotificationController::class)->sendNotification($draft->id);
    $statuses = mysqlAuditRunConcurrently([$action, $action]);

    expect($statuses)->toBe([200, 404])
        ->and($draft->fresh()->status)->toBe('sent')
        ->and(Notification::query()
            ->where('draft_id', $draft->id)
            ->where('user_id', $recipient->id)
            ->count())->toBe(1);
});
