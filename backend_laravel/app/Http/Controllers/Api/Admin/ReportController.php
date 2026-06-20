<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * API 1: Thống kê tổng quan (Dashboard Cards)
     */
    public function getOverviewStatistics(Request $request)
    {
        // Lấy năm từ tham số truyền lên, mặc định là năm hiện tại
        $year = $request->input('year', Carbon::now()->year);
        $currentDate = Carbon::now()->format('Y-m-d');

        // 1. Tổng doanh thu theo năm (Điều kiện: Booking đã thanh toán thành công)
        $totalRevenueYear = DB::table('bookings')
            ->whereYear('created_at', $year)
            ->where('payment_status', 'paid')
            ->sum('total_amount');

        // 2. Tổng số lượng booking theo năm
        $totalBookingsYear = DB::table('bookings')
            ->whereYear('created_at', $year)
            ->count();

        // 3. Tỉ lệ hoàn thành tour (%)
        $completedBookings = DB::table('bookings')
            ->whereYear('created_at', $year)
            ->where('status', 'completed')
            ->count();

        $completionRate = $totalBookingsYear > 0 
            ? round(($completedBookings / $totalBookingsYear) * 100, 2) 
            : 0;

        // 4. Trung bình doanh thu booking theo tháng
        $monthlyAverages = DB::table('bookings')
            ->select(DB::raw('MONTH(created_at) as month'), DB::raw('AVG(total_amount) as avg_amount'))
            ->whereYear('created_at', $year)
            ->where('payment_status', 'paid')
            ->groupBy(DB::raw('MONTH(created_at)'))
            ->get();

        $averageBookingRevenueMonth = $monthlyAverages->count() > 0 
            ? round($monthlyAverages->avg('avg_amount'), 2) 
            : 0;

        return response()->json([
            'success' => true,
            'message' => 'Lấy dữ liệu thống kê tổng quan thành công.',
            'data' => [
                'current_date' => $currentDate, // + hiển thị ngày hiện tại
                'year' => (int)$year,
                'total_revenue_year' => (float)$totalRevenueYear, // + tổng doanh thu theo năm
                'total_bookings_year' => $totalBookingsYear, // + tổng số lượng booking theo năm
                'tour_completion_rate' => $completionRate, // + tỉ lệ hoàn thành tour
                'average_revenue_per_booking_month' => (float)$averageBookingRevenueMonth // + trung bình doanh thu booking theo tháng
            ]
        ], 200);
    }

    /**
     * API 2: Biểu đồ thống kê chi tiết (Charts & Analytics)
     */
    public function getChartStatistics(Request $request)
    {
        $year = $request->input('year', Carbon::now()->year);

        // Mảng khung 12 tháng
        $monthsData = array_fill(1, 12, ['revenue' => 0, 'customers' => 0]);

        // Lấy doanh thu thành công và lượng khách tham gia (loại trừ booking bị hủy)
        $dbData = DB::table('bookings')
            ->select(
                DB::raw('MONTH(created_at) as month'),
                DB::raw('SUM(CASE WHEN payment_status = "paid" THEN total_amount ELSE 0 END) as total_revenue'),
                DB::raw('SUM(CASE WHEN status != "cancelled" THEN number_of_people ELSE 0 END) as total_customers')
            )
            ->whereYear('created_at', $year)
            ->groupBy(DB::raw('MONTH(created_at)'))
            ->get();

        foreach ($dbData as $row) {
            $monthsData[$row->month] = [
                'revenue' => (float)$row->total_revenue,
                'customers' => (int)$row->total_customers
            ];
        }

        $revenueChart = [];
        $customerChart = [];
        for ($m = 1; $m <= 12; $m++) {
            $revenueChart[] = [
                'month' => "Tháng " . $m,
                'revenue' => $monthsData[$m]['revenue']
            ];
            $customerChart[] = [
                'month' => "Tháng " . $m,
                'total_customers' => $monthsData[$m]['customers']
            ];
        }

        // Tính Top 5 địa điểm đến được ưa chuộng nhất dựa theo liên kết bảng của bạn
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
                'year' => (int)$year,
                'revenue_by_month_chart' => $revenueChart, // + biểu đồ thống kê doanh thu theo tháng
                'customer_by_month_chart' => $customerChart, // + biểu đồ thống kê số lượng khách hàng theo tháng
                'top_destinations' => $topDestinations // + top địa điểm đến
            ]
        ], 200);
    }
}