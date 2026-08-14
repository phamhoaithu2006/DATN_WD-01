<?php

namespace App\Http\Controllers\Api\Customer;

use App\Filters\TourFilter;
use App\Http\Controllers\Controller;
use App\Http\Requests\TourFilterRequest;
use App\Http\Resources\TourResource;
use App\Models\Category;
use App\Models\Province;
use App\Models\Tour;
use App\Models\TourDeparture;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class TourController extends Controller
{
    /**
     * Danh sách tour cho giao diện khách hàng.
     * Có thể dùng trực tiếp endpoint này để search/filter luôn.
     */
    public function index_gdkh(TourFilterRequest $request)
    {
        return $this->getCustomerTourList($request);
    }

    /**
     * Giữ lại endpoint search cũ để Frontend không bị lỗi.
     */
    public function search_gdkh(TourFilterRequest $request)
    {
        return $this->getCustomerTourList($request);
    }

    /**
     * Giữ lại endpoint filter cũ để Frontend không bị lỗi.
     */
    public function filter_gdkh(TourFilterRequest $request)
    {
        return $this->getCustomerTourList($request);
    }

    /**
     * Metadata cho UI bộ lọc: khoảng giá, điểm đến, danh mục, bucket thời lượng
     * kèm số tour đang mở bán cho từng lựa chọn. Cache 10 phút; admin thay đổi
     * tour sẽ xóa cache (TourManagerController).
     */
    public function filterOptions()
    {
        $options = Cache::remember(Tour::FILTER_OPTIONS_CACHE_KEY, 600, function () {
            $published = Tour::query()->where('status', 'published');

            $priceRange = (clone $published)
                ->selectRaw('MIN(COALESCE(discount_price, base_price)) as min_price')
                ->selectRaw('MAX(COALESCE(discount_price, base_price)) as max_price')
                ->first();

            $categories = Category::query()
                ->withCount(['tours as tours_count' => fn ($q) => $q->where('status', 'published')])
                ->orderBy('name')
                ->get(['id', 'name'])
                ->filter(fn ($category) => $category->tours_count > 0)
                ->map(fn ($category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'tours_count' => (int) $category->tours_count,
                ])
                ->values()
                ->all();

            $provinceCounts = (clone $published)
                ->select('province_id', DB::raw('COUNT(*) as total'))
                ->groupBy('province_id')
                ->pluck('total', 'province_id');

            $provinces = Province::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn ($province) => [
                    'id' => $province->id,
                    'name' => $province->name,
                    'tours_count' => (int) ($provinceCounts[$province->id] ?? 0),
                ])
                ->filter(fn ($province) => $province['tours_count'] > 0)
                ->values()
                ->all();

            $durationCounts = (clone $published)
                ->selectRaw('SUM(CASE WHEN duration_days BETWEEN 1 AND 3 THEN 1 ELSE 0 END) as bucket_1_3')
                ->selectRaw('SUM(CASE WHEN duration_days BETWEEN 4 AND 7 THEN 1 ELSE 0 END) as bucket_4_7')
                ->selectRaw('SUM(CASE WHEN duration_days >= 8 THEN 1 ELSE 0 END) as bucket_8_plus')
                ->first();

            $departureLocations = DB::table('tour_departures')
                ->join('tours', 'tours.id', '=', 'tour_departures.tour_id')
                ->where('tours.status', 'published')
                ->whereNull('tours.deleted_at')
                ->where('tour_departures.status', 'open')
                ->whereDate(
                    'tour_departures.departure_date',
                    '>',
                    TourDeparture::customerBookingCutoffDate()
                )
                ->whereNotNull('tour_departures.departure_location')
                ->where('tour_departures.departure_location', '!=', '')
                ->select(
                    'tour_departures.departure_location',
                    DB::raw('COUNT(DISTINCT tours.id) as tours_count')
                )
                ->groupBy('tour_departures.departure_location')
                ->orderBy('tour_departures.departure_location')
                ->get()
                ->map(fn ($location) => [
                    'name' => $location->departure_location,
                    'tours_count' => (int) $location->tours_count,
                ])
                ->values()
                ->all();

            return [
                'price' => [
                    'min' => (float) ($priceRange?->min_price ?? 0),
                    'max' => (float) ($priceRange?->max_price ?? 0),
                ],
                'departure_locations' => $departureLocations,
                'categories' => $categories,
                'provinces' => $provinces,
                // Alias cho frontend cũ; dữ liệu bên trong là tỉnh/thành.
                'destinations' => $provinces,
                'durations' => [
                    ['value' => '1-3', 'label' => '1–3 ngày', 'tours_count' => (int) ($durationCounts?->bucket_1_3 ?? 0)],
                    ['value' => '4-7', 'label' => '4–7 ngày', 'tours_count' => (int) ($durationCounts?->bucket_4_7 ?? 0)],
                    ['value' => '8+', 'label' => '8+ ngày', 'tours_count' => (int) ($durationCounts?->bucket_8_plus ?? 0)],
                ],
            ];
        });

        return response()->json(['data' => $options]);
    }

    /**
     * Chi tiết tour theo slug.
     */
    public function show_gdkh(string $slug)
    {
        $tour = $this->customerTourQuery([])
            ->where('tours.slug', $slug)
            ->withCount([
                'bookings as bookings_count' => function ($query) {
                    $query->where('status', '!=', 'cancelled');
                },
            ])
            ->firstOrFail();

        return new TourResource($tour);
    }

    /**
     * Hàm dùng chung cho index, search và filter.
     */
    private function getCustomerTourList(TourFilterRequest $request)
    {
        $filters = $request->filters();

        $query = $this->customerTourQuery($filters);

        (new TourFilter($filters))->apply($query);

        /*
         * Khi có lọc ngày, số khách hoặc giá:
         * phải đảm bảo TẤT CẢ điều kiện cùng khớp trên một tour_departure.
         */
        if ($this->hasDepartureFilters($filters)) {
            $query->whereHas('departures', function ($departureQuery) use ($filters) {
                $this->applyDepartureConditions($departureQuery, $filters);
            });
        }

        $this->applySort($query, $filters['sort']);

        $tours = $query
            ->paginate($filters['per_page'])
            ->withQueryString();

        return TourResource::collection($tours);
    }

    private function applyVisibleDepartures($query)
    {
        return $query
            ->whereIn('status', ['open', 'confirmed'])
            ->whereDate(
                'departure_date',
                '>',
                TourDeparture::customerBookingCutoffDate()
            )
            ->whereRaw('(COALESCE(total_slots, 0) - COALESCE(booked_slots, 0)) > 0');
    }

    /**
     * Query cơ bản dành cho khách hàng.
     */
    private function customerTourQuery(array $filters): Builder
    {
        return Tour::query()
            ->select('tours.*')
            ->where('tours.status', 'published')
            ->selectSub(function ($query) use ($filters) {
                $query->from('tour_departures')
                    ->selectRaw('MIN('.$this->departureSalePriceExpression().')')
                    ->whereColumn('tour_departures.tour_id', 'tours.id');

                $this->applyDepartureConditions($query, $filters, false);
            }, 'min_departure_price')
            ->selectSub(function ($query) {
                $effectiveBasePrice = 'COALESCE(tour_departures.base_price, tours.base_price)';
                $effectiveDiscountPrice = 'COALESCE(tour_departures.discount_price, tours.discount_price)';

                $query->from('tour_departures')
                    ->selectRaw(
                        "MAX(({$effectiveBasePrice} - {$effectiveDiscountPrice}) / NULLIF({$effectiveBasePrice}, 0))"
                    )
                    ->whereColumn('tour_departures.tour_id', 'tours.id');

                $this->applyVisibleDepartures($query);
                $query
                    ->whereRaw("{$effectiveDiscountPrice} > 0")
                    ->whereRaw("{$effectiveDiscountPrice} < {$effectiveBasePrice}");
            }, 'discount_rate')
            ->with([
                'category',
                'province',
                'thumbnail',
                'images',
                'itineraries.images',
                'itineraries.destinationPlace.province',
                'itineraries.destinationPlace.district.province',
                'itineraries.destinationPlace.activityTypeLinks',

                'agePricingRules' => function ($query) {
                    $query->where('is_active', true)
                        ->orderBy('sort_order');
                },

                'departures' => function ($query) {
                    $this->applyVisibleDepartures($query);

                    $query->select([
                        'id',
                        'tour_id',
                        'departure_date',
                        'return_date',
                        'departure_location',
                        'price',
                        'base_price',
                        'discount_price',
                        'total_slots',
                        'booked_slots',
                        'status',
                        'current_stage_id',
                    ])
                        ->selectRaw('(total_slots - booked_slots) as available_slots')
                        ->orderBy('departure_date');
                },
            ])

            // Giá thấp nhất của các lịch khởi hành còn mở.
            ->withMin([
                'departures as legacy_min_departure_price' => function ($query) use ($filters) {
                    $this->applyDepartureConditions($query, $filters);
                },
            ], 'price')

            // Ngày khởi hành gần nhất.
            ->withMin([
                'departures as next_departure_date' => function ($query) use ($filters) {
                    $this->applyDepartureConditions($query, $filters);
                },
            ], 'departure_date')

            // Số lịch khởi hành còn có thể đặt.
            ->withCount([
                'departures as available_departures_count' => function ($query) use ($filters) {
                    $this->applyDepartureConditions($query, $filters);
                },
            ]);
    }

    /**
     * Điều kiện chung của một lịch khởi hành được phép hiển thị/đặt.
     */
    private function applyDepartureConditions($query, array $filters, bool $includePriceFilters = true)
    {
        $this->applyVisibleDepartures($query);

        if (! empty($filters['departure_date'])) {
            $query->whereDate('departure_date', $filters['departure_date']);
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('departure_date', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('departure_date', '<=', $filters['date_to']);
        }

        if (! empty($filters['departure_location'])) {
            $query->where(
                'departure_location',
                'like',
                '%'.$filters['departure_location'].'%'
            );
        }

        if (! empty($filters['guests'])) {
            $query->whereRaw(
                '(COALESCE(total_slots, 0) - COALESCE(booked_slots, 0)) >= ?',
                [$filters['guests']]
            );
        }

        if ($includePriceFilters && ($filters['min_price'] ?? null) !== null) {
            $query->whereRaw($this->departureSalePriceExpression().' >= ?', [$filters['min_price']]);
        }

        if ($includePriceFilters && ($filters['max_price'] ?? null) !== null) {
            $query->whereRaw($this->departureSalePriceExpression().' <= ?', [$filters['max_price']]);
        }

        return $query;
    }

    private function departureSalePriceExpression(): string
    {
        return 'CASE
            WHEN tour_departures.base_price IS NOT NULL
                THEN COALESCE(tour_departures.discount_price, tour_departures.base_price)
            WHEN tour_departures.price IS NOT NULL
                THEN tour_departures.price
            ELSE COALESCE(tours.discount_price, tours.base_price)
        END';
    }

    private function hasDepartureFilters(array $filters): bool
    {
        return ! empty($filters['departure_date'])
            || ! empty($filters['date_from'])
            || ! empty($filters['date_to'])
            || ! empty($filters['departure_location'])
            || ! empty($filters['guests'])
            || $filters['min_price'] !== null
            || $filters['max_price'] !== null;
    }

    private function applySort(Builder $query, string $sort): void
    {
        switch ($sort) {
            case 'discount':
                $query
                    ->where(function (Builder $discountQuery) {
                        $discountQuery
                            ->where(function (Builder $tourDiscountQuery) {
                                $tourDiscountQuery
                                    ->whereNotNull('tours.discount_price')
                                    ->where('tours.discount_price', '>', 0)
                                    ->whereColumn('tours.discount_price', '<', 'tours.base_price');
                            })
                            ->orWhereHas('departures', function ($departureQuery) {
                                $effectiveBasePrice = 'COALESCE(tour_departures.base_price, tours.base_price)';
                                $effectiveDiscountPrice = 'COALESCE(tour_departures.discount_price, tours.discount_price)';

                                $this->applyVisibleDepartures($departureQuery);
                                $departureQuery
                                    ->whereRaw("{$effectiveDiscountPrice} > 0")
                                    ->whereRaw("{$effectiveDiscountPrice} < {$effectiveBasePrice}");
                            });
                    })
                    ->orderByDesc('discount_rate')
                    ->orderByDesc('tours.id');
                break;

            case 'price_asc':
                $query->orderByRaw('min_departure_price IS NULL, min_departure_price ASC');
                break;

            case 'price_desc':
                $query->orderByRaw('min_departure_price IS NULL, min_departure_price DESC');
                break;

            case 'departure_soon':
                $query->orderByRaw('next_departure_date IS NULL, next_departure_date ASC');
                break;

            case 'rating_desc':
                $query->orderByDesc('tours.average_rating')
                    ->orderByDesc('tours.review_count');
                break;

            case 'duration_asc':
                $query->orderBy('tours.duration_days');
                break;

            case 'duration_desc':
                $query->orderByDesc('tours.duration_days');
                break;

            case 'popular':
                $query->orderByDesc('tours.review_count')
                    ->orderByDesc('tours.average_rating');
                break;

            default:
                $query->orderByDesc('tours.id');
                break;
        }
    }
}
