<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingDisruptionRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BookingDisruptionController extends Controller
{
    /**
     * Danh sách yêu cầu xử lý sự cố (mưa bão) của chính khách hàng đang đăng nhập.
     */
    public function index(Request $request): JsonResponse
    {
        $items = BookingDisruptionRequest::query()
            ->whereHas('booking', fn($q) => $q->where('user_id', $request->user()->id))
            ->with([
                'booking:id,booking_code,status,payment_status,tour_id,tour_departure_id',
                'booking.tour:id,title,slug',
                'booking.tourDeparture:id,departure_date,return_date',
                'requestedDeparture:id,departure_date,return_date',
            ])
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    /**
     * Khách gửi yêu cầu xử lý sự cố (mưa bão) cho 1 booking của mình.
     */
    public function store(Request $request, Booking $booking): JsonResponse
    {
        if ($booking->user_id !== $request->user()->id) {
            abort(404);
        }

        // Chỉ cho phép gửi yêu cầu khi tour chưa bị hủy/hoàn tất và đã thanh toán.
        if (! in_array($booking->status, ['pending', 'confirmed'], true)) {
            return response()->json([
                'message' => 'Không thể gửi yêu cầu xử lý sự cố cho đơn ở trạng thái hiện tại.',
            ], 422);
        }

        // Không cho gửi trùng khi đã có 1 yêu cầu đang chờ xử lý cho booking này.
        $hasPending = BookingDisruptionRequest::query()
            ->where('booking_id', $booking->id)
            ->where('status', 'pending')
            ->exists();

        if ($hasPending) {
            return response()->json([
                'message' => 'Đơn này đã có yêu cầu đang chờ xử lý, vui lòng đợi ViVuGo phản hồi.',
            ], 422);
        }

        $data = $request->validate([
            'type' => ['required', 'string', Rule::in(BookingDisruptionRequest::TYPES)],
            'reason' => ['required', 'string', 'max:2000'],
            'requested_tour_departure_id' => [
                'nullable',
                'required_if:type,transfer',
                'integer',
                'exists:tour_departures,id',
            ],
        ]);

        $disruption = BookingDisruptionRequest::create([
            'booking_id' => $booking->id,
            'type' => $data['type'],
            'status' => 'pending',
            'reason' => $data['reason'],
            'requested_tour_departure_id' => $data['requested_tour_departure_id'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi yêu cầu xử lý sự cố. ViVuGo sẽ phản hồi sớm nhất.',
            'data' => $disruption,
        ], 201);
    }
}
