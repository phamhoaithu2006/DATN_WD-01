<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\TourDepartureResource;
use App\Models\Tour;
use App\Models\TourDeparture;
use Illuminate\Http\Request;

class TourDepartureController extends Controller
{
    /**
     * 1. Lấy danh sách ngày khởi hành của một tour.
     * GET /api/admin/tours/{tourId}/departures
     */
    public function index($tourId)
    {
        $departures = TourDeparture::query()
            ->where('tour_id', $tourId)
            ->with([
                'guideAssignments' => function ($query) {
                    $query
                        ->where('status', 'assigned')
                        ->with([
                            'guide:id,user_id,guide_code',
                            'guide.user:id,full_name,email,avatar_url',
                        ]);
                },
            ])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        $departures->each(function ($departure) {
            $assignedGuides = $departure->guideAssignments->values();

            $leadAssignment = $assignedGuides->first(function ($assignment) {
                return $assignment->status === 'assigned' &&
                    ($assignment->role === 'lead' || !$assignment->role);
            });

            /*
        | Các field này giúp TourDepartureTable hiển thị được:
        | - HDV phụ trách
        | - badge Đã phân công / Chưa phân công
        */
            $departure->setAttribute(
                'assigned_guides',
                $assignedGuides
            );

            $departure->setAttribute(
                'assignment_state',
                $leadAssignment ? 'assigned' : 'available'
            );
        });

        return response()->json([
            'message' => 'Danh sách lịch khởi hành',
            'data' => $departures,
        ]);
    }

    /**
     * 2. Thêm ngày khởi hành mới cho tour.
     * POST /api/admin/tours/{tourId}/departures
     */
    public function store(Request $request, $tourId)
    {
        $tour = Tour::findOrFail($tourId);

        $validatedData = $request->validate([
            'departure_date' => 'required|date|after_or_equal:today',
            'return_date' => 'nullable|date|after:departure_date',
            'price' => 'nullable|numeric|min:0',
            'total_slots' => 'required|integer|min:1',
            'status' => 'required|in:open,closed,completed,cancelled',
        ]);

        $validatedData['tour_id'] = $tour->id;
        $validatedData['booked_slots'] = 0;

        $departure = TourDeparture::create($validatedData);

        return response()->json([
            'status' => 'success',
            'message' => 'Thêm lịch khởi hành thành công',
            'data' => new TourDepartureResource($departure->load('tour')),
        ], 201, [], JSON_PRESERVE_ZERO_FRACTION);
    }

    /**
     * 3. Cập nhật thông tin ngày khởi hành.
     * PUT /api/admin/tours/departures/{id}
     */
    public function update(Request $request, $id)
    {
        $departure = TourDeparture::findOrFail($id);

        $validatedData = $request->validate([
            'departure_date' => 'sometimes|required|date|after_or_equal:today',
            'return_date' => 'nullable|date|after:' . ($request->departure_date ?? $departure->departure_date?->format('Y-m-d') ?? 'today'),
            'price' => 'nullable|numeric|min:0',
            'total_slots' => 'sometimes|required|integer|min:' . ($request->booked_slots ?? $departure->booked_slots),
            'booked_slots' => 'nullable|integer|min:0|max:' . ($request->total_slots ?? $departure->total_slots),
            'status' => 'sometimes|required|in:open,closed,completed,cancelled',
        ]);

        $departure->update($validatedData);

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật lịch khởi hành thành công',
            'data' => new TourDepartureResource($departure->fresh(['tour'])),
        ], 200, [], JSON_PRESERVE_ZERO_FRACTION);
    }

    /**
     * 4. Xóa ngày khởi hành.
     * DELETE /api/admin/tours/departures/{id}
     *
     * Chặn xóa nếu đã có booking liên kết với lịch khởi hành này.
     */
    public function destroy($id)
    {
        $departure = TourDeparture::findOrFail($id);

        // Kiểm tra ràng buộc: không cho phép xóa nếu có booking đang tồn tại liên kết
        if ($departure->bookings()->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không thể xóa lịch khởi hành này vì đã có booking liên kết. Vui lòng hủy hoặc chuyển các booking trước khi xóa.',
            ], 422);
        }

        $departure->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Đã xóa lịch khởi hành thành công',
        ]);
    }
}
