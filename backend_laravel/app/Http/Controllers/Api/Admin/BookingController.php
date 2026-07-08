<?php

// app/Http/Controllers/Api/Admin/BookingController.php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Services\TourPricingService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BookingController extends Controller
{
    public function __construct(
        private readonly TourPricingService $tourPricingService
    ) {}

    /**
     * GET /api/admin/bookings
     * Danh sách booking có phân trang + tìm kiếm + lọc
     */
    public function index(Request $request)
    {
        $request->validate([
            'search' => 'nullable|string|max:100',
            'status' => ['nullable', Rule::in(['pending', 'confirmed', 'completed', 'cancelled'])],
            'payment_status' => ['nullable', Rule::in(['unpaid', 'paid', 'failed', 'refunded'])],
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date|after_or_equal:from_date',
            'per_page' => 'nullable|integer|min:5|max:100',
            'sort_by' => ['nullable', Rule::in(['created_at', 'total_amount', 'booking_code'])],
            'sort_dir' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $bookings = Booking::with([
            'user:id,full_name,email',
            'tour:id,title',
            'contact:booking_id,contact_name,contact_phone',
            'payment',
            'participants:id,booking_id,full_name,phone,birth_date,gender,participant_type,unit_price',
        ])
            ->withCount('participants')

            ->search($request->search)
            ->filterStatus($request->status)
            ->filterPaymentStatus($request->payment_status)
            ->filterDate($request->from_date, $request->to_date)
            ->orderBy($request->sort_by ?? 'created_at', $request->sort_dir ?? 'desc')
            ->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => $bookings->items(),
            'meta' => [
                'current_page' => $bookings->currentPage(),
                'last_page' => $bookings->lastPage(),
                'per_page' => $bookings->perPage(),
                'total' => $bookings->total(),
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
            'data' => $stats,
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
            'payment',
            'statusHistories' => fn ($q) => $q->latest(),
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $booking,
        ]);
    }

    // ─── Thêm/Tạo booking ─────────────────────────────────────────
    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'tour_id' => 'required|exists:tours,id',
            'tour_departure_id' => 'nullable|exists:tour_departures,id',
            'promotion_id' => 'nullable|exists:promotions,id',
            'staff_id' => 'nullable|exists:users,id',
            'number_of_people' => 'nullable|integer|min:1',
            'unit_price' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'note' => 'nullable|string',
            'contact' => 'nullable|array',
            'contact.contact_name' => 'required_with:contact|string|max:150',
            'contact.contact_email' => 'nullable|email|max:150',
            'contact.contact_phone' => 'required_with:contact|string|max:20',
            'contact.address' => 'nullable|string|max:255',
            'contact.special_request' => 'nullable|string',
            'participants' => 'nullable|array|min:1',
            'participants.*.full_name' => 'required_with:participants|string|max:150',
            'participants.*.phone' => 'nullable|string|max:20',
            'participants.*.birth_date' => 'required_with:participants|date|before_or_equal:today',
            'participants.*.gender' => 'nullable|in:male,female,other',
            'participants.*.identity_number' => 'nullable|string|max:30',
            'participants.*.participant_type' => 'nullable|in:adult,child,infant',
        ]);

        $participants = $data['participants'] ?? [];
        $contact = $data['contact'] ?? null;
        unset($data['participants'], $data['contact']);

        $data['booking_code'] = 'BK'.now()->format('Ymd').strtoupper(Str::random(4));
        $data['discount_amount'] = $data['discount_amount'] ?? 0;
        $data['status'] = 'pending';
        $data['payment_status'] = 'unpaid';

        $booking = DB::transaction(function () use ($data, $participants, $contact) {
            if ($participants !== []) {
                $tour = Tour::with('agePricingRules')->findOrFail($data['tour_id']);
                $departure = $this->resolveDeparture($tour, $data['tour_departure_id'] ?? null);
                $pricingSummary = $this->buildParticipantPricing($tour, $departure, $participants);

                $data['number_of_people'] = count($pricingSummary['participants']);
                $data['unit_price'] = $pricingSummary['adult_price'];
                $data['total_amount'] = max(0, $pricingSummary['total_amount'] - $data['discount_amount']);
            } else {
                if (! isset($data['number_of_people'], $data['unit_price'])) {
                    throw ValidationException::withMessages([
                        'participants' => 'Vui lòng nhập danh sách người tham gia hoặc nhập số người và đơn giá.',
                    ]);
                }

                $data['total_amount'] = ($data['unit_price'] * $data['number_of_people']) - $data['discount_amount'];
            }

            $booking = Booking::create($data);

            if ($contact) {
                $booking->contact()->create($contact);
            }

            if ($participants !== []) {
                $booking->participants()->createMany($pricingSummary['participants']);
            }

            $booking->payment()->create([
                'payment_method' => 'cod',
                'amount' => $booking->total_amount,
                'status' => 'pending',
                'paid_at' => null,
            ]);

            return $booking;
        });

        return response()->json([
            'success' => true,
            'message' => 'Tạo booking thành công.',
            'data' => $booking->load(['contact', 'participants', 'payment']),
        ], 201);
    }

    // ─── Sửa booking ──────────────────────────────────────────────
    public function update(Request $request, $id)
    {
        $booking = Booking::with(['tour.agePricingRules', 'tourDeparture', 'participants', 'contact', 'payment'])->findOrFail($id);

        $data = $request->validate([
            'number_of_people' => 'sometimes|integer|min:1',
            'unit_price' => 'sometimes|numeric|min:0',
            'discount_amount' => 'sometimes|numeric|min:0',
            'status' => ['sometimes', Rule::in(['pending', 'confirmed', 'completed', 'cancelled'])],
            'payment_status' => ['prohibited'],
            'note' => 'nullable|string',
            'cancel_reason' => 'nullable|string',
            'staff_id' => 'nullable|exists:users,id',
            'contact' => 'nullable|array',
            'contact.contact_name' => 'required_with:contact|string|max:150',
            'contact.contact_email' => 'nullable|email|max:150',
            'contact.contact_phone' => 'required_with:contact|string|max:20',
            'contact.address' => 'nullable|string|max:255',
            'contact.special_request' => 'nullable|string',
            'participants' => 'nullable|array|min:1',
            'participants.*.full_name' => 'required_with:participants|string|max:150',
            'participants.*.phone' => 'nullable|string|max:20',
            'participants.*.birth_date' => 'required_with:participants|date|before_or_equal:today',
            'participants.*.gender' => 'nullable|in:male,female,other',
            'participants.*.identity_number' => 'nullable|string|max:30',
            'participants.*.participant_type' => 'nullable|in:adult,child,infant',
        ]);

        // Tự tính lại total nếu có thay đổi giá/số người
        $participants = $data['participants'] ?? null;
        $contact = $data['contact'] ?? null;
        unset($data['participants'], $data['contact']);
        $pricingSummary = null;

        if ($participants !== null) {
            $pricingSummary = $this->buildParticipantPricing($booking->tour, $booking->tourDeparture, $participants);
            $discount = $data['discount_amount'] ?? $booking->discount_amount;
            $data['number_of_people'] = count($pricingSummary['participants']);
            $data['unit_price'] = $pricingSummary['adult_price'];
            $data['total_amount'] = max(0, $pricingSummary['total_amount'] - $discount);
        }

        if ($participants === null && (isset($data['unit_price']) || isset($data['number_of_people']) || isset($data['discount_amount']))) {
            $unitPrice = $data['unit_price'] ?? $booking->unit_price;
            $numPeople = $data['number_of_people'] ?? $booking->number_of_people;
            $discount = $data['discount_amount'] ?? $booking->discount_amount;
            $data['total_amount'] = ($unitPrice * $numPeople) - $discount;
        }

        // Nếu huỷ thì ghi thời gian
        if (isset($data['status']) && $data['status'] === 'cancelled') {
            $data['cancelled_at'] = Carbon::now();
        }

        DB::transaction(function () use ($booking, $data, $participants, $contact, $pricingSummary) {
            $shouldReleaseSlots = ($data['status'] ?? null) === 'cancelled'
                && $booking->status !== 'cancelled';
            $slotsToRelease = (int) $booking->number_of_people;

            $booking->update($data);

            if ($shouldReleaseSlots) {
                $this->releaseBookedSlots($booking, $slotsToRelease);
            }

            if ($contact !== null) {
                $booking->contact()->updateOrCreate(
                    ['booking_id' => $booking->id],
                    $contact
                );
            }

            if ($participants !== null && $pricingSummary !== null) {
                $booking->participants()->delete();
                $booking->participants()->createMany($pricingSummary['participants']);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật booking thành công.',
            'data' => $booking->fresh(['contact', 'participants', 'payment']),
        ]);
    }

    // ─── Xóa mềm ──────────────────────────────────────────────────
    public function softDelete($id)
    {
        DB::transaction(function () use ($id): void {
            $booking = Booking::query()
                ->with('tourDeparture')
                ->lockForUpdate()
                ->findOrFail($id);

            if ($booking->status === 'cancelled') {
                return;
            }

            $slotsToRelease = (int) $booking->number_of_people;

            $booking->update(['status' => 'cancelled', 'cancelled_at' => Carbon::now()]);
            $this->releaseBookedSlots($booking, $slotsToRelease);
        });

        return response()->json([
            'success' => true,
            'message' => 'Đã huỷ booking.',
        ]);
    }

    // ─── Xóa vĩnh viễn ────────────────────────────────────────────
    public function destroy($id)
    {
        $booking = Booking::findOrFail($id);

        if ($booking->status !== 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xóa vĩnh viễn booking đã hủy.',
            ], 422);
        }

        $booking->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa booking vĩnh viễn.',
        ]);
    }

    private function resolveDeparture(Tour $tour, ?int $departureId): TourDeparture
    {
        if (! $departureId) {
            throw ValidationException::withMessages([
                'tour_departure_id' => 'Vui lòng chọn lịch khởi hành khi tính giá theo hành khách.',
            ]);
        }

        $departure = TourDeparture::findOrFail($departureId);

        if ((int) $departure->tour_id !== (int) $tour->id) {
            throw ValidationException::withMessages([
                'tour_departure_id' => 'Lịch khởi hành không thuộc tour đã chọn.',
            ]);
        }

        return $departure;
    }

    private function buildParticipantPricing(Tour $tour, TourDeparture $departure, array $participants): array
    {
        $adultPrice = $this->tourPricingService->resolveAdultPrice($tour, $departure);
        $hasActiveAgePricingRules = $tour->agePricingRules
            ->where('is_active', true)
            ->isNotEmpty();
        $rows = [];
        $totalAmount = 0;
        $adultCount = 0;

        foreach ($participants as $index => $participant) {
            $birthDate = Carbon::parse($participant['birth_date']);
            $pricing = $this->tourPricingService->calculateParticipantPrice(
                $tour,
                $departure,
                $birthDate,
                $departure->departure_date
            );
            $rule = $pricing['rule'];

            if (
                $hasActiveAgePricingRules
                && ! $rule
                && ($participant['participant_type'] ?? 'adult') !== 'adult'
            ) {
                throw ValidationException::withMessages([
                    "participants.{$index}.birth_date" => 'Không tìm thấy quy tắc giá phù hợp cho hành khách này.',
                ]);
            }

            if (! $rule) {
                $adultCount += 1;
            }

            $rows[] = [
                'full_name' => $participant['full_name'],
                'phone' => $participant['phone'] ?? null,
                'birth_date' => $birthDate->toDateString(),
                'gender' => $participant['gender'] ?? null,
                'identity_number' => $participant['identity_number'] ?? null,
                'participant_type' => $participant['participant_type'] ?? $this->detectParticipantType($pricing['age']),
                'unit_price' => $pricing['unit_price'],
                'pricing_rule_label' => $rule?->label ?? 'Người lớn mặc định',
                'pricing_type' => $rule?->pricing_type ?? 'percentage',
                'pricing_value' => $rule?->price_value ?? 100,
            ];

            $totalAmount += $pricing['unit_price'];
        }

        if ($adultCount < 1) {
            throw ValidationException::withMessages([
                'participants' => 'Vui lòng nhập ít nhất 1 người lớn trước khi thêm trẻ em hoặc em bé.',
            ]);
        }

        return [
            'adult_price' => $adultPrice,
            'participants' => $rows,
            'total_amount' => $totalAmount,
        ];
    }

    private function detectParticipantType(int $age): string
    {
        if ($age < 6) {
            return 'infant';
        }

        if ($age < 11) {
            return 'child';
        }

        return 'adult';
    }

    private function releaseBookedSlots(Booking $booking, int $slotsToRelease): void
    {
        $departure = $booking->tourDeparture()
            ->lockForUpdate()
            ->first();

        if (! $departure) {
            return;
        }

        $departure->booked_slots = max(
            0,
            (int) $departure->booked_slots - $slotsToRelease
        );
        $departure->save();
    }
}
