<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Category;
use App\Models\Destination;
use App\Models\Guide;
use App\Models\Review;
use App\Models\Tour;
use App\Models\TourReview;
use App\Models\User;
use App\Services\GuideReviewService;
use App\Services\TourReviewService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TourTestingDataSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $adminId = User::query()->whereHas('role', fn ($query) => $query->where('name', 'admin'))->value('id');
        $this->seedDestinations($now);
        $tours = $this->seedTours($adminId, $now);
        $departures = $this->seedTourDetails($tours, $adminId, $now);
        $this->seedTransactions($tours, $departures, $adminId, $now);
        $this->command->info('Đã seed dữ liệu kiểm thử cho toàn bộ vòng đời tour.');
    }

    private function seedDestinations($now): void
    {
        foreach ([
            ['Hội An', 'hoi-an', 'Quảng Nam'], ['Hà Nội', 'ha-noi', 'Hà Nội'], ['Ninh Bình', 'ninh-binh', 'Ninh Bình'],
        ] as [$name, $slug, $city]) {
            Destination::query()->updateOrCreate(['slug' => $slug], [
                'name' => $name, 'province_city' => $city, 'country' => 'Việt Nam', 'status' => 'active',
                'description' => 'Điểm đến mẫu phục vụ kiểm thử tour.', 'updated_at' => $now,
            ]);
        }
    }

    /** @return array<string, Tour> */
    private function seedTours(?int $adminId, $now): array
    {
        $fixtures = [
            ['ha-long-du-thuyen-2-ngay-1-dem-test', 'Hạ Long du thuyền 2 ngày 1 đêm', 'du-lich-nghi-duong', 'ha-long', ['ha-noi', 'ha-long'], 2, 1, 4590000, 4190000, 'published', 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429'],
            ['ha-noi-ninh-binh-3-ngay-2-dem-test', 'Hà Nội - Ninh Bình 3 ngày 2 đêm', 'du-lich-van-hoa', 'ha-noi', ['ha-noi', 'ninh-binh'], 3, 2, 3290000, null, 'published', 'https://images.unsplash.com/photo-1528181304800-259b08848526'],
            ['da-nang-hoi-an-cuoi-tuan-test', 'Đà Nẵng - Hội An cuối tuần', 'du-lich-van-hoa', 'da-nang', ['da-nang', 'hoi-an'], 2, 1, 2790000, 2490000, 'draft', 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b'],
            ['phu-quoc-sunset-noi-bo-test', 'Phú Quốc săn hoàng hôn', 'du-lich-bien', 'phu-quoc', ['phu-quoc'], 3, 2, 5490000, 4990000, 'hidden', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e'],
        ];
        $tours = [];
        foreach ($fixtures as [$slug, $title, $categorySlug, $destinationSlug, $destinationSlugs, $days, $nights, $price, $discount, $status, $image]) {
            $categoryId = Category::query()->where('slug', $categorySlug)->value('id');
            $destinationId = Destination::query()->where('slug', $destinationSlug)->value('id');
            if (! $categoryId || ! $destinationId) {
                continue;
            }
            $tour = Tour::withTrashed()->updateOrCreate(['slug' => $slug], [
                'category_id' => $categoryId, 'destination_id' => $destinationId, 'created_by' => $adminId, 'title' => $title,
                'summary' => 'Tour mẫu để kiểm thử khách hàng, quản trị và đặt tour.', 'description' => 'Dữ liệu mẫu có đầy đủ ảnh, lịch trình, giá, đợt khởi hành và giao dịch.',
                'itinerary' => "Ngày 1: Khởi hành và tham quan\nNgày 2: Trải nghiệm điểm đến", 'duration_days' => $days, 'duration_nights' => $nights,
                'base_price' => $price, 'discount_price' => $discount, 'max_slots' => 30, 'available_slots' => 24, 'status' => $status,
            ]);
            if ($tour->trashed()) {
                $tour->restore();
            }
            $tours[$slug] = $tour;
            foreach ($destinationSlugs as $order => $itemSlug) {
                $id = Destination::query()->where('slug', $itemSlug)->value('id');
                if ($id) {
                    $this->upsert('tour_destinations', ['tour_id' => $tour->id, 'destination_id' => $id], ['sort_order' => $order + 1], $now);
                }
            }
            foreach ([$image, $image.'?auto=format&fit=crop&w=1200&q=80'] as $order => $url) {
                $this->upsert('tour_images', ['tour_id' => $tour->id, 'image_url' => $url], ['alt_text' => $title, 'sort_order' => $order + 1, 'is_thumbnail' => $order === 0], $now);
            }
            foreach ([['departure', 'Tập trung và khởi hành'], ['sightseeing', 'Tham quan điểm nổi bật'], ['meal', 'Dùng bữa đặc sản'], ['return', 'Kết thúc hành trình']] as $order => [$type, $itineraryTitle]) {
                $dayNumber = min((int) floor($order * $days / 4) + 1, $days);
                $key = ['tour_id' => $tour->id, 'sort_order' => $order + 1];
                $this->upsert('tour_itineraries', $key, ['day_number' => $dayNumber, 'type' => $type, 'title' => $itineraryTitle, 'start_time' => $order % 2 === 0 ? '08:00' : '14:00', 'end_time' => $order % 2 === 0 ? '10:00' : '16:00', 'duration' => '2 giờ', 'transport' => 'Xe du lịch', 'description' => 'Hoạt động mẫu.'], $now);
                $itineraryId = DB::table('tour_itineraries')->where($key)->value('id');
                $this->upsert('tour_itinerary_images', ['tour_itinerary_id' => $itineraryId, 'image_url' => $image], ['alt_text' => $itineraryTitle, 'sort_order' => 1], $now);
            }
            foreach ([['Người lớn', 12, null, 'fixed', $discount ?? $price], ['Trẻ em', 5, 11, 'percentage', 70], ['Em bé', 0, 4, 'free', 0]] as $order => [$label, $minAge, $maxAge, $type, $value]) {
                $this->upsert('tour_age_pricing_rules', ['tour_id' => $tour->id, 'label' => $label], ['min_age' => $minAge, 'max_age' => $maxAge, 'pricing_type' => $type, 'price_value' => $value, 'sort_order' => $order + 1, 'is_active' => true], $now);
            }
        }

        return $tours;
    }

    /** @param array<string, Tour> $tours @return array<string, array<string, object>> */
    private function seedTourDetails(array $tours, ?int $adminId, $now): array
    {
        $all = [];
        $guideId = Guide::query()->where('guide_code', 'HDV001')->value('id');
        $tourIds = collect($tours)->pluck('id');

        if ($guideId) {
            $testDepartureIds = DB::table('tour_departures')
                ->whereIn('tour_id', $tourIds)
                ->pluck('id');
            $currentOrFutureDepartureIds = DB::table('tour_departures')
                ->whereDate('return_date', '>=', today())
                ->pluck('id');

            DB::table('tour_guide_assignments')
                ->where('guide_id', $guideId)
                ->whereIn('tour_departure_id', $testDepartureIds
                    ->merge($currentOrFutureDepartureIds)
                    ->unique()
                    ->values())
                ->update([
                    'status' => 'cancelled',
                    'updated_at' => $now,
                ]);
        }

        $ongoingTourSlug = 'ha-long-du-thuyen-2-ngay-1-dem-test';
        $upcomingTourOffsets = [
            'ha-noi-ninh-binh-3-ngay-2-dem-test' => 3,
            'da-nang-hoi-an-cuoi-tuan-test' => 8,
        ];

        foreach ($tours as $slug => $tour) {
            $price = $tour->discount_price ?? $tour->base_price;
            $openOffset = $upcomingTourOffsets[$slug] ?? 14;
            $dates = [
                'open' => [now()->addDays($openOffset), 'open', 5], 'ongoing' => [now(), 'open', 12],
                'completed' => [now()->subDays(12), 'completed', 20], 'closed' => [now()->addDays(35), 'closed', 30],
            ];
            foreach ($dates as $name => [$start, $status, $booked]) {
                $end = $start->copy()->addDays($tour->duration_days - 1);
                $this->upsert('tour_departures', ['tour_id' => $tour->id, 'departure_date' => $start->toDateString()], ['return_date' => $end->toDateString(), 'price' => $price, 'base_price' => $tour->base_price, 'discount_price' => $tour->discount_price, 'total_slots' => 30, 'booked_slots' => $booked, 'status' => $status], $now);
                $departure = DB::table('tour_departures')->where(['tour_id' => $tour->id, 'departure_date' => $start->toDateString()])->first();
                $all[$slug][$name] = $departure;
                $isOngoingTarget = $slug === $ongoingTourSlug && $name === 'ongoing';
                $isUpcomingTarget = isset($upcomingTourOffsets[$slug]) && $name === 'open';
                $isCompletedTarget = $name === 'completed';

                if ($guideId && ($isOngoingTarget || $isUpcomingTarget || $isCompletedTarget)) {
                    $assignmentStatus = $isOngoingTarget
                        ? 'confirmed'
                        : ($isUpcomingTarget ? 'assigned' : 'completed');
                    $this->upsert('tour_guide_assignments', ['guide_id' => $guideId, 'tour_departure_id' => $departure->id], ['role' => 'lead', 'status' => $assignmentStatus, 'assigned_by' => $adminId, 'assigned_at' => $now, 'note' => 'Phân công mẫu.', 'notes' => 'Phân công mẫu.'], $now);
                }
            }
            foreach (['ongoing' => 'in_progress', 'completed' => 'completed'] as $name => $stageStatus) {
                $departure = $all[$slug][$name];
                $lastStageId = null;
                foreach (DB::table('tour_itineraries')->where('tour_id', $tour->id)->orderBy('sort_order')->get() as $index => $item) {
                    $this->upsert('tour_departure_stages', ['tour_departure_id' => $departure->id, 'tour_itinerary_id' => $item->id], ['day_number' => $item->day_number, 'sort_order' => $item->sort_order, 'type' => $item->type, 'title' => $item->title, 'start_time' => $item->start_time, 'end_time' => $item->end_time, 'status' => $name === 'ongoing' && $index === 1 ? 'in_progress' : $stageStatus, 'started_at' => $now, 'completed_at' => $name === 'completed' ? $now : null], $now);
                    $lastStageId = DB::table('tour_departure_stages')->where(['tour_departure_id' => $departure->id, 'tour_itinerary_id' => $item->id])->value('id');
                }
                DB::table('tour_departures')->where('id', $departure->id)->update(['current_stage_id' => $lastStageId, 'updated_at' => $now]);
            }
        }

        return $all;
    }

    private function seedTransactions(array $tours, array $departures, ?int $adminId, $now): void
    {
        $customers = User::query()->whereIn('email', ['thao.nguyen@example.test', 'minh.tran@example.test', 'linh.le@example.test'])->get()->values();
        if ($customers->isEmpty()) {
            return;
        }
        $fixtures = [
            ['BK-TST-PENDING', 'ha-noi-ninh-binh-3-ngay-2-dem-test', 'open', 'pending', 'pending', 'vnpay', 2], ['BK-TST-CONFIRMED', 'ha-long-du-thuyen-2-ngay-1-dem-test', 'ongoing', 'confirmed', 'paid', 'cod', 3],
            ['BK-TST-COMPLETED', 'ha-long-du-thuyen-2-ngay-1-dem-test', 'completed', 'completed', 'paid', 'vnpay', 2], ['BK-TST-CANCELLED', 'phu-quoc-sunset-noi-bo-test', 'open', 'cancelled', 'refunded', 'momo', 1], ['BK-TST-FAILED', 'da-nang-hoi-an-cuoi-tuan-test', 'closed', 'pending', 'failed', 'vnpay', 1],
        ];
        $bookings = [];
        foreach ($fixtures as $index => [$code, $slug, $departureName, $status, $paymentStatus, $method, $people]) {
            $tour = $tours[$slug];
            $departure = $departures[$slug][$departureName];
            $customer = $customers[$index % $customers->count()];
            $unit = (float) ($departure->discount_price ?? $departure->base_price);
            $total = $unit * $people;
            $booking = Booking::query()->updateOrCreate(['booking_code' => $code], ['user_id' => $customer->id, 'tour_id' => $tour->id, 'tour_departure_id' => $departure->id, 'number_of_people' => $people, 'unit_price' => $unit, 'discount_amount' => 0, 'total_amount' => $total, 'status' => $status, 'payment_status' => $paymentStatus === 'paid' ? 'paid' : ($paymentStatus === 'refunded' ? 'refunded' : ($paymentStatus === 'failed' ? 'failed' : 'unpaid')), 'cancel_reason' => $status === 'cancelled' ? 'Khách thay đổi lịch trình.' : null, 'cancelled_at' => $status === 'cancelled' ? $now : null]);
            $bookings[$code] = $booking;
            $this->upsert('booking_contacts', ['booking_id' => $booking->id], ['contact_name' => $customer->full_name, 'contact_email' => $customer->email, 'contact_phone' => $customer->phone ?? '0900000000', 'address' => 'Địa chỉ mẫu', 'special_request' => 'Ưu tiên hỗ trợ đoàn có trẻ em.'], $now);
            foreach (range(1, $people) as $person) {
                $type = $person === 1 ? 'adult' : ($person === 2 ? 'child' : 'infant');
                $this->upsert('booking_participants', ['booking_id' => $booking->id, 'identity_number' => 'TST'.$index.$person.'2026'], ['full_name' => $customer->full_name.' '.$person, 'phone' => $person === 1 ? $customer->phone : null, 'birth_date' => now()->subYears($type === 'adult' ? 28 : 8)->toDateString(), 'gender' => $person % 2 ? 'female' : 'male', 'participant_type' => $type, 'unit_price' => $type === 'adult' ? $unit : ($type === 'child' ? $unit * .7 : 0), 'pricing_rule_label' => $type === 'adult' ? 'Người lớn' : ($type === 'child' ? 'Trẻ em' : 'Em bé'), 'pricing_type' => $type === 'adult' ? 'fixed' : ($type === 'child' ? 'percentage' : 'free'), 'pricing_value' => $type === 'child' ? 70 : 0], $now);
            }
            $this->upsert('booking_status_histories', ['booking_id' => $booking->id, 'new_status' => 'pending'], ['changed_by' => $adminId, 'old_status' => null, 'note' => 'Booking được tạo.'], $now, false);
            if ($status !== 'pending') {
                $this->upsert('booking_status_histories', ['booking_id' => $booking->id, 'new_status' => $status], ['changed_by' => $adminId, 'old_status' => 'pending', 'note' => 'Cập nhật trạng thái mẫu.'], $now, false);
            }
            $this->upsert('payments', ['booking_id' => $booking->id], ['payment_method' => $method, 'amount' => $total, 'transaction_code' => 'TEST-'.$method.'-'.$code, 'gateway_response' => json_encode(['test_mode' => true, 'booking_code' => $code]), 'status' => $paymentStatus === 'paid' ? 'success' : $paymentStatus, 'paid_at' => $paymentStatus === 'paid' ? $now : null, 'expires_at' => $paymentStatus === 'pending' ? now()->addMinutes(15) : null], $now);
            $this->upsert('wishlists', ['user_id' => $customer->id, 'tour_id' => $tours['ha-long-du-thuyen-2-ngay-1-dem-test']->id], [], $now);
        }
        $active = $bookings['BK-TST-CONFIRMED'];
        $guideUserId = DB::table('tour_guide_assignments')
            ->join('guides', 'guides.id', '=', 'tour_guide_assignments.guide_id')
            ->where('tour_guide_assignments.tour_departure_id', $active->tour_departure_id)
            ->value('guides.user_id');
        $activeDeparture = DB::table('tour_departures')->find($active->tour_departure_id);
        $activeItineraries = DB::table('tour_itineraries')
            ->where('tour_id', $active->tour_id)
            ->orderBy('day_number')
            ->orderBy('sort_order')
            ->get();

        foreach ($activeItineraries as $itinerary) {
            $scheduledDate = Carbon::parse($activeDeparture->departure_date)
                ->addDays(max((int) $itinerary->day_number - 1, 0))
                ->toDateString();
            $this->upsert('attendance_sessions', [
                'tour_departure_id' => $active->tour_departure_id,
                'tour_itinerary_id' => $itinerary->id,
            ], [
                'scheduled_date' => $scheduledDate,
                'boundary' => null,
                'name' => "Ngày {$itinerary->day_number} · ".mb_substr((string) $itinerary->start_time, 0, 5)." · {$itinerary->title}",
                'note' => 'Phiên điểm danh tạo theo lịch trình tour.',
                'status' => 'active',
                'created_by' => $guideUserId ?? $adminId ?? $active->user_id,
            ], $now);
        }
        $done = $bookings['BK-TST-COMPLETED'];
        $guideId = DB::table('tour_guide_assignments')->where('tour_departure_id', $done->tour_departure_id)->value('guide_id');
        if ($guideId) {
            Review::query()->updateOrCreate(['booking_id' => $done->id, 'guide_id' => $guideId], ['user_id' => $done->user_id, 'tour_id' => $done->tour_id, 'tour_departure_id' => $done->tour_departure_id, 'rating' => 5, 'comment' => 'Đánh giá mẫu cho tour đã hoàn thành.', 'status' => 'visible']);
            app(GuideReviewService::class)->refreshGuideRating($guideId);
        }
        TourReview::query()->updateOrCreate(['booking_id' => $done->id], ['user_id' => $done->user_id, 'tour_id' => $done->tour_id, 'tour_departure_id' => $done->tour_departure_id, 'rating' => 5, 'comment' => 'Lịch trình tour hợp lý và dịch vụ chu đáo.', 'status' => 'visible']);
        app(TourReviewService::class)->refreshTourRating($done->tour_id);
    }

    private function upsert(string $table, array $keys, array $values, $now, bool $timestamps = true): void
    {
        $data = $timestamps ? array_merge($values, ['created_at' => $now, 'updated_at' => $now]) : array_merge($values, ['created_at' => $now]);
        DB::table($table)->updateOrInsert($keys, $data);
    }
}
