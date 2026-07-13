<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\Notification;
use App\Models\TourDeparture;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class GuideTourController extends Controller
{
    private function getGuide(Request $request): ?Guide
    {
        return Guide::where('user_id', $request->user()->id)
            ->first();
    }

    private function emptyPaginator(Request $request): array
    {
        $perPage = min($request->integer('per_page', 10), 50);

        return [
            'data' => [],
            'current_page' => 1,
            'last_page' => 1,
            'per_page' => $perPage,
            'total' => 0,
        ];
    }

    private function baseQuery(Guide $guide)
    {
        $assignmentNoteExpression = 'NULL as assignment_note';

        if (
            Schema::hasColumn('tour_guide_assignments', 'notes') &&
            Schema::hasColumn('tour_guide_assignments', 'note')
        ) {
            $assignmentNoteExpression = 'COALESCE(tga.notes, tga.note) as assignment_note';
        } elseif (Schema::hasColumn('tour_guide_assignments', 'notes')) {
            $assignmentNoteExpression = 'tga.notes as assignment_note';
        } elseif (Schema::hasColumn('tour_guide_assignments', 'note')) {
            $assignmentNoteExpression = 'tga.note as assignment_note';
        }

        $query = TourDeparture::query()
            ->join('tour_guide_assignments as tga', 'tga.tour_departure_id', '=', 'tour_departures.id')
            ->where('tga.guide_id', $guide->id)
            ->where('tga.status', '!=', 'cancelled')
            ->with([
                'tour:id,title,slug,summary,duration_days,duration_nights,base_price,discount_price,average_rating,review_count,destination_id,category_id',
                'tour.destination:id,name,province_city',
                'tour.category:id,name,slug',
                'tour.thumbnail:id,tour_id,image_url,alt_text,is_thumbnail',
            ])
            ->addSelect([
                'tour_departures.*',
                'tga.id as assignment_id',
                'tga.status as assignment_status',
                DB::raw($assignmentNoteExpression),
            ]);

        if (Schema::hasTable('guide_replacement_requests')) {
            $query->selectSub(function ($subQuery) use ($guide) {
                $subQuery
                    ->from('guide_replacement_requests as grr')
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('grr.tour_departure_id', 'tour_departures.id')
                    ->where('grr.current_guide_id', $guide->id)
                    ->where('grr.status', 'pending');
            }, 'replacement_request_pending');
        } else {
            $query->addSelect(DB::raw('0 as replacement_request_pending'));
        }

        return $query;
    }

    private function applyFilters($query, Request $request)
    {
        if ($keyword = $request->input('keyword')) {
            $query->whereHas('tour', function ($q) use ($keyword) {
                $q->where('title', 'like', "%{$keyword}%")
                    ->orWhere('summary', 'like', "%{$keyword}%")
                    ->orWhereHas('destination', fn ($d) => $d->where('name', 'like', "%{$keyword}%"));
            });
        }

        if ($destinationId = $request->input('destination_id')) {
            $query->whereHas('tour', fn ($q) => $q->where('destination_id', $destinationId));
        }

        if ($fromDate = $request->input('from_date')) {
            $query->where('tour_departures.departure_date', '>=', $fromDate);
        }

        if ($toDate = $request->input('to_date')) {
            $query->where('tour_departures.departure_date', '<=', $toDate);
        }

        return $query;
    }

    private function sortForGuide($query)
    {
        $today = Carbon::today()->toDateString();

        return $query
            ->orderByRaw(
                "
                CASE
                    WHEN DATE(tour_departures.departure_date) <= ?
                        AND DATE(COALESCE(tour_departures.return_date, tour_departures.departure_date)) >= ?
                        AND tour_departures.status NOT IN ('completed', 'cancelled', 'canceled')
                        THEN 1
                    WHEN DATE(tour_departures.departure_date) > ?
                        THEN 2
                    WHEN tour_departures.status IN ('cancelled', 'canceled')
                        THEN 4
                    ELSE 3
                END ASC
                ",
                [$today, $today, $today]
            )
            ->when(Schema::hasTable('guide_replacement_requests'), function ($sortQuery) {
                $sortQuery->orderByRaw(
                    "
                    CASE
                        WHEN EXISTS (
                            SELECT 1
                            FROM guide_replacement_requests grr
                            WHERE grr.tour_departure_id = tour_departures.id
                                AND grr.status = 'pending'
                        )
                        THEN 0
                        ELSE 1
                    END ASC
                    "
                );
            })
            ->orderBy('tour_departures.departure_date', 'asc');
    }

    public function index(Request $request)
    {
        $guide = $this->getGuide($request);

        if (!$guide) {
            return response()->json([
                'message' => 'Tài khoản chưa có hồ sơ hướng dẫn viên hoặc chưa được phân công tour.',
                'data' => $this->emptyPaginator($request),
            ]);
        }

        $query = $this->applyFilters($this->baseQuery($guide), $request);
        $query = $this->sortForGuide($query);

        return response()->json([
            'message' => 'Danh sách tour được phân công',
            'data' => $query->paginate(min($request->integer('per_page', 10), 50)),
        ]);
    }

    public function upcoming(Request $request)
    {
        $guide = $this->getGuide($request);

        if (!$guide) {
            return response()->json([
                'message' => 'Tài khoản chưa có hồ sơ hướng dẫn viên hoặc chưa được phân công tour.',
                'data' => $this->emptyPaginator($request),
            ]);
        }

        $today = Carbon::today()->toDateString();

        $query = $this->baseQuery($guide)
            ->where('tour_departures.departure_date', '>', $today);

        $query = $this->applyFilters($query, $request);
        $query->orderBy('tour_departures.departure_date', 'asc');

        return response()->json([
            'message' => 'Danh sách tour sắp diễn ra',
            'data' => $query->paginate(min($request->integer('per_page', 10), 50)),
        ]);
    }

    public function ongoing(Request $request)
    {
        $guide = $this->getGuide($request);

        if (!$guide) {
            return response()->json([
                'message' => 'Tài khoản chưa có hồ sơ hướng dẫn viên hoặc chưa được phân công tour.',
                'data' => $this->emptyPaginator($request),
            ]);
        }

        $today = Carbon::today()->toDateString();

        $query = $this->baseQuery($guide)
            ->where('tour_departures.departure_date', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('tour_departures.return_date')
                    ->orWhere('tour_departures.return_date', '>=', $today);
            })
            ->whereNotIn('tour_departures.status', ['completed', 'cancelled', 'canceled']);

        $query = $this->applyFilters($query, $request);
        $query->orderBy('tour_departures.departure_date', 'asc');

        return response()->json([
            'message' => 'Danh sách tour đang diễn ra',
            'data' => $query->paginate(min($request->integer('per_page', 10), 50)),
        ]);
    }

    public function completed(Request $request)
    {
        $guide = $this->getGuide($request);

        if (!$guide) {
            return response()->json([
                'message' => 'Tài khoản chưa có hồ sơ hướng dẫn viên hoặc chưa được phân công tour.',
                'data' => $this->emptyPaginator($request),
            ]);
        }

        $today = Carbon::today()->toDateString();

        $query = $this->baseQuery($guide)
            ->where(function ($q) use ($today) {
                $q->where('tour_departures.status', 'completed')
                    ->orWhere(function ($sub) use ($today) {
                        $sub->whereNotNull('tour_departures.return_date')
                            ->where('tour_departures.return_date', '<', $today);
                    });
            });

        $query = $this->applyFilters($query, $request);
        $query->orderBy('tour_departures.departure_date', 'desc');

        return response()->json([
            'message' => 'Danh sách tour đã hoàn thành',
            'data' => $query->paginate(min($request->integer('per_page', 10), 50)),
        ]);
    }

    public function show(Request $request, int $departureId)
    {
        $guide = $this->getGuide($request);

        if (!$guide) {
            return response()->json([
                'message' => 'Tài khoản chưa có hồ sơ hướng dẫn viên hoặc chưa được phân công tour.',
                'data' => null,
            ]);
        }

        $departure = TourDeparture::query()
            ->join('tour_guide_assignments as tga', 'tga.tour_departure_id', '=', 'tour_departures.id')
            ->where('tga.guide_id', $guide->id)
            ->where('tga.status', '!=', 'cancelled')
            ->where('tour_departures.id', $departureId)
            ->with([
                'tour:id,title,slug,summary,duration_days,duration_nights,base_price,discount_price,average_rating,review_count,destination_id,category_id',
                'tour.category:id,name,slug',
                'tour.destination:id,name,slug,province_city,country,description',
                'tour.thumbnail:id,tour_id,image_url,alt_text,is_thumbnail',
                'tour.itineraries' => fn ($it) => $it
                    ->orderBy('day_number')
                    ->orderBy('sort_order'),
            ])
            ->addSelect([
                'tour_departures.*',
                'tga.id as assignment_id',
                'tga.status as assignment_status',
                DB::raw('COALESCE(tga.notes, tga.note) as assignment_note'),
            ])
            ->when(Schema::hasTable('guide_replacement_requests'), function ($detailQuery) use ($guide) {
                $detailQuery->selectSub(function ($subQuery) use ($guide) {
                    $subQuery
                        ->from('guide_replacement_requests as grr')
                        ->selectRaw('COUNT(*)')
                        ->whereColumn('grr.tour_departure_id', 'tour_departures.id')
                        ->where('grr.current_guide_id', $guide->id)
                        ->where('grr.status', 'pending');
                }, 'replacement_request_pending');
            }, function ($detailQuery) {
                $detailQuery->addSelect(DB::raw('0 as replacement_request_pending'));
            })
            ->firstOrFail();

        return response()->json([
            'message' => 'Chi tiết tour được phân công',
            'data' => $departure,
        ]);
    }

    public function requestReplacement(Request $request, TourDeparture $tourDeparture)
    {
        $guide = $this->getGuide($request);

        if (!$guide) {
            return response()->json([
                'message' => 'Tài khoản chưa có hồ sơ hướng dẫn viên.',
            ], 404);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:2000'],
            'evidence' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ], [
            'reason.required' => 'Vui lòng nhập lý do xin đổi HDV.',
            'reason.min' => 'Lý do cần ít nhất 10 ký tự.',
            'evidence.mimes' => 'Bằng chứng chỉ chấp nhận ảnh hoặc PDF.',
            'evidence.max' => 'Bằng chứng không được vượt quá 5MB.',
        ]);

        $assignment = DB::table('tour_guide_assignments')
            ->where('tour_departure_id', $tourDeparture->id)
            ->where('guide_id', $guide->id)
            ->where('status', '!=', 'cancelled')
            ->first();

        if (!$assignment) {
            return response()->json([
                'message' => 'Bạn không được phân công cho lịch khởi hành này.',
            ], 403);
        }

        $departureDate = Carbon::parse($tourDeparture->departure_date)->startOfDay();
        $minDate = Carbon::today()->addDays(5)->startOfDay();

        if ($departureDate->lt($minDate)) {
            return response()->json([
                'message' => 'Yêu cầu đổi HDV cần gửi trước ngày khởi hành ít nhất 5 ngày.',
                'code' => 'REPLACEMENT_REQUEST_TOO_LATE',
            ], 422);
        }

        $hasPending = DB::table('guide_replacement_requests')
            ->where('tour_departure_id', $tourDeparture->id)
            ->where('current_guide_id', $guide->id)
            ->where('status', 'pending')
            ->exists();

        if ($hasPending) {
            return response()->json([
                'message' => 'Bạn đã gửi yêu cầu đổi HDV cho lịch này và đang chờ admin duyệt.',
                'code' => 'REPLACEMENT_REQUEST_PENDING',
            ], 409);
        }

        $evidencePath = null;

        if ($request->hasFile('evidence')) {
            $evidencePath = $request->file('evidence')->store('guide-replacement-evidence', 'public');
        }

        $requestId = null;

        DB::transaction(function () use (
            $request,
            $tourDeparture,
            $guide,
            $validated,
            $evidencePath,
            &$requestId
        ) {
            $requestId = DB::table('guide_replacement_requests')->insertGetId([
                'tour_departure_id' => $tourDeparture->id,
                'current_guide_id' => $guide->id,
                'requested_by' => $request->user()->id,
                'reason' => $validated['reason'],
                'evidence_path' => $evidencePath,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->notifyAdminsAboutReplacementRequest($tourDeparture, $guide, $validated['reason'], $requestId);
        });

        return response()->json([
            'message' => 'Đã gửi yêu cầu đổi HDV. Admin sẽ xem xét và phản hồi.',
            'data' => [
                'id' => $requestId,
                'tour_departure_id' => $tourDeparture->id,
                'status' => 'pending',
            ],
        ], 201);
    }

    public function replacementRequestStatus(Request $request, TourDeparture $tourDeparture)
    {
        $guide = $this->getGuide($request);

        if (!$guide) {
            return response()->json([
                'message' => 'Tài khoản chưa có hồ sơ hướng dẫn viên.',
                'data' => null,
            ]);
        }

        $replacementRequest = DB::table('guide_replacement_requests')
            ->where('tour_departure_id', $tourDeparture->id)
            ->where('current_guide_id', $guide->id)
            ->orderByDesc('id')
            ->first();

        return response()->json([
            'message' => 'Trạng thái yêu cầu đổi HDV.',
            'data' => $replacementRequest,
        ]);
    }

    private function notifyAdminsAboutReplacementRequest(
        TourDeparture $departure,
        Guide $guide,
        string $reason,
        ?int $replacementRequestId = null
    ): void {
        $departure->loadMissing([
            'tour:id,title',
        ]);

        $guide->loadMissing([
            'user:id,full_name,email',
        ]);

        $adminIds = $this->getAdminUserIds();

        if ($adminIds->isEmpty()) {
            return;
        }

        $tourTitle = $departure->tour?->title ?? "Tour #{$departure->tour_id}";
        $guideName = $guide->user?->full_name ?? $guide->guide_code ?? "HDV #{$guide->id}";
        $departureDate = Carbon::parse($departure->departure_date)->format('d/m/Y');
        $returnDate = Carbon::parse($departure->return_date ?: $departure->departure_date)->format('d/m/Y');
        $now = now();

        $rows = $adminIds->map(function ($adminId) use (
            $tourTitle,
            $guideName,
            $departureDate,
            $reason,
            $departure,
            $guide,
            $now,
            $replacementRequestId,
            $returnDate
        ) {
            $row = [
                'draft_id' => null,
                'user_id' => $adminId,
                'title' => 'HDV yêu cầu đổi lịch dẫn tour',
                'message' => "{$guideName} vừa gửi yêu cầu đổi HDV cho {$tourTitle}.\nNgày đi: {$departureDate}.\nNgày về: {$returnDate}.\nLý do: {$reason}",
                'type' => 'system',
                'status' => 'unread',
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (Schema::hasColumn('notifications', 'data')) {
                $row['data'] = json_encode([
                    'source' => 'guide_replacement_request',
                    'type' => 'guide_replacement_request',
                    'action' => 'created',
                    'replacement_request_id' => $replacementRequestId,
                    'tour_departure_id' => $departure->id,
                    'departure_id' => $departure->id,
                    'guide_id' => $guide->id,
                    'departure_date' => $departure->departure_date?->toDateString(),
                    'return_date' => $departure->return_date?->toDateString(),
                ]);
            }

            return $row;
        })->values()->all();

        Notification::insert($rows);
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