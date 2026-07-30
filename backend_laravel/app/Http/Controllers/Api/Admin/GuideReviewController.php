<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateGuideReviewStatusRequest;
use App\Http\Resources\AdminGuideReviewResource;
use App\Models\Review;
use App\Services\GuideReviewService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class GuideReviewController extends Controller
{
    public function __construct(
        private readonly GuideReviewService $guideReviewService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(Review::STATUSES)],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'guide_id' => ['nullable', 'integer', 'exists:guides,id'],
            'tour_id' => ['nullable', 'integer', 'exists:tours,id'],
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date', 'after_or_equal:from_date'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $reviews = $this->guideReviewsQuery()
            ->when($validated['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($validated['rating'] ?? null, fn (Builder $query, int $rating) => $query->where('rating', $rating))
            ->when($validated['guide_id'] ?? null, fn (Builder $query, int $guideId) => $query->where('guide_id', $guideId))
            ->when($validated['tour_id'] ?? null, fn (Builder $query, int $tourId) => $query->where('tour_id', $tourId))
            ->when($validated['from_date'] ?? null, fn (Builder $query, string $date) => $query->whereDate('created_at', '>=', $date))
            ->when($validated['to_date'] ?? null, fn (Builder $query, string $date) => $query->whereDate('created_at', '<=', $date))
            ->when($validated['search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $searchQuery) use ($search): void {
                    $searchQuery
                        ->where('comment', 'like', "%{$search}%")
                        ->orWhereHas('user', fn (Builder $userQuery) => $userQuery
                            ->where('full_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%"))
                        ->orWhereHas('guide', fn (Builder $guideQuery) => $guideQuery
                            ->where('guide_code', 'like', "%{$search}%")
                            ->orWhereHas('user', fn (Builder $guideUserQuery) => $guideUserQuery
                                ->where('full_name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%")))
                        ->orWhereHas('tour', fn (Builder $tourQuery) => $tourQuery
                            ->where('title', 'like', "%{$search}%"))
                        ->orWhereHas('booking', fn (Builder $bookingQuery) => $bookingQuery
                            ->where('booking_code', 'like', "%{$search}%"));
                });
            })
            ->latest('created_at')
            ->latest('id')
            ->paginate($validated['per_page'] ?? 15);

        $reviews->setCollection(
            $reviews->getCollection()
                ->map(fn (Review $review): array => (new AdminGuideReviewResource($review))->resolve($request))
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách đánh giá HDV thành công.',
            'summary' => $this->adminSummary(),
            'data' => $reviews,
        ]);
    }

    public function show(int $review): JsonResponse
    {
        $guideReview = $this->guideReviewsQuery()->findOrFail($review);

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy chi tiết đánh giá HDV thành công.',
            'data' => new AdminGuideReviewResource($guideReview),
        ]);
    }

    public function updateStatus(UpdateGuideReviewStatusRequest $request, int $review): JsonResponse
    {
        $guideReview = DB::transaction(function () use ($request, $review): Review {
            $guideReview = Review::query()
                ->whereNotNull('guide_id')
                ->lockForUpdate()
                ->findOrFail($review);

            $guideReview->update([
                'status' => $request->validated('status'),
            ]);

            $this->guideReviewService->refreshGuideRating((int) $guideReview->guide_id);

            return $guideReview->load($this->relations());
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật trạng thái đánh giá HDV thành công.',
            'data' => new AdminGuideReviewResource($guideReview),
        ]);
    }

    private function guideReviewsQuery(): Builder
    {
        return Review::query()
            ->whereNotNull('guide_id')
            ->with($this->relations());
    }

    /**
     * @return array<int, string>
     */
    private function relations(): array
    {
        return [
            'user:id,full_name,email',
            'guide:id,user_id,guide_code,avatar_url,average_rating,review_count,status',
            'guide.user:id,full_name,email,phone,avatar_url',
            'tour:id,title,slug',
            'booking:id,booking_code,status',
            'tourDeparture:id,departure_date,return_date,status',
        ];
    }

    /**
     * @return array{total: int, visible: int, hidden: int, spam: int, average_rating: float}
     */
    private function adminSummary(): array
    {
        $summary = Review::query()
            ->whereNotNull('guide_id')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN status = 'visible' THEN 1 ELSE 0 END) as visible")
            ->selectRaw("SUM(CASE WHEN status = 'hidden' THEN 1 ELSE 0 END) as hidden")
            ->selectRaw("SUM(CASE WHEN status = 'spam' THEN 1 ELSE 0 END) as spam")
            ->selectRaw("COALESCE(AVG(CASE WHEN status = 'visible' THEN rating END), 0) as average_rating")
            ->first();

        return [
            'total' => (int) ($summary?->total ?? 0),
            'visible' => (int) ($summary?->visible ?? 0),
            'hidden' => (int) ($summary?->hidden ?? 0),
            'spam' => (int) ($summary?->spam ?? 0),
            'average_rating' => round((float) ($summary?->average_rating ?? 0), 2),
        ];
    }
}
