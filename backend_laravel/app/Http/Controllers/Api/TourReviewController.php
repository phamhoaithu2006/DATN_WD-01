<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicTourReviewResource;
use App\Models\Tour;
use App\Models\TourReview;
use App\Services\TourReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TourReviewController extends Controller
{
    public function __construct(
        private readonly TourReviewService $tourReviewService
    ) {}

    public function index(Request $request, string $slug): JsonResponse
    {
        $validated = $request->validate([
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'sort' => ['nullable', Rule::in(['newest', 'oldest', 'highest', 'lowest'])],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:50'],
        ]);

        $tour = Tour::query()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->firstOrFail();

        $query = TourReview::query()
            ->visible()
            ->where('tour_id', $tour->id)
            ->with(['user:id,full_name', 'tour:id,title,slug'])
            ->when(
                isset($validated['rating']),
                fn ($reviewQuery) => $reviewQuery->where('rating', $validated['rating'])
            );

        match ($validated['sort'] ?? 'newest') {
            'oldest' => $query->oldest('created_at')->oldest('id'),
            'highest' => $query->orderByDesc('rating')->latest('id'),
            'lowest' => $query->orderBy('rating')->latest('id'),
            default => $query->latest('created_at')->latest('id'),
        };

        $reviews = $query->paginate($validated['per_page'] ?? 10);
        $reviews->setCollection(
            $reviews->getCollection()
                ->map(fn (TourReview $review): array => (new PublicTourReviewResource($review))->resolve($request))
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách đánh giá tour thành công.',
            'summary' => $this->tourReviewService->summaryForTour($tour->id),
            'data' => $reviews,
        ]);
    }
}
