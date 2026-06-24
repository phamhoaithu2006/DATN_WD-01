<?php

namespace App\Http\Controllers\Api\Guide;

use App\Http\Controllers\Controller;
use App\Models\GuideAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class GuideHomeController extends Controller
{
    public function assignedTours(Request $request): JsonResponse
    {
        $guide = $this->resolveGuide($request);
        if (! $guide) {
            return response()->json([
                'status' => 'error',
                'message' => 'Khong tim thay ho so huong dan vien.',
            ], 404);
        }

        $assignments = GuideAssignment::query()
            ->with(['tourDeparture.tour.category', 'tourDeparture.tour.destination'])
            ->where('guide_id', $guide->id)
            ->where('status', '!=', 'cancelled')
            ->orderByDesc('assigned_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (GuideAssignment $assignment) => $this->formatAssignment($assignment));

        return response()->json([
            'status' => 'success',
            'data' => $assignments,
        ]);
    }

    public function todayItinerary(Request $request): JsonResponse
    {
        $today = now()->toDateString();
        $guide = $this->resolveGuide($request);
        if (! $guide) {
            return response()->json([
                'status' => 'error',
                'message' => 'Khong tim thay ho so huong dan vien.',
            ], 404);
        }

        $assignments = GuideAssignment::query()
            ->with(['tourDeparture.tour.category', 'tourDeparture.tour.destination'])
            ->where('guide_id', $guide->id)
            ->where('status', '!=', 'cancelled')
            ->whereHas('tourDeparture', fn ($query) => $query->whereDate('departure_date', $today))
            ->orderBy('tour_departure_id')
            ->get()
            ->map(fn (GuideAssignment $assignment) => $this->formatAssignment($assignment));

        return response()->json([
            'status' => 'success',
            'data' => $assignments,
        ]);
    }

    public function upcomingItineraries(Request $request): JsonResponse
    {
        $today = now()->toDateString();
        $guide = $this->resolveGuide($request);
        if (! $guide) {
            return response()->json([
                'status' => 'error',
                'message' => 'Khong tim thay ho so huong dan vien.',
            ], 404);
        }

        $assignments = GuideAssignment::query()
            ->select('guide_assignments.*')
            ->join('tour_departures', 'guide_assignments.tour_departure_id', '=', 'tour_departures.id')
            ->with(['tourDeparture.tour.category', 'tourDeparture.tour.destination'])
            ->where('guide_id', $guide->id)
            ->where('status', '!=', 'cancelled')
            ->whereDate('tour_departures.departure_date', '>', $today)
            ->orderBy('tour_departures.departure_date')
            ->get()
            ->map(fn (GuideAssignment $assignment) => $this->formatAssignment($assignment));

        return response()->json([
            'status' => 'success',
            'data' => $assignments,
        ]);
    }

    public function statistics(Request $request): JsonResponse
    {
        $guide = $this->resolveGuide($request);
        if (! $guide) {
            return response()->json([
                'status' => 'error',
                'message' => 'Khong tim thay ho so huong dan vien.',
            ], 404);
        }
        $now = now();
        $month = (int) $request->integer('month', $now->month);
        $year = (int) $request->integer('year', $now->year);

        $periodStart = Carbon::create($year, $month, 1)->startOfDay();
        $periodEnd = (clone $periodStart)->endOfMonth()->endOfDay();
        $effectiveEnd = $periodEnd->greaterThan($now) ? $now : $periodEnd;

        $baseQuery = GuideAssignment::query()
            ->join('tour_departures', 'guide_assignments.tour_departure_id', '=', 'tour_departures.id')
            ->leftJoin('bookings', 'bookings.tour_departure_id', '=', 'tour_departures.id')
            ->where('guide_assignments.guide_id', $guide->id)
            ->where('guide_assignments.status', '!=', 'cancelled')
            ->whereDate('tour_departures.departure_date', '>=', $periodStart->toDateString())
            ->whereDate('tour_departures.departure_date', '<=', $effectiveEnd->toDateString())
            ->whereDate('tour_departures.departure_date', '<=', $now->toDateString())
            ->whereIn('tour_departures.status', ['open', 'completed'])
            ->whereIn('bookings.status', ['confirmed', 'completed'])
            ->whereIn('bookings.payment_status', ['paid', 'partially_paid', 'unpaid']);

        $tourCount = (clone $baseQuery)
            ->distinct('tour_departures.id')
            ->count('tour_departures.id');

        $customerCount = (int) (clone $baseQuery)
            ->sum(DB::raw('COALESCE(bookings.number_of_people, 0)'));

        return response()->json([
            'status' => 'success',
            'data' => [
                'month' => $month,
                'year' => $year,
                'tour_count' => $tourCount,
                'customer_count' => $customerCount,
            ],
        ]);
    }

    public function rating(Request $request): JsonResponse
    {
        $guide = $this->resolveGuide($request);
        if (! $guide) {
            return response()->json([
                'status' => 'error',
                'message' => 'Khong tim thay ho so huong dan vien.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'average_rating' => $guide->average_rating,
                'review_count' => $guide->review_count,
                'label' => $this->ratingLabel((float) $guide->average_rating),
            ],
        ]);
    }

    public function clock(Request $request): JsonResponse
    {
        $now = now();

        return response()->json([
            'status' => 'success',
            'data' => [
                'server_time' => $now->toIso8601String(),
                'server_date' => $now->toDateString(),
                'timezone' => config('app.timezone'),
                'timestamp' => $now->timestamp,
            ],
        ]);
    }

    private function formatAssignment(GuideAssignment $assignment): array
    {
        $departure = $assignment->tourDeparture;
        $tour = $departure?->tour;

        return [
            'assignment_id' => $assignment->id,
            'status' => $assignment->status,
            'assigned_at' => $assignment->assigned_at?->toIso8601String(),
            'tour_departure' => [
                'id' => $departure?->id,
                'departure_date' => $departure?->departure_date?->toDateString(),
                'return_date' => $departure?->return_date?->toDateString(),
                'status' => $departure?->status,
                'total_slots' => $departure?->total_slots,
                'booked_slots' => $departure?->booked_slots,
            ],
            'tour' => $tour ? [
                'id' => $tour->id,
                'title' => $tour->title,
                'slug' => $tour->slug,
                'itinerary' => $tour->itinerary,
                'average_rating' => $tour->average_rating,
                'review_count' => $tour->review_count,
                'destination' => $tour->destination?->name,
                'category' => $tour->category?->name,
            ] : null,
        ];
    }

    private function resolveGuide(Request $request)
    {
        return $request->user()->guide()->first();
    }

    private function ratingLabel(float $rating): string
    {
        if ($rating >= 4.8) {
            return 'Xuất sắc';
        }

        if ($rating >= 4.5) {
            return 'Rất tốt';
        }

        if ($rating >= 4.0) {
            return 'Tốt';
        }

        if ($rating >= 3.0) {
            return 'Khá';
        }

        return 'Cần cải thiện';
    }
}
