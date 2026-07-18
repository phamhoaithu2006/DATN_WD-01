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
use Illuminate\Support\Facades\Schema;
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
                    ->whereIn('status', ['assigned', 'confirmed'])
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
        | Ưu tiên tự động phân công công bằng:
        | 1. HDV có tổng số ngày tour đã nhận ít hơn
        | 2. Nếu bằng ngày, HDV có số tour ít hơn
        | 3. Nếu vẫn bằng, HDV lâu chưa được phân công hơn
        | 4. Nếu vẫn bằng, ưu tiên kinh nghiệm rồi ID nhỏ hơn
        */
        return $this->applyFairWorkloadOrder($query, $departure);
    }

    /**
     * Sắp xếp HDV theo tải công việc để tự động phân công công bằng hơn.
     *
     * Cách cân bằng:
     * - Chỉ xét các HDV đã qua đủ điều kiện ở eligibleGuidesQuery().
     * - Tính tải công việc trong cùng năm với lịch khởi hành đang phân công.
     * - Ưu tiên người có tổng số ngày tour ít hơn trước.
     * - Sau đó xét số lượng tour, thời điểm phân công gần nhất, kinh nghiệm và ID.
     */
    private function applyFairWorkloadOrder(
        Builder $query,
        TourDeparture $departure
    ): Builder {
        [$startDate] = $this->dateRange($departure);

        $workloadFrom = $startDate
            ->copy()
            ->startOfYear()
            ->toDateString();

        $workloadTo = $startDate
            ->copy()
            ->endOfYear()
            ->toDateString();

        $assignmentDeletedAtCondition = Schema::hasColumn(
            'tour_guide_assignments',
            'deleted_at'
        )
            ? 'AND {alias}.deleted_at IS NULL'
            : '';

        $countDeletedAtCondition = str_replace(
            '{alias}',
            'tga_count',
            $assignmentDeletedAtCondition
        );

        $daysDeletedAtCondition = str_replace(
            '{alias}',
            'tga_days',
            $assignmentDeletedAtCondition
        );

        $lastDeletedAtCondition = str_replace(
            '{alias}',
            'tga_last',
            $assignmentDeletedAtCondition
        );

        /*
        | Đếm số tour HDV đã nhận trong năm của lịch khởi hành.
        */
        $workloadCountSql = "
            SELECT COUNT(*)
            FROM tour_guide_assignments AS tga_count
            INNER JOIN tour_departures AS td_count
                ON td_count.id = tga_count.tour_departure_id
            WHERE tga_count.guide_id = guides.id
                AND tga_count.status IN ('assigned', 'confirmed')
                AND tga_count.tour_departure_id != ?
                {$countDeletedAtCondition}
                AND DATE(td_count.departure_date) <= ?
                AND DATE(COALESCE(td_count.return_date, td_count.departure_date)) >= ?
        ";

        /*
        | Tính tổng số ngày tour HDV đã nhận trong năm.
        | Tour dài ngày sẽ được tính nặng hơn tour ngắn ngày.
        */
        $workloadDaysSql = "
            SELECT COALESCE(
                SUM(
                    DATEDIFF(
                        DATE(COALESCE(td_days.return_date, td_days.departure_date)),
                        DATE(td_days.departure_date)
                    ) + 1
                ),
                0
            )
            FROM tour_guide_assignments AS tga_days
            INNER JOIN tour_departures AS td_days
                ON td_days.id = tga_days.tour_departure_id
            WHERE tga_days.guide_id = guides.id
                AND tga_days.status IN ('assigned', 'confirmed')
                AND tga_days.tour_departure_id != ?
                {$daysDeletedAtCondition}
                AND DATE(td_days.departure_date) <= ?
                AND DATE(COALESCE(td_days.return_date, td_days.departure_date)) >= ?
        ";

        /*
        | Lấy lần phân công gần nhất.
        | Người lâu chưa nhận việc sẽ được ưu tiên hơn nếu tải công việc bằng nhau.
        */
        $lastAssignedSql = "
            SELECT MAX(tga_last.assigned_at)
            FROM tour_guide_assignments AS tga_last
            WHERE tga_last.guide_id = guides.id
                AND tga_last.status IN ('assigned', 'confirmed')
                {$lastDeletedAtCondition}
        ";

        $query
            ->select('guides.*')
            ->selectRaw("({$workloadDaysSql}) AS workload_days", [
                $departure->id,
                $workloadTo,
                $workloadFrom,
            ])
            ->selectRaw("({$workloadCountSql}) AS workload_count", [
                $departure->id,
                $workloadTo,
                $workloadFrom,
            ])
            ->selectRaw("({$lastAssignedSql}) AS last_assigned_at")
            ->orderBy('workload_days', 'asc')
            ->orderBy('workload_count', 'asc')
            ->orderByRaw('last_assigned_at IS NULL DESC')
            ->orderBy('last_assigned_at', 'asc');

        if (Schema::hasColumn('guides', 'experience_years')) {
            $query->orderByDesc('experience_years');
        }

        return $query->orderBy('guides.id', 'asc');
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
            ->whereIn('status', ['assigned', 'confirmed'])
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
                ->whereIn('status', ['assigned', 'confirmed'])
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
                ->whereIn('status', ['assigned', 'confirmed'])
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
