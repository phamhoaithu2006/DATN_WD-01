<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerTourReviewResource;
use App\Models\Booking;
use App\Models\Tour;
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
        $bookings = Booking::query()
            ->where('user_id', $request->user()->id)
            ->with([
                'tour.category',
                'tour.destination',
                'tourDeparture',
                'payment',
                'tourReview',
            ])
            ->orderByDesc('id')
            ->get()
            ->map(function (Booking $booking) use ($request): array {
                $data = $booking->toArray();
                $data['can_review_tour'] = $this->bookingReviewEligibilityService->isReviewable($booking);
                $data['tour_review'] = $booking->tourReview
                    ? (new CustomerTourReviewResource($booking->tourReview))->resolve($request)
                    : null;

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
            ->with(['category', 'destination'])
            ->orderByDesc('average_rating')
            ->orderByDesc('review_count')
            ->limit(3);

        if (str_contains($message, 'biển') || str_contains($message, 'beach')) {
            $query->where(function ($q) {
                $q->where('title', 'like', '%biển%')
                    ->orWhere('summary', 'like', '%biển%')
                    ->orWhereHas('destination', function ($dq) {
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
                    ->orWhereHas('destination', function ($dq) {
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
            $destination = $tour->destination->name ?? 'Việt Nam';

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
