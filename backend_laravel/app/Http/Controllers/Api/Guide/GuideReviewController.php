<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Http\Resources\GuideReviewResource;
use App\Models\Guide;
use App\Models\Review;
use App\Models\TourGuideAssignment;
use App\Services\GuideReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuideReviewController extends Controller
{
    public function __construct(
        private readonly GuideReviewService $guideReviewService
    ) {}

    public function reviews(Request $request): JsonResponse
    {
        $guide = $this->getGuide($request);

        if (! $guide) {
            return $this->emptyGuideResponse('Tai khoan chua co ho so HDV.', []);
        }

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
            'message' => 'Danh sach danh gia cua HDV.',
            'summary' => $this->guideReviewService->guideRatingSummary($guide),
            'data' => $reviews,
        ]);
    }

    public function tourHistory(Request $request): JsonResponse
    {
        $guide = $this->getGuide($request);

        if (! $guide) {
            return $this->emptyGuideResponse('Tai khoan chua co ho so HDV.', []);
        }

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

    private function getGuide(Request $request): ?Guide
    {
        return Guide::query()
            ->with('user:id,full_name,email,phone,avatar_url')
            ->where('user_id', $request->user()->id)
            ->first();
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

    private function emptyGuideResponse(string $message, array $data): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'message' => $message,
            'data' => $data,
        ]);
    }

    private function perPage(Request $request): int
    {
        return min(max($request->integer('per_page', 10), 1), 50);
    }
}
