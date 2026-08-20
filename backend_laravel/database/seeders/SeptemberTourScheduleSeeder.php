<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\BookingContact;
use App\Models\BookingParticipant;
use App\Models\Guide;
use App\Models\Payment;
use App\Models\Role;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\TourGuideAssignment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SeptemberTourScheduleSeeder extends Seeder
{
    private const YEAR = 2026;

    private const MINIMUM_GUESTS = 20;

    private const VIETNAMESE_SURNAMES = [
        'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
        'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Trịnh', 'Đinh', 'Mai', 'Cao',
    ];

    private const VIETNAMESE_MIDDLE_NAMES = [
        'Văn', 'Thị', 'Minh', 'Hoàng', 'Quốc', 'Thanh', 'Ngọc', 'Đức', 'Gia', 'Hải',
        'Khánh', 'Tuấn', 'Thu', 'Phương', 'Bảo', 'Anh', 'Quang', 'Nhật', 'Kim', 'Thành',
    ];

    private const VIETNAMESE_GIVEN_NAMES = [
        'An', 'Anh', 'Bình', 'Châu', 'Cường', 'Dũng', 'Duy', 'Giang', 'Hà', 'Hạnh',
        'Hiếu', 'Hoa', 'Hùng', 'Hương', 'Huy', 'Khang', 'Khánh', 'Linh', 'Long', 'Mai',
        'Minh', 'Nam', 'Nga', 'Ngân', 'Ngọc', 'Nhung', 'Phong', 'Phúc', 'Phương', 'Quân',
        'Quang', 'Sơn', 'Tâm', 'Thảo', 'Thành', 'Thắng', 'Trang', 'Trung', 'Tú', 'Vy',
    ];

    public function run(): void
    {
        DB::transaction(function (): void {
            $tours = Tour::query()
                ->where('status', 'published')
                ->orderBy('id')
                ->get();
            $guides = Guide::query()
                ->where('status', 'active')
                ->orderBy('id')
                ->get();
            $customerRoleId = Role::query()->where('name', 'customer')->value('id');
            $customers = User::query()
                ->where('role_id', $customerRoleId)
                ->where('status', 'active')
                ->orderBy('id')
                ->get();
            $adminId = User::query()
                ->whereHas('role', fn ($query) => $query->where('name', 'admin'))
                ->value('id');

            if ($tours->isEmpty() || $guides->isEmpty() || $customers->isEmpty() || ! $adminId) {
                $this->command?->warn('Bỏ qua lịch tour tháng 9: thiếu tour, HDV, khách hàng hoặc quản trị viên.');

                return;
            }

            $this->renameSeededGuides();

            $start = Carbon::create(self::YEAR, 9, 1)->startOfDay();
            $end = $start->copy()->endOfMonth();

            $scheduleIndex = 0;

            for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
                foreach ($tours as $tour) {
                    $returnDate = $date->copy()->addDays(max(1, (int) $tour->duration_days) - 1);
                    $price = (float) ($tour->discount_price ?? $tour->base_price);

                    $departure = TourDeparture::updateOrCreate(
                        [
                            'tour_id' => $tour->id,
                            'departure_date' => $date->toDateString(),
                        ],
                        [
                            'departure_at' => $date->copy()->setTime(6, 30),
                            'return_date' => $returnDate->toDateString(),
                            'departure_location' => 'Văn phòng ViVuGo',
                            'price' => $price,
                            'base_price' => $tour->base_price,
                            'discount_price' => $tour->discount_price,
                            'total_slots' => max(30, self::MINIMUM_GUESTS),
                            'status' => 'open',
                        ]
                    );

                    $this->assignAvailableGuide($departure, $guides, (int) $adminId);
                    $this->seedMinimumGuests(
                        $departure,
                        $customers[$scheduleIndex % $customers->count()],
                        $price
                    );
                    $scheduleIndex++;
                }
            }
        });
    }

    private function assignAvailableGuide(TourDeparture $departure, $guides, int $adminId): void
    {
        $isInternational = $departure->tour()
            ->whereHas('category', fn ($query) => $query->where('slug', 'tour-quoc-te'))
            ->exists();
        $existing = TourGuideAssignment::query()
            ->where('tour_departure_id', $departure->id)
            ->where('role', 'lead')
            ->whereIn('status', ['assigned', 'confirmed'])
            ->first();

        if ($existing
            && (! $isInternational || $existing->guide?->certificate_type === 'Quốc tế')
            && ! $this->guideHasOverlap((int) $existing->guide_id, $departure)) {
            return;
        }

        $guide = $guides->first(function (Guide $guide) use ($departure, $isInternational): bool {
            return (! $isInternational || $guide->certificate_type === 'Quốc tế')
                && ! $this->guideHasOverlap($guide->id, $departure);
        });

        if (! $guide) {
            $guide = $this->createAdditionalGuide($guides->count() + 1, $isInternational);
            $guides->push($guide);
        }

        TourGuideAssignment::updateOrCreate(
            ['tour_departure_id' => $departure->id, 'role' => 'lead'],
            [
                'guide_id' => $guide->id,
                'status' => 'assigned',
                'assigned_by' => $adminId,
                'assigned_at' => now(),
                'notes' => 'Phân công tự động cho lịch tour tháng 9/2026.',
            ]
        );
    }

    private function guideHasOverlap(int $guideId, TourDeparture $departure): bool
    {
        return TourGuideAssignment::query()
            ->where('guide_id', $guideId)
            ->whereIn('status', ['assigned', 'confirmed'])
            ->where('tour_departure_id', '!=', $departure->id)
            ->whereHas('departure', function ($query) use ($departure): void {
                $query
                    ->whereDate('departure_date', '<=', $departure->return_date)
                    ->whereDate(DB::raw('COALESCE(return_date, departure_date)'), '>=', $departure->departure_date);
            })
            ->exists();
    }

    private function createAdditionalGuide(int $number, bool $isInternational): Guide
    {
        $roleId = (int) Role::query()->where('name', 'tour guide')->value('id');
        $index = str_pad((string) $number, 3, '0', STR_PAD_LEFT);
        $user = User::updateOrCreate(
            ['email' => "guide.september{$index}@gmail.com"],
            [
                'role_id' => $roleId,
                'full_name' => $this->vietnameseName($number),
                'phone' => '096'.str_pad((string) $number, 7, '0', STR_PAD_LEFT),
                'password' => Hash::make('password'),
                'status' => 'active',
            ]
        );

        return Guide::updateOrCreate(
            ['user_id' => $user->id],
            [
                'guide_code' => "HDVT9{$index}",
                'certificate_type' => $isInternational ? 'Quốc tế' : 'Nội địa',
                'experience_years' => 3,
                'average_rating' => 0,
                'review_count' => 0,
                'status' => 'active',
            ]
        );
    }

    private function renameSeededGuides(): void
    {
        User::query()
            ->where('email', 'like', 'guide.september%@gmail.com')
            ->orderBy('id')
            ->get()
            ->each(function (User $user): void {
                if (preg_match('/guide\.september(\d+)@gmail\.com/', $user->email, $matches) !== 1) {
                    return;
                }

                $user->update([
                    'full_name' => $this->vietnameseName((int) $matches[1]),
                ]);
            });
    }

    private function seedMinimumGuests(TourDeparture $departure, User $customer, float $unitPrice): void
    {
        $bookingCode = sprintf(
            'BK-S26-%d-%s',
            $departure->tour_id,
            $departure->departure_date->format('md')
        );
        $booking = Booking::updateOrCreate(
            ['booking_code' => $bookingCode],
            [
                'idempotency_key' => 'seed-'.sha1($bookingCode),
                'user_id' => $customer->id,
                'tour_id' => $departure->tour_id,
                'tour_departure_id' => $departure->id,
                'number_of_people' => self::MINIMUM_GUESTS,
                'unit_price' => $unitPrice,
                'discount_amount' => 0,
                'total_amount' => $unitPrice * self::MINIMUM_GUESTS,
                'status' => 'confirmed',
                'payment_status' => 'paid',
                'slot_committed_at' => now(),
                'note' => 'Booking mẫu bảo đảm tối thiểu 20 khách cho lịch tháng 9/2026.',
            ]
        );

        BookingContact::updateOrCreate(
            ['booking_id' => $booking->id],
            [
                'contact_name' => $customer->full_name,
                'contact_email' => $customer->email,
                'contact_phone' => $customer->phone,
                'phone_normalized' => $customer->phone,
                'address' => 'Việt Nam',
            ]
        );

        foreach (range(1, self::MINIMUM_GUESTS) as $participantIndex) {
            BookingParticipant::updateOrCreate(
                [
                    'booking_id' => $booking->id,
                    'identity_number' => sprintf('SEP26%05d%02d', $booking->id, $participantIndex),
                ],
                [
                    'full_name' => $this->vietnameseName(
                        ($booking->id * self::MINIMUM_GUESTS) + $participantIndex
                    ),
                    'birth_date' => Carbon::create(1980 + (($booking->id + $participantIndex) % 20), 5, 15),
                    'gender' => $participantIndex % 2 === 0 ? 'female' : 'male',
                    'participant_type' => 'adult',
                    'unit_price' => $unitPrice,
                    'pricing_rule_label' => 'Người lớn',
                    'pricing_type' => 'percentage',
                    'pricing_value' => 100,
                ]
            );
        }

        Payment::updateOrCreate(
            ['booking_id' => $booking->id],
            [
                'payment_method' => 'vnpay',
                'amount' => $booking->total_amount,
                'transaction_code' => 'VNPAY-'.$bookingCode,
                'gateway_response' => ['seeded' => true],
                'status' => 'success',
                'paid_at' => now(),
            ]
        );

        $bookedSlots = (int) Booking::query()
            ->where('tour_departure_id', $departure->id)
            ->whereNotIn('status', ['cancelled', 'cancelled_by_tour'])
            ->whereNotNull('slot_committed_at')
            ->sum('number_of_people');

        $departure->update([
            'total_slots' => max((int) $departure->total_slots, $bookedSlots),
            'booked_slots' => $bookedSlots,
            'status' => 'open',
        ]);
    }

    private function vietnameseName(int $number): string
    {
        $index = max(0, $number - 1);
        $surnameCount = count(self::VIETNAMESE_SURNAMES);
        $middleNameCount = count(self::VIETNAMESE_MIDDLE_NAMES);

        return implode(' ', [
            self::VIETNAMESE_SURNAMES[$index % $surnameCount],
            self::VIETNAMESE_MIDDLE_NAMES[intdiv($index, $surnameCount) % $middleNameCount],
            self::VIETNAMESE_GIVEN_NAMES[
                intdiv($index, $surnameCount * $middleNameCount) % count(self::VIETNAMESE_GIVEN_NAMES)
            ],
        ]);
    }
}
