<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingDisruptionRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BookingDisruptionController extends Controller
{
    /**
     * Danh sách yêu cầu xử lý sự cố (mưa bão) của chính khách hàng đang đăng nhập.
     */
    public function index(Request $request): JsonResponse
    {
        $items = BookingDisruptionRequest::query()
            ->whereHas('booking', fn ($q) => $q->where('user_id', $request->user()->id))
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

        $canRequestRefund = in_array(
            $booking->status,
            ['awaiting_payment', 'confirmed', 'cancelled', 'cancelled_by_tour'],
            true,
        ) && in_array($booking->payment_status, ['paid', 'refund_pending'], true);

        if (! $canRequestRefund) {
            return response()->json([
                'message' => 'Đơn ở trạng thái hiện tại không đủ điều kiện gửi yêu cầu hoàn tiền.',
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
            'type' => ['required', 'string', Rule::in(['refund'])],
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        $disruption = BookingDisruptionRequest::create([
            'booking_id' => $booking->id,
            'type' => $data['type'],
            'status' => 'pending',
            'reason' => $data['reason'],
            'requested_tour_departure_id' => null,
        ]);

        $booking->statusHistories()->create([
            'changed_by' => $request->user()->id,
            'old_status' => $booking->status,
            'new_status' => $booking->status,
            'note' => '[customer_cancellation_requested] Khách hàng gửi yêu cầu hủy tour và hoàn tiền. Lý do: '.$data['reason'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi yêu cầu xử lý sự cố. ViVuGo sẽ phản hồi sớm nhất.',
            'data' => $disruption,
        ], 201);
    }

    public function withdraw(Request $request, BookingDisruptionRequest $bookingDisruptionRequest): JsonResponse
    {
        $withdrawnId = DB::transaction(function () use ($request, $bookingDisruptionRequest): ?int {
            $lockedRequest = BookingDisruptionRequest::query()
                ->with('booking:id,user_id,status')
                ->lockForUpdate()
                ->findOrFail($bookingDisruptionRequest->id);

            if ($lockedRequest->booking?->user_id !== $request->user()->id) {
                abort(404);
            }

            if ($lockedRequest->status !== 'pending' || $lockedRequest->processed_at || $lockedRequest->processed_by) {
                return null;
            }

            $lockedRequest->booking->statusHistories()->create([
                'changed_by' => $request->user()->id,
                'old_status' => $lockedRequest->booking->status,
                'new_status' => $lockedRequest->booking->status,
                'note' => '[customer_cancellation_withdrawn] Khách hàng đã rút yêu cầu hủy tour trước khi Admin xử lý.',
            ]);

            $id = $lockedRequest->id;
            $lockedRequest->delete();

            return $id;
        });

        if (! $withdrawnId) {
            return response()->json([
                'message' => 'Yêu cầu đã được Admin xử lý nên không thể rút lại.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã rút yêu cầu hủy đơn.',
            'data' => ['id' => $withdrawnId],
        ]);
    }
}
