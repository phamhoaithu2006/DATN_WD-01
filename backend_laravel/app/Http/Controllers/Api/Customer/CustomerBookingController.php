<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreBookingRequest;
use App\Models\Booking;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Services\TourPricingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CustomerBookingController extends Controller
{
    public function __construct(
        private readonly TourPricingService $tourPricingService
    ) {
    }

    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tour_departure_id' => ['required', 'integer', 'exists:tour_departures,id'],
            'quantity_summary' => ['required', 'array', 'min:1', 'max:20'],
            'quantity_summary.*.rule_id' => ['nullable', 'integer', 'exists:tour_age_pricing_rules,id'],
            'quantity_summary.*.quantity' => ['required', 'integer', 'min:0', 'max:20'],
        ]);

        $departure = TourDeparture::query()->findOrFail($data['tour_departure_id']);
        $tour = Tour::query()
            ->with('agePricingRules')
            ->findOrFail($departure->tour_id);

        $this->ensureDepartureCanBeBooked($tour, $departure);

        $summary = $this->buildQuantityPricing($tour, $departure, $data['quantity_summary']);
        $availableSlots = (int) $departure->total_slots - (int) $departure->booked_slots;

        if ($summary['total_people'] < 1) {
            throw ValidationException::withMessages([
                'quantity_summary' => 'Vui lòng chọn ít nhất 1 người tham gia.',
            ]);
        }

        if ($availableSlots < $summary['total_people']) {
            throw ValidationException::withMessages([
                'quantity_summary' => "Lịch này chỉ còn {$availableSlots} chỗ trống.",
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Tính giá đặt tour thành công.',
            'data' => [
                'tour_departure_id' => $departure->id,
                'departure_date' => $departure->departure_date?->toDateString(),
                'return_date' => $departure->return_date?->toDateString(),
                'adult_price' => $summary['adult_price'],
                'available_slots' => $availableSlots,
                'total_people' => $summary['total_people'],
                'subtotal' => $summary['subtotal'],
                'discount_amount' => 0,
                'total_amount' => $summary['subtotal'],
                'pricing_groups' => $summary['groups'],
            ],
        ]);
    }

    public function store(StoreBookingRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        $booking = DB::transaction(function () use ($data, $user) {
            // Khóa lịch khởi hành để tránh overbooking khi nhiều người đặt cùng lúc
            $departure = TourDeparture::query()
                ->lockForUpdate()
                ->findOrFail($data['tour_departure_id']);

            // Tour dùng SoftDelete thì query này tự bỏ tour đã bị xóa mềm
            $tour = Tour::query()
                ->with('agePricingRules')
                ->lockForUpdate()
                ->findOrFail($departure->tour_id);

            $this->ensureDepartureCanBeBooked($tour, $departure);

            $numberOfPeople = (int) $data['number_of_people'];

            $availableSlots = (int) $departure->total_slots
                - (int) $departure->booked_slots;

            if ($availableSlots < $numberOfPeople) {
                throw ValidationException::withMessages([
                    'number_of_people' => [
                        "Lịch này chỉ còn {$availableSlots} chỗ trống.",
                    ],
                ]);
            }

            // Giá lịch khởi hành được ưu tiên.
            // Nếu lịch chưa có giá thì lấy giá khuyến mãi tour, sau đó mới lấy giá gốc.
            $unitPrice = $this->tourPricingService->resolveAdultPrice($tour, $departure);

            if ($unitPrice <= 0) {
                throw ValidationException::withMessages([
                    'tour_departure_id' => [
                        'Lịch khởi hành chưa có giá hợp lệ.',
                    ],
                ]);
            }

            $discountAmount = 0;
            $hasActiveAgePricingRules = $tour->agePricingRules
                ->where('is_active', true)
                ->isNotEmpty();
            $pricedParticipants = collect($data['participants'])
                ->map(function (array $participant, int $index) use ($tour, $departure, $hasActiveAgePricingRules) {
                    $birthDate = Carbon::parse($participant['birth_date']);
                    $pricing = $this->tourPricingService->calculateParticipantPrice(
                        $tour,
                        $departure,
                        $birthDate,
                        $departure->departure_date
                    );
                    $rule = $pricing['rule'];

                    if ($hasActiveAgePricingRules && ! $rule) {
                        throw ValidationException::withMessages([
                            "participants.{$index}.birth_date" => 'Không tìm thấy quy tắc giá phù hợp cho hành khách này.',
                        ]);
                    }

                    return [
                        'full_name' => $participant['full_name'],
                        'phone' => $participant['phone'] ?? null,
                        'birth_date' => $birthDate->toDateString(),
                        'gender' => $participant['gender'] ?? null,
                        'identity_number' => $participant['identity_number'] ?? null,
                        'participant_type' => $participant['participant_type'],
                        'unit_price' => $pricing['unit_price'],
                        'pricing_rule_label' => $rule?->label ?? 'Người lớn mặc định',
                        'pricing_type' => $rule?->pricing_type ?? 'percentage',
                        'pricing_value' => $rule?->price_value ?? 100,
                        '_pricing_rule_id' => $rule?->id,
                    ];
                });

            if (! empty($data['quantity_summary'])) {
                $this->ensureParticipantCountMatchesQuantitySummary(
                    $data['quantity_summary'],
                    $pricedParticipants->all()
                );
            }

            $participantsForInsert = $pricedParticipants
                ->map(function (array $participant) {
                    unset($participant['_pricing_rule_id']);
                    return $participant;
                });
            $totalAmount = round(max(0, $pricedParticipants->sum('unit_price') - $discountAmount), 2);

            $booking = Booking::create([
                'booking_code' => 'BK-' . Str::upper((string) Str::ulid()),
                'user_id' => $user->id,
                'tour_id' => $tour->id,
                'tour_departure_id' => $departure->id,

                // Chưa xử lý mã khuyến mãi thì để null / 0
                'promotion_id' => null,
                'staff_id' => null,

                'number_of_people' => $numberOfPeople,
                'unit_price' => $unitPrice,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,

                // Đổi lại nếu ENUM/status của bạn dùng tên khác
                'status' => 'pending',
                'payment_status' => 'unpaid',

                'note' => $data['note'] ?? null,
            ]);

            $booking->contact()->create([
                'contact_name' => $data['contact']['contact_name'],
                'contact_email' => $data['contact']['contact_email'] ?? null,
                'contact_phone' => $data['contact']['contact_phone'],
                'address' => $data['contact']['address'] ?? null,
                'special_request' => $data['contact']['special_request'] ?? null,
            ]);

            $booking->participants()->createMany($participantsForInsert->all());

            $booking->statusHistories()->create([
                'changed_by' => $user->id,
                'old_status' => null,
                'new_status' => 'pending',
                'note' => 'Khách hàng tạo đơn đặt tour.',
            ]);

            // Chỉ tăng booked_slots của lịch cụ thể
            $departure->booked_slots += $numberOfPeople;
            $departure->save();

            return $booking;
        }, 3);

        $booking->load([
            'tour:id,title,slug',
            'tourDeparture:id,tour_id,departure_date,return_date,price,total_slots,booked_slots,status',
            'contact',
            'participants',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đặt tour thành công. Vui lòng chờ xác nhận thanh toán.',
            'data' => $booking,
        ], 201);
    }

    private function ensureDepartureCanBeBooked(Tour $tour, TourDeparture $departure): void
    {
        if ($tour->status !== 'published') {
            throw ValidationException::withMessages([
                'tour_departure_id' => ['Tour hiện chưa sẵn sàng để đặt.'],
            ]);
        }

        if ($departure->status !== 'open') {
            throw ValidationException::withMessages([
                'tour_departure_id' => ['Lịch khởi hành hiện không mở để đặt.'],
            ]);
        }

        if ($departure->departure_date->isBefore(today())) {
            throw ValidationException::withMessages([
                'tour_departure_id' => ['Lịch khởi hành này đã qua.'],
            ]);
        }
    }

    private function buildQuantityPricing(Tour $tour, TourDeparture $departure, array $quantitySummary): array
    {
        $adultPrice = $this->tourPricingService->resolveAdultPrice($tour, $departure);

        if ($adultPrice <= 0) {
            throw ValidationException::withMessages([
                'tour_departure_id' => ['Lịch khởi hành chưa có giá hợp lệ.'],
            ]);
        }

        $activeRules = $tour->agePricingRules
            ->where('is_active', true)
            ->keyBy('id');
        $groups = [];
        $totalPeople = 0;
        $subtotal = 0;

        foreach ($quantitySummary as $index => $item) {
            $quantity = (int) ($item['quantity'] ?? 0);

            if ($quantity < 1) {
                continue;
            }

            $ruleId = $item['rule_id'] ?? null;
            $rule = $ruleId ? $activeRules->get((int) $ruleId) : null;

            if ($activeRules->isNotEmpty() && ! $rule) {
                throw ValidationException::withMessages([
                    "quantity_summary.{$index}.rule_id" => 'Nhóm giá đã chọn không hợp lệ cho tour này.',
                ]);
            }

            $unitPrice = $this->calculateUnitPriceFromRule($adultPrice, $rule);
            $lineTotal = round($unitPrice * $quantity, 2);
            $totalPeople += $quantity;
            $subtotal += $lineTotal;

            $groups[] = [
                'rule_id' => $rule?->id,
                'label' => $rule?->label ?? 'Người lớn mặc định',
                'pricing_type' => $rule?->pricing_type ?? 'percentage',
                'price_value' => $rule?->price_value ?? 100,
                'unit_price' => $unitPrice,
                'quantity' => $quantity,
                'line_total' => $lineTotal,
            ];
        }

        return [
            'adult_price' => $adultPrice,
            'total_people' => $totalPeople,
            'subtotal' => round($subtotal, 2),
            'groups' => $groups,
        ];
    }

    private function calculateUnitPriceFromRule(float $adultPrice, $rule): float
    {
        if (! $rule) {
            return $adultPrice;
        }

        return match ($rule->pricing_type) {
            'free' => 0.0,
            'fixed' => (float) $rule->price_value,
            default => round($adultPrice * ((float) $rule->price_value) / 100, 2),
        };
    }

    private function ensureParticipantCountMatchesQuantitySummary(array $quantitySummary, array $participants): void
    {
        $expected = collect($quantitySummary)
            ->filter(fn ($item) => (int) ($item['quantity'] ?? 0) > 0)
            ->mapWithKeys(fn ($item) => [
                (string) ($item['rule_id'] ?? 'adult_default') => (int) $item['quantity'],
            ]);

        $actual = collect($participants)
            ->groupBy(fn ($participant) => $participant['_pricing_rule_id'] === null
                ? 'adult_default'
                : (string) $participant['_pricing_rule_id'])
            ->map(fn ($items) => $items->count());

        foreach ($expected as $key => $count) {
            if ((int) ($actual[$key] ?? 0) !== $count) {
                throw ValidationException::withMessages([
                    'participants' => 'Thông tin người tham gia chưa khớp với số lượng đã chọn.',
                ]);
            }
        }
    }
}
