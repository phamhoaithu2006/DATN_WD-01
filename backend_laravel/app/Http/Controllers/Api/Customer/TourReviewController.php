<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreTourReviewRequest;
use App\Http\Requests\Customer\UpdateTourReviewRequest;
use App\Http\Resources\CustomerTourReviewResource;
use App\Models\Booking;
use App\Models\Tour;
use App\Models\TourReview;
use App\Services\TourReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TourReviewController extends Controller
{
    public function __construct(
        private readonly TourReviewService $tourReviewService
    ) {}

    public function store(StoreTourReviewRequest $request): JsonResponse
    {
        $data = $request->validated();

        $review = DB::transaction(function () use ($data, $request): ?TourReview {
            $booking = Booking::query()
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->findOrFail($data['booking_id']);

            Tour::query()->lockForUpdate()->findOrFail($booking->tour_id);
            $booking->load('tourDeparture');

            if (! $this->tourReviewService->isBookingReviewable($booking)) {
                throw ValidationException::withMessages([
                    'booking_id' => 'Chỉ có thể đánh giá khi tour đã hoàn thành.',
                ]);
            }

            if (TourReview::query()->where('booking_id', $booking->id)->exists()) {
                return null;
            }

            $review = TourReview::query()->create([
                'user_id' => $request->user()->id,
                'tour_id' => $booking->tour_id,
                'booking_id' => $booking->id,
                'tour_departure_id' => $booking->tour_departure_id,
                'rating' => (int) $data['rating'],
                'comment' => $this->normalizeComment($data['comment'] ?? null),
                'status' => 'visible',
            ]);

            $this->tourReviewService->refreshTourRating((int) $booking->tour_id);

            return $review;
        });

        if (! $review) {
            return response()->json([
                'status' => 'error',
                'message' => 'Booking này đã có đánh giá tour.',
            ], 409);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Đánh giá tour thành công.',
            'data' => new CustomerTourReviewResource($this->loadReview($review)),
        ], 201);
    }

    public function update(UpdateTourReviewRequest $request, int $tourReview): JsonResponse
    {
        $data = $request->validated();

        $review = DB::transaction(function () use ($data, $request, $tourReview): TourReview {
            $review = TourReview::query()
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->findOrFail($tourReview);

            $review->update([
                'rating' => (int) $data['rating'],
                'comment' => $this->normalizeComment($data['comment'] ?? null),
            ]);

            $this->tourReviewService->refreshTourRating((int) $review->tour_id);

            return $review;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật đánh giá tour thành công.',
            'data' => new CustomerTourReviewResource($this->loadReview($review)),
        ]);
    }

    private function loadReview(TourReview $review): TourReview
    {
        return $review->load([
            'tour:id,title,slug',
            'tourDeparture:id,departure_date,return_date',
            'booking:id,booking_code',
        ]);
    }

    private function normalizeComment(?string $comment): ?string
    {
        $comment = trim((string) $comment);

        return $comment === '' ? null : $comment;
    }
}
