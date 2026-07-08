<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\TourDeparture;
use App\Services\TourPricingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GuideDashboardController extends Controller
{
    private function getGuide(Request $request): ?Guide
    {
        return Guide::with(['user:id,role_id,full_name,email,phone,avatar_url,status'])
            ->where('user_id', $request->user()->id)
            ->first();
    }

    private function departureBaseQuery(Guide $guide)
    {
        return TourDeparture::query()
            ->join('tour_guide_assignments as tga', 'tga.tour_departure_id', '=', 'tour_departures.id')
            ->where('tga.guide_id', $guide->id)
            ->where('tga.status', '!=', 'cancelled')
            ->with([
                'tour:id,title,slug,summary,duration_days,duration_nights,base_price,discount_price,average_rating,review_count,destination_id,category_id',
                'tour.destination:id,name,province_city',
                'tour.category:id,name,slug',
                'tour.thumbnail:id,tour_id,image_url,alt_text,is_thumbnail',
            ])
            ->addSelect([
                'tour_departures.*',
                'tga.status as assignment_status',
                DB::raw('COALESCE(tga.notes, tga.note) as assignment_note'),
            ]);
    }

    private function assignmentOverviewQuery(Guide $guide)
    {
        return DB::table('tour_departures')
            ->join('tour_guide_assignments as tga', 'tga.tour_departure_id', '=', 'tour_departures.id')
            ->where('tga.guide_id', $guide->id)
            ->distinct('tour_departures.id');
    }

    private function bookedIncomeQuery(Guide $guide)
    {
        return DB::table('bookings')
            ->join('tour_departures', 'bookings.tour_departure_id', '=', 'tour_departures.id')
            ->join('tour_guide_assignments as tga', 'tga.tour_departure_id', '=', 'tour_departures.id')
            ->where('tga.guide_id', $guide->id)
            ->where('tga.status', '!=', 'cancelled')
            ->where('bookings.status', '!=', 'cancelled')
            ->where('bookings.payment_status', 'paid');
    }

    private function mapDeparture(TourDeparture $departure): array
    {
        $tour = $departure->tour;
        $totalSlots = (int) ($departure->total_slots ?? 0);
        $bookedSlots = (int) ($departure->booked_slots ?? 0);
        $pricingService = new TourPricingService();
        $basePrice = $tour ? $pricingService->resolveBasePrice($tour, $departure) : 0;
        $discountPrice = $tour ? $pricingService->resolveDiscountPrice($tour, $departure) : null;

        return [
            'id' => $departure->id,
            'departure_date' => optional($departure->departure_date)->toDateString(),
            'return_date' => optional($departure->return_date)->toDateString(),
            'base_price' => $basePrice,
            'discount_price' => $discountPrice,
            'price' => $discountPrice ?? $basePrice,
            'total_slots' => $totalSlots,
            'booked_slots' => $bookedSlots,
            'available_slots' => max($totalSlots - $bookedSlots, 0),
            'fill_rate' => $totalSlots > 0 ? round(($bookedSlots / $totalSlots) * 100, 1) : 0,
            'status' => $departure->status,
            'assignment_status' => $departure->assignment_status,
            'assignment_note' => $departure->assignment_note,
            'tour' => $tour ? [
                'id' => $tour->id,
                'title' => $tour->title,
                'slug' => $tour->slug,
                'summary' => $tour->summary,
                'duration_days' => $tour->duration_days,
                'duration_nights' => $tour->duration_nights,
                'base_price' => (float) ($tour->base_price ?? 0),
                'discount_price' => (float) ($tour->discount_price ?? 0),
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
                'thumbnail_alt' => $tour->thumbnail?->alt_text,
            ] : null,
        ];
    }

    private function countTourDepartures(Guide $guide, int $year, ?int $month = null): int
    {
        $query = DB::table('tour_departures')
            ->join('tour_guide_assignments as tga', 'tga.tour_departure_id', '=', 'tour_departures.id')
            ->where('tga.guide_id', $guide->id)
            ->where('tga.status', '!=', 'cancelled')
            ->whereYear('tour_departures.departure_date', $year);

        if ($month !== null) {
            $query->whereMonth('tour_departures.departure_date', $month);
        }

        return (int) $query->distinct('tour_departures.id')->count('tour_departures.id');
    }

    private function countCustomers(Guide $guide, int $year, ?int $month = null): int
    {
        $query = $this->bookedIncomeQuery($guide)
            ->whereYear('tour_departures.departure_date', $year);

        if ($month !== null) {
            $query->whereMonth('tour_departures.departure_date', $month);
        }

        return (int) $query->sum('bookings.number_of_people');
    }

    private function buildIncomeRows(Guide $guide, int $year, int $currentMonth): array
    {
        $rows = $this->bookedIncomeQuery($guide)
            ->whereYear('bookings.created_at', $year)
            ->selectRaw('MONTH(bookings.created_at) as month_number')
            ->selectRaw('SUM(bookings.total_amount) as revenue')
            ->selectRaw('SUM(bookings.number_of_people) as guests')
            ->selectRaw('COUNT(bookings.id) as booking_count')
            ->groupByRaw('MONTH(bookings.created_at)')
            ->get()
            ->keyBy('month_number');

        $items = [];
        $monthLimit = min(max($currentMonth, 1), 12);
        $startMonth = max($monthLimit - 5, 1);

        for ($month = $startMonth; $month <= $monthLimit; $month++) {
            $row = $rows->get($month);
            $previousRow = $rows->get($month - 1);
            $revenue = (float) ($row->revenue ?? 0);
            $previousRevenue = (float) ($previousRow->revenue ?? 0);
            $change = $previousRevenue > 0
                ? round((($revenue - $previousRevenue) / $previousRevenue) * 100, 1)
                : null;

            $items[] = [
                'month_number' => $month,
                'label' => 'Tháng ' . $month,
                'revenue' => $revenue,
                'guests' => (int) ($row->guests ?? 0),
                'booking_count' => (int) ($row->booking_count ?? 0),
                'change_percent' => $change,
                'trend' => $change === null ? 'flat' : ($change >= 0 ? 'up' : 'down'),
                'note' => $row ? 'Doanh thu theo booking đã thanh toán' : 'Chưa có giao dịch',
            ];
        }

        return $items;
    }

    private function buildTourOverview(Guide $guide, Carbon $today): array
    {
        $allQuery = $this->assignmentOverviewQuery($guide);
        $nonCancelledQuery = (clone $allQuery)
            ->where('tga.status', '!=', 'cancelled')
            ->where(function ($query) {
                $query->whereNull('tour_departures.status')
                    ->orWhere('tour_departures.status', '!=', 'cancelled');
            });

        $cancelledQuery = (clone $allQuery)
            ->where(function ($query) {
                $query->where('tga.status', 'cancelled')
                    ->orWhere('tour_departures.status', 'cancelled');
            });

        $completedQuery = (clone $nonCancelledQuery)
            ->where(function ($query) use ($today) {
                $query->where('tour_departures.status', 'completed')
                    ->orWhere(function ($subQuery) use ($today) {
                        $subQuery->whereNotNull('tour_departures.return_date')
                            ->whereDate('tour_departures.return_date', '<', $today->toDateString());
                    });
            });

        $ongoingQuery = (clone $nonCancelledQuery)
            ->where(function ($query) use ($today) {
                $query->whereDate('tour_departures.departure_date', '<=', $today->toDateString())
                    ->where(function ($innerQuery) use ($today) {
                        $innerQuery->whereNull('tour_departures.return_date')
                            ->orWhereDate('tour_departures.return_date', '>=', $today->toDateString());
                    })
                    ->where(function ($subQuery) {
                        $subQuery->whereNull('tour_departures.status')
                            ->orWhereNotIn('tour_departures.status', ['completed', 'cancelled']);
                    });
            });

        $upcomingQuery = (clone $nonCancelledQuery)
            ->whereDate('tour_departures.departure_date', '>', $today->toDateString());

        $total = (int) $allQuery->count('tour_departures.id');
        $completed = (int) $completedQuery->count('tour_departures.id');
        $ongoing = (int) $ongoingQuery->count('tour_departures.id');
        $upcoming = (int) $upcomingQuery->count('tour_departures.id');
        $cancelled = (int) $cancelledQuery->count('tour_departures.id');
        $active = max($total - $cancelled, 0);

        return [
            'total' => $total,
            'active' => $active,
            'completed' => $completed,
            'ongoing' => $ongoing,
            'upcoming' => $upcoming,
            'cancelled' => $cancelled,
            'segments' => [
                [
                    'key' => 'completed',
                    'label' => 'Hoàn thành',
                    'count' => $completed,
                    'percent' => $active > 0 ? round(($completed / $active) * 100, 1) : 0,
                    'color' => '#3366ff',
                ],
                [
                    'key' => 'ongoing',
                    'label' => 'Đang diễn ra',
                    'count' => $ongoing,
                    'percent' => $active > 0 ? round(($ongoing / $active) * 100, 1) : 0,
                    'color' => '#ff9900',
                ],
                [
                    'key' => 'upcoming',
                    'label' => 'Sắp khởi hành',
                    'count' => $upcoming,
                    'percent' => $active > 0 ? round(($upcoming / $active) * 100, 1) : 0,
                    'color' => '#12b76a',
                ],
                [
                    'key' => 'cancelled',
                    'label' => 'Đã hủy',
                    'count' => $cancelled,
                    'percent' => $total > 0 ? round(($cancelled / $total) * 100, 1) : 0,
                    'color' => '#f04444',
                ],
            ],
        ];
    }

    private function buildRecentReviews(Guide $guide)
    {
        return DB::table('reviews')
            ->join('users', 'users.id', '=', 'reviews.user_id')
            ->join('tours', 'tours.id', '=', 'reviews.tour_id')
            ->join('tour_departures', 'tour_departures.tour_id', '=', 'tours.id')
            ->join('tour_guide_assignments as tga', 'tga.tour_departure_id', '=', 'tour_departures.id')
            ->where('tga.guide_id', $guide->id)
            ->where('tga.status', '!=', 'cancelled')
            ->where('reviews.status', 'visible')
            ->select([
                'reviews.id',
                'reviews.rating',
                'reviews.comment',
                'reviews.created_at',
                'users.full_name as reviewer_name',
                'users.avatar_url as reviewer_avatar',
                'tours.title as tour_title',
            ])
            ->distinct()
            ->orderByDesc('reviews.created_at')
            ->limit(3)
            ->get()
            ->map(function ($review) {
                $name = $review->reviewer_name ?: 'Khách hàng';
                $initials = collect(explode(' ', trim($name)))
                    ->filter()
                    ->take(2)
                    ->map(fn ($part) => mb_substr($part, 0, 1))
                    ->join('');

                return [
                    'id' => $review->id,
                    'rating' => (int) ($review->rating ?? 0),
                    'comment' => $review->comment,
                    'created_at' => optional($review->created_at)->toDateTimeString(),
                    'reviewer_name' => $name,
                    'reviewer_avatar' => $review->reviewer_avatar,
                    'reviewer_initials' => $initials,
                    'tour_title' => $review->tour_title,
                ];
            })
            ->values();
    }

    public function show(Request $request): JsonResponse
    {
        $guide = $this->getGuide($request);
        if (!$guide) {
            return response()->json([
                'status' => 'success',
                'message' => 'Tài khoản chưa có hồ sơ hướng dẫn viên hoặc chưa được phân công tour.',
                'data' => [
                    'guide' => [
                        'id' => null,
                        'guide_code' => null,
                        'experience_years' => 0,
                        'average_rating' => 0,
                        'review_count' => 0,
                        'status' => null,
                        'user' => $request->user(),
                        'avatar_url' => $request->user()?->avatar_url,
                    ],
                    'summary' => [
                        'period' => [
                            'month' => [
                                'label' => 'Tháng ' . Carbon::now()->month . '/' . Carbon::now()->year,
                                'tour_count' => 0,
                                'customer_count' => 0,
                            ],
                            'year' => [
                                'label' => 'Năm ' . Carbon::now()->year,
                                'tour_count' => 0,
                                'customer_count' => 0,
                            ],
                        ],
                        'tour_count_total' => 0,
                        'upcoming_count' => 0,
                        'ongoing_count' => 0,
                        'today_count' => 0,
                        'rating' => [
                            'average' => 0,
                            'review_count' => 0,
                        ],
                        'income' => [
                            'year' => Carbon::now()->year,
                            'month' => Carbon::now()->month,
                            'current_month_revenue' => 0,
                            'current_year_revenue' => 0,
                        ],
                        'notifications_count' => 0,
                    ],
                    'today_schedule' => [],
                    'upcoming_tours' => [],
                    'ongoing_tours' => [],
                    'assigned_tours' => [],
                    'income_rows' => [],
                    'tour_overview' => [
                        'total' => 0,
                        'active' => 0,
                        'completed' => 0,
                        'ongoing' => 0,
                        'upcoming' => 0,
                        'cancelled' => 0,
                        'segments' => [],
                    ],
                    'recent_reviews' => [],
                ],
            ]);
        }

        $now = Carbon::now();
        $today = $now->toDateString();
        $month = $now->month;
        $year = $now->year;

        $baseQuery = $this->departureBaseQuery($guide);

        $allDepartures = (clone $baseQuery)
            ->orderBy('tour_departures.departure_date', 'desc')
            ->get()
            ->map(fn (TourDeparture $departure) => $this->mapDeparture($departure))
            ->values();

        $upcomingDepartures = (clone $baseQuery)
            ->where('tour_departures.departure_date', '>', $today)
            ->orderBy('tour_departures.departure_date', 'asc')
            ->limit(5)
            ->get()
            ->map(fn (TourDeparture $departure) => $this->mapDeparture($departure))
            ->values();

        $ongoingDepartures = (clone $baseQuery)
            ->where('tour_departures.departure_date', '<=', $today)
            ->where(function ($query) use ($today) {
                $query->whereNull('tour_departures.return_date')
                    ->orWhere('tour_departures.return_date', '>=', $today);
            })
            ->orderBy('tour_departures.departure_date', 'asc')
            ->limit(5)
            ->get()
            ->map(fn (TourDeparture $departure) => $this->mapDeparture($departure))
            ->values();

        $todaySchedule = (clone $baseQuery)
            ->where(function ($query) use ($today) {
                $query->whereDate('tour_departures.departure_date', $today)
                    ->orWhere(function ($subQuery) use ($today) {
                        $subQuery->whereDate('tour_departures.departure_date', '<', $today)
                            ->where(function ($innerQuery) use ($today) {
                                $innerQuery->whereNull('tour_departures.return_date')
                                    ->orWhereDate('tour_departures.return_date', '>=', $today);
                            });
                    });
            })
            ->orderBy('tour_departures.departure_date', 'asc')
            ->limit(6)
            ->get()
            ->map(fn (TourDeparture $departure) => $this->mapDeparture($departure))
            ->values();

        $incomeRows = $this->buildIncomeRows($guide, $year, $month);
        $tourOverview = $this->buildTourOverview($guide, $now);
        $recentReviews = $this->buildRecentReviews($guide);
        $currentMonthIncome = collect($incomeRows)->last();

        $summary = [
            'period' => [
                'month' => [
                    'label' => 'Tháng ' . $month . '/' . $year,
                    'tour_count' => $this->countTourDepartures($guide, $year, $month),
                    'customer_count' => $this->countCustomers($guide, $year, $month),
                ],
                'year' => [
                    'label' => 'Năm ' . $year,
                    'tour_count' => $this->countTourDepartures($guide, $year),
                    'customer_count' => $this->countCustomers($guide, $year),
                ],
            ],
            'tour_count_total' => $allDepartures->count(),
            'upcoming_count' => $upcomingDepartures->count(),
            'ongoing_count' => $ongoingDepartures->count(),
            'today_count' => $todaySchedule->count(),
            'rating' => [
                'average' => (float) ($guide->average_rating ?? 0),
                'review_count' => (int) ($guide->review_count ?? 0),
            ],
            'income' => [
                'year' => $year,
                'month' => $month,
                'current_month_revenue' => (float) ($currentMonthIncome['revenue'] ?? 0),
                'current_year_revenue' => (float) $this->bookedIncomeQuery($guide)
                    ->whereYear('bookings.created_at', $year)
                    ->sum('bookings.total_amount'),
            ],
            'notifications_count' => 0,
        ];

        return response()->json([
            'status' => 'success',
            'message' => 'Tải dữ liệu tổng quan HDV thành công.',
            'data' => [
                'guide' => [
                    'id' => $guide->id,
                    'guide_code' => $guide->guide_code,
                    'experience_years' => $guide->experience_years,
                    'average_rating' => (float) ($guide->average_rating ?? 0),
                    'review_count' => (int) ($guide->review_count ?? 0),
                    'status' => $guide->status,
                    'user' => $guide->user,
                    'avatar_url' => $guide->avatar_url ?? $guide->user?->avatar_url,
                ],
                'summary' => $summary,
                'today_schedule' => $todaySchedule,
                'upcoming_tours' => $upcomingDepartures,
                'ongoing_tours' => $ongoingDepartures,
                'assigned_tours' => $allDepartures->take(10)->values(),
                'income_rows' => $incomeRows,
                'tour_overview' => $tourOverview,
                'recent_reviews' => $recentReviews,
            ],
        ]);
    }
}
