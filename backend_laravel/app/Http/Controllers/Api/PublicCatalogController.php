<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TourResource;
use App\Models\Category;
use App\Models\Province;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\TourReview;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
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
            ->limit(5)
            ->get(['id', 'name', 'slug', 'description', 'thumbnail_url']);

        $destinationProvinces = Province::query()
            ->whereHas('tours', fn (Builder $query) => $this->applyAvailableTourConstraints($query))
            ->withCount([
                'tours as tour_count' => fn (Builder $query) => $this->applyAvailableTourConstraints($query),
            ])
            ->orderByDesc('tour_count')
            ->orderBy('name')
            ->limit(6)
            ->get(['id', 'name', 'code']);

        $destinationImages = $this->destinationImages($destinationProvinces);

        $destinations = $destinationProvinces
            ->map(fn (Province $province): array => [
                'id' => $province->id,
                'name' => $province->name,
                'slug' => $province->slug,
                'province_city' => $province->name,
                'country' => 'Việt Nam',
                'thumbnail_url' => $destinationImages->get($province->id)?->thumbnail_url,
                'thumbnail_alt_text' => $destinationImages->get($province->id)?->alt_text
                    ?: 'Ảnh điểm đến '.$province->name,
                'place_name' => $destinationImages->get($province->id)?->place_name,
                'tour_count' => (int) $province->tour_count,
            ])
            ->values();

        $featuredTours = $this->availableToursQuery()
            ->with([
                'category:id,name,slug',
                'province:id,name,code',
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
            ->orderByDesc('tours.created_at')
            ->orderByDesc('tours.id')
            ->limit(6)
            ->get();

        $reviews = TourReview::query()
            ->visible()
            ->whereHas('tour', fn (Builder $query) => $query->where('status', 'published'))
            ->where('rating', '>=', 4)
            ->whereNotNull('comment')
            ->where('comment', '!=', '')
            ->with([
                'tour:id,title,slug',
                'user:id,full_name,avatar_url',
            ])
            ->latest('created_at')
            ->get()
            ->map(fn (TourReview $review): array => [
                'id' => $review->id,
                'rating' => (int) $review->rating,
                'comment' => trim((string) $review->comment),
                'reviewer_name' => $this->maskReviewerName($review->user?->full_name),
                'reviewer_avatar_url' => $review->user?->avatar_url,
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
        $availableDestinations = Province::query()
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

    public function destinations(Request $request): JsonResponse
    {
        $query = Province::query();

        if ($request->boolean('with_tours')) {
            $query->whereHas('tours', fn (Builder $q) => $this->applyAvailableTourConstraints($q));
        }

        $destinations = $query
            ->orderBy('name')
            ->get(['id', 'name', 'code'])
            ->map(fn (Province $province): array => [
                'id' => $province->id,
                'name' => $province->name,
                'slug' => $province->slug,
                'province_city' => $province->name,
                'country' => 'Việt Nam',
                'thumbnail_url' => null,
                'status' => 'active',
            ])
            ->values();

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

    private function destinationImages(Collection $provinces): Collection
    {
        $provinceIds = $provinces
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        if ($provinceIds === []) {
            return collect();
        }

        $itineraryImages = DB::table('tour_itinerary_images as candidate_image')
            ->join('tour_itineraries as itinerary', 'itinerary.id', '=', 'candidate_image.tour_itinerary_id')
            ->join('destination_places as place', 'place.id', '=', 'itinerary.destination_place_id')
            ->join('tours as candidate_tour', 'candidate_tour.id', '=', 'itinerary.tour_id')
            ->whereIn('place.province_id', $provinceIds)
            ->where('place.status', 'active')
            ->whereNull('place.deleted_at')
            ->whereNotNull('candidate_image.image_url')
            ->where('candidate_image.image_url', '!=', '')
            ->select([
                'place.province_id as province_id',
                'candidate_image.image_url as thumbnail_url',
                'candidate_image.alt_text as alt_text',
                'place.name as place_name',
                DB::raw('1 as source_priority'),
            ]);
        $this->applyAvailableImageTourConstraints($itineraryImages, 'candidate_tour');

        $placeImages = DB::table('tour_itineraries as itinerary')
            ->join('destination_places as place', 'place.id', '=', 'itinerary.destination_place_id')
            ->join('tours as candidate_tour', 'candidate_tour.id', '=', 'itinerary.tour_id')
            ->whereIn('place.province_id', $provinceIds)
            ->where('place.status', 'active')
            ->whereNull('place.deleted_at')
            ->whereNotNull('place.thumbnail_url')
            ->where('place.thumbnail_url', '!=', '')
            ->select([
                'place.province_id as province_id',
                'place.thumbnail_url as thumbnail_url',
                DB::raw('NULL as alt_text'),
                'place.name as place_name',
                DB::raw('2 as source_priority'),
            ]);
        $this->applyAvailableImageTourConstraints($placeImages, 'candidate_tour');

        $tourImages = DB::table('tour_images as candidate_image')
            ->join('tours as candidate_tour', 'candidate_tour.id', '=', 'candidate_image.tour_id')
            ->whereIn('candidate_tour.province_id', $provinceIds)
            ->whereNotNull('candidate_image.image_url')
            ->where('candidate_image.image_url', '!=', '')
            ->select([
                'candidate_tour.province_id as province_id',
                'candidate_image.image_url as thumbnail_url',
                'candidate_image.alt_text as alt_text',
                DB::raw('NULL as place_name'),
                DB::raw('3 as source_priority'),
            ]);
        $this->applyAvailableImageTourConstraints($tourImages, 'candidate_tour');

        return $itineraryImages
            ->unionAll($placeImages)
            ->unionAll($tourImages)
            ->get()
            ->groupBy(fn ($image) => (int) $image->province_id)
            ->map(function (Collection $images) {
                $priority = (int) $images->min('source_priority');

                return $images
                    ->filter(fn ($image) => (int) $image->source_priority === $priority)
                    ->random();
            });
    }

    private function applyAvailableImageTourConstraints(QueryBuilder $query, string $tourAlias): void
    {
        $query
            ->where($tourAlias.'.status', 'published')
            ->whereNull($tourAlias.'.deleted_at')
            ->whereExists(function (QueryBuilder $departureQuery) use ($tourAlias): void {
                $departureQuery
                    ->selectRaw('1')
                    ->from('tour_departures')
                    ->whereColumn('tour_departures.tour_id', $tourAlias.'.id');

                $this->applyAvailableDepartureConstraints($departureQuery);
            });
    }

    private function applyAvailableDepartureConstraints(Builder|HasMany|QueryBuilder $query): Builder|HasMany|QueryBuilder
    {
        return $query
            ->where('status', 'open')
            ->whereDate('departure_date', '>', TourDeparture::customerBookingCutoffDate())
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
