<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\TourDepartureResource;
use App\Models\Booking;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Services\TourDepartureChangeNotificationService;
use App\Services\TourDepartureMutationGuard;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TourDepartureController extends Controller
{
    /**
     * GET /api/admin/tours/{tourId}/departures
     */
    public function index($tourId)
    {
        $tour = Tour::findOrFail($tourId);

        $departures = TourDeparture::query()
            ->where('tour_id', $tour->id)
            ->with([
                'tour:id,title,slug,duration_days,duration_nights',
                'guideAssignments' => function ($query) {
                    $query
                        ->where('status', 'assigned')
                        ->with([
                            'guide:id,user_id,guide_code',
                            'guide.user:id,full_name,email,avatar_url',
                        ]);
                },
            ])
            ->withCount([
                'bookings as active_bookings_count' => function ($query) {
                    $query->whereNotIn('status', [
                        'cancelled',
                        'canceled',
                    ]);
                },
            ])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        $today = now()->startOfDay();

        $departures->each(function (TourDeparture $departure) use ($today) {
            $assignedGuides = $departure->guideAssignments->values();

            $leadAssignment = $assignedGuides->first(function ($assignment) {
                return $assignment->status === 'assigned' &&
                    ($assignment->role === 'lead' || !$assignment->role);
            });

            // Lịch trước hôm nay là lịch đã qua.
            $isLocked = Carbon::parse($departure->departure_date)
                ->startOfDay()
                ->lt($today);

            $departure->setAttribute(
                'assigned_guides',
                $assignedGuides
            );

            $departure->setAttribute(
                'assignment_state',
                $leadAssignment ? 'assigned' : 'available'
            );

            /*
             * Alias hỗ trợ frontend.
             * Cột thật trong database vẫn là price.
             */
            $departure->setAttribute(
                'departure_base_price',
                $departure->price
            );

            $departure->setAttribute(
                'departure_discount_price',
                $departure->discount_price
            );

            $departure->setAttribute(
                'schedule_group',
                $isLocked ? 'past' : 'upcoming'
            );

            $departure->setAttribute(
                'is_locked',
                $isLocked
            );

            $departure->setAttribute(
                'has_bookings',
                (int) $departure->active_bookings_count > 0
            );

            $departure->setAttribute(
                'available_slots',
                max(
                    0,
                    (int) $departure->total_slots -
                        (int) $departure->booked_slots
                )
            );
        });

        return response()->json([
            'message' => 'Danh sách lịch khởi hành',
            'data' => $departures,
        ]);
    }

    /**
     * POST /api/admin/tours/{tourId}/departures
     */
    public function store(Request $request, $tourId)
    {
        $tour = Tour::findOrFail($tourId);

        $validatedData = $request->validate([
            'departure_date' => [
                'required',
                'date',
                'after_or_equal:today',
            ],
            'base_price' => [
                'nullable',
                'required_with:discount_price',
                'numeric',
                'min:0',
            ],
            'discount_price' => [
                'nullable',
                'numeric',
                'min:0',
            ],
            'total_slots' => [
                'required',
                'integer',
                'min:1',
            ],
            'status' => [
                'required',
                'in:open,closed,completed,cancelled',
            ],
        ]);

        /*
         * base_price từ frontend sẽ được đổi thành price
         * trước khi insert database.
         */
        $this->normalizeDeparturePrices($validatedData);

        $validatedData['tour_id'] = $tour->id;

        $validatedData['return_date'] = $this->calculateReturnDate(
            $tour,
            $validatedData['departure_date']
        );

        $validatedData['booked_slots'] = 0;

        $departure = TourDeparture::create($validatedData);

        return response()->json([
            'status' => 'success',
            'message' => 'Thêm lịch khởi hành thành công',
            'data' => new TourDepartureResource(
                $departure->load('tour')
            ),
        ], 201, [], JSON_PRESERVE_ZERO_FRACTION);
    }

    /**
     * PUT /api/admin/tours/departures/{id}
     */
    public function update(
        Request $request,
        $id,
        TourDepartureMutationGuard $guard,
        TourDepartureChangeNotificationService $notificationService
    ) {
        $tourDeparture = TourDeparture::with('tour')->findOrFail($id);

        // Không cho sửa lịch đã qua
        $guard->assertCanMutate($tourDeparture);

        $validated = $request->validate([
            'departure_date' => [
                'sometimes',
                'date',
                'after_or_equal:today',
            ],
            'base_price' => [
                'nullable',
                'numeric',
                'min:0',
            ],
            'discount_price' => [
                'nullable',
                'numeric',
                'min:0',
            ],
            'total_slots' => [
                'sometimes',
                'integer',
                'min:1',
            ],
            'status' => [
                'sometimes',
                'in:open,closed,completed,cancelled',
            ],
            'confirm_booked_change' => [
                'nullable',
                'boolean',
            ],
            'change_reason' => [
                'required',
                'string',
                'min:3',
                'max:1000',
            ],
        ]);

        $confirmed = filter_var(
            $validated['confirm_booked_change'] ?? false,
            FILTER_VALIDATE_BOOLEAN
        );

        $changeReason = trim(
            (string) $validated['change_reason']
        );

        /*
     * Không đưa change_reason và confirm_booked_change
     * vào bảng tour_departures.
     */
        $payload = Arr::except($validated, [
            'confirm_booked_change',
            'change_reason',
        ]);

        /*
     * Database dùng price, không dùng base_price.
     */
        $trackedFields = [
            'departure_date',
            'return_date',
            'price',
            'discount_price',
            'total_slots',
            'status',
        ];

        /*
     * Lấy dữ liệu cũ trước khi fill dữ liệu mới.
     */
        $oldValues = Arr::only(
            $tourDeparture->getRawOriginal(),
            $trackedFields
        );

        /*
     * Đổi ngày đi thì tự tính lại ngày về.
     */
        if (array_key_exists('departure_date', $payload)) {
            $payload['return_date'] = $this->calculateReturnDate(
                $tourDeparture->tour,
                $payload['departure_date']
            );
        }

        /*
     * Chuyển base_price frontend gửi lên thành price
     * để lưu đúng cột database.
     */
        $this->normalizeUpdatedPrices(
            $tourDeparture,
            $payload
        );

        /*
     * Không được giảm tổng chỗ thấp hơn số chỗ đã đặt.
     */
        if (
            array_key_exists('total_slots', $payload) &&
            (int) $payload['total_slots'] <
            (int) $tourDeparture->booked_slots
        ) {
            throw ValidationException::withMessages([
                'total_slots' => [
                    'Tổng số chỗ không được nhỏ hơn số chỗ đã đặt.',
                ],
            ]);
        }

        $tourDeparture->fill($payload);

        /*
     * Lấy chính xác field có thay đổi,
     * kèm giá trị cũ và giá trị mới.
     */
        $dirtyValues = Arr::only(
            $tourDeparture->getDirty(),
            $trackedFields
        );

        $changes = collect($dirtyValues)
            ->map(function ($newValue, $field) use ($oldValues) {
                return [
                    'field' => $field,
                    'old' => $oldValues[$field] ?? null,
                    'new' => $newValue,
                ];
            })
            ->values()
            ->all();

        if (empty($changes)) {
            return response()->json([
                'message' => 'Không có thông tin nào thay đổi.',
                'data' => $tourDeparture,
            ]);
        }

        $bookingCount = Booking::query()
            ->where('tour_departure_id', $tourDeparture->id)
            ->whereNotIn('status', [
                'cancelled',
                'canceled',
            ])
            ->count();

        /*
     * Có khách đặt thì admin phải xác nhận.
     */
        if ($bookingCount > 0 && !$confirmed) {
            return response()->json([
                'message' => 'Lịch này đã có khách đặt tour. Vui lòng xác nhận trước khi thay đổi.',
                'requires_confirmation' => true,
                'booking_count' => $bookingCount,
                'code' => 'BOOKED_DEPARTURE_CONFIRMATION_REQUIRED',
            ], 409);
        }

        $notificationResult = null;

        DB::transaction(function () use (
            $tourDeparture,
            $bookingCount,
            $changes,
            $changeReason,
            $notificationService,
            &$notificationResult
        ) {
            $tourDeparture->save();

            /*
         * Có booking thì tự gửi thông báo cho khách và HDV.
         */
            if ($bookingCount > 0) {
                $notificationResult =
                    $notificationService->sendForUpdatedDeparture(
                        $tourDeparture,
                        $changes,
                        $changeReason
                    );
            }
        });

        return response()->json([
            'message' => $bookingCount > 0
                ? 'Cập nhật thành công và đã gửi thông báo.'
                : 'Cập nhật lịch khởi hành thành công.',

            'data' => $tourDeparture->fresh()->load('tour'),
            'changes' => $changes,
            'notification' => $notificationResult,
        ]);
    }

    /**
     * DELETE /api/admin/tours/departures/{id}
     */
    public function destroy(
        $id,
        TourDepartureMutationGuard $guard
    ) {
        $departure = TourDeparture::findOrFail($id);

        $guard->assertCanMutate($departure);

        if ($departure->bookings()->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không thể xóa lịch khởi hành này vì đã có booking liên kết. Vui lòng xử lý booking trước.',
            ], 422);
        }

        $departure->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Đã xóa lịch khởi hành thành công',
        ]);
    }

    private function calculateReturnDate(
        Tour $tour,
        string $departureDate
    ): string {
        $durationNights = max(
            (int) $tour->duration_nights,
            0
        );

        return Carbon::parse($departureDate)
            ->addDays($durationNights)
            ->toDateString();
    }

    /*
     * Nhận base_price từ frontend,
     * chuyển về price trước khi create/update database.
     */
    private function normalizeDeparturePrices(array &$data): void
    {
        $basePrice = $data['base_price'] ?? null;
        $discountPrice = $data['discount_price'] ?? null;

        if ($basePrice === '') {
            $basePrice = null;
        }

        if ($discountPrice === '') {
            $discountPrice = null;
        }

        /*
         * Xóa field không tồn tại trong database.
         */
        unset($data['base_price']);

        if ($basePrice === null) {
            $data['price'] = null;
            $data['discount_price'] = null;

            return;
        }

        if (
            $discountPrice !== null &&
            (float) $discountPrice > (float) $basePrice
        ) {
            throw ValidationException::withMessages([
                'discount_price' => [
                    'Giá giảm của lịch không được lớn hơn giá gốc.',
                ],
            ]);
        }

        $data['price'] = (float) $basePrice;

        $data['discount_price'] = $discountPrice !== null
            ? (float) $discountPrice
            : null;
    }

    private function normalizeUpdatedPrices(
        TourDeparture $tourDeparture,
        array &$payload
    ): void {
        $hasBasePrice = array_key_exists(
            'base_price',
            $payload
        );

        $hasDiscountPrice = array_key_exists(
            'discount_price',
            $payload
        );

        if (!$hasBasePrice && !$hasDiscountPrice) {
            return;
        }

        $priceData = [
            'base_price' => $hasBasePrice
                ? $payload['base_price']
                : $tourDeparture->price,

            'discount_price' => $hasDiscountPrice
                ? $payload['discount_price']
                : $tourDeparture->discount_price,
        ];

        $this->normalizeDeparturePrices($priceData);

        /*
         * Không cho base_price đi vào fill(),
         * vì bảng tour_departures không có cột này.
         */
        unset($payload['base_price']);

        $payload['price'] = $priceData['price'];
        $payload['discount_price'] =
            $priceData['discount_price'];
    }
}
