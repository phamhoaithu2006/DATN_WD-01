<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\Notification;
use App\Models\TourDeparture;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminGuideReplacementRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('guide_replacement_requests as grr')
            ->join('tour_departures as td', 'td.id', '=', 'grr.tour_departure_id')
            ->leftJoin('tours as t', 't.id', '=', 'td.tour_id')
            ->leftJoin('guides as g', 'g.id', '=', 'grr.current_guide_id')
            ->leftJoin('users as u', 'u.id', '=', 'g.user_id')
            ->leftJoin('guides as rg', 'rg.id', '=', 'grr.replacement_guide_id')
            ->leftJoin('users as ru', 'ru.id', '=', 'rg.user_id')
            ->select([
                'grr.*',
                'td.departure_date',
                'td.return_date',
                'td.status as departure_status',
                't.title as tour_title',
                'u.full_name as current_guide_name',
                'u.email as current_guide_email',
                'ru.full_name as replacement_guide_name',
            ]);

        if ($request->filled('status')) {
            $query->where('grr.status', $request->input('status'));
        }

        $requests = $query
            ->orderByRaw("CASE WHEN grr.status = 'pending' THEN 0 ELSE 1 END ASC")
            ->orderByDesc('grr.created_at')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'message' => 'Danh sách yêu cầu đổi HDV.',
            'data' => $requests,
        ]);
    }

    public function approve(Request $request, int $id)
    {
        $validated = $request->validate([
            'admin_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $result = DB::transaction(function () use ($request, $validated, $id) {
            $requestSnapshot = DB::table('guide_replacement_requests')
                ->where('id', $id)
                ->first();

            if (! $requestSnapshot) {
                return ['outcome' => 'not_found'];
            }

            $departure = TourDeparture::query()
                ->with('tour:id,title')
                ->whereKey($requestSnapshot->tour_departure_id)
                ->lockForUpdate()
                ->firstOrFail();

            $replacementRequest = DB::table('guide_replacement_requests')
                ->where('id', $id)
                ->lockForUpdate()
                ->first();

            if (! $replacementRequest) {
                return ['outcome' => 'not_found'];
            }

            if ($replacementRequest->status !== 'pending') {
                return ['outcome' => 'processed'];
            }

            $newGuide = $this->findReplacementGuide(
                $departure,
                (int) $replacementRequest->current_guide_id
            );

            if (! $newGuide) {
                return ['outcome' => 'no_candidate'];
            }

            DB::table('tour_guide_assignments')
                ->where('tour_departure_id', $departure->id)
                ->where('guide_id', $replacementRequest->current_guide_id)
                ->where('status', 'assigned')
                ->update([
                    'status' => 'cancelled',
                    'updated_at' => now(),
                ]);

            DB::table('tour_guide_assignments')->insert([
                'tour_departure_id' => $departure->id,
                'guide_id' => $newGuide->id,
                'role' => 'lead',
                'status' => 'assigned',
                'assigned_by' => $request->user()->id,
                'assigned_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('guide_replacement_requests')
                ->where('id', $replacementRequest->id)
                ->where('status', 'pending')
                ->update([
                    'status' => 'approved',
                    'replacement_guide_id' => $newGuide->id,
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                    'admin_note' => $validated['admin_note'] ?? null,
                    'updated_at' => now(),
                ]);

            $this->notifyResult($departure, $replacementRequest, $newGuide, true);
            $this->notifyAdmins($departure, $replacementRequest, $newGuide, true);

            return [
                'outcome' => 'approved',
                'replacement_guide_id' => $newGuide->id,
            ];
        }, 3);

        if ($result['outcome'] === 'not_found') {
            return response()->json([
                'message' => 'Không tìm thấy yêu cầu đổi HDV.',
            ], 404);
        }

        if ($result['outcome'] === 'processed') {
            return response()->json([
                'message' => 'Yêu cầu này đã được xử lý.',
            ], 409);
        }

        if ($result['outcome'] === 'no_candidate') {
            return response()->json([
                'message' => 'Chưa tìm được HDV thay thế phù hợp và trống lịch.',
                'code' => 'NO_REPLACEMENT_GUIDE_AVAILABLE',
            ], 422);
        }

        return response()->json([
            'message' => 'Đã duyệt yêu cầu và phân công HDV thay thế.',
            'data' => [
                'replacement_guide_id' => $result['replacement_guide_id'],
            ],
        ]);
    }

    public function reject(Request $request, int $id)
    {
        $validated = $request->validate([
            'admin_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $result = DB::transaction(function () use ($request, $validated, $id) {
            $requestSnapshot = DB::table('guide_replacement_requests')
                ->where('id', $id)
                ->first();

            if (! $requestSnapshot) {
                return ['outcome' => 'not_found'];
            }

            $departure = TourDeparture::query()
                ->with('tour:id,title')
                ->whereKey($requestSnapshot->tour_departure_id)
                ->lockForUpdate()
                ->firstOrFail();

            $replacementRequest = DB::table('guide_replacement_requests')
                ->where('id', $id)
                ->lockForUpdate()
                ->first();

            if (! $replacementRequest) {
                return ['outcome' => 'not_found'];
            }

            if ($replacementRequest->status !== 'pending') {
                return ['outcome' => 'processed'];
            }

            DB::table('guide_replacement_requests')
                ->where('id', $replacementRequest->id)
                ->where('status', 'pending')
                ->update([
                    'status' => 'rejected',
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                    'admin_note' => $validated['admin_note'] ?? null,
                    'updated_at' => now(),
                ]);

            $this->notifyResult($departure, $replacementRequest, null, false, $validated['admin_note'] ?? null);
            $this->notifyAdmins($departure, $replacementRequest, null, false);

            return ['outcome' => 'rejected'];
        }, 3);

        if ($result['outcome'] === 'not_found') {
            return response()->json([
                'message' => 'Không tìm thấy yêu cầu đổi HDV.',
            ], 404);
        }

        if ($result['outcome'] === 'processed') {
            return response()->json([
                'message' => 'Yêu cầu này đã được xử lý.',
            ], 409);
        }

        return response()->json([
            'message' => 'Đã từ chối yêu cầu đổi HDV.',
        ]);
    }

    private function findReplacementGuide(TourDeparture $departure, int $currentGuideId): ?Guide
    {
        $from = Carbon::parse($departure->departure_date)->toDateString();
        $to = Carbon::parse($departure->return_date ?: $departure->departure_date)->toDateString();

        $query = Guide::query()
            ->where('id', '!=', $currentGuideId)
            ->whereNotExists(function ($subQuery) use ($from, $to) {
                $subQuery
                    ->select(DB::raw(1))
                    ->from('tour_guide_assignments as tga')
                    ->join('tour_departures as td', 'td.id', '=', 'tga.tour_departure_id')
                    ->whereColumn('tga.guide_id', 'guides.id')
                    ->where('tga.status', 'assigned')
                    ->whereDate('td.departure_date', '<=', $to)
                    ->whereRaw('DATE(COALESCE(td.return_date, td.departure_date)) >= ?', [$from]);
            });

        if (Schema::hasColumn('guides', 'status')) {
            $query->where('guides.status', 'active');
        }

        return $query
            ->with('user:id,full_name,email')
            ->select('guides.*')
            ->selectSub(function ($workloadQuery) {
                $workloadQuery
                    ->from('tour_guide_assignments as workload_tga')
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('workload_tga.guide_id', 'guides.id')
                    ->where('workload_tga.status', 'assigned');
            }, 'active_assignments_count')
            ->orderBy('active_assignments_count')
            ->orderBy('id')
            ->lockForUpdate()
            ->first();
    }

    private function notifyResult(
        TourDeparture $departure,
        $replacementRequest,
        ?Guide $newGuide,
        bool $approved,
        ?string $adminNote = null
    ): void {
        $oldGuide = Guide::query()
            ->with('user:id,full_name,email')
            ->find($replacementRequest->current_guide_id);

        $tourTitle = $departure->tour?->title ?? "Tour #{$departure->tour_id}";
        $departureDate = Carbon::parse($departure->departure_date)->format('d/m/Y');
        $returnDate = Carbon::parse($departure->return_date ?: $departure->departure_date)->format('d/m/Y');
        $replacementGuideName = $newGuide?->user?->full_name ?? ($newGuide ? "HDV #{$newGuide->id}" : null);

        $message = $approved
            ? "Yêu cầu đổi HDV cho {$tourTitle} đã được duyệt.\nNgày đi: {$departureDate}.\nNgày về: {$returnDate}.\nHDV thay thế: {$replacementGuideName}."
            : "Yêu cầu đổi HDV cho {$tourTitle} chưa được duyệt.\nNgày đi: {$departureDate}.\nNgày về: {$returnDate}.";

        if ($adminNote) {
            $message .= "\nGhi chú admin: {$adminNote}";
        }

        $this->notifyUser(
            userId: $oldGuide?->user_id,
            title: $approved ? 'Yêu cầu đổi HDV đã được duyệt' : 'Yêu cầu đổi HDV chưa được duyệt',
            message: $message
        );

        if ($approved && $newGuide?->user_id) {
            $this->notifyUser(
                userId: $newGuide->user_id,
                title: 'Bạn được phân công thay thế HDV',
                message: "Bạn vừa được phân công thay thế cho {$tourTitle}.\nNgày đi: {$departureDate}.\nNgày về: {$returnDate}."
            );
        }
    }

    private function notifyAdmins(TourDeparture $departure, $replacementRequest, ?Guide $newGuide, bool $approved): void
    {
        $adminIds = $this->getAdminUserIds();

        if ($adminIds->isEmpty()) {
            return;
        }

        $oldGuide = Guide::query()
            ->with('user:id,full_name,email')
            ->find($replacementRequest->current_guide_id);

        $departure->loadMissing('tour:id,title');
        $newGuide?->loadMissing('user:id,full_name,email');

        $tourTitle = $departure->tour?->title ?? "Tour #{$departure->tour_id}";
        $departureDate = Carbon::parse($departure->departure_date)->format('d/m/Y');
        $returnDate = Carbon::parse($departure->return_date ?: $departure->departure_date)->format('d/m/Y');
        $oldGuideName = $oldGuide?->user?->full_name ?? "HDV #{$replacementRequest->current_guide_id}";
        $replacementGuideName = $newGuide?->user?->full_name ?? ($newGuide ? "HDV #{$newGuide->id}" : null);
        $statusText = $approved ? 'đã được duyệt' : 'đã bị từ chối';

        $message = "Yêu cầu đổi HDV cho {$tourTitle} {$statusText}."
            ."\\nNgày đi: {$departureDate}."
            ."\\nNgày về: {$returnDate}."
            ."\\nHDV yêu cầu: {$oldGuideName}.";

        if ($approved && $replacementGuideName) {
            $message .= "\\nHDV thay thế: {$replacementGuideName}.";
        }

        $data = [
            'source' => 'guide_replacement_request',
            'type' => 'guide_replacement_request',
            'action' => $approved ? 'approved' : 'rejected',
            'replacement_request_id' => $replacementRequest->id,
            'tour_departure_id' => $departure->id,
            'departure_id' => $departure->id,
            'current_guide_id' => $replacementRequest->current_guide_id,
            'replacement_guide_id' => $newGuide?->id,
            'departure_date' => $departure->departure_date?->toDateString(),
            'return_date' => $departure->return_date?->toDateString(),
        ];

        foreach ($adminIds as $adminId) {
            $this->notifyUser(
                userId: $adminId,
                title: 'Yêu cầu đổi HDV đã được xử lý',
                message: $message,
                data: $data
            );
        }
    }

    private function notifyUser(?int $userId, string $title, string $message, array $data = []): void
    {
        if (! $userId) {
            return;
        }

        $payload = [
            'draft_id' => null,
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => 'system',
            'status' => 'unread',
        ];

        if (! empty($data) && Schema::hasColumn('notifications', 'data')) {
            $payload['data'] = json_encode($data);
        }

        Notification::query()->create($payload);
    }

    private function getAdminUserIds()
    {
        if (Schema::hasColumn('users', 'role')) {
            return DB::table('users')
                ->whereRaw('LOWER(role) = ?', ['admin'])
                ->pluck('id');
        }

        if (Schema::hasTable('roles') && Schema::hasColumn('users', 'role_id')) {
            return DB::table('users')
                ->join('roles', 'roles.id', '=', 'users.role_id')
                ->whereRaw('LOWER(roles.name) = ?', ['admin'])
                ->pluck('users.id');
        }

        return collect();
    }
}
