<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Guide;
use App\Models\Province;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\TourDepartureStatusHistory;
use App\Models\TourGuideAssignment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class CancelledTourSeeder extends Seeder
{
    public const TOUR_SLUG = 'tour-mau-da-huy-do-thoi-tiet';

    public const DEPARTURE_DATE = '2026-09-18';

    private const CANCELLATION_REASON = 'weather_disaster';

    public function run(): void
    {
        DB::transaction(function (): void {
            $admin = $this->resolveAdmin();
            $category = Category::query()
                ->where('status', 'active')
                ->orderBy('id')
                ->first();
            $province = Province::query()->orderBy('id')->first();
            $guide = Guide::query()
                ->where('status', 'active')
                ->orderBy('id')
                ->first();

            if (! $category || ! $province || ! $guide) {
                throw new RuntimeException(
                    'Không thể seed tour hủy vì chưa có danh mục, tỉnh/thành hoặc HDV đang hoạt động.'
                );
            }

            $tour = Tour::withTrashed()->updateOrCreate(
                ['slug' => self::TOUR_SLUG],
                [
                    'category_id' => $category->id,
                    'province_id' => $province->id,
                    'created_by' => $admin->id,
                    'title' => 'Hạ Long - Lịch mẫu đã hủy do thời tiết',
                    'summary' => 'Tour mẫu dùng để kiểm tra quy trình quản lý tour và lịch khởi hành bị hủy.',
                    'description' => 'Tour mẫu này được tạo ở trạng thái đã hủy do điều kiện thời tiết không bảo đảm an toàn cho hành trình.',
                    'itinerary' => 'Lịch trình mẫu không được triển khai vì tour đã bị hủy trước ngày khởi hành.',
                    'duration_days' => 3,
                    'duration_nights' => 2,
                    'base_price' => 4990000,
                    'discount_price' => 4590000,
                    'max_slots' => 30,
                    'available_slots' => 0,
                    'status' => 'cancelled',
                    'average_rating' => 0,
                    'review_count' => 0,
                ]
            );

            $tour->restore();

            $departureDate = Carbon::createFromFormat('Y-m-d', self::DEPARTURE_DATE)
                ->startOfDay();
            $returnDate = $departureDate->copy()->addDays(2);

            $departure = TourDeparture::updateOrCreate(
                [
                    'tour_id' => $tour->id,
                    'departure_date' => self::DEPARTURE_DATE,
                ],
                [
                    'departure_at' => $departureDate->copy()->setTime(6, 30),
                    'return_date' => $returnDate->toDateString(),
                    'departure_location' => 'Văn phòng ViVuGo',
                    'price' => 4590000,
                    'base_price' => 4990000,
                    'discount_price' => 4590000,
                    'total_slots' => 30,
                    'booked_slots' => 0,
                    'status' => 'cancelled',
                    'cancellation_reason' => self::CANCELLATION_REASON,
                ]
            );

            TourGuideAssignment::updateOrCreate(
                [
                    'tour_departure_id' => $departure->id,
                    'role' => 'lead',
                ],
                [
                    'guide_id' => $guide->id,
                    'status' => 'cancelled',
                    'assigned_by' => $admin->id,
                    'assigned_at' => $departureDate->copy()->subDays(7)->setTime(9, 0),
                    'notes' => 'Phân công mẫu đã được hủy cùng lịch khởi hành do thời tiết.',
                ]
            );

            TourDepartureStatusHistory::query()->firstOrCreate([
                'tour_departure_id' => $departure->id,
                'old_status' => 'open',
                'new_status' => 'cancelled',
                'reason' => self::CANCELLATION_REASON,
            ]);
        });
    }

    private function resolveAdmin(): User
    {
        $admin = User::query()
            ->where('status', 'active')
            ->whereHas('role', fn ($query) => $query->where('name', 'admin'))
            ->orderBy('id')
            ->first();

        if (! $admin) {
            throw new RuntimeException(
                'Không thể seed tour hủy vì chưa có tài khoản Admin đang hoạt động.'
            );
        }

        return $admin;
    }
}
