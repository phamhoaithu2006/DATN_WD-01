<?php

namespace App\Services;

use App\Models\TourDeparture;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class TourDepartureMutationGuard
{
    public function isLocked(TourDeparture $departure): bool
    {
        return Carbon::parse($departure->departure_date)
            ->startOfDay()
            ->lte(now()->startOfDay());
    }

    public function assertCanMutate(TourDeparture $departure): void
    {
        if ($this->isLocked($departure)) {
            throw ValidationException::withMessages([
                'departure' => [
                    'Lịch khởi hành đã bắt đầu hoặc đã qua nên không thể chỉnh sửa hay phân công HDV.',
                ],
            ]);
        }
    }
}