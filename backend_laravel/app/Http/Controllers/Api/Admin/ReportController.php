<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * API 1: Thống kê tổng quan (Dashboard Cards)
     */
    public function getOverviewStatistics(Request $request)
    {
        $year = (int) $request->input('year', Carbon::now()->year);
        $currentDate = Carbon::now()->format('Y-m-d');

        // Revenue is recorded when a payment succeeds, not when its booking is created.
        $paidPayments = DB::table('payments')
            ->join('bookings', 'payments.booking_id', '=', 'bookings.id')
            ->where('payments.status', 'success')
            ->where('bookings.status', '!=', 'cancelled')
            ->whereYear('payments.paid_at', $year);

        $totalRevenueYear = (clone $paidPayments)->sum('payments.amount');
        $paidBookingsYear = (clone $paidPayments)->count();

        $totalBookingsYear = DB::table('bookings')
            ->whereYear('created_at', $year)
            ->count();

        $completedBookings = DB::table('bookings')
            ->whereYear('created_at', $year)
            ->where('status', 'completed')
            ->count();

        $completionRate = $totalBookingsYear > 0
            ? round(($completedBookings / $totalBookingsYear) * 100, 2)
            : 0;

        $averageBookingRevenue = $paidBookingsYear > 0
            ? round($totalRevenueYear / $paidBookingsYear, 2)
            : 0;

        return response()->json([
            'success' => true,
            'message' => 'Lấy dữ liệu thống kê tổng quan thành công.',
            'data' => [
                'current_date' => $currentDate,
                'year' => (int) $year,
                'total_revenue_year' => (float) $totalRevenueYear,
                'total_bookings_year' => $totalBookingsYear,
                'tour_completion_rate' => $completionRate,
                'average_revenue_per_booking_month' => (float) $averageBookingRevenue,
            ],
        ], 200);
    }

    /**
     * API 2: Biểu đồ thống kê chi tiết (Charts & Analytics)
     */
    public function getChartStatistics(Request $request)
    {
        $year = (int) $request->input('year', Carbon::now()->year);

        $monthsData = array_fill(1, 12, ['revenue' => 0, 'bookings' => 0, 'customers' => 0]);

        $bookingData = DB::table('bookings')
            ->select(
                DB::raw('MONTH(created_at) as month'),
                DB::raw('COUNT(*) as total_bookings')
            )
            ->whereYear('created_at', $year)
            ->groupBy(DB::raw('MONTH(created_at)'))
            ->get();

        foreach ($bookingData as $row) {
            $monthsData[$row->month]['bookings'] = (int) $row->total_bookings;
        }

        $revenueData = DB::table('payments')
            ->join('bookings', 'payments.booking_id', '=', 'bookings.id')
            ->select(
                DB::raw('MONTH(payments.paid_at) as month'),
                DB::raw('SUM(payments.amount) as total_revenue')
            )
            ->where('payments.status', 'success')
            ->where('bookings.status', '!=', 'cancelled')
            ->whereYear('payments.paid_at', $year)
            ->groupBy(DB::raw('MONTH(payments.paid_at)'))
            ->get();

        foreach ($revenueData as $row) {
            $monthsData[$row->month]['revenue'] = (float) $row->total_revenue;
        }

        $customerData = DB::table('users')
            ->join('roles', 'users.role_id', '=', 'roles.id')
            ->select(
                DB::raw('MONTH(users.created_at) as month'),
                DB::raw('COUNT(users.id) as total_customers')
            )
            ->where('roles.name', 'customer')
            ->whereNull('users.deleted_at')
            ->whereYear('users.created_at', $year)
            ->groupBy(DB::raw('MONTH(users.created_at)'))
            ->get();

        foreach ($customerData as $row) {
            $monthsData[$row->month]['customers'] = (int) $row->total_customers;
        }

        $revenueChart = [];
        $bookingChart = [];
        $customerChart = [];

        for ($m = 1; $m <= 12; $m++) {
            $revenueChart[] = [
                'month' => 'Tháng '.$m,
                'revenue' => $monthsData[$m]['revenue'],
            ];
            $bookingChart[] = [
                'month' => 'Tháng '.$m,
                'total_bookings' => $monthsData[$m]['bookings'],
            ];
            $customerChart[] = [
                'month' => 'Tháng '.$m,
                'total_customers' => $monthsData[$m]['customers'],
            ];
        }

        $topDestinations = DB::table('bookings')
            ->join('tours', 'bookings.tour_id', '=', 'tours.id')
            ->join('destinations', 'tours.destination_id', '=', 'destinations.id')
            ->select(
                'destinations.id',
                'destinations.name',
                'destinations.province_city',
                DB::raw('COUNT(bookings.id) as total_bookings'),
                DB::raw('SUM(bookings.number_of_people) as total_tourists')
            )
            ->whereYear('bookings.created_at', $year)
            ->where('bookings.status', '!=', 'cancelled')
            ->groupBy('destinations.id', 'destinations.name', 'destinations.province_city')
            ->orderByDesc('total_bookings')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lấy dữ liệu biểu đồ và phân tích thành công.',
            'data' => [
                'year' => (int) $year,
                'revenue_by_month_chart' => $revenueChart,
                'booking_by_month_chart' => $bookingChart,
                'customer_by_month_chart' => $customerChart,
                'top_destinations' => $topDestinations,
            ],
        ], 200);
    }
}
