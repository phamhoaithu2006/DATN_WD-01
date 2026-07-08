<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TourDeparture;
use App\Models\TourGuideAssignment;
use App\Services\GuideAssignmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

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
                fn (TourDeparture $departure) => $this->formatPlanningItem(
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

        $assignment->update([
            'status' => 'cancelled',
        ]);

        return response()->json([
            'message' => 'Đã hủy phân công HDV.',
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
            fn ($assignment) =>
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
}