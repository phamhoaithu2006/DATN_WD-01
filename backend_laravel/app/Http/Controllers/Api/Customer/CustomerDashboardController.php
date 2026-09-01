<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerTourReviewResource;
use App\Models\Booking;
use App\Models\BookingInformationChangeHistory;
use App\Models\Tour;
use App\Models\TourFinalizationOutbox;
use App\Services\BookingReviewEligibilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerDashboardController extends Controller
{
    public function __construct(
        private readonly BookingReviewEligibilityService $bookingReviewEligibilityService
    ) {}

    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $user->id,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'avatar_url' => $user->avatar_url,
                'bookings_count' => $user->bookings()->count(),
                'wishlist_count' => $user->wishlists()->count(),
            ],
        ]);
    }

    public function bookings(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $bookings = Booking::query()
            ->where('user_id', $userId)
            ->with([
                'tour.category',
                'tour.province',
                'tour.destination',
                'tour.thumbnail',
                'tour.itineraries.destinationPlace:id,name,address,district_name',
                'tourDeparture.stages.itinerary.destinationPlace:id,name,address,district_name',
                'tourDeparture.attendanceSessions' => fn ($query) => $query
                    ->select('id', 'tour_departure_id', 'name', 'scheduled_date', 'status')
                    ->orderBy('scheduled_date')
                    ->orderBy('id'),
                'payment',
                'contact',
                'participants.attendances:id,attendance_session_id,booking_participant_id,status,checked_in_at,checked_out_at,note',
                'tourReview',
                'disruptionRequests',
                'statusHistories' => fn($q) => $q
                    ->with('changedBy:id,full_name')
                    ->orderByDesc('id'),
                'informationChangeHistories' => fn($q) => $q->orderByDesc('id'),
            ])
            ->orderByDesc('id')
            ->get();

        $tourCancellationMessages = TourFinalizationOutbox::query()
            ->whereIn('tour_departure_id', $bookings->pluck('tour_departure_id')->filter()->unique())
            ->whereIn('event_type', ['tour_cancelled_admin', 'tour_cancelled_insufficient_participants'])
            ->orderByDesc('id')
            ->get()
            ->unique('tour_departure_id')
            ->mapWithKeys(fn (TourFinalizationOutbox $outbox) => [
                $outbox->tour_departure_id => $outbox->payload['customer_message'] ?? null,
            ]);

        // Đếm số lần hủy theo TỪNG TOUR (không phân biệt lịch khởi hành),
        // tính 1 lần cho cả danh sách thay vì query lại cho mỗi booking (tránh N+1).
        $cancelledCountByTourId = Booking::query()
            ->where('user_id', $userId)
            ->where('status', 'cancelled')
            ->selectRaw('tour_id, COUNT(*) as total')
            ->groupBy('tour_id')
            ->pluck('total', 'tour_id');

        // Đếm số lần đã sửa thông tin liên hệ/hành khách cho TỪNG booking,
        // tính 1 lần cho cả danh sách thay vì query lại cho mỗi booking (tránh N+1).
        $editCountByBookingId = BookingInformationChangeHistory::query()
            ->whereIn('booking_id', $bookings->pluck('id'))
            ->selectRaw('booking_id, COUNT(*) as total')
            ->groupBy('booking_id')
            ->pluck('total', 'booking_id');

        $bookings = $bookings->map(function (Booking $booking) use ($request, $cancelledCountByTourId, $editCountByBookingId, $tourCancellationMessages): array {
            $data = $booking->toArray();
            $data['can_review_tour'] = $this->bookingReviewEligibilityService->isReviewable($booking);
            $data['tour_review'] = $booking->tourReview
                ? (new CustomerTourReviewResource($booking->tourReview))->resolve($request)
                : null;

            $pendingDisruption = $booking->disruptionRequests->firstWhere('status', 'pending');
            $data['has_pending_disruption'] = (bool) $pendingDisruption;
            $data['pending_disruption_request'] = $pendingDisruption ? [
                'id' => $pendingDisruption->id,
                'type' => $pendingDisruption->type,
                'status' => $pendingDisruption->status,
                'reason' => $pendingDisruption->reason,
                'created_at' => $pendingDisruption->created_at?->toIso8601String(),
            ] : null;

            $data['customer_cancellation_count'] = (int) ($cancelledCountByTourId[$booking->tour_id] ?? 0);
            $data['customer_cancellation_limit'] = Booking::CUSTOMER_CANCELLATION_LIMIT;

            $data['information_edit_count'] = (int) ($editCountByBookingId[$booking->id] ?? 0);
            $data['tour_cancellation_message'] = $tourCancellationMessages[$booking->tour_departure_id] ?? null;
            $data['information_edit_limit'] = Booking::INFORMATION_EDIT_LIMIT;

            return $data;
        });

        return response()->json([
            'status' => 'success',
            'data' => $bookings,
        ]);
    }

    public function travelAssistant(Request $request): JsonResponse
    {
        $request->validate([
            'message' => ['required', 'string', 'max:1000'],
        ]);

        $message = mb_strtolower($request->message, 'UTF-8');

        $query = Tour::query()
            ->where('status', 'published')
            ->with(['category', 'province', 'destination'])
            ->orderByDesc('average_rating')
            ->orderByDesc('review_count')
            ->limit(3);

        if (str_contains($message, 'biển') || str_contains($message, 'beach')) {
            $query->where(function ($q) {
                $q->where('title', 'like', '%biển%')
                    ->orWhere('summary', 'like', '%biển%')
                    ->orWhereHas('province', function ($dq) {
                        $dq->where('name', 'like', '%biển%');
                    });
            });
        } elseif (str_contains($message, 'ngân sách') || str_contains($message, 'tiền') || str_contains($message, 'rẻ')) {
            $query->where(function ($q) {
                $q->where('discount_price', '>', 0)
                    ->orWhere('base_price', '<=', 10000000);
            });
        } elseif (str_contains($message, 'miền bắc') || str_contains($message, 'hà nội') || str_contains($message, 'sapa')) {
            $query->where(function ($q) {
                $q->where('title', 'like', '%sapa%')
                    ->orWhere('title', 'like', '%hà nội%')
                    ->orWhereHas('province', function ($dq) {
                        $dq->where('name', 'like', '%sapa%')
                            ->orWhere('name', 'like', '%hà nội%');
                    });
            });
        }

        $tours = $query->get();

        if ($tours->isEmpty()) {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'message' => 'Mình chưa tìm được tour khớp hoàn toàn. Bạn cho mình biết thêm điểm đến, ngân sách và số ngày nhé.',
                ],
            ]);
        }

        $lines = $tours->map(function ($tour) {
            $price = $tour->discount_price ?: $tour->base_price;
            $destination = $tour->province->name ?? 'Việt Nam';

            return sprintf(
                '- %s tại %s, giá từ %s',
                $tour->title,
                $destination,
                number_format((float) $price, 0, ',', '.')
            );
        })->implode("\n");

        return response()->json([
            'status' => 'success',
            'data' => [
                'message' => "Mình gợi ý bạn một vài tour phù hợp:\n{$lines}\n\nNếu muốn, bạn có thể nói thêm khu vực, số ngày hoặc mức ngân sách để mình lọc sát hơn.",
            ],
        ]);
    }
}
