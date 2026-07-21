<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TourResource;
use App\Models\Category;
use App\Models\Destination;
use App\Models\Tour;
use App\Models\TourReview;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PublicCatalogController extends Controller
{
    public function home(Request $request): JsonResponse
    {
        $categories = Category::query()
            ->where('status', 'active')
            ->whereHas('tours', fn (Builder $query) => $this->applyAvailableTourConstraints($query))
            ->withCount([
                'tours as tour_count' => fn (Builder $query) => $this->applyAvailableTourConstraints($query),
            ])
            ->orderByDesc('tour_count')
            ->orderBy('name')
            ->limit(6)
            ->get(['id', 'name', 'slug', 'description', 'thumbnail_url']);

        $destinations = Destination::query()
            ->where('status', 'active')
            ->whereHas('tours', fn (Builder $query) => $this->applyAvailableTourConstraints($query))
            ->withCount([
                'tours as tour_count' => fn (Builder $query) => $this->applyAvailableTourConstraints($query),
            ])
            ->orderByDesc('tour_count')
            ->orderBy('name')
            ->limit(6)
            ->get(['id', 'name', 'slug', 'province_city', 'country', 'thumbnail_url']);

        $featuredTours = $this->availableToursQuery()
            ->with([
                'category:id,name,slug',
                'destination:id,name,slug,province_city,country,description,thumbnail_url,status',
                'thumbnail:id,tour_id,image_url,alt_text,is_thumbnail,sort_order',
                'departures' => fn (Builder|HasMany $query) => $this->applyAvailableDepartureConstraints($query)
                    ->select([
                        'id',
                        'tour_id',
                        'departure_date',
                        'return_date',
                        'price',
                        'base_price',
                        'discount_price',
                        'total_slots',
                        'booked_slots',
                        'status',
                        'current_stage_id',
                    ])
                    ->orderBy('departure_date'),
            ])
            ->withCount([
                'bookings as bookings_count' => fn (Builder $query) => $query->where('status', '!=', 'cancelled'),
            ])
            ->withMin([
                'departures as next_departure_date' => fn (Builder|HasMany $query) => $this->applyAvailableDepartureConstraints($query),
            ], 'departure_date')
            ->orderByDesc('average_rating')
            ->orderByDesc('review_count')
            ->orderByDesc('bookings_count')
            ->orderBy('next_departure_date')
            ->limit(6)
            ->get();

        $reviews = TourReview::query()
            ->visible()
            ->whereHas('tour', fn (Builder $query) => $query->where('status', 'published'))
            ->whereNotNull('comment')
            ->where('comment', '!=', '')
            ->with([
                'tour:id,title,slug',
                'user:id,full_name',
            ])
            ->latest('created_at')
            ->limit(3)
            ->get()
            ->map(fn (TourReview $review): array => [
                'id' => $review->id,
                'rating' => (int) $review->rating,
                'comment' => trim((string) $review->comment),
                'reviewer_name' => $this->maskReviewerName($review->user?->full_name),
                'tour_title' => $review->tour?->title,
                'tour_slug' => $review->tour?->slug,
                'created_at' => $review->created_at?->toDateString(),
            ])
            ->values();

        $availableTours = $this->availableToursQuery()->count();
        $availableCategories = Category::query()
            ->where('status', 'active')
            ->whereHas('tours', fn (Builder $query) => $this->applyAvailableTourConstraints($query))
            ->count();
        $availableDestinations = Destination::query()
            ->where('status', 'active')
            ->whereHas('tours', fn (Builder $query) => $this->applyAvailableTourConstraints($query))
            ->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'statistics' => [
                    'available_tours' => $availableTours,
                    'categories' => $availableCategories,
                    'destinations' => $availableDestinations,
                ],
                'featured_tours' => TourResource::collection($featuredTours)->resolve($request),
                'categories' => $categories,
                'destinations' => $destinations,
                'reviews' => $reviews,
            ],
        ]);
    }

    public function categories(): JsonResponse
    {
        $categories = Category::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'description', 'status']);

        return response()->json([
            'status' => 'success',
            'data' => $categories,
        ]);
    }

    public function destinations(): JsonResponse
    {
        $destinations = Destination::query()
            ->where('status', 'active')
            ->orderBy('country')
            ->orderBy('province_city')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'slug',
                'province_city',
                'country',
                'thumbnail_url',
                'status',
            ]);

        return response()->json([
            'status' => 'success',
            'data' => $destinations,
        ]);
    }

    private function availableToursQuery(): Builder
    {
        return Tour::query()
            ->where('status', 'published')
            ->whereHas('departures', fn (Builder $query) => $this->applyAvailableDepartureConstraints($query));
    }

    private function applyAvailableTourConstraints(Builder $query): void
    {
        $query->where('status', 'published')
            ->whereHas('departures', fn (Builder $departureQuery) => $this->applyAvailableDepartureConstraints($departureQuery));
    }

    private function applyAvailableDepartureConstraints(Builder|HasMany $query): Builder|HasMany
    {
        return $query
            ->where('status', 'open')
            ->whereDate('departure_date', '>=', today())
            ->whereRaw('(COALESCE(total_slots, 0) - COALESCE(booked_slots, 0)) > 0');
    }

    private function maskReviewerName(?string $fullName): string
    {
        $parts = preg_split('/\s+/u', trim((string) $fullName), -1, PREG_SPLIT_NO_EMPTY);

        if (! $parts) {
            return 'Khách hàng ViVuGo';
        }

        if (count($parts) === 1) {
            return Str::substr($parts[0], 0, 1).'.';
        }

        return collect($parts)
            ->map(fn (string $part): string => Str::substr($part, 0, 1).'.')
            ->implode(' ');
    }
}
