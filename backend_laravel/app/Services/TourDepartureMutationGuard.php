<?php

namespace App\Services;

use App\Models\TourDeparture;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class TourDepartureMutationGuard
{
    public function isLocked(TourDeparture $departure): bool
    {
        if (in_array(strtolower((string) $departure->status), ['completed', 'cancelled', 'canceled'], true)) {
            return true;
        }

        return Carbon::parse($departure->departure_date)
            ->startOfDay()
            ->lte(now()->startOfDay());
    }

    public function assertCanMutate(TourDeparture $departure): void
    {
        if ($this->isLocked($departure)) {
            $status = strtolower((string) $departure->status);
            $departureDate = Carbon::parse($departure->departure_date)->startOfDay();
            $returnDate = Carbon::parse($departure->return_date ?: $departure->departure_date)->endOfDay();

            $message = match (true) {
                in_array($status, ['cancelled', 'canceled'], true) => 'Lịch khởi hành đã hủy nên không thể chỉnh sửa hoặc phân công HDV.',
                $status === 'completed', now()->greaterThan($returnDate) => 'Lịch khởi hành đã hoàn thành nên không thể chỉnh sửa hoặc phân công HDV.',
                $departureDate->lte(now()->startOfDay()) => 'Lịch khởi hành đang diễn ra nên không thể chỉnh sửa hoặc phân công HDV.',
                default => 'Trạng thái lịch khởi hành hiện tại không cho phép chỉnh sửa hoặc phân công HDV.',
            };

            throw ValidationException::withMessages([
                'departure' => [$message],
            ]);
        }
    }

    public function assertCanManageGuideAssignment(TourDeparture $departure): void
    {
        $status = strtolower((string) $departure->status);
        $returnDate = Carbon::parse($departure->return_date ?: $departure->departure_date)->endOfDay();

        if (! in_array($status, ['completed', 'cancelled', 'canceled'], true) && now()->lessThanOrEqualTo($returnDate)) {
            return;
        }

        $message = in_array($status, ['cancelled', 'canceled'], true)
            ? 'Lịch khởi hành đã hủy nên không thể phân công HDV.'
            : 'Lịch khởi hành đã hoàn thành nên không thể phân công HDV.';

        throw ValidationException::withMessages([
            'departure' => [$message],
        ]);
    }
}
