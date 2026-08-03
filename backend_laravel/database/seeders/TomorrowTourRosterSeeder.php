<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Guide;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TomorrowTourRosterSeeder extends Seeder
{
    private const TOUR_SLUG = 'da-nang-ba-na-hills-2-ngay-1-dem-seeder';

    private const BOOKING_CODE = 'BK-TMR-BANA-001';

    private const CUSTOMER_EMAIL = 'customer@vivugo.vn';

    private const GUIDE_EMAIL = 'hung.tv@vivugo.vn';

    public function run(): void
    {
        $now = now();

        DB::transaction(function () use ($now): void {
            $admin = User::query()->where('email', 'admin@vivugo.vn')->firstOrFail();
            $customer = User::query()->where('email', self::CUSTOMER_EMAIL)->firstOrFail();
            $guide = Guide::query()
                ->whereHas('user', fn ($query) => $query->where('email', self::GUIDE_EMAIL))
                ->firstOrFail();

            $tour = $this->upsertTour($admin->id);
            $departure = $this->upsertDeparture($tour, $now);
            $booking = $this->upsertBooking($tour, $departure, $customer, $admin->id, $now);

            $this->upsertBookingContact($booking, $now);
            $this->upsertParticipants($booking, $now);
            $this->upsertPayment($booking, $now);
            $this->upsertBookingHistory($booking, $customer->id, $admin->id, $now);
            $this->assignGuide($departure, $guide->id, $admin->id, $now);
            $this->synchronizeSlots($tour, $departure);
        });

        $this->command?->info('Đã tạo tour, lịch khởi hành hôm nay, booking, khách hàng và HDV Trần Văn Hùng.');
    }

    private function upsertTour(int $adminId): Tour
    {
        $categoryId = DB::table('categories')->where('slug', 'du-lich-kham-pha')->value('id');
        $destinationId = DB::table('destinations')->where('slug', 'da-nang')->value('id');

        if (! $categoryId || ! $destinationId) {
            throw new \RuntimeException('Thiếu category du-lich-kham-pha hoặc destination da-nang.');
        }

        $tour = Tour::query()->updateOrCreate(
            ['slug' => self::TOUR_SLUG],
            [
                'category_id' => $categoryId,
                'destination_id' => $destinationId,
                'created_by' => $adminId,
                'title' => 'Đà Nẵng - Bà Nà Hills 2 ngày 1 đêm',
                'summary' => 'Khám phá Bà Nà Hills, Cầu Vàng và những điểm nổi bật của Đà Nẵng.',
                'description' => 'Tour mẫu phục vụ kiểm thử danh sách lịch khởi hành, booking, khách hàng và phân công hướng dẫn viên.',
                'itinerary' => "Ngày 1: Hà Nội - Đà Nẵng - Bà Nà Hills - Cầu Vàng\nNgày 2: Sơn Trà - biển Mỹ Khê - trở về.",
                'duration_days' => 2,
                'duration_nights' => 1,
                'base_price' => 3890000,
                'discount_price' => 3490000,
                'max_slots' => 20,
                'available_slots' => 16,
                'status' => 'published',
                'average_rating' => 0,
                'review_count' => 0,
            ],
        );

        DB::table('tour_images')->updateOrInsert(
            ['tour_id' => $tour->id, 'image_url' => 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b'],
            [
                'alt_text' => 'Bà Nà Hills và Cầu Vàng',
                'sort_order' => 1,
                'is_thumbnail' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        DB::table('tour_destinations')->updateOrInsert(
            ['tour_id' => $tour->id, 'destination_id' => $destinationId],
            ['sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
        );

        return $tour;
    }

    private function upsertDeparture(Tour $tour, Carbon $now): TourDeparture
    {
        $departureDate = $now->copy()->startOfDay();

        return TourDeparture::query()->updateOrCreate(
            [
                'tour_id' => $tour->id,
                'departure_date' => $departureDate,
            ],
            [
                'departure_at' => $departureDate->copy()->setTime(7, 0),
                'return_date' => $departureDate->copy()->addDay()->toDateString(),
                'departure_location' => 'Hà Nội',
                'price' => $tour->discount_price ?? $tour->base_price,
                'base_price' => $tour->base_price,
                'discount_price' => $tour->discount_price,
                'total_slots' => $tour->max_slots,
                'status' => 'confirmed',
            ],
        );
    }

    private function upsertBooking(
        Tour $tour,
        TourDeparture $departure,
        User $customer,
        int $adminId,
        Carbon $now,
    ): Booking {
        $unitPrice = (float) ($departure->discount_price ?? $departure->base_price ?? $departure->price);
        $numberOfPeople = 11;

        return Booking::query()->updateOrCreate(
            ['booking_code' => self::BOOKING_CODE],
            [
                'idempotency_key' => 'seed-tomorrow-bana-001',
                'user_id' => $customer->id,
                'tour_id' => $tour->id,
                'tour_departure_id' => $departure->id,
                'staff_id' => $adminId,
                'number_of_people' => $numberOfPeople,
                'unit_price' => $unitPrice,
                'discount_amount' => 0,
                'total_amount' => $unitPrice * $numberOfPeople,
                'status' => 'confirmed',
                'payment_status' => 'paid',
                'slot_committed_at' => $now,
                'note' => 'Booking mẫu cho lịch khởi hành hôm nay.',
            ],
        );
    }

    private function upsertBookingContact(Booking $booking, Carbon $now): void
    {
        DB::table('booking_contacts')->updateOrInsert(
            ['booking_id' => $booking->id],
            [
                'contact_name' => 'Nguyễn Minh Anh',
                'contact_email' => self::CUSTOMER_EMAIL,
                'contact_phone' => '0901000002',
                'phone_normalized' => '0901000002',
                'address' => '25 Tràng Tiền, Hoàn Kiếm, Hà Nội',
                'special_request' => 'Đón tại điểm tập trung lúc 06:30.',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        );
    }

    private function upsertParticipants(Booking $booking, Carbon $now): void
    {
        DB::table('booking_participants')->where('booking_id', $booking->id)->delete();

        $unitPrice = (float) $booking->unit_price;
        $participants = [
            ['Nguyễn Minh Anh', '0901000002', '1995-04-18', 'male', '012345678901'],
            ['Trần Thu Hà', '0912345678', '1994-08-22', 'female', '012345678902'],
            ['Nguyễn Gia Bảo', '0987654321', '1996-03-14', 'male', '012345678903'],
            ['Lê Hoàng Nam', '0977123456', '1993-11-09', 'male', '012345678904'],
            ['Phạm Hoài Nam', '0902123456', '1992-06-27', 'male', '012345678905'],
            ['Đỗ Ngọc Anh', '0913123456', '1997-01-15', 'female', '012345678906'],
            ['Bùi Quốc Huy', '0988123456', '1991-10-03', 'male', '012345678907'],
            ['Lê Khánh Linh', '0978123456', '1996-12-21', 'female', '012345678908'],
            ['Trần Nhật Minh', '0908123456', '1994-02-11', 'male', '012345678909'],
            ['Nguyễn Phương Thảo', '0918123456', '1995-09-30', 'female', '012345678910'],
            ['Võ Thanh Tâm', '0986123456', '1993-07-06', 'male', '012345678911'],
        ];

        foreach ($participants as [$name, $phone, $birthDate, $gender, $identityNumber]) {
            DB::table('booking_participants')->insert([
                'booking_id' => $booking->id,
                'full_name' => $name,
                'phone' => $phone,
                'phone_normalized' => $phone,
                'birth_date' => $birthDate,
                'gender' => $gender,
                'identity_number' => $identityNumber,
                'participant_type' => 'adult',
                'unit_price' => $unitPrice,
                'pricing_rule_label' => 'Người lớn',
                'pricing_type' => 'fixed',
                'pricing_value' => $unitPrice,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    private function upsertPayment(Booking $booking, Carbon $now): void
    {
        DB::table('payments')->updateOrInsert(
            ['booking_id' => $booking->id],
            [
                'frontend_origin' => null,
                'payment_method' => 'cod',
                'amount' => $booking->total_amount,
                'transaction_code' => 'SEED-COD-BANA-001',
                'gateway_response' => json_encode(['seed' => self::BOOKING_CODE]),
                'status' => 'success',
                'paid_at' => $now,
                'expires_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        );
    }

    private function upsertBookingHistory(Booking $booking, int $customerId, int $adminId, Carbon $now): void
    {
        DB::table('booking_status_histories')->where('booking_id', $booking->id)->delete();

        DB::table('booking_status_histories')->insert([
            [
                'booking_id' => $booking->id,
                'changed_by' => $customerId,
                'old_status' => null,
                'new_status' => 'pending',
                'note' => 'Khách hàng tạo booking mẫu.',
                'created_at' => $now->copy()->subMinutes(5),
            ],
            [
                'booking_id' => $booking->id,
                'changed_by' => $adminId,
                'old_status' => 'pending',
                'new_status' => 'confirmed',
                'note' => 'Quản trị viên xác nhận booking mẫu.',
                'created_at' => $now,
            ],
        ]);
    }

    private function assignGuide(TourDeparture $departure, int $guideId, int $adminId, Carbon $now): void
    {
        DB::table('tour_guide_assignments')->updateOrInsert(
            [
                'guide_id' => $guideId,
                'tour_departure_id' => $departure->id,
            ],
            [
                'role' => 'lead',
                'status' => 'confirmed',
                'assigned_by' => $adminId,
                'assigned_at' => $now,
                'note' => 'HDV Trần Văn Hùng phụ trách lịch khởi hành hôm nay.',
                'notes' => 'HDV Trần Văn Hùng phụ trách lịch khởi hành hôm nay.',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        );
    }

    private function synchronizeSlots(Tour $tour, TourDeparture $departure): void
    {
        $bookedSlots = Booking::query()
            ->where('tour_departure_id', $departure->id)
            ->whereIn('status', ['pending', 'confirmed', 'departed', 'completed'])
            ->sum('number_of_people');

        $departure->update([
            'booked_slots' => min((int) $bookedSlots, (int) $departure->total_slots),
        ]);

        $availableSlots = TourDeparture::query()
            ->where('tour_id', $tour->id)
            ->where('status', 'open')
            ->whereDate('departure_date', '>=', today())
            ->selectRaw('MAX(total_slots - booked_slots) as available_slots')
            ->value('available_slots');

        $tour->update(['available_slots' => max(0, (int) ($availableSlots ?? 0))]);
    }
}
