<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Models\Guide;
use App\Models\TourDeparture;
use Illuminate\Http\Request;
use Carbon\Carbon;

class GuideTourController extends Controller
{
    private function getGuide(Request $request): Guide
    {
        return Guide::where('user_id', $request->user()->id)
            ->firstOrFail();
    }

    private function baseQuery(Guide $guide)
    {
        return TourDeparture::query()
            ->join('tour_guide_assignments as tga', 'tga.tour_departure_id', '=', 'tour_departures.id')
            ->where('tga.guide_id', $guide->id)
            ->where('tga.status', '!=', 'cancelled')
            ->with([
                'tour:id,title,slug,summary,duration_days,duration_nights,base_price,discount_price,average_rating,review_count,destination_id,category_id',
                'tour.destination:id,name,province_city',
                'tour.category:id,name,slug',
            ])
            ->addSelect([
                'tour_departures.*',
                'tga.status as assignment_status',
                'tga.note as assignment_note',
            ]);
    }

    private function applyFilters($query, Request $request)
    {
        if ($keyword = $request->input('keyword')) {
            $query->whereHas('tour', function ($q) use ($keyword) {
                $q->where('title', 'like', "%{$keyword}%")
                    ->orWhere('summary', 'like', "%{$keyword}%")
                    ->orWhereHas('destination', fn($d) => $d->where('name', 'like', "%{$keyword}%"));
            });
        }

        if ($destinationId = $request->input('destination_id')) {
            $query->whereHas('tour', fn($q) => $q->where('destination_id', $destinationId));
        }

        if ($fromDate = $request->input('from_date')) {
            $query->where('tour_departures.departure_date', '>=', $fromDate);
        }

        if ($toDate = $request->input('to_date')) {
            $query->where('tour_departures.departure_date', '<=', $toDate);
        }

        return $query;
    }

    // GET /api/guide/tours
    public function index(Request $request)
    {
        $guide = $this->getGuide($request);
        $query = $this->applyFilters($this->baseQuery($guide), $request);
        $query->orderBy('tour_departures.departure_date', 'asc');

        return response()->json([
            'message' => 'Danh sách tour được phân công',
            'data'    => $query->paginate(min($request->integer('per_page', 10), 50)),
        ]);
    }

    // GET /api/guide/tours/upcoming
    public function upcoming(Request $request)
    {
        $guide = $this->getGuide($request);
        $today = Carbon::today()->toDateString();

        $query = $this->baseQuery($guide)
            ->where('tour_departures.departure_date', '>', $today);
        $query = $this->applyFilters($query, $request);
        $query->orderBy('tour_departures.departure_date', 'asc');

        return response()->json([
            'message' => 'Danh sách tour sắp diễn ra',
            'data'    => $query->paginate(min($request->integer('per_page', 10), 50)),
        ]);
    }

    // GET /api/guide/tours/ongoing
    public function ongoing(Request $request)
    {
        $guide = $this->getGuide($request);
        $today = Carbon::today()->toDateString();

        $query = $this->baseQuery($guide)
            ->where('tour_departures.departure_date', '<=', $today)
            ->where(function ($q) use ($today) {
                $q->whereNull('tour_departures.return_date')
                    ->orWhere('tour_departures.return_date', '>=', $today);
            });
        $query = $this->applyFilters($query, $request);
        $query->orderBy('tour_departures.departure_date', 'asc');

        return response()->json([
            'message' => 'Danh sách tour đang diễn ra',
            'data'    => $query->paginate(min($request->integer('per_page', 10), 50)),
        ]);
    }

    // GET /api/guide/tours/completed
    public function completed(Request $request)
    {
        $guide = $this->getGuide($request);
        $today = Carbon::today()->toDateString();

        $query = $this->baseQuery($guide)
            ->where(function ($q) use ($today) {
                $q->where('tour_departures.status', 'completed')
                    ->orWhere(function ($sub) use ($today) {
                        $sub->whereNotNull('tour_departures.return_date')
                            ->where('tour_departures.return_date', '<', $today);
                    });
            });
        $query = $this->applyFilters($query, $request);
        $query->orderBy('tour_departures.departure_date', 'desc');

        return response()->json([
            'message' => 'Danh sách tour đã hoàn thành',
            'data'    => $query->paginate(min($request->integer('per_page', 10), 50)),
        ]);
    }

    // GET /api/guide/tours/{departureId}
    public function show(Request $request, int $departureId)
    {
        $guide = $this->getGuide($request);

        $departure = TourDeparture::query()
            ->join('tour_guide_assignments as tga', 'tga.tour_departure_id', '=', 'tour_departures.id')
            ->where('tga.guide_id', $guide->id)
            ->where('tga.status', '!=', 'cancelled')
            ->where('tour_departures.id', $departureId)
            ->with([
                'tour.category:id,name,slug',
                'tour.destination:id,name,slug,province_city,country,description',
                'tour.itineraries' => fn($it) => $it
                    ->orderBy('day_number')
                    ->orderBy('sort_order'),
            ])
            ->addSelect([
                'tour_departures.*',
                'tga.status as assignment_status',
                'tga.note as assignment_note',
            ])
            ->firstOrFail();

        return response()->json([
            'message' => 'Chi tiết tour được phân công',
            'data'    => $departure,
        ]);
    }
}
