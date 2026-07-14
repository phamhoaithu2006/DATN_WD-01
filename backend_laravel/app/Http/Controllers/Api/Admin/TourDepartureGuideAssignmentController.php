<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\Notification;
use App\Models\TourDeparture;
use App\Models\TourGuideAssignment;
use App\Services\GuideAssignmentService;
use App\Services\AdminNotificationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TourDepartureGuideAssignmentController extends Controller
{
    public function planning(
        Request $request,
        GuideAssignmentService $service
    ) {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'tour_id' => ['nullable', 'integer', 'exists:tours,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $from = $validated['from'] ?? today()->toDateString();
        $to = $validated['to'] ?? today()->addMonths(3)->toDateString();

        $departures = TourDeparture::query()
            ->with([
                'tour:id,title,destination_id',

                // Điểm đến chính lưu trong tours.destination_id
                'tour.destination:id,name,province_city,country',

                // Nhiều điểm đến lưu trong pivot tour_destinations
                'tour.destinations:id,name,province_city,country',

                'guideAssignments' => function ($query) {
                    $query
                        ->where('status', 'assigned')
                        ->with([
                            'guide.user:id,full_name,email,avatar_url',
                            'guide.destinations:id,name,province_city',
                        ]);
                },
            ])
            ->when(
                !empty($validated['tour_id']),
                function ($query) use ($validated) {
                    $query->where('tour_id', $validated['tour_id']);
                }
            )
            ->whereDate('departure_date', '>=', $from)
            ->whereDate('departure_date', '<=', $to)
            ->orderBy('departure_date')
            ->paginate($validated['per_page'] ?? 30);

        $departures->setCollection(
            $departures->getCollection()->map(
                fn(TourDeparture $departure) => $this->formatPlanningItem(
                    $departure,
                    $service
                )
            )
        );

        return response()->json([
            'message' => 'Danh sách lịch phân công HDV',
            'data' => $departures,
        ]);
    }

    public function candidates(
        TourDeparture $departure,
        GuideAssignmentService $service
    ) {
        $guides = $service
            ->eligibleGuidesQuery($departure)
            ->get();

        return response()->json([
            'message' => 'Danh sách HDV phù hợp',
            'data' => $guides,
        ]);
    }

    public function autoAssign(
        TourDeparture $departure,
        GuideAssignmentService $service
    ) {
        $assignment = $service->autoAssign(
            $departure->id,
            auth()->id()
        );

        $this->notifyGuideAssigned($assignment, $departure);
        $this->notifyAdminGuideAutoAssigned($departure, $assignment);

        return response()->json([
            'message' => 'Đã tự động phân công HDV.',
            'data' => $assignment,
        ], 201);
    }

    public function assign(
        Request $request,
        TourDeparture $departure,
        GuideAssignmentService $service
    ) {
        $validated = $request->validate([
            'guide_id' => ['required', 'integer', 'exists:guides,id'],
        ]);

        $assignment = $service->assignSpecific(
            $departure,
            $validated['guide_id'],
            auth()->id()
        );

        $this->notifyGuideAssigned($assignment, $departure);
        $this->notifyAdminGuideDirectAssigned($departure, $assignment);

        return response()->json([
            'message' => 'Đã phân công HDV.',
            'data' => $assignment,
        ], 201);
    }

    public function cancel(
        TourDeparture $departure,
        TourGuideAssignment $assignment
    ) {
        abort_unless(
            (int) $assignment->tour_departure_id === (int) $departure->id,
            404
        );

        $assignment->loadMissing([
            'guide.user:id,full_name,email',
        ]);

        $departure->loadMissing([
            'tour:id,title',
        ]);

        DB::transaction(function () use ($assignment, $departure) {
            /*
         * Gửi thông báo trước khi xóa,
         * vì sau khi xóa có thể mất relation guide/user.
         */
            $this->notifyGuideAssignmentRemoved($assignment, $departure);
            $this->notifyAdminGuideAssignmentCancelled($departure, $assignment);

            /*
         * Xóa cứng khỏi bảng tour_guide_assignments.
         */
            $assignment->delete();
        });

        return response()->json([
            'message' => 'Đã hoàn tác phân công HDV.',
        ]);
    }

    private function formatPlanningItem(
        TourDeparture $departure,
        GuideAssignmentService $service
    ): array {
        $destinations = $this->getTourDestinations($departure);

        $assignedGuides = $departure->guideAssignments
            ->values();

        $leadAssignment = $assignedGuides->first(
            fn($assignment) =>
            $assignment->status === 'assigned' &&
                $assignment->role === 'lead'
        );

        $hasLeadGuide = $leadAssignment !== null;

        $availableGuideCount = $hasLeadGuide
            ? 0
            : $service->eligibleGuidesQuery($departure)->count();

        /*
         * Chỉ đỏ khi:
         * - Tour thật sự không có điểm đến
         * - Hoặc không còn HDV phù hợp
         */
        if ($hasLeadGuide) {
            $assignmentState = 'assigned';
        } elseif ($destinations->isEmpty()) {
            $assignmentState = 'blocked';
        } elseif ($availableGuideCount === 0) {
            $assignmentState = 'blocked';
        } else {
            $assignmentState = 'available';
        }

        return [
            'id' => $departure->id,
            'tour_id' => $departure->tour_id,
            'tour_title' => $departure->tour?->title,
            'departure_date' => $this->dateOnly(
                $departure->getRawOriginal('departure_date')
                    ?? $departure->departure_date
            ),
            'return_date' => $this->dateOnly(
                $departure->getRawOriginal('return_date')
                    ?? $departure->return_date
            ),
            'status' => $departure->status,

            'destinations' => $destinations->values(),

            'assigned_guides' => $assignedGuides,

            'available_guide_count' => $availableGuideCount,

            'assignment_state' => $assignmentState,
        ];
    }

    /**
     * Ưu tiên điểm đến từ pivot tour_destinations.
     * Nếu tour cũ chưa có pivot thì lấy destination_id trong bảng tours.
     */
    private function getTourDestinations(
        TourDeparture $departure
    ): Collection {
        $tour = $departure->tour;

        if (!$tour) {
            return collect();
        }

        $destinations = $tour->destinations
            ?->values() ?? collect();

        if (
            $destinations->isEmpty() &&
            $tour->destination
        ) {
            $destinations = collect([
                $tour->destination,
            ]);
        }

        return $destinations;
    }

    //
    private function notifyGuideAssigned(
        TourGuideAssignment $assignment,
        TourDeparture $departure
    ): void {
        try {
            $assignment->loadMissing([
                'guide.user:id,full_name,email',
            ]);

            $departure->loadMissing([
                'tour:id,title',
            ]);

            $guideUserId =
                $assignment->guide?->user_id
                ?? $assignment->guide?->user?->id;

            if (!$guideUserId) {
                return;
            }

            $tourTitle = $departure->tour?->title ?? 'tour';

            $departureDate = $departure->departure_date
                ? \Carbon\Carbon::parse($departure->departure_date)->format('d/m/Y')
                : 'chưa xác định';

            $returnDate = $departure->return_date
                ? \Carbon\Carbon::parse($departure->return_date)->format('d/m/Y')
                : $departureDate;

            Notification::insert([
                'draft_id' => null,
                'user_id' => $guideUserId,
                'title' => 'Bạn có lịch hướng dẫn mới',
                'message' => "Bạn vừa được phân công làm HDV cho {$tourTitle}, khởi hành ngày {$departureDate}, kết thúc ngày {$returnDate}. Vui lòng kiểm tra lịch làm việc của bạn.",
                'type' => 'system',
                'status' => 'unread',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    //gửi thông báo khi hoàn tác lại phân công 
    private function notifyGuideAssignmentCancelled(
        TourGuideAssignment $assignment,
        TourDeparture $departure
    ): void {
        try {
            $guideUserId =
                $assignment->guide?->user_id
                ?? $assignment->guide?->user?->id;

            if (!$guideUserId) {
                return;
            }

            $tourTitle = $departure->tour?->title ?? 'tour';

            $departureDate = $departure->departure_date
                ? \Carbon\Carbon::parse($departure->departure_date)->format('d/m/Y')
                : 'chưa xác định';

            $returnDate = $departure->return_date
                ? \Carbon\Carbon::parse($departure->return_date)->format('d/m/Y')
                : $departureDate;

            Notification::insert([
                'draft_id' => null,
                'user_id' => $guideUserId,
                'title' => 'Lịch hướng dẫn đã được hoàn tác',
                'message' => "Bạn không còn được phân công làm HDV cho {$tourTitle}, khởi hành ngày {$departureDate}, kết thúc ngày {$returnDate}. Vui lòng kiểm tra lại lịch làm việc.",
                'type' => 'system',
                'status' => 'unread',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function notifyGuideAssignmentRemoved(
        TourGuideAssignment $assignment,
        TourDeparture $departure
    ): void {
        try {
            $guideUserId =
                $assignment->guide?->user_id
                ?? $assignment->guide?->user?->id;

            if (!$guideUserId) {
                return;
            }

            $tourTitle = $departure->tour?->title ?? 'tour';

            $departureDate = $departure->departure_date
                ? \Carbon\Carbon::parse($departure->departure_date)->format('d/m/Y')
                : 'chưa xác định';

            $returnDate = $departure->return_date
                ? \Carbon\Carbon::parse($departure->return_date)->format('d/m/Y')
                : $departureDate;

            Notification::insert([
                'draft_id' => null,
                'user_id' => $guideUserId,
                'title' => 'Lịch hướng dẫn đã được hoàn tác',
                'message' => "Bạn không còn được phân công làm HDV cho {$tourTitle}, khởi hành ngày {$departureDate}, kết thúc ngày {$returnDate}. Vui lòng kiểm tra lại lịch làm việc.",
                'type' => 'system',
                'status' => 'unread',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    public function directCandidates(
        Request $request,
        TourDeparture $departure
    ) {
        $validated = $request->validate([
            'mode' => ['nullable', 'in:eligible,all'],
            'keyword' => ['nullable', 'string', 'max:255'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'destination_id' => ['nullable', 'integer', 'exists:destinations,id'],
            'language_ids' => ['nullable', 'array'],
            'language_ids.*' => ['integer', 'exists:languages,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $departure->loadMissing([
            'tour:id,title,destination_id',
            'tour.destination:id,name,province_city,country',
            'tour.destinations:id,name,province_city,country',
        ]);

        $fromRaw = $validated['from']
            ?? $departure->departure_date
            ?? now()->toDateString();

        $toRaw = $validated['to']
            ?? ($departure->return_date ?: $departure->departure_date)
            ?? $fromRaw;

        $from = \Carbon\Carbon::parse($fromRaw)->toDateString();
        $to = \Carbon\Carbon::parse($toRaw)->toDateString();

        if ($to < $from) {
            $to = $from;
        }

        $mode = $validated['mode'] ?? 'eligible';

        $assignmentHasDeletedAt = Schema::hasColumn('tour_guide_assignments', 'deleted_at');
        $guideLanguageHasDeletedAt = Schema::hasColumn('guide_languages', 'deleted_at');
        $hasGuideLeaveRequests = Schema::hasTable('guide_leave_requests');
        $leaveRequestHasDeletedAt = $hasGuideLeaveRequests
            && Schema::hasColumn('guide_leave_requests', 'deleted_at');

        $languageIds = collect($validated['language_ids'] ?? [])
            ->filter(fn($id) => $id !== null && $id !== '')
            ->map(fn($id) => (int) $id)
            ->unique()
            ->values();

        $tourDestinations = $departure->tour?->destinations?->pluck('id') ?? collect();

        if ($tourDestinations->isEmpty() && $departure->tour?->destination_id) {
            $tourDestinations = collect([
                $departure->tour->destination_id,
            ]);
        }

        $tourDestinationIds = $tourDestinations
            ->map(fn($id) => (int) $id)
            ->values();

        $query = Guide::query()
            ->with([
                'user:id,full_name,email,phone,avatar_url',
                'destinations:id,name,province_city,country',
            ]);

        /*
     * Không hiển thị HDV đã được phân công cho chính lịch khởi hành này.
     * Dùng cho cả phân công mới và đổi HDV trực tiếp.
     */
        $query->whereNotExists(function ($subQuery) use ($departure, $assignmentHasDeletedAt) {
            $subQuery
                ->select(DB::raw(1))
                ->from('tour_guide_assignments as current_assignments')
                ->whereColumn('current_assignments.guide_id', 'guides.id')
                ->where('current_assignments.tour_departure_id', $departure->id)
                ->where('current_assignments.status', 'assigned');

            if ($assignmentHasDeletedAt) {
                $subQuery->whereNull('current_assignments.deleted_at');
            }
        });

        if (Schema::hasColumn('guides', 'status')) {
            $query->where('guides.status', 'active');
        }

        if (!empty($validated['keyword'])) {
            $keyword = trim($validated['keyword']);

            $query->where(function ($q) use ($keyword) {
                $q->where('guides.guide_code', 'like', "%{$keyword}%")
                    ->orWhereHas('user', function ($userQuery) use ($keyword) {
                        $userQuery
                            ->where('full_name', 'like', "%{$keyword}%")
                            ->orWhere('email', 'like', "%{$keyword}%")
                            ->orWhere('phone', 'like', "%{$keyword}%");
                    });
            });
        }

        if (!empty($validated['destination_id'])) {
            $destinationId = (int) $validated['destination_id'];

            $query->whereHas('destinations', function ($q) use ($destinationId) {
                $q->where('destinations.id', $destinationId);
            });
        }

        if ($mode === 'eligible' && $tourDestinationIds->isNotEmpty()) {
            $query->whereHas('destinations', function ($q) use ($tourDestinationIds) {
                $q->whereIn('destinations.id', $tourDestinationIds);
            });
        }

        if ($languageIds->isNotEmpty()) {
            $query->whereExists(function ($subQuery) use ($languageIds, $guideLanguageHasDeletedAt) {
                $subQuery
                    ->select(DB::raw(1))
                    ->from('guide_languages')
                    ->whereColumn('guide_languages.guide_id', 'guides.id')
                    ->whereIn('guide_languages.language_id', $languageIds);

                if ($guideLanguageHasDeletedAt) {
                    $subQuery->whereNull('guide_languages.deleted_at');
                }
            });
        }

        /*
     * Subquery đếm số lịch bị trùng.
     * Dùng để sort:
     * - conflict_count = 0 => trống lịch, lên đầu
     * - conflict_count > 0 => bận lịch, xuống cuối
     */
        $conflictCountQuery = TourGuideAssignment::query()
            ->selectRaw('COUNT(*)')
            ->whereColumn('tour_guide_assignments.guide_id', 'guides.id')
            ->where('tour_guide_assignments.status', 'assigned')
            ->where('tour_guide_assignments.tour_departure_id', '!=', $departure->id)
            ->whereHas('departure', function ($q) use ($from, $to) {
                $q->whereDate('departure_date', '<=', $to)
                    ->whereRaw(
                        'DATE(COALESCE(return_date, departure_date)) >= ?',
                        [$from]
                    );
            });

        if ($assignmentHasDeletedAt) {
            $conflictCountQuery->whereNull('tour_guide_assignments.deleted_at');
        }

        $leaveConflictCountQuery = null;

        if ($hasGuideLeaveRequests) {
            $leaveConflictCountQuery = DB::table('guide_leave_requests')
                ->selectRaw('COUNT(*)')
                ->whereColumn('guide_leave_requests.guide_id', 'guides.id')
                ->whereIn('guide_leave_requests.status', ['pending', 'approved'])
                ->whereDate('guide_leave_requests.start_date', '<=', $to)
                ->whereDate('guide_leave_requests.end_date', '>=', $from);

            if ($leaveRequestHasDeletedAt) {
                $leaveConflictCountQuery->whereNull('guide_leave_requests.deleted_at');
            }
        }

        $guides = $query
            ->when($leaveConflictCountQuery, function ($candidateQuery) use ($leaveConflictCountQuery) {
                $candidateQuery->orderBy($leaveConflictCountQuery, 'asc');
            })
            ->orderBy($conflictCountQuery, 'asc')
            ->orderByDesc('guides.id')
            ->paginate($validated['per_page'] ?? 20);

        $languageColumns = ['languages.id'];

        if (Schema::hasColumn('languages', 'name')) {
            $languageColumns[] = 'languages.name';
        } elseif (Schema::hasColumn('languages', 'language_name')) {
            $languageColumns[] = DB::raw('languages.language_name as name');
        } else {
            $languageColumns[] = DB::raw('NULL as name');
        }

        $guides->setCollection(
            $guides->getCollection()->map(function (Guide $guide) use (
                $departure,
                $from,
                $to,
                $tourDestinationIds,
                $assignmentHasDeletedAt,
                $guideLanguageHasDeletedAt,
                $languageColumns,
                $hasGuideLeaveRequests,
                $leaveRequestHasDeletedAt
            ) {
                $guideDestinationIds = $guide->destinations
                    ?->pluck('id')
                    ->map(fn($id) => (int) $id)
                    ->values() ?? collect();

                $isAreaMatch = $tourDestinationIds->isNotEmpty()
                    && $guideDestinationIds
                    ->intersect($tourDestinationIds)
                    ->isNotEmpty();

                $conflictingAssignmentsQuery = TourGuideAssignment::query()
                    ->where('guide_id', $guide->id)
                    ->where('status', 'assigned')
                    ->where('tour_departure_id', '!=', $departure->id)
                    ->whereHas('departure', function ($q) use ($from, $to) {
                        $q->whereDate('departure_date', '<=', $to)
                            ->whereRaw(
                                'DATE(COALESCE(return_date, departure_date)) >= ?',
                                [$from]
                            );
                    })
                    ->with([
                        'departure:id,tour_id,departure_date,return_date,status',
                        'departure.tour:id,title',
                    ]);

                if ($assignmentHasDeletedAt) {
                    $conflictingAssignmentsQuery->whereNull('tour_guide_assignments.deleted_at');
                }

                $conflictingAssignments = $conflictingAssignmentsQuery->get();

                $leaveRequests = collect();

                if ($hasGuideLeaveRequests) {
                    $leaveQuery = DB::table('guide_leave_requests')
                        ->where('guide_id', $guide->id)
                        ->whereIn('status', ['pending', 'approved'])
                        ->whereDate('start_date', '<=', $to)
                        ->whereDate('end_date', '>=', $from)
                        ->select([
                            'id',
                            'start_date',
                            'end_date',
                            'status',
                            'reason',
                        ]);

                    if ($leaveRequestHasDeletedAt) {
                        $leaveQuery->whereNull('deleted_at');
                    }

                    $leaveRequests = $leaveQuery->get();
                }

                $assignedToursQuery = TourGuideAssignment::query()
                    ->where('guide_id', $guide->id)
                    ->where('status', 'assigned')
                    ->with([
                        'departure:id,tour_id,departure_date,return_date,status',
                        'departure.tour:id,title',
                    ])
                    ->orderByDesc('assigned_at')
                    ->limit(20);

                if ($assignmentHasDeletedAt) {
                    $assignedToursQuery->whereNull('tour_guide_assignments.deleted_at');
                }

                $assignedTours = $assignedToursQuery->get();

                $guideLanguagesQuery = DB::table('guide_languages')
                    ->join('languages', 'languages.id', '=', 'guide_languages.language_id')
                    ->where('guide_languages.guide_id', $guide->id)
                    ->select($languageColumns);

                if ($guideLanguageHasDeletedAt) {
                    $guideLanguagesQuery->whereNull('guide_languages.deleted_at');
                }

                $guideLanguages = $guideLanguagesQuery->get();

                $hasLeaveConflict = $leaveRequests->isNotEmpty();
                $hasTourConflict = $conflictingAssignments->isNotEmpty();
                $isAvailable = !$hasTourConflict && !$hasLeaveConflict;

                $blockingReasons = [];

                if ($hasTourConflict) {
                    $blockingReasons[] = 'HDV đã có lịch trong khoảng thời gian này.';
                }

                if ($hasLeaveConflict) {
                    $blockingReasons[] = 'HDV có đơn xin nghỉ đang chờ duyệt hoặc đã duyệt trong khoảng thời gian này.';
                }

                if (!$isAreaMatch) {
                    $blockingReasons[] = 'HDV không phụ trách khu vực của tour.';
                }

                $avatarUrl =
                    $guide->user?->avatar_url
                    ?? $guide->avatar_url
                    ?? null;

                return [
                    'id' => $guide->id,
                    'guide_code' => $guide->guide_code ?? null,
                    'avatar_url' => $avatarUrl,
                    'user' => $guide->user,
                    'destinations' => $guide->destinations,
                    'languages' => $guideLanguages,
                    'is_area_match' => $isAreaMatch,
                    'is_available' => $isAvailable,
                    'is_eligible' => $isAvailable && $isAreaMatch,
                    'blocking_reasons' => $blockingReasons,
                    'conflicting_assignments' => $conflictingAssignments,
                    'leave_requests' => $leaveRequests,
                    'assigned_tours' => $assignedTours,
                ];
            })
        );

        return response()->json([
            'message' => 'Danh sách HDV cho phân công trực tiếp',
            'data' => $guides,
        ]);
    }

    public function directAssign(
        Request $request,
        TourDeparture $departure
    ) {
        $validated = $request->validate([
            'guide_id' => ['required', 'integer', 'exists:guides,id'],
            'force_area_mismatch' => ['nullable', 'boolean'],
        ]);

        $departure->loadMissing([
            'tour:id,title,destination_id',
            'tour.destination:id,name,province_city,country',
            'tour.destinations:id,name,province_city,country',
        ]);

        $guide = Guide::query()
            ->with([
                'user:id,full_name,email,phone',
                'destinations:id,name,province_city,country',
            ])
            ->findOrFail($validated['guide_id']);

        $from = $departure->departure_date;
        $to = $departure->return_date ?: $departure->departure_date;

        $hasScheduleConflict = TourGuideAssignment::query()
            ->where('guide_id', $guide->id)
            ->where('status', 'assigned')
            ->where('tour_departure_id', '!=', $departure->id)
            ->whereHas('departure', function ($q) use ($from, $to) {
                $q->whereDate('departure_date', '<=', $to)
                    ->whereDate(
                        DB::raw('COALESCE(return_date, departure_date)'),
                        '>=',
                        $from
                    );
            })
            ->exists();

        if ($hasScheduleConflict) {
            return response()->json([
                'message' => 'HDV này đã có lịch trong khoảng thời gian tour.',
                'code' => 'GUIDE_SCHEDULE_CONFLICT',
            ], 422);
        }

        if (Schema::hasTable('guide_leave_requests')) {
            $leaveConflictQuery = DB::table('guide_leave_requests')
                ->where('guide_id', $guide->id)
                ->whereIn('status', ['pending', 'approved'])
                ->whereDate('start_date', '<=', $to)
                ->whereDate('end_date', '>=', $from);

            if (Schema::hasColumn('guide_leave_requests', 'deleted_at')) {
                $leaveConflictQuery->whereNull('deleted_at');
            }

            if ($leaveConflictQuery->exists()) {
                return response()->json([
                    'message' => 'HDV này đang có đơn xin nghỉ trong khoảng thời gian tour.',
                    'code' => 'GUIDE_LEAVE_CONFLICT',
                ], 422);
            }
        }

        $tourDestinations = $departure->tour?->destinations?->pluck('id') ?? collect();

        if ($tourDestinations->isEmpty() && $departure->tour?->destination_id) {
            $tourDestinations = collect([
                $departure->tour->destination_id,
            ]);
        }

        $guideDestinationIds = $guide->destinations
            ?->pluck('id')
            ->map(fn($id) => (int) $id)
            ->values() ?? collect();

        $isAreaMatch = $tourDestinations->isNotEmpty() &&
            $guideDestinationIds
            ->intersect($tourDestinations->map(fn($id) => (int) $id))
            ->isNotEmpty();

        $forceAreaMismatch = filter_var(
            $validated['force_area_mismatch'] ?? false,
            FILTER_VALIDATE_BOOLEAN
        );

        if (!$isAreaMatch && !$forceAreaMismatch) {
            return response()->json([
                'message' => 'HDV này không phụ trách khu vực của tour. Bạn có chắc muốn phân công không?',
                'code' => 'AREA_MISMATCH_CONFIRM_REQUIRED',
            ], 409);
        }

        $assignment = null;
        $isReplacing = false;

        DB::transaction(function () use (
            $departure,
            $guide,
            &$assignment,
            &$isReplacing
        ) {
            /*
         * Lấy HDV cũ đang được phân công cho lịch này.
         */
            $oldAssignment = TourGuideAssignment::query()
                ->with([
                    'guide.user:id,full_name,email,phone',
                ])
                ->where('tour_departure_id', $departure->id)
                ->where('role', 'lead')
                ->where('status', 'assigned')
                ->first();

            /*
         * Nếu chọn lại đúng HDV đang phân công thì không tạo lại,
         * không gửi thông báo trùng.
         */
            if ($oldAssignment && (int) $oldAssignment->guide_id === (int) $guide->id) {
                $assignment = $oldAssignment;
                return;
            }

            /*
         * Nếu có HDV cũ, gửi thông báo cho HDV cũ rồi xoá assignment cũ.
         */
            if ($oldAssignment) {
                $isReplacing = true;

                $this->notifyGuideDirectReplaced(
                    $oldAssignment,
                    $departure,
                    $guide
                );

                $oldAssignment->delete();
            }

            /*
         * Tạo phân công mới.
         */
            $assignment = TourGuideAssignment::create([
                'tour_departure_id' => $departure->id,
                'guide_id' => $guide->id,
                'role' => 'lead',
                'status' => 'assigned',
                'assigned_by' => auth()->id(),
                'assigned_at' => now(),
            ]);

            $assignment->load([
                'guide.user:id,full_name,email,phone',
            ]);

            /*
         * Gửi thông báo cho HDV mới.
         */
            $this->notifyGuideDirectAssigned($assignment, $departure);

            /*
         * Gửi thông báo cho các tài khoản admin về thao tác phân công/đổi HDV.
         */
            if ($oldAssignment) {
                $this->notifyAdminGuideReplaced(
                    $departure,
                    $oldAssignment,
                    $assignment
                );
            } else {
                $this->notifyAdminGuideDirectAssigned(
                    $departure,
                    $assignment
                );
            }
        });

        return response()->json([
            'message' => $isReplacing
                ? ($isAreaMatch
                    ? 'Đã đổi HDV trực tiếp.'
                    : 'Đã đổi sang HDV ngoài khu vực phụ trách.')
                : ($isAreaMatch
                    ? 'Đã phân công HDV.'
                    : 'Đã phân công HDV ngoài khu vực phụ trách.'),
            'data' => $assignment?->load([
                'guide.user:id,full_name,email,phone',
            ]),
        ], 201);
    }

    private function notifyGuideDirectAssigned(
        TourGuideAssignment $assignment,
        TourDeparture $departure
    ): void {
        try {
            $assignment->loadMissing([
                'guide.user:id,full_name,email',
            ]);

            $departure->loadMissing([
                'tour:id,title',
            ]);

            $guideUserId =
                $assignment->guide?->user_id
                ?? $assignment->guide?->user?->id;

            if (!$guideUserId) {
                return;
            }

            $tourTitle = $departure->tour?->title ?? 'tour';

            $departureDate = $departure->departure_date
                ? \Carbon\Carbon::parse($departure->departure_date)->format('d/m/Y')
                : 'chưa xác định';

            $returnDate = $departure->return_date
                ? \Carbon\Carbon::parse($departure->return_date)->format('d/m/Y')
                : $departureDate;

            Notification::insert([
                'draft_id' => null,
                'user_id' => $guideUserId,
                'title' => 'Bạn có lịch hướng dẫn mới',
                'message' => "Bạn vừa được phân công làm HDV cho {$tourTitle}, khởi hành ngày {$departureDate}, kết thúc ngày {$returnDate}. Vui lòng kiểm tra lịch làm việc của bạn.",
                'type' => 'system',
                'status' => 'unread',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function notifyGuideDirectReplaced(
        TourGuideAssignment $oldAssignment,
        TourDeparture $departure,
        Guide $newGuide
    ): void {
        try {
            $oldUserId =
                $oldAssignment->guide?->user_id
                ?? $oldAssignment->guide?->user?->id;

            if (!$oldUserId) {
                return;
            }

            $departure->loadMissing([
                'tour:id,title',
            ]);

            $newGuide->loadMissing([
                'user:id,full_name,email',
            ]);

            $tourTitle = $departure->tour?->title ?? 'tour';

            $departureDate = $departure->departure_date
                ? \Carbon\Carbon::parse($departure->departure_date)->format('d/m/Y')
                : 'chưa xác định';

            $returnDate = $departure->return_date
                ? \Carbon\Carbon::parse($departure->return_date)->format('d/m/Y')
                : $departureDate;

            $newGuideName =
                $newGuide->user?->full_name
                ?? $newGuide->guide_code
                ?? 'HDV khác';

            Notification::insert([
                'draft_id' => null,
                'user_id' => $oldUserId,
                'title' => 'Lịch hướng dẫn đã được thay đổi',
                'message' => "Bạn không còn được phân công làm HDV cho {$tourTitle}, khởi hành ngày {$departureDate}, kết thúc ngày {$returnDate}. Lịch này đã được chuyển sang {$newGuideName}. Vui lòng kiểm tra lại lịch làm việc.",
                'type' => 'system',
                'status' => 'unread',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function notifyAdminGuideAutoAssigned(
        TourDeparture $departure,
        TourGuideAssignment $assignment
    ): void {
        try {
            $assignment->loadMissing([
                'guide.user:id,full_name,email',
            ]);

            app(AdminNotificationService::class)
                ->notifyGuideAutoAssigned(
                    $departure,
                    $assignment->guide,
                    auth()->user()
                );
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function notifyAdminGuideDirectAssigned(
        TourDeparture $departure,
        TourGuideAssignment $assignment
    ): void {
        try {
            $assignment->loadMissing([
                'guide.user:id,full_name,email',
            ]);

            app(AdminNotificationService::class)
                ->notifyGuideDirectAssigned(
                    $departure,
                    $assignment->guide,
                    auth()->user()
                );
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function notifyAdminGuideReplaced(
        TourDeparture $departure,
        TourGuideAssignment $oldAssignment,
        TourGuideAssignment $newAssignment
    ): void {
        try {
            $oldAssignment->loadMissing([
                'guide.user:id,full_name,email',
            ]);

            $newAssignment->loadMissing([
                'guide.user:id,full_name,email',
            ]);

            app(AdminNotificationService::class)
                ->notifyGuideReplaced(
                    $departure,
                    $oldAssignment->guide,
                    $newAssignment->guide,
                    auth()->user()
                );
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function notifyAdminGuideAssignmentCancelled(
        TourDeparture $departure,
        TourGuideAssignment $assignment
    ): void {
        try {
            $assignment->loadMissing([
                'guide.user:id,full_name,email',
            ]);

            app(AdminNotificationService::class)
                ->notifyGuideAssignmentCancelled(
                    $departure,
                    $assignment->guide,
                    auth()->user()
                );
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /**
     * Trả ngày dưới dạng YYYY-MM-DD, không serialize Carbon thành UTC.
     */
    private function dateOnly(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return Carbon::parse($value)->toDateString();
    }

}