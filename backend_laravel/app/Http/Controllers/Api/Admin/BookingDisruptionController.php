<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingDisruptionRequest;
use App\Models\TourDeparture;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BookingDisruptionController extends Controller
{
    /**
     * Danh sách yêu cầu xử lý sự cố (mưa bão) của khách hàng đang đăng nhập.
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
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    /**
     * Khách hàng gửi yêu cầu xử lý sự cố mưa bão cho 1 booking:
     * - refund: hoàn tiền
     * - retain: bảo lưu
     * - transfer: chuyển sang lịch khởi hành khác
     */
    public function store(Request $request, Booking $booking): JsonResponse
    {
        if ($booking->user_id !== $request->user()->id) {
            abort(404);
        }

        if (! $booking->canBeManagedByCustomer()) {
            throw ValidationException::withMessages([
                'booking' => ['Đơn hàng không ở trạng thái có thể gửi yêu cầu xử lý sự cố.'],
            ]);
        }

        $data = $request->validate([
            'type' => ['required', 'in:refund,retain,transfer'],
            'reason' => ['required', 'string', 'max:2000'],
            // Khách có thể chưa biết mã lịch khởi hành mong muốn — nếu để trống,
            // nhân viên hỗ trợ sẽ chọn lịch phù hợp khi duyệt yêu cầu.
            'requested_tour_departure_id' => [
                'nullable',
                'integer',
                'exists:tour_departures,id',
            ],
        ]);

        $hasPending = BookingDisruptionRequest::query()
            ->where('booking_id', $booking->id)
            ->where('status', 'pending')
            ->exists();

        if ($hasPending) {
            throw ValidationException::withMessages([
                'booking' => ['Đơn hàng này đang có một yêu cầu xử lý sự cố chờ duyệt.'],
            ]);
        }

        if ($data['type'] === 'transfer' && ! empty($data['requested_tour_departure_id'])) {
            $target = TourDeparture::query()->findOrFail($data['requested_tour_departure_id']);

            if ((int) $target->id === (int) $booking->tour_departure_id) {
                throw ValidationException::withMessages([
                    'requested_tour_departure_id' => ['Vui lòng chọn lịch khởi hành khác lịch hiện tại.'],
                ]);
            }

            $availableSlots = (int) $target->total_slots - (int) $target->booked_slots;

            if ($availableSlots < (int) $booking->number_of_people) {
                throw ValidationException::withMessages([
                    'requested_tour_departure_id' => ["Lịch khởi hành này chỉ còn {$availableSlots} chỗ trống."],
                ]);
            }
        }

        $disruption = BookingDisruptionRequest::create([
            'booking_id' => $booking->id,
            'type' => $data['type'],
            'status' => 'pending',
            'reason' => $data['reason'],
            'requested_tour_departure_id' => $data['requested_tour_departure_id'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi yêu cầu xử lý sự cố. Nhân viên sẽ liên hệ và xử lý sớm nhất.',
            'data' => $disruption,
        ], 201);
    }
}
