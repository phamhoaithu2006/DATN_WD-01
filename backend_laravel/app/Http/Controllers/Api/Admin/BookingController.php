<?php
// app/Http/Controllers/Api/Admin/BookingController.php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Carbon\Carbon;

class BookingController extends Controller
{
    /**
     * GET /api/admin/bookings
     * Danh sách booking có phân trang + tìm kiếm + lọc
     */
    public function index(Request $request)
    {
        $request->validate([
            'search'         => 'nullable|string|max:100',
            'status'         => ['nullable', Rule::in(['pending', 'confirmed', 'completed', 'cancelled'])],
            'payment_status' => ['nullable', Rule::in(['unpaid', 'paid', 'failed', 'refunded'])],
            'from_date'      => 'nullable|date',
            'to_date'        => 'nullable|date|after_or_equal:from_date',
            'per_page'       => 'nullable|integer|min:5|max:100',
            'sort_by'        => ['nullable', Rule::in(['created_at', 'total_amount', 'booking_code'])],
            'sort_dir'       => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $bookings = Booking::with(['user:id,full_name,email', 'tour:id,title', 'contact:booking_id,contact_name,contact_phone'])

            ->search($request->search)
            ->filterStatus($request->status)
            ->filterPaymentStatus($request->payment_status)
            ->filterDate($request->from_date, $request->to_date)
            ->orderBy($request->sort_by ?? 'created_at', $request->sort_dir ?? 'desc')
            ->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data'    => $bookings->items(),
            'meta'    => [
                'current_page' => $bookings->currentPage(),
                'last_page'    => $bookings->lastPage(),
                'per_page'     => $bookings->perPage(),
                'total'        => $bookings->total(),
            ],
        ]);
    }

    /**
     * GET /api/admin/bookings/statistics
     * Tổng số lượng, tổng booking theo từng trạng thái
     */
    public function statistics()
    {
        $stats = Booking::selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
            SUM(CASE WHEN payment_status = 'unpaid'   THEN 1 ELSE 0 END) as unpaid,
            SUM(CASE WHEN payment_status = 'paid'     THEN 1 ELSE 0 END) as paid,
            SUM(CASE WHEN payment_status = 'failed'   THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN payment_status = 'refunded' THEN 1 ELSE 0 END) as refunded,
            SUM(total_amount) as total_revenue
        ")->first();

        return response()->json([
            'success' => true,
            'data'    => $stats,
        ]);
    }

    /**
     * GET /api/admin/bookings/{id}
     * Chi tiết booking
     */
    public function show($id)
    {
        $booking = Booking::with([
            'user:id,full_name,email,phone',
            'tour:id,title,summary',
            'tourDeparture:id,departure_date,return_date',
            // 'promotion:id,code,discount_value', ← xóa dòng này
            'contact',
            'participants',
            'statusHistories' => fn($q) => $q->latest(),
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $booking,
        ]);
    }
    // ─── Thêm/Tạo booking ─────────────────────────────────────────
    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id'          => 'required|exists:users,id',
            'tour_id'          => 'required|exists:tours,id',
            'tour_departure_id' => 'nullable|exists:tour_departures,id',
            'promotion_id'     => 'nullable|exists:promotions,id',
            'staff_id'         => 'nullable|exists:users,id',
            'number_of_people' => 'required|integer|min:1',
            'unit_price'       => 'required|numeric|min:0',
            'discount_amount'  => 'nullable|numeric|min:0',
            'note'             => 'nullable|string',
        ]);

        $data['booking_code']   = 'BK' . now()->format('Ymd') . strtoupper(Str::random(4));
        $data['discount_amount'] = $data['discount_amount'] ?? 0;
        $data['total_amount']   = ($data['unit_price'] * $data['number_of_people']) - $data['discount_amount'];
        $data['status']         = 'pending';
        $data['payment_status'] = 'unpaid';

        $booking = Booking::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Tạo booking thành công.',
            'data'    => $booking,
        ], 201);
    }

    // ─── Sửa booking ──────────────────────────────────────────────
    public function update(Request $request, $id)
    {
        $booking = Booking::findOrFail($id);

        $data = $request->validate([
            'number_of_people' => 'sometimes|integer|min:1',
            'unit_price'       => 'sometimes|numeric|min:0',
            'discount_amount'  => 'sometimes|numeric|min:0',
            'status'           => ['sometimes', Rule::in(['pending', 'confirmed', 'completed', 'cancelled'])],
            'payment_status'   => ['sometimes', Rule::in(['unpaid', 'paid', 'failed', 'refunded'])],
            'note'             => 'nullable|string',
            'cancel_reason'    => 'nullable|string',
            'staff_id'         => 'nullable|exists:users,id',
        ]);

        // Tự tính lại total nếu có thay đổi giá/số người
        if (isset($data['unit_price']) || isset($data['number_of_people']) || isset($data['discount_amount'])) {
            $unitPrice   = $data['unit_price']       ?? $booking->unit_price;
            $numPeople   = $data['number_of_people'] ?? $booking->number_of_people;
            $discount    = $data['discount_amount']  ?? $booking->discount_amount;
            $data['total_amount'] = ($unitPrice * $numPeople) - $discount;
        }

        // Nếu huỷ thì ghi thời gian
        if (isset($data['status']) && $data['status'] === 'cancelled') {
            $data['cancelled_at'] = Carbon::now();
        }

        $booking->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật booking thành công.',
            'data'    => $booking->fresh(),
        ]);
    }

    // ─── Xóa mềm ──────────────────────────────────────────────────
    public function softDelete($id)
    {
        $booking = Booking::findOrFail($id);
        $booking->update(['status' => 'cancelled', 'cancelled_at' => Carbon::now()]);

        return response()->json([
            'success' => true,
            'message' => 'Đã huỷ booking.',
        ]);
    }

    // ─── Xóa vĩnh viễn ────────────────────────────────────────────
    public function destroy($id)
    {
        $booking = Booking::findOrFail($id);
        $booking->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa booking vĩnh viễn.',
        ]);
    }
}
