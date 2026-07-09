<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\Notification;
use App\Models\TourDeparture;
use App\Models\TourGuideAssignment;
use App\Services\GuideAssignmentService;
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
            'departure_date' => $departure->departure_date,
            'return_date' => $departure->return_date,
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

        $from = $validated['from'] ?? $departure->departure_date;
        $to = $validated['to'] ?? ($departure->return_date ?: $departure->departure_date);
        $mode = $validated['mode'] ?? 'eligible';

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

        if (Schema::hasColumn('guides', 'status')) {
            $query->where('status', 'active');
        }

        if (!empty($validated['keyword'])) {
            $keyword = trim($validated['keyword']);

            $query->where(function ($q) use ($keyword) {
                $q->where('guide_code', 'like', "%{$keyword}%")
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
            $query->whereExists(function ($subQuery) use ($languageIds) {
                $subQuery
                    ->select(DB::raw(1))
                    ->from('guide_languages')
                    ->whereColumn('guide_languages.guide_id', 'guides.id')
                    ->whereIn('guide_languages.language_id', $languageIds);
            });
        }

        $guides = $query
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 20);

        $guides->setCollection(
            $guides->getCollection()->map(function (Guide $guide) use (
                $departure,
                $from,
                $to,
                $tourDestinationIds
            ) {
                $guideDestinationIds = $guide->destinations
                    ?->pluck('id')
                    ->map(fn($id) => (int) $id)
                    ->values() ?? collect();

                $isAreaMatch = $tourDestinationIds->isNotEmpty()
                    && $guideDestinationIds
                    ->intersect($tourDestinationIds)
                    ->isNotEmpty();

                $conflictingAssignments = TourGuideAssignment::query()
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
                    ])
                    ->get();

                $assignedTours = TourGuideAssignment::query()
                    ->where('guide_id', $guide->id)
                    ->where('status', 'assigned')
                    ->with([
                        'departure:id,tour_id,departure_date,return_date,status',
                        'departure.tour:id,title',
                    ])
                    ->orderByDesc('assigned_at')
                    ->limit(20)
                    ->get();

                $guideLanguages = DB::table('guide_languages')
                    ->join('languages', 'languages.id', '=', 'guide_languages.language_id')
                    ->where('guide_languages.guide_id', $guide->id)
                    ->select([
                        'languages.id',
                        'languages.name',
                    ])
                    ->get();

                $isAvailable = $conflictingAssignments->isEmpty();

                $blockingReasons = [];

                if (!$isAvailable) {
                    $blockingReasons[] = 'HDV đã có lịch trong khoảng thời gian này.';
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

        DB::transaction(function () use (
            $departure,
            $guide,
            &$assignment
        ) {
            /*
         * Nếu lịch đã có HDV cũ thì xóa để thay bằng HDV mới.
         * Vì bạn đang muốn hoàn tác/xóa thật record khỏi DB.
         */
            TourGuideAssignment::query()
                ->where('tour_departure_id', $departure->id)
                ->where('role', 'lead')
                ->delete();

            $assignment = TourGuideAssignment::create([
                'tour_departure_id' => $departure->id,
                'guide_id' => $guide->id,
                'role' => 'lead',
                'status' => 'assigned',
                'assigned_by' => auth()->id(),
                'assigned_at' => now(),
            ]);

            $this->notifyGuideDirectAssigned($assignment, $departure);
        });

        return response()->json([
            'message' => $isAreaMatch
                ? 'Đã phân công HDV.'
                : 'Đã phân công HDV ngoài khu vực phụ trách.',
            'data' => $assignment->load([
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
}
