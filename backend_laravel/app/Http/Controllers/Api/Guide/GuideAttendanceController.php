<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Http\Requests\AttendanceActionRequest;
use App\Http\Requests\AttendanceSessionQueryRequest;
use App\Http\Requests\GuideTourCustomerIndexRequest;
use App\Http\Requests\StoreAttendanceSessionRequest;
use App\Http\Requests\UpdateAttendanceNoteRequest;
use App\Http\Resources\AttendanceSessionResource;
use App\Http\Resources\GuideTourCustomerDetailResource;
use App\Http\Resources\GuideTourCustomerResource;
use App\Http\Resources\GuideTourOverviewResource;
use App\Http\Resources\TourDepartureStageResource;
use App\Models\Attendance;
use App\Models\AttendanceSession;
use App\Models\BookingParticipant;
use App\Models\TourDeparture;
use App\Services\GuideTourOperationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuideAttendanceController extends Controller
{
    public function __construct(private readonly GuideTourOperationService $service) {}

    public function overview(Request $request, TourDeparture $tourDeparture): JsonResponse
    {
        $departure = $this->service->getOverview($request->user(), $tourDeparture);

        return response()->json([
            'status' => 'success',
            'message' => 'Tour overview retrieved successfully.',
            'data' => new GuideTourOverviewResource($departure),
        ]);
    }

    public function customers(GuideTourCustomerIndexRequest $request, TourDeparture $tourDeparture): JsonResponse
    {
        $result = $this->service->getCustomers($request->user(), $tourDeparture, $request->validated());
        $customers = $result['customers'];

        return response()->json([
            'status' => 'success',
            'message' => 'Tour customers retrieved successfully.',
            'current_session' => $result['session'] ? new AttendanceSessionResource($result['session']) : null,
            'data' => GuideTourCustomerResource::collection($customers->getCollection()),
            'meta' => [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ],
        ]);
    }

    public function statistics(AttendanceSessionQueryRequest $request, TourDeparture $tourDeparture): JsonResponse
    {
        $stats = $this->service->getAttendanceStatistics(
            $request->user(),
            $tourDeparture,
            $request->integer('attendance_session_id') ?: null
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Attendance statistics retrieved successfully.',
            'data' => [
                'current_session' => $stats['current_session']
                    ? new AttendanceSessionResource($stats['current_session'])
                    : null,
                'total_customers' => $stats['total_customers'],
                'checked_in' => $stats['checked_in'],
                'not_checked_in' => $stats['not_checked_in'],
                'absent' => $stats['absent'],
                'checked_out' => $stats['checked_out'],
            ],
        ]);
    }

    public function showCustomer(Request $request, TourDeparture $tourDeparture, BookingParticipant $bookingParticipant): JsonResponse
    {
        $participant = $this->service->getCustomerDetail($request->user(), $tourDeparture, $bookingParticipant);

        return response()->json([
            'status' => 'success',
            'message' => 'Tour customer detail retrieved successfully.',
            'data' => new GuideTourCustomerDetailResource($participant),
        ]);
    }

    public function storeSession(StoreAttendanceSessionRequest $request, TourDeparture $tourDeparture): JsonResponse
    {
        $session = $this->service->createAttendanceSession($request->user(), $tourDeparture, $request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Attendance session created successfully.',
            'data' => new AttendanceSessionResource($session),
        ], 201);
    }

    public function checkIn(
        AttendanceActionRequest $request,
        TourDeparture $tourDeparture,
        AttendanceSession $attendanceSession
    ): JsonResponse {
        $attendance = $this->service->checkIn(
            $request->user(),
            $tourDeparture,
            $attendanceSession,
            (int) $request->validated('participant_id')
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Customer checked in successfully.',
            'data' => $this->attendanceData($attendance),
        ]);
    }

    public function checkOut(
        AttendanceActionRequest $request,
        TourDeparture $tourDeparture,
        AttendanceSession $attendanceSession
    ): JsonResponse {
        $attendance = $this->service->checkOut(
            $request->user(),
            $tourDeparture,
            $attendanceSession,
            (int) $request->validated('participant_id')
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Customer checked out successfully.',
            'data' => $this->attendanceData($attendance),
        ]);
    }

    public function updateNote(
        UpdateAttendanceNoteRequest $request,
        TourDeparture $tourDeparture,
        AttendanceSession $attendanceSession
    ): JsonResponse {
        $attendance = $this->service->updateAttendanceNote(
            $request->user(),
            $tourDeparture,
            $attendanceSession,
            $request->validated()
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Attendance note updated successfully.',
            'data' => $this->attendanceData($attendance),
        ]);
    }

    public function stages(Request $request, TourDeparture $tourDeparture): JsonResponse
    {
        $stages = $this->service->getStages($request->user(), $tourDeparture);
        $currentStage = $stages->firstWhere('status', 'in_progress')
            ?? $stages->firstWhere('status', 'pending')
            ?? $stages->last();

        return response()->json([
            'status' => 'success',
            'message' => 'Tour stages retrieved successfully.',
            'data' => [
                'current_stage' => $currentStage ? new TourDepartureStageResource($currentStage) : null,
                'stages' => TourDepartureStageResource::collection($stages),
            ],
        ]);
    }

    public function advanceStage(Request $request, TourDeparture $tourDeparture): JsonResponse
    {
        $result = $this->service->advanceStage($request->user(), $tourDeparture);

        return response()->json([
            'status' => 'success',
            'message' => 'Tour stage advanced successfully.',
            'data' => [
                'current_stage' => new TourDepartureStageResource($result['current_stage']),
                'stages' => TourDepartureStageResource::collection($result['stages']),
            ],
        ]);
    }

    private function attendanceData(Attendance $attendance): array
    {
        return [
            'id' => $attendance->id,
            'attendance_session_id' => $attendance->attendance_session_id,
            'participant_id' => $attendance->booking_participant_id,
            'status' => $attendance->status,
            'checked_in_at' => $attendance->checked_in_at?->toDateTimeString(),
            'checked_in_by' => $attendance->checkedInBy?->only(['id', 'full_name', 'email']),
            'checked_out_at' => $attendance->checked_out_at?->toDateTimeString(),
            'checked_out_by' => $attendance->checkedOutBy?->only(['id', 'full_name', 'email']),
            'note' => $attendance->note,
            'note_updated_by' => $attendance->noteUpdatedBy?->only(['id', 'full_name', 'email']),
        ];
    }
}
