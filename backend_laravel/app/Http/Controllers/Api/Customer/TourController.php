<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Resources\TourResource;
use App\Models\Tour;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class TourController extends Controller
{
    /**
     * Danh sách tour cho giao diện khách hàng.
     * Có thể dùng trực tiếp endpoint này để search/filter luôn.
     */
    public function index_gdkh(Request $request)
    {
        return $this->getCustomerTourList($request);
    }

    /**
     * Giữ lại endpoint search cũ để Frontend không bị lỗi.
     */
    public function search_gdkh(Request $request)
    {
        return $this->getCustomerTourList($request);
    }

    /**
     * Giữ lại endpoint filter cũ để Frontend không bị lỗi.
     */
    public function filter_gdkh(Request $request)
    {
        return $this->getCustomerTourList($request);
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
    private function getCustomerTourList(Request $request)
    {
        $filters = $this->validateFilters($request);

        $query = $this->customerTourQuery($filters);

        $this->applyTourFilters($query, $filters);

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
            ->where('status', 'open')
            ->whereDate('departure_date', '>=', today());
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
                    ->selectRaw('MIN(' . $this->departureSalePriceExpression() . ')')
                    ->whereColumn('tour_departures.tour_id', 'tours.id');

                $this->applyDepartureConditions($query, $filters, false);
            }, 'min_departure_price')
            ->with([
                'category',
                'destination',
                'destinations',
                'thumbnail',
                'images',
                'itineraries.images',

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

        if (!empty($filters['departure_date'])) {
            $query->whereDate('departure_date', $filters['departure_date']);
        }

        if (!empty($filters['guests'])) {
            $query->whereRaw(
                '(COALESCE(total_slots, 0) - COALESCE(booked_slots, 0)) >= ?',
                [$filters['guests']]
            );
        }

        if ($includePriceFilters && ($filters['min_price'] ?? null) !== null) {
            $query->whereRaw($this->departureSalePriceExpression() . ' >= ?', [$filters['min_price']]);
        }

        if ($includePriceFilters && ($filters['max_price'] ?? null) !== null) {
            $query->whereRaw($this->departureSalePriceExpression() . ' <= ?', [$filters['max_price']]);
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

    /**
     * Lọc các thông tin nằm trong bảng tours.
     */
    private function applyTourFilters(Builder $query, array $filters): void
    {
        if (!empty($filters['keyword'])) {
            $keyword = '%' . $filters['keyword'] . '%';

            $query->where(function (Builder $subQuery) use ($keyword) {
                $subQuery
                    ->where('tours.title', 'like', $keyword)
                    ->orWhere('tours.summary', 'like', $keyword)
                    ->orWhere('tours.description', 'like', $keyword)
                    ->orWhereHas('category', function (Builder $categoryQuery) use ($keyword) {
                        $categoryQuery->where('name', 'like', $keyword);
                    })
                    ->orWhereHas('destination', function (Builder $destinationQuery) use ($keyword) {
                        $destinationQuery->where('name', 'like', $keyword);
                    })
                    ->orWhereHas('destinations', function (Builder $destinationQuery) use ($keyword) {
                        $destinationQuery->where('name', 'like', $keyword);
                    });
            });
        }

        if (!empty($filters['category_id'])) {
            $query->where('tours.category_id', $filters['category_id']);
        }

        /*
         * Hỗ trợ cả destination_id cũ trong bảng tours
         * và bảng tour_destinations mới.
         */
        if (!empty($filters['destination_id'])) {
            $destinationId = $filters['destination_id'];

            $query->where(function (Builder $subQuery) use ($destinationId) {
                $subQuery
                    ->where('tours.destination_id', $destinationId)
                    ->orWhereHas('destinations', function (Builder $destinationQuery) use ($destinationId) {
                        $destinationQuery->whereKey($destinationId);
                    });
            });
        }

        if (!empty($filters['duration_days'])) {
            $query->where('tours.duration_days', $filters['duration_days']);
        }
    }

    private function hasDepartureFilters(array $filters): bool
    {
        return !empty($filters['departure_date'])
            || !empty($filters['guests'])
            || $filters['min_price'] !== null
            || $filters['max_price'] !== null;
    }

    private function applySort(Builder $query, string $sort): void
    {
        switch ($sort) {
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

            default:
                $query->orderByDesc('tours.id');
                break;
        }
    }

    private function validateFilters(Request $request): array
    {
        $data = $request->validate([
            'keyword' => ['nullable', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', 'min:1'],
            'destination_id' => ['nullable', 'integer', 'min:1'],

            // API mới nên dùng departure_date.
            // start_date giữ lại để Frontend cũ vẫn chạy.
            'departure_date' => ['nullable', 'date'],
            'start_date' => ['nullable', 'date'],

            'guests' => ['nullable', 'integer', 'min:1'],
            'min_slots' => ['nullable', 'integer', 'min:1'],

            'min_price' => ['nullable', 'numeric', 'min:0'],
            'max_price' => ['nullable', 'numeric', 'min:0'],

            'duration_days' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],

            'sort' => [
                'nullable',
                'in:latest,price_asc,price_desc,departure_soon,rating_desc,duration_asc,duration_desc',
            ],
        ]);

        return [
            'keyword' => isset($data['keyword']) ? trim($data['keyword']) : null,
            'category_id' => $data['category_id'] ?? null,
            'destination_id' => $data['destination_id'] ?? null,

            'departure_date' => $data['departure_date'] ?? $data['start_date'] ?? null,
            'guests' => $data['guests'] ?? $data['min_slots'] ?? null,

            'min_price' => $data['min_price'] ?? null,
            'max_price' => $data['max_price'] ?? null,

            'duration_days' => $data['duration_days'] ?? null,
            'per_page' => (int) ($data['per_page'] ?? 12),
            'sort' => $data['sort'] ?? 'latest',
        ];
    }
}
