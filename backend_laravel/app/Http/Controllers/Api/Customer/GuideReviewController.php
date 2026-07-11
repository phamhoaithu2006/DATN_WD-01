<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreGuideReviewRequest;
use App\Http\Resources\GuideReviewResource;
use App\Models\Booking;
use App\Models\Guide;
use App\Models\Review;
use App\Models\TourGuideAssignment;
use App\Services\GuideReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GuideReviewController extends Controller
{
    public function __construct(
        private readonly GuideReviewService $guideReviewService
    ) {}

    public function reviewableBookings(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $today = today()->toDateString();

        $bookings = Booking::query()
            ->where('user_id', $userId)
            ->where('status', '!=', 'cancelled')
            ->where(function ($query) use ($today): void {
                $query->where('status', 'completed')
                    ->orWhere(function ($subQuery) use ($today): void {
                        $subQuery->whereIn('status', ['confirmed', 'completed'])
                            ->whereHas('tourDeparture', function ($departureQuery) use ($today): void {
                                $departureQuery->where('status', 'completed')
                                    ->orWhere(function ($departureSubQuery) use ($today): void {
                                        $departureSubQuery->whereNotNull('return_date')
                                            ->whereDate('return_date', '<', $today);
                                    });
                            });
                    });
            })
            ->with([
                'tour:id,title,slug,summary,duration_days,duration_nights,destination_id,category_id,average_rating,review_count',
                'tour.destination:id,name,province_city',
                'tour.category:id,name,slug',
                'tour.thumbnail:id,tour_id,image_url,alt_text,is_thumbnail',
                'tourDeparture:id,tour_id,departure_date,return_date,status,total_slots,booked_slots',
                'tourDeparture.guideAssignments' => function ($query): void {
                    $query->where('status', '!=', 'cancelled')
                        ->with(['guide.user:id,full_name,email,phone,avatar_url']);
                },
                'reviews' => function ($query) use ($userId): void {
                    $query->where('user_id', $userId)
                        ->with([
                            'booking',
                            'guide.user:id,full_name,avatar_url',
                            'tour:id,title,slug',
                            'tourDeparture:id,departure_date,return_date,status',
                            'user:id,full_name,avatar_url',
                        ]);
                },
            ])
            ->orderByDesc('id')
            ->paginate($this->perPage($request));

        $bookings->setCollection(
            $bookings->getCollection()
                ->map(fn (Booking $booking): array => $this->mapReviewableBooking($booking, $request))
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Danh sach tour co the danh gia HDV.',
            'data' => $bookings,
        ]);
    }

    public function store(StoreGuideReviewRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        $booking = Booking::query()
            ->where('user_id', $user->id)
            ->with([
                'tour',
                'tourDeparture.guideAssignments' => function ($query): void {
                    $query->where('status', '!=', 'cancelled');
                },
            ])
            ->findOrFail($data['booking_id']);

        if (! $this->guideReviewService->isBookingReviewable($booking)) {
            throw ValidationException::withMessages([
                'booking_id' => 'Chi co the danh gia khi tour da hoan thanh.',
            ]);
        }

        $assignment = $booking->tourDeparture?->guideAssignments
            ->first(fn (TourGuideAssignment $assignment): bool => (int) $assignment->guide_id === (int) $data['guide_id']);

        if (! $assignment) {
            throw ValidationException::withMessages([
                'guide_id' => 'HDV nay khong duoc phan cong cho booking da chon.',
            ]);
        }

        [$review, $created] = DB::transaction(function () use ($booking, $data, $user): array {
            $review = Review::query()->firstOrNew([
                'booking_id' => $booking->id,
                'guide_id' => (int) $data['guide_id'],
            ]);

            $created = ! $review->exists;

            $review->fill([
                'user_id' => $user->id,
                'tour_id' => $booking->tour_id,
                'tour_departure_id' => $booking->tour_departure_id,
                'rating' => (int) $data['rating'],
                'comment' => $data['comment'] ?? null,
            ]);

            if ($created) {
                $review->status = 'visible';
            }

            $review->save();

            $this->guideReviewService->refreshGuideRating((int) $data['guide_id']);
            $this->guideReviewService->refreshTourRating((int) $booking->tour_id);

            return [$review, $created];
        });

        $review->load([
            'booking',
            'guide.user:id,full_name,avatar_url',
            'tour:id,title,slug',
            'tourDeparture:id,departure_date,return_date,status',
            'user:id,full_name,avatar_url',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => $created ? 'Danh gia HDV thanh cong.' : 'Cap nhat danh gia HDV thanh cong.',
            'data' => new GuideReviewResource($review),
        ], $created ? 201 : 200);
    }

    public function guideReviews(Request $request, Guide $guide): JsonResponse
    {
        return $this->reviewsResponse($request, $guide);
    }

    public function guideTourHistory(Request $request, Guide $guide): JsonResponse
    {
        return $this->tourHistoryResponse($request, $guide);
    }

    private function reviewsResponse(Request $request, Guide $guide): JsonResponse
    {
        $query = Review::query()
            ->visible()
            ->where('guide_id', $guide->id)
            ->with([
                'booking',
                'guide.user:id,full_name,avatar_url',
                'tour:id,title,slug',
                'tourDeparture:id,departure_date,return_date,status',
                'user:id,full_name,avatar_url',
            ])
            ->latest('created_at');

        if ($request->filled('rating')) {
            $query->where('rating', (int) $request->input('rating'));
        }

        $reviews = $query->paginate($this->perPage($request));
        $reviews->setCollection(
            $reviews->getCollection()
                ->map(fn (Review $review): array => (new GuideReviewResource($review))->resolve($request))
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Danh sach danh gia HDV.',
            'summary' => $this->guideReviewService->guideRatingSummary($guide),
            'data' => $reviews,
        ]);
    }

    private function tourHistoryResponse(Request $request, Guide $guide): JsonResponse
    {
        $query = $this->guideReviewService
            ->completedAssignmentsQuery($guide)
            ->join('tour_departures as td', 'td.id', '=', 'tour_guide_assignments.tour_departure_id')
            ->select('tour_guide_assignments.*')
            ->with([
                'departure.tour:id,title,slug,summary,duration_days,duration_nights,destination_id,category_id,average_rating,review_count',
                'departure.tour.destination:id,name,province_city',
                'departure.tour.category:id,name,slug',
                'departure.tour.thumbnail:id,tour_id,image_url,alt_text,is_thumbnail',
                'departure.reviews' => function ($reviewQuery) use ($guide): void {
                    $reviewQuery->visible()
                        ->where('guide_id', $guide->id)
                        ->select('id', 'tour_departure_id', 'guide_id', 'rating', 'status');
                },
            ]);

        if ($request->filled('keyword')) {
            $keyword = trim((string) $request->input('keyword'));

            $query->whereHas('departure.tour', function ($tourQuery) use ($keyword): void {
                $tourQuery->where('title', 'like', "%{$keyword}%")
                    ->orWhereHas('destination', function ($destinationQuery) use ($keyword): void {
                        $destinationQuery->where('name', 'like', "%{$keyword}%")
                            ->orWhere('province_city', 'like', "%{$keyword}%");
                    });
            });
        }

        if ($request->filled('from_date')) {
            $query->whereDate('td.departure_date', '>=', $request->input('from_date'));
        }

        if ($request->filled('to_date')) {
            $query->whereDate('td.departure_date', '<=', $request->input('to_date'));
        }

        $assignments = $query
            ->orderByDesc('td.return_date')
            ->orderByDesc('td.departure_date')
            ->paginate($this->perPage($request));

        $assignments->setCollection(
            $assignments->getCollection()
                ->map(fn (TourGuideAssignment $assignment): array => $this->mapTourHistoryAssignment($assignment))
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Lich su tour da dan cua HDV.',
            'guide' => $this->mapGuide($guide),
            'data' => $assignments,
        ]);
    }

    private function mapReviewableBooking(Booking $booking, Request $request): array
    {
        $tour = $booking->tour;
        $departure = $booking->tourDeparture;
        $reviews = $booking->relationLoaded('reviews') ? $booking->reviews : collect();
        $assignments = $departure?->relationLoaded('guideAssignments')
            ? $departure->guideAssignments
            : collect();

        return [
            'id' => $booking->id,
            'booking_code' => $booking->booking_code,
            'status' => $booking->status,
            'payment_status' => $booking->payment_status,
            'number_of_people' => (int) $booking->number_of_people,
            'total_amount' => (float) $booking->total_amount,
            'tour' => $tour ? [
                'id' => $tour->id,
                'title' => $tour->title,
                'slug' => $tour->slug,
                'summary' => $tour->summary,
                'duration_days' => $tour->duration_days,
                'duration_nights' => $tour->duration_nights,
                'average_rating' => (float) ($tour->average_rating ?? 0),
                'review_count' => (int) ($tour->review_count ?? 0),
                'destination' => $tour->destination ? [
                    'id' => $tour->destination->id,
                    'name' => $tour->destination->name,
                    'province_city' => $tour->destination->province_city,
                ] : null,
                'category' => $tour->category ? [
                    'id' => $tour->category->id,
                    'name' => $tour->category->name,
                    'slug' => $tour->category->slug,
                ] : null,
                'thumbnail_url' => $tour->thumbnail?->image_url,
            ] : null,
            'tour_departure' => $departure ? [
                'id' => $departure->id,
                'departure_date' => $departure->departure_date?->toDateString(),
                'return_date' => $departure->return_date?->toDateString(),
                'status' => $departure->status,
            ] : null,
            'guides' => $assignments
                ->map(function (TourGuideAssignment $assignment) use ($reviews, $request): array {
                    $guide = $assignment->guide;
                    $guideUser = $guide?->user;
                    $review = $guide ? $reviews->firstWhere('guide_id', $guide->id) : null;

                    return [
                        'id' => $guide?->id,
                        'guide_code' => $guide?->guide_code,
                        'full_name' => $guideUser?->full_name,
                        'email' => $guideUser?->email,
                        'phone' => $guideUser?->phone,
                        'avatar_url' => $guide?->avatar_url ?? $guideUser?->avatar_url,
                        'assignment_status' => $assignment->status,
                        'reviewed' => $review !== null,
                        'review' => $review
                            ? (new GuideReviewResource($review))->resolve($request)
                            : null,
                    ];
                })
                ->values(),
        ];
    }

    private function mapTourHistoryAssignment(TourGuideAssignment $assignment): array
    {
        $departure = $assignment->departure;
        $tour = $departure?->tour;
        $reviews = $departure?->relationLoaded('reviews') ? $departure->reviews : collect();

        return [
            'assignment_id' => $assignment->id,
            'assignment_status' => $assignment->status,
            'assignment_note' => $assignment->note,
            'tour_departure' => $departure ? [
                'id' => $departure->id,
                'departure_date' => $departure->departure_date?->toDateString(),
                'return_date' => $departure->return_date?->toDateString(),
                'status' => $departure->status,
                'total_slots' => (int) $departure->total_slots,
                'booked_slots' => (int) $departure->booked_slots,
            ] : null,
            'tour' => $tour ? [
                'id' => $tour->id,
                'title' => $tour->title,
                'slug' => $tour->slug,
                'summary' => $tour->summary,
                'duration_days' => $tour->duration_days,
                'duration_nights' => $tour->duration_nights,
                'average_rating' => (float) ($tour->average_rating ?? 0),
                'review_count' => (int) ($tour->review_count ?? 0),
                'destination' => $tour->destination ? [
                    'id' => $tour->destination->id,
                    'name' => $tour->destination->name,
                    'province_city' => $tour->destination->province_city,
                ] : null,
                'category' => $tour->category ? [
                    'id' => $tour->category->id,
                    'name' => $tour->category->name,
                    'slug' => $tour->category->slug,
                ] : null,
                'thumbnail_url' => $tour->thumbnail?->image_url,
            ] : null,
            'guide_review_summary' => [
                'average_rating' => round((float) $reviews->avg('rating'), 2),
                'review_count' => $reviews->count(),
            ],
        ];
    }

    private function mapGuide(Guide $guide): array
    {
        $guide->loadMissing('user:id,full_name,email,phone,avatar_url');

        return [
            'id' => $guide->id,
            'guide_code' => $guide->guide_code,
            'full_name' => $guide->user?->full_name,
            'email' => $guide->user?->email,
            'phone' => $guide->user?->phone,
            'avatar_url' => $guide->avatar_url ?? $guide->user?->avatar_url,
            'experience_years' => (int) $guide->experience_years,
            'average_rating' => (float) ($guide->average_rating ?? 0),
            'review_count' => (int) ($guide->review_count ?? 0),
            'status' => $guide->status,
        ];
    }

    private function perPage(Request $request): int
    {
        return min(max($request->integer('per_page', 10), 1), 50);
    }
}
