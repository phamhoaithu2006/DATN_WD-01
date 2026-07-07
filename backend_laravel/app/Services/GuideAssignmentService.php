<?php

namespace App\Services;

use App\Models\Guide;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\TourGuideAssignment;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GuideAssignmentService
{
    /**
     * Số ngày HDV phải nghỉ giữa hai tour.
     * Mặc định: 1 ngày.
     */
    private function restDays(): int
    {
        return (int) config('tour.guide_rest_days', 1);
    }

    /**
     * Đảm bảo lấy đủ dữ liệu Tour:
     * - destination_id trong bảng tours
     * - destinations trong bảng pivot tour_destinations
     *
     * Có xử lý trường hợp controller chỉ load tour:id,title
     * nên thiếu destination_id.
     */
    private function getTourForDeparture(
        TourDeparture $departure
    ): ?Tour {
        $tour = $departure->relationLoaded('tour')
            ? $departure->getRelation('tour')
            : null;

        $needsReload =
            !$tour ||
            !$tour->relationLoaded('destinations') ||
            !array_key_exists(
                'destination_id',
                $tour->getAttributes()
            );

        if ($needsReload) {
            $tour = Tour::query()
                ->with('destinations')
                ->find($departure->tour_id);

            if ($tour) {
                $departure->setRelation('tour', $tour);
            }
        }

        return $tour;
    }

    /**
     * Lấy toàn bộ ID điểm đến của tour.
     *
     * Nguồn dữ liệu:
     * 1. Pivot tour_destinations
     * 2. destination_id trong bảng tours
     */
    private function getDestinationIds(
        TourDeparture $departure
    ): Collection {
        $tour = $this->getTourForDeparture($departure);

        if (!$tour) {
            return collect();
        }

        $destinationIds = $tour->destinations
            ->pluck('id')
            ->push($tour->destination_id)
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        return $destinationIds;
    }

    /**
     * Query HDV đủ điều kiện cho lịch khởi hành.
     *
     * HDV phải:
     * - Đang active
     * - Có tài khoản user
     * - Phụ trách toàn bộ điểm đến của tour
     * - Không trùng lịch
     * - Có đủ ngày nghỉ giữa hai tour
     */
    public function eligibleGuidesQuery(
        TourDeparture $departure
    ): Builder {
        $destinationIds = $this->getDestinationIds($departure);

        if ($destinationIds->isEmpty()) {
            return Guide::query()->whereRaw('1 = 0');
        }

        [$startDate, $endDate] = $this->dateRange($departure);

        $blockedStart = $startDate
            ->copy()
            ->subDays($this->restDays());

        $blockedEnd = $endDate
            ->copy()
            ->addDays($this->restDays());

        $query = Guide::query()
            ->with([
                'user:id,full_name,email,avatar_url',
                'destinations:id,name,province_city',
            ])
            ->where('status', 'active')
            ->whereHas('user');

        /*
        | HDV phải phụ trách tất cả điểm đến.
        |
        | Ví dụ tour có Đà Lạt + Nha Trang:
        | HDV phải có cả Đà Lạt và Nha Trang.
        */
        foreach ($destinationIds as $destinationId) {
            $query->whereHas(
                'destinations',
                function (Builder $destinationQuery) use (
                    $destinationId
                ) {
                    $destinationQuery->where(
                        'destinations.id',
                        $destinationId
                    );
                }
            );
        }

        /*
        | Loại HDV bị trùng lịch.
        |
        | Ví dụ:
        | Tour cũ: 08/07 - 11/07
        | HDV nghỉ: 12/07
        | Tour mới từ 13/07 mới hợp lệ.
        */
        $query->whereDoesntHave(
            'assignments',
            function (Builder $assignmentQuery) use (
                $departure,
                $blockedStart,
                $blockedEnd
            ) {
                $assignmentQuery
                    ->where('status', 'assigned')
                    ->whereHas(
                        'departure',
                        function (Builder $departureQuery) use (
                            $departure,
                            $blockedStart,
                            $blockedEnd
                        ) {
                            $departureQuery
                                ->where(
                                    'id',
                                    '!=',
                                    $departure->id
                                )
                                ->whereDate(
                                    'departure_date',
                                    '<=',
                                    $blockedEnd->toDateString()
                                )
                                ->whereRaw(
                                    'COALESCE(return_date, departure_date) >= ?',
                                    [$blockedStart->toDateString()]
                                );
                        }
                    );
            }
        );

        /*
        | Ưu tiên:
        | 1. HDV có ít tour tương lai hơn
        | 2. Nhiều năm kinh nghiệm hơn
        | 3. ID nhỏ hơn
        */
        return $query
            ->withCount([
                'assignments as upcoming_assignments_count' => function (
                    Builder $assignmentQuery
                ) {
                    $assignmentQuery
                        ->where('status', 'assigned')
                        ->whereHas(
                            'departure',
                            function (Builder $departureQuery) {
                                $departureQuery->whereRaw(
                                    'COALESCE(return_date, departure_date) >= ?',
                                    [today()->toDateString()]
                                );
                            }
                        );
                },
            ])
            ->orderBy('upcoming_assignments_count')
            ->orderByDesc('experience_years')
            ->orderBy('id');
    }

    /**
     * Kiểm tra một HDV có trùng lịch hay không.
     */
    public function hasScheduleConflict(
        Guide $guide,
        TourDeparture $departure
    ): bool {
        [$startDate, $endDate] = $this->dateRange($departure);

        $blockedStart = $startDate
            ->copy()
            ->subDays($this->restDays());

        $blockedEnd = $endDate
            ->copy()
            ->addDays($this->restDays());

        return $guide->assignments()
            ->where('status', 'assigned')
            ->whereHas(
                'departure',
                function (Builder $departureQuery) use (
                    $departure,
                    $blockedStart,
                    $blockedEnd
                ) {
                    $departureQuery
                        ->where('id', '!=', $departure->id)
                        ->whereDate(
                            'departure_date',
                            '<=',
                            $blockedEnd->toDateString()
                        )
                        ->whereRaw(
                            'COALESCE(return_date, departure_date) >= ?',
                            [$blockedStart->toDateString()]
                        );
                }
            )
            ->exists();
    }

    /**
     * Tự động chọn HDV phù hợp nhất.
     */
    public function autoAssign(
        int $departureId,
        ?int $assignedBy = null
    ): TourGuideAssignment {
        return DB::transaction(function () use (
            $departureId,
            $assignedBy
        ) {
            $departure = TourDeparture::query()
                ->with('tour.destinations')
                ->lockForUpdate()
                ->findOrFail($departureId);

            $currentAssignment = $departure->guideAssignments()
                ->where('status', 'assigned')
                ->where('role', 'lead')
                ->first();

            /*
            | Bấm tự động phân công nhiều lần
            | sẽ không tạo thêm assignment trùng.
            */
            if ($currentAssignment) {
                return $currentAssignment->load([
                    'guide.user',
                    'guide.destinations',
                ]);
            }

            $guide = $this->eligibleGuidesQuery($departure)
                ->lockForUpdate()
                ->first();

            if (
                !$guide ||
                $this->hasScheduleConflict($guide, $departure)
            ) {
                throw ValidationException::withMessages([
                    'guide' => [
                        'Không còn hướng dẫn viên phù hợp và trống lịch cho lịch khởi hành này.',
                    ],
                ]);
            }

            return TourGuideAssignment::create([
                'tour_departure_id' => $departure->id,
                'guide_id' => $guide->id,
                'role' => 'lead',
                'status' => 'assigned',
                'assigned_by' => $assignedBy,
                'assigned_at' => now(),
            ])->load([
                'guide.user',
                'guide.destinations',
            ]);
        }, 3);
    }

    /**
     * Admin chọn một HDV cụ thể.
     */
    public function assignSpecific(
        TourDeparture $departure,
        int $guideId,
        ?int $assignedBy = null
    ): TourGuideAssignment {
        return DB::transaction(function () use (
            $departure,
            $guideId,
            $assignedBy
        ) {
            $departure = TourDeparture::query()
                ->with('tour.destinations')
                ->lockForUpdate()
                ->findOrFail($departure->id);

            $alreadyHasLeadGuide = $departure->guideAssignments()
                ->where('status', 'assigned')
                ->where('role', 'lead')
                ->exists();

            if ($alreadyHasLeadGuide) {
                throw ValidationException::withMessages([
                    'departure' => [
                        'Lịch này đã có HDV chính. Hãy hủy phân công cũ trước khi thay thế.',
                    ],
                ]);
            }

            $guide = $this->eligibleGuidesQuery($departure)
                ->whereKey($guideId)
                ->lockForUpdate()
                ->first();

            if (
                !$guide ||
                $this->hasScheduleConflict($guide, $departure)
            ) {
                throw ValidationException::withMessages([
                    'guide_id' => [
                        'HDV không phụ trách đúng khu vực hoặc không còn trống lịch.',
                    ],
                ]);
            }

            return TourGuideAssignment::create([
                'tour_departure_id' => $departure->id,
                'guide_id' => $guide->id,
                'role' => 'lead',
                'status' => 'assigned',
                'assigned_by' => $assignedBy,
                'assigned_at' => now(),
            ])->load([
                'guide.user',
                'guide.destinations',
            ]);
        }, 3);
    }

    /**
     * Chuẩn hóa ngày đi và ngày về.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    private function dateRange(
        TourDeparture $departure
    ): array {
        $startDate = Carbon::parse(
            $departure->departure_date
        )->startOfDay();

        $endDate = Carbon::parse(
            $departure->return_date ?: $departure->departure_date
        )->startOfDay();

        return [$startDate, $endDate];
    }
}