<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BookingSeeder extends Seeder
{
    public function run(): void
    {
        $userIds = DB::table('users')->pluck('id')->toArray();
        $tourIds = DB::table('tours')->pluck('id')->toArray();
        $departures = DB::table('tour_departures')->get()->groupBy('tour_id');

        if (empty($userIds) || empty($tourIds)) {
            $this->command->warn('⚠ Cần có users và tours trước!');

            return;
        }

        if (DB::table('tour_departures')->count() === 0) {
            $this->command->warn('⚠ Cần có tour_departures trước!');

            return;
        }

        $allDepartureIds = DB::table('tour_departures')->pluck('id')->toArray();
        $promotionIds = DB::table('promotions')->where('status', 'active')->pluck('id')->toArray();
        $staffIds = DB::table('users')->where('role_id', 1)->pluck('id')->toArray();

        $vietnameseNames = [
            'Nguyễn Văn An',
            'Trần Thị Bình',
            'Lê Hoàng Nam',
            'Phạm Thị Lan',
            'Hoàng Văn Hùng',
            'Vũ Thị Mai',
            'Đặng Quốc Tuấn',
            'Bùi Thị Hoa',
            'Lý Văn Minh',
            'Phan Thị Thu',
            'Ngô Văn Đức',
            'Đinh Thị Yến',
            'Tô Văn Khoa',
            'Cao Thị Linh',
            'Dương Văn Tài',
            'Lưu Thị Ngọc',
            'Trương Văn Sơn',
            'Mai Thị Hằng',
        ];

        $phonePrefixes = [
            '032',
            '033',
            '034',
            '035',
            '036',
            '037',
            '038',
            '039',
            '070',
            '076',
            '077',
            '078',
            '079',
            '086',
            '096',
            '097',
            '098',
        ];

        $addresses = [
            '12 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
            '45 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
            '78 Trần Phú, Hải Châu, Đà Nẵng',
            '23 Lê Lợi, Thành phố Huế',
            '56 Điện Biên Phủ, Bình Thạnh, TP. Hồ Chí Minh',
            '90 Nguyễn Trãi, Đống Đa, Hà Nội',
        ];

        $cancelReasons = [
            'Khách thay đổi kế hoạch du lịch.',
            'Công việc đột xuất không thể tham gia.',
            'Lý do sức khoẻ cá nhân.',
            'Không thu xếp được thời gian.',
            'Chuyến đi không phù hợp với lịch trình gia đình.',
        ];

        $statusWeights = ['pending' => 20, 'confirmed' => 30, 'completed' => 40, 'cancelled' => 10];

        $bookings = [];
        $contacts = [];
        $participants = [];
        $histories = [];
        $payments = [];
        $now = Carbon::now();

        for ($i = 1; $i <= 50; $i++) {
            $tourId = $tourIds[array_rand($tourIds)];
            $userId = $userIds[array_rand($userIds)];
            $status = $this->weightedRandom($statusWeights);
            $numPeople = rand(1, 6);
            $unitPrice = rand(1, 20) * 500000;
            $discount = rand(0, 1) ? rand(1, 5) * 100000 : 0;
            $total = ($unitPrice * $numPeople) - $discount;
            $createdAt = $now->copy()->subDays(rand(0, 180))->subHours(rand(0, 23));

            // Lấy departure phù hợp với tour, fallback lấy random toàn bộ
            $tourDeps = $departures->get($tourId);
            $departureId = $tourDeps && $tourDeps->isNotEmpty()
                ? $tourDeps->random()->id
                : $allDepartureIds[array_rand($allDepartureIds)];

            $paymentStatus = match ($status) {
                'completed' => 'paid',
                'cancelled' => (rand(0, 1) ? 'refunded' : 'failed'),
                'confirmed' => (rand(0, 2) ? 'paid' : 'unpaid'),
                default => 'unpaid',
            };

            $bookingCode = 'BK'.$createdAt->format('Ymd').str_pad($i, 4, '0', STR_PAD_LEFT);
            $contactName = $vietnameseNames[array_rand($vietnameseNames)];
            $contactPhone = $phonePrefixes[array_rand($phonePrefixes)].rand(1000000, 9999999);

            $bookings[] = [
                'booking_code' => $bookingCode,
                'user_id' => $userId,
                'tour_id' => $tourId,
                'tour_departure_id' => $departureId,
                'promotion_id' => rand(1, 10) <= 4 && ! empty($promotionIds)
                    ? $promotionIds[array_rand($promotionIds)]
                    : null,
                'staff_id' => rand(0, 1) && ! empty($staffIds)
                    ? $staffIds[array_rand($staffIds)]
                    : null,
                'number_of_people' => $numPeople,
                'unit_price' => $unitPrice,
                'discount_amount' => $discount,
                'total_amount' => $total,
                'status' => $status,
                'payment_status' => $paymentStatus,
                'note' => rand(0, 3) === 0 ? 'Khách yêu cầu phòng có view biển.' : null,
                'cancel_reason' => $status === 'cancelled' ? $cancelReasons[array_rand($cancelReasons)] : null,
                'cancelled_at' => $status === 'cancelled' ? $createdAt->copy()->addDays(rand(1, 5)) : null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];

            $contacts[] = [
                'booking_id' => $i,
                'contact_name' => $contactName,
                'contact_email' => strtolower(preg_replace('/\s+/', '', $contactName)).rand(100, 999).'@gmail.com',
                'contact_phone' => $contactPhone,
                'address' => $addresses[array_rand($addresses)],
                'special_request' => rand(0, 4) === 0 ? 'Ăn chay, không dùng hải sản.' : null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];

            $payments[] = [
                'booking_id' => $i,
                'payment_method' => 'cod',
                'amount' => $total,
                'transaction_code' => null,
                'gateway_response' => null,
                'status' => match ($paymentStatus) {
                    'paid' => 'success',
                    'failed' => 'failed',
                    'refunded' => 'refunded',
                    default => 'pending',
                },
                'paid_at' => null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];

            $genders = ['male', 'female', 'other'];
            $participantTypes = ['adult', 'adult', 'adult', 'child', 'infant'];

            for ($p = 0; $p < $numPeople; $p++) {
                $participants[] = [
                    'booking_id' => $i,
                    'full_name' => $vietnameseNames[array_rand($vietnameseNames)],
                    'phone' => $p === 0 ? $contactPhone : null,
                    'birth_date' => $now->copy()->subYears(rand(5, 60))->subDays(rand(0, 365))->toDateString(),
                    'gender' => $genders[array_rand($genders)],
                    'identity_number' => (string) rand(100000000, 999999999),
                    'participant_type' => $participantTypes[array_rand($participantTypes)],
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ];
            }

            $histories[] = [
                'booking_id' => $i,
                'changed_by' => $userIds[0],
                'old_status' => null,
                'new_status' => 'pending',
                'note' => 'Booking được tạo.',
                'created_at' => $createdAt,
            ];

            if (in_array($status, ['confirmed', 'completed', 'cancelled'])) {
                $histories[] = [
                    'booking_id' => $i,
                    'changed_by' => $userIds[0],
                    'old_status' => 'pending',
                    'new_status' => $status,
                    'note' => match ($status) {
                        'confirmed' => 'Admin xác nhận booking.',
                        'completed' => 'Tour đã hoàn thành.',
                        'cancelled' => 'Khách yêu cầu huỷ.',
                    },
                    'created_at' => $createdAt->copy()->addDays(1),
                ];
            }
        }

        DB::table('bookings')->insert($bookings);
        DB::table('booking_contacts')->insert($contacts);
        DB::table('booking_participants')->insert($participants);
        DB::table('booking_status_histories')->insert($histories);
        DB::table('payments')->insert($payments);

        $this->command->info('✅ Seed 50 bookings thành công!');
    }

    private function weightedRandom(array $weights): string
    {
        $total = array_sum($weights);
        $rand = rand(1, $total);
        $sum = 0;
        foreach ($weights as $key => $weight) {
            $sum += $weight;
            if ($rand <= $sum) {
                return $key;
            }
        }

        return array_key_first($weights);
    }
}
