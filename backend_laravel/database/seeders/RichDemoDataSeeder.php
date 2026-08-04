<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Category;
use App\Models\Destination;
use App\Models\Guide;
use App\Models\Review;
use App\Models\Role;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\TourReview;
use App\Models\User;
use App\Services\GuideReviewService;
use App\Services\TourReviewService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Seeder dữ liệu vận hành số lượng lớn, phủ đủ luồng nghiệp vụ:
 * khách đặt tour → thanh toán → phân công HDV → điểm danh → đánh giá →
 * hỗ trợ → thông báo → báo cáo doanh thu theo tháng.
 *
 * - Idempotent: mọi bản ghi đều upsert theo khóa ổn định (slug, mã BK-VV-*, SUP-VV-*...).
 * - Deterministic: không dùng random; dữ liệu suy ra từ chỉ số nên chạy lại không lệch.
 * - Chạy SAU DemoWorkflowSeeder trong DatabaseSeeder (đồng bộ slot/rating ở cuối).
 */
class RichDemoDataSeeder extends Seeder
{
    private const BOOKING_PREFIX = 'BK-VV-';

    private const MARKER = 'RICH-DEMO';

    private const TARGET_BOOKED_SLOTS = 12;

    private const UNDERFILLED_BOOKED_SLOTS = 6;

    private const UNDERFILLED_DEPARTURE_INTERVAL = 12;

    private Carbon $now;

    private User $admin;

    private User $supportStaff;

    /** @var array<int, User> */
    private array $customers = [];

    /** @var array<int, Guide> */
    private array $guides = [];

    /** @var array<int, array{tour: Tour, departure: TourDeparture, phase: string}> */
    private array $departureFixtures = [];

    /** @var array<int, array{booking: Booking, sequence: int, departure: TourDeparture, tour: Tour}> */
    private array $completedBookings = [];

    /** @var array<int, int> */
    private array $tourIds = [];

    private const CUSTOMER_NAMES = [
        'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Cường', 'Phạm Thu Dung',
        'Hoàng Minh Đức', 'Vũ Thị Én', 'Đặng Quang Giang', 'Bùi Thu Hà',
        'Đỗ Văn Hùng', 'Ngô Thị Kim', 'Dương Thành Long', 'Lý Thị Mai',
        'Phan Văn Nam', 'Võ Thị Oanh', 'Trịnh Đình Phong', 'Mai Thị Quỳnh',
        'Đinh Văn Sơn', 'Lương Thị Thảo', 'Tạ Quang Uy', 'Hồ Thị Vân',
        'Chu Văn Xuân', 'La Thị Yến', 'Quách Đại Dương', 'Kiều Thanh Hằng',
    ];

    private const REVIEW_COMMENTS = [
        'Chuyến đi tuyệt vời, hướng dẫn viên nhiệt tình, lịch trình hợp lý.',
        'Cảnh đẹp, ăn uống ngon, sẽ quay lại cùng gia đình.',
        'Dịch vụ tốt so với giá tiền, khách sạn sạch sẽ.',
        'Lịch trình hơi dày nhưng đáng trải nghiệm.',
        'Xe đưa đón đúng giờ, mọi thứ chu đáo.',
        'Tour ổn, mong có thêm thời gian tự do hơn.',
    ];

    public function run(): void
    {
        $this->now = now();

        DB::transaction(function (): void {
            $this->admin = User::query()->where('email', 'admin@vivugo.vn')->firstOrFail();
            $this->supportStaff = User::query()->where('email', 'support@vivugo.vn')->firstOrFail();
            $this->guides = Guide::query()
                ->whereIn('guide_code', ['HDV001', 'HDV002', 'HDV003', 'HDV004'])
                ->orderBy('guide_code')
                ->get()
                ->values()
                ->all();

            $this->seedDestinations();
            $this->seedCustomers();
            $this->seedTours();
            $this->seedAssignments();
            $this->seedBookings();
            $this->seedReviews();
            $this->seedWishlists();
            $this->seedSupportRequests();
            $this->seedGuideLeaveRequests();
            $this->seedAttendance();
            $this->synchronize();
        });

        $this->command?->info('Đã seed dữ liệu RICH-DEMO: tours, bookings, payments, reviews, support, attendance.');
    }

    private function seedDestinations(): void
    {
        $fixtures = [
            ['hue', 'Huế', 'Thừa Thiên Huế'],
            ['nha-trang', 'Nha Trang', 'Khánh Hòa'],
            ['da-lat', 'Đà Lạt', 'Lâm Đồng'],
            ['can-tho', 'Cần Thơ', 'Cần Thơ'],
            ['quy-nhon', 'Quy Nhơn', 'Bình Định'],
        ];

        foreach ($fixtures as [$slug, $name, $province]) {
            Destination::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $name,
                    'province_city' => $province,
                    'country' => 'Việt Nam',
                    'status' => 'active',
                ],
            );
        }
    }

    private function seedCustomers(): void
    {
        $customerRole = Role::query()->where('name', 'customer')->firstOrFail();

        foreach (self::CUSTOMER_NAMES as $index => $fullName) {
            $position = $index + 1;

            $user = User::query()->updateOrCreate(
                ['email' => sprintf('kh%02d@vivugo.vn', $position)],
                [
                    'role_id' => $customerRole->id,
                    'full_name' => $fullName,
                    'phone' => sprintf('09010%05d', $position),
                    'password' => Hash::make('Customer@123'),
                    'status' => 'active',
                ],
            );

            $this->customers[] = $user;
        }
    }

    private function seedTours(): void
    {
        // slug, title, category slug, destination slug, days, nights, base, discount, slots
        $fixtures = [
            ['hue-kinh-thanh-3n2d', 'Huế - Kinh thành cổ kính 3N2Đ', 'du-lich-van-hoa', 'hue', 3, 2, 3990000, 3590000, 30],
            ['nha-trang-vinpearl-4n3d', 'Nha Trang - Vinpearl 4N3Đ', 'du-lich-bien', 'nha-trang', 4, 3, 6490000, 5990000, 35],
            ['da-lat-ngan-hoa-3n2d', 'Đà Lạt - Thành phố ngàn hoa 3N2Đ', 'du-lich-nghi-duong', 'da-lat', 3, 2, 3490000, null, 30],
            ['can-tho-mien-tay-2n1d', 'Cần Thơ - Chợ nổi miền Tây 2N1Đ', 'du-lich-kham-pha', 'can-tho', 2, 1, 2290000, 1990000, 25],
            ['quy-nhon-ky-co-3n2d', 'Quy Nhơn - Kỳ Co Eo Gió 3N2Đ', 'du-lich-bien', 'quy-nhon', 3, 2, 4290000, 3990000, 30],
            ['ha-long-5-sao-2n1d', 'Hạ Long - Du thuyền 5 sao 2N1Đ', 'du-lich-nghi-duong', 'ha-long', 2, 1, 5290000, 4790000, 20],
            ['sa-pa-ban-lang-4n3d', 'Sa Pa - Bản làng Tây Bắc 4N3Đ', 'du-lich-kham-pha', 'sa-pa', 4, 3, 4790000, null, 28],
            ['ha-noi-pho-co-1n', 'Hà Nội - Phố cổ và ẩm thực 1N', 'du-lich-van-hoa', 'ha-noi', 1, 0, 990000, 890000, 40],
            ['phu-quoc-nam-dao-5n4d', 'Phú Quốc - Khám phá Nam đảo 5N4Đ', 'du-lich-bien', 'phu-quoc', 5, 4, 8990000, 8290000, 30],
            ['hoi-an-den-long-2n1d', 'Hội An - Đêm đèn lồng 2N1Đ', 'du-lich-van-hoa', 'hoi-an', 2, 1, 2590000, 2390000, 32],
            ['ninh-binh-trang-an-2n1d', 'Ninh Bình - Tràng An Bái Đính 2N1Đ', 'du-lich-kham-pha', 'ninh-binh', 2, 1, 2190000, null, 35],
            ['da-nang-ba-na-hills-8n7d', 'Xuyên Việt miền Trung 8N7Đ', 'du-lich-nghi-duong', 'da-nang', 8, 7, 12990000, 11990000, 24],
        ];

        foreach ($fixtures as $tourIndex => [$slug, $title, $categorySlug, $destinationSlug, $days, $nights, $base, $discount, $slots]) {
            $category = Category::query()->where('slug', $categorySlug)->firstOrFail();
            $destination = Destination::query()->where('slug', $destinationSlug)->firstOrFail();

            $tour = Tour::withTrashed()->updateOrCreate(
                ['slug' => $slug],
                [
                    'category_id' => $category->id,
                    'destination_id' => $destination->id,
                    'created_by' => $this->admin->id,
                    'title' => $title,
                    'summary' => "Trải nghiệm {$title} cùng ViVuGo với lịch trình chọn lọc.",
                    'description' => "Hành trình {$title} đưa bạn khám phá {$destination->name} với dịch vụ trọn gói: xe đưa đón, khách sạn tiêu chuẩn, hướng dẫn viên chuyên nghiệp và các bữa ăn đặc sản địa phương.",
                    'itinerary' => "Ngày 1: Khởi hành và nhận phòng\nNgày cuối: Mua sắm đặc sản, trở về điểm đón",
                    'duration_days' => $days,
                    'duration_nights' => $nights,
                    'base_price' => $base,
                    'discount_price' => $discount,
                    'max_slots' => $slots,
                    'available_slots' => $slots,
                    'status' => 'published',
                    'deleted_at' => null,
                ],
            );

            $this->tourIds[] = $tour->id;

            foreach ([1, 2] as $order) {
                $this->upsert('tour_images', [
                    'tour_id' => $tour->id,
                    'sort_order' => $order,
                ], [
                    'image_url' => "https://picsum.photos/seed/vivugo-{$slug}-{$order}/800/600",
                    'alt_text' => $title,
                    'is_thumbnail' => $order === 1,
                ]);
            }

            $itineraryItems = [
                ['departure', 'Tập trung và khởi hành', 1],
                ['sightseeing', "Tham quan {$destination->name}", max(1, (int) ceil($days / 2))],
                ['meal', 'Thưởng thức đặc sản địa phương', max(1, (int) ceil($days / 2))],
                ['return', 'Kết thúc hành trình, trở về', $days],
            ];

            foreach ($itineraryItems as $order => [$type, $itineraryTitle, $dayNumber]) {
                $this->upsert('tour_itineraries', [
                    'tour_id' => $tour->id,
                    'sort_order' => $order + 1,
                ], [
                    'day_number' => $dayNumber,
                    'type' => $type,
                    'title' => $itineraryTitle,
                    'start_time' => $order % 2 === 0 ? '08:00' : '13:30',
                    'end_time' => $order % 2 === 0 ? '11:00' : '16:30',
                    'duration' => '3 giờ',
                    'transport' => 'Xe du lịch',
                    'description' => 'Hoạt động trong khuôn khổ tour.',
                ]);
            }

            foreach ([
                ['Người lớn', 12, null, 'fixed', $discount ?? $base, 1],
                ['Trẻ em', 2, 11, 'percentage', 70, 2],
                ['Em bé', 0, 1, 'free', 0, 3],
            ] as [$label, $minAge, $maxAge, $type, $value, $order]) {
                $this->upsert('tour_age_pricing_rules', [
                    'tour_id' => $tour->id,
                    'label' => $label,
                ], [
                    'min_age' => $minAge,
                    'max_age' => $maxAge,
                    'pricing_type' => $type,
                    'price_value' => $value,
                    'sort_order' => $order,
                    'is_active' => true,
                ]);
            }

            // 6 lịch khởi hành/tour: 3 quá khứ (báo cáo doanh thu trải 3 tháng), 3 tương lai.
            $departureOffsets = [
                [-(70 + $tourIndex), 'completed', 'past'],
                [-(40 + $tourIndex), 'completed', 'past'],
                [-(12 + $tourIndex), 'completed', 'past'],
                [7 + ($tourIndex % 5), 'open', 'future'],
                [22 + ($tourIndex % 7), 'open', 'future'],
                [45 + ($tourIndex % 9), 'open', 'future'],
            ];
            $departureLocations = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng'];

            foreach ($departureOffsets as $departureIndex => [$offset, $status, $phase]) {
                $departureDate = $this->now->copy()->startOfDay()->addDays($offset);

                // Truyền Carbon (không phải chuỗi Y-m-d) để WHERE khớp giá trị đã lưu trên sqlite.
                $departure = TourDeparture::query()->updateOrCreate(
                    [
                        'tour_id' => $tour->id,
                        'departure_date' => $departureDate,
                    ],
                    [
                        'return_date' => $departureDate->copy()->addDays(max(0, $days - 1))->toDateString(),
                        'departure_location' => $departureLocations[($tourIndex + $departureIndex) % count($departureLocations)],
                        'base_price' => $base,
                        'discount_price' => $discount,
                        'total_slots' => $slots,
                        'status' => $status,
                    ],
                );

                $this->departureFixtures[] = [
                    'tour' => $tour,
                    'departure' => $departure,
                    'phase' => $phase,
                ];
            }
        }
    }

    private function seedAssignments(): void
    {
        foreach ($this->departureFixtures as $index => $fixture) {
            $guide = $this->guides[$index % count($this->guides)];
            $departure = $fixture['departure'];

            $status = $fixture['phase'] === 'past'
                ? 'completed'
                : ($index % 2 === 0 ? 'confirmed' : 'assigned');

            $this->upsert('tour_guide_assignments', [
                'tour_departure_id' => $departure->id,
                'guide_id' => $guide->id,
            ], [
                'role' => 'lead',
                'status' => $status,
                'assigned_by' => $this->admin->id,
                'assigned_at' => $this->now->copy()->subDays(90),
                'note' => 'Phân công dữ liệu demo',
                'notes' => self::MARKER,
            ]);
        }
    }

    private function seedBookings(): void
    {
        $sequence = 0;

        foreach ($this->departureFixtures as $departureIndex => $fixture) {
            $departure = $fixture['departure'];
            $tour = $fixture['tour'];
            $isPast = $fixture['phase'] === 'past';

            $bookingCount = 2 + ($departureIndex % 3);
            $bookingPlans = [];

            for ($i = 0; $i < $bookingCount; $i++) {
                $bookingSequence = $sequence + $i + 1;
                [$status, $paymentStatus, $paymentState] = $this->bookingStateFor($bookingSequence, $isPast);

                $bookingPlans[] = [
                    'sequence' => $bookingSequence,
                    'status' => $status,
                    'payment_status' => $paymentStatus,
                    'payment_state' => $paymentState,
                ];
            }

            $activeBookingCount = count(array_filter(
                $bookingPlans,
                fn (array $plan): bool => in_array($plan['status'], ['pending', 'confirmed', 'completed'], true),
            ));
            $targetBookedSlots = $departureIndex % self::UNDERFILLED_DEPARTURE_INTERVAL === 0
                ? self::UNDERFILLED_BOOKED_SLOTS
                : self::TARGET_BOOKED_SLOTS;
            $activeBookingPosition = 0;

            foreach ($bookingPlans as $i => $plan) {
                $sequence = $plan['sequence'];

                $customer = $this->customers[($sequence - 1) % count($this->customers)];
                $isActiveBooking = in_array($plan['status'], ['pending', 'confirmed', 'completed'], true);
                $people = $isActiveBooking
                    ? $this->peopleForDeparture($targetBookedSlots, $activeBookingCount, $activeBookingPosition)
                    : 1 + ($sequence % 3);
                $unitPrice = (float) ($departure->discount_price ?? $departure->base_price);

                if ($isActiveBooking) {
                    $activeBookingPosition++;
                }

                $status = $plan['status'];
                $paymentStatus = $plan['payment_status'];
                $paymentState = $plan['payment_state'];

                $discount = 0;
                $promotionId = null;

                if ($paymentStatus === 'paid' && $sequence % 6 === 0 && $unitPrice * $people >= 1000000) {
                    $promotionId = DB::table('promotions')->where('code', 'WELCOME50')->value('id');
                    $discount = $promotionId ? 50000 : 0;
                }

                $total = max(0, $unitPrice * $people - $discount);

                $createdAt = $isPast
                    ? Carbon::parse($departure->departure_date)->subDays(20)->addDays($i * 3)->setTime(9 + $i, 30)
                    : $this->now->copy()->subDays(9 - ($sequence % 9))->setTime(10 + $i, 15);

                $cancelledAt = $status === 'cancelled'
                    ? $createdAt->copy()->addHours(6)
                    : null;

                $code = self::BOOKING_PREFIX.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);

                $booking = Booking::query()->updateOrCreate(
                    ['booking_code' => $code],
                    [
                        'user_id' => $customer->id,
                        'tour_id' => $tour->id,
                        'tour_departure_id' => $departure->id,
                        'promotion_id' => $promotionId,
                        'staff_id' => in_array($status, ['confirmed', 'completed'], true) ? $this->supportStaff->id : null,
                        'number_of_people' => $people,
                        'unit_price' => $unitPrice,
                        'discount_amount' => $discount,
                        'total_amount' => $total,
                        'status' => $status,
                        'payment_status' => $paymentStatus,
                        'note' => null,
                        'cancel_reason' => $status === 'cancelled' ? 'Khách bận việc đột xuất' : null,
                        'cancelled_at' => $cancelledAt,
                    ],
                );

                $booking->forceFill([
                    'created_at' => $createdAt,
                    'updated_at' => $cancelledAt ?? $createdAt,
                ])->saveQuietly();

                $this->seedBookingChildren($booking, $customer, $people, $unitPrice, $paymentState, $createdAt, $sequence);

                if ($promotionId !== null) {
                    DB::table('promotion_usages')->updateOrInsert(
                        ['promotion_id' => $promotionId, 'booking_id' => $booking->id],
                        ['user_id' => $customer->id, 'discount_amount' => $discount, 'used_at' => $createdAt],
                    );
                }

                if ($status === 'completed' && $paymentStatus === 'paid') {
                    $this->completedBookings[] = [
                        'booking' => $booking,
                        'sequence' => $sequence,
                        'departure' => $departure,
                        'tour' => $tour,
                    ];
                }

                if ($sequence % 3 === 0) {
                    $this->seedBookingNotification($booking, $customer, $status, $paymentStatus, $createdAt, $sequence);
                }
            }
        }
    }

    /**
     * @return array{0: string, 1: string, 2: string} [booking status, payment_status, payment state]
     */
    private function bookingStateFor(int $sequence, bool $isPast): array
    {
        if ($isPast) {
            return $sequence % 5 === 4
                ? ['cancelled', 'refunded', 'refunded']
                : ['completed', 'paid', 'success'];
        }

        return match ($sequence % 4) {
            0, 2 => ['confirmed', 'paid', 'success'],
            1 => ['pending', 'unpaid', 'pending'],
            default => ['cancelled', 'failed', 'failed'],
        };
    }

    private function peopleForDeparture(int $targetBookedSlots, int $activeBookingCount, int $activeBookingPosition): int
    {
        $activeBookingCount = max(1, $activeBookingCount);
        $basePeople = intdiv($targetBookedSlots, $activeBookingCount);
        $remainingPeople = $targetBookedSlots % $activeBookingCount;

        return $basePeople + ($activeBookingPosition < $remainingPeople ? 1 : 0);
    }

    private function seedBookingChildren(
        Booking $booking,
        User $customer,
        int $people,
        float $unitPrice,
        string $paymentState,
        Carbon $createdAt,
        int $sequence,
    ): void {
        DB::table('booking_contacts')->updateOrInsert(
            ['booking_id' => $booking->id],
            [
                'contact_name' => $customer->full_name,
                'contact_email' => $customer->email,
                'contact_phone' => $customer->phone,
                'address' => 'Số '.(10 + $sequence % 90).' đường Trần Hưng Đạo',
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ],
        );

        DB::table('booking_participants')->where('booking_id', $booking->id)->delete();

        foreach (range(1, $people) as $position) {
            $name = $position === 1
                ? $customer->full_name
                : self::CUSTOMER_NAMES[($sequence + $position * 7) % count(self::CUSTOMER_NAMES)];

            DB::table('booking_participants')->insert([
                'booking_id' => $booking->id,
                'full_name' => $name,
                'phone' => $position === 1 ? $customer->phone : null,
                'birth_date' => $this->now->copy()->subYears(22 + (($sequence + $position) % 30))->toDateString(),
                'gender' => ($sequence + $position) % 2 === 0 ? 'male' : 'female',
                'identity_number' => sprintf('VV%d%02d', $booking->id, $position),
                'participant_type' => 'adult',
                'unit_price' => $unitPrice,
                'pricing_rule_label' => 'Người lớn',
                'pricing_type' => 'fixed',
                'pricing_value' => $unitPrice,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
        }

        $method = ['vnpay', 'momo', 'cod'][$sequence % 3];

        DB::table('payments')->updateOrInsert(
            ['booking_id' => $booking->id],
            [
                'payment_method' => $method,
                'amount' => $booking->total_amount,
                'transaction_code' => $paymentState === 'success' ? 'VV-PAY-'.$booking->id : null,
                'gateway_response' => $paymentState === 'success'
                    ? json_encode(['demo' => true, 'source' => self::MARKER])
                    : null,
                'status' => $paymentState,
                'paid_at' => $paymentState === 'success' ? $createdAt->copy()->addHours(2) : null,
                'expires_at' => $paymentState === 'pending' ? $this->now->copy()->addDays(2) : null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ],
        );

        DB::table('booking_status_histories')->where('booking_id', $booking->id)->delete();

        DB::table('booking_status_histories')->insert([
            'booking_id' => $booking->id,
            'changed_by' => $customer->id,
            'old_status' => null,
            'new_status' => 'pending',
            'note' => 'Khách tạo đơn',
            'created_at' => $createdAt,
        ]);

        if ($booking->status !== 'pending') {
            DB::table('booking_status_histories')->insert([
                'booking_id' => $booking->id,
                'changed_by' => $booking->status === 'cancelled' ? $customer->id : $this->admin->id,
                'old_status' => 'pending',
                'new_status' => $booking->status,
                'note' => 'Cập nhật trạng thái đơn',
                'created_at' => $createdAt->copy()->addHours(5),
            ]);
        }
    }

    private function seedBookingNotification(
        Booking $booking,
        User $customer,
        string $status,
        string $paymentStatus,
        Carbon $createdAt,
        int $sequence,
    ): void {
        [$type, $title, $message] = match (true) {
            $paymentStatus === 'paid' => [
                'payment',
                "Thanh toán thành công đơn {$booking->booking_code}",
                'Cảm ơn bạn đã thanh toán. Chúc bạn có chuyến đi vui vẻ cùng ViVuGo!',
            ],
            $status === 'pending' => [
                'booking',
                "Đơn {$booking->booking_code} đang chờ thanh toán",
                'Vui lòng hoàn tất thanh toán để giữ chỗ cho chuyến đi của bạn.',
            ],
            default => [
                'system',
                "Đơn {$booking->booking_code} đã được cập nhật",
                'Trạng thái đơn hàng của bạn vừa thay đổi. Xem chi tiết trong mục đơn hàng.',
            ],
        };

        $isRead = $sequence % 2 === 0;

        DB::table('notifications')->updateOrInsert(
            ['user_id' => $customer->id, 'title' => $title],
            [
                'message' => $message,
                'type' => $type,
                'data' => json_encode(['booking_id' => $booking->id, 'booking_code' => $booking->booking_code]),
                'status' => $isRead ? 'read' : 'unread',
                'read_at' => $isRead ? $createdAt->copy()->addHours(8) : null,
                'created_at' => $createdAt->copy()->addHours(3),
                'updated_at' => $createdAt->copy()->addHours(3),
            ],
        );
    }

    private function seedReviews(): void
    {
        $reviewedGuideIds = [];
        $ratingPool = [5, 4, 5, 3, 4];

        foreach ($this->completedBookings as $entry) {
            $booking = $entry['booking'];
            $sequence = $entry['sequence'];
            $departure = $entry['departure'];

            $reviewedAt = Carbon::parse($departure->return_date ?? $departure->departure_date)->addDays(2)->setTime(20, 0);

            if ($sequence % 10 < 7) {
                $review = TourReview::query()->updateOrCreate(
                    ['booking_id' => $booking->id],
                    [
                        'user_id' => $booking->user_id,
                        'tour_id' => $booking->tour_id,
                        'tour_departure_id' => $departure->id,
                        'rating' => $ratingPool[$sequence % 5],
                        'comment' => self::REVIEW_COMMENTS[$sequence % count(self::REVIEW_COMMENTS)],
                        'status' => $sequence % 17 === 0 ? 'hidden' : 'visible',
                        'moderated_by' => $sequence % 17 === 0 ? $this->admin->id : null,
                        'moderated_at' => $sequence % 17 === 0 ? $reviewedAt : null,
                    ],
                );

                $review->forceFill(['created_at' => $reviewedAt, 'updated_at' => $reviewedAt])->saveQuietly();
            }

            if ($sequence % 2 === 0) {
                $guideId = DB::table('tour_guide_assignments')
                    ->where('tour_departure_id', $departure->id)
                    ->whereIn('status', ['assigned', 'confirmed', 'completed'])
                    ->value('guide_id');

                if ($guideId) {
                    $guideReview = Review::query()->updateOrCreate(
                        ['booking_id' => $booking->id, 'guide_id' => $guideId],
                        [
                            'user_id' => $booking->user_id,
                            'tour_id' => $booking->tour_id,
                            'tour_departure_id' => $departure->id,
                            'rating' => $ratingPool[($sequence + 1) % 5],
                            'comment' => 'Hướng dẫn viên chu đáo, am hiểu địa phương.',
                            'status' => 'visible',
                        ],
                    );

                    $guideReview->forceFill(['created_at' => $reviewedAt, 'updated_at' => $reviewedAt])->saveQuietly();

                    $reviewedGuideIds[$guideId] = true;
                }
            }
        }

        $tourReviewService = app(TourReviewService::class);

        foreach (array_unique($this->tourIds) as $tourId) {
            $tourReviewService->refreshTourRating($tourId);
        }

        $guideReviewService = app(GuideReviewService::class);

        foreach (array_keys($reviewedGuideIds) as $guideId) {
            $guideReviewService->refreshGuideRating($guideId);
        }
    }

    private function seedWishlists(): void
    {
        $tourCount = count($this->tourIds);

        foreach ($this->customers as $index => $customer) {
            foreach ([$index % $tourCount, ($index + 5) % $tourCount] as $tourOffset) {
                $this->upsert('wishlists', [
                    'user_id' => $customer->id,
                    'tour_id' => $this->tourIds[$tourOffset],
                ], []);
            }
        }
    }

    private function seedSupportRequests(): void
    {
        $categories = ['technical', 'payment', 'account', 'feedback', 'general'];
        $priorities = ['low', 'medium', 'high'];
        $subjects = [
            'Không thanh toán được bằng VNPAY',
            'Muốn đổi ngày khởi hành',
            'Hỏi về chính sách hoàn tiền',
            'Không đăng nhập được tài khoản',
            'Góp ý về hướng dẫn viên',
            'Hóa đơn xuất sai thông tin công ty',
        ];

        foreach (range(1, 12) as $index) {
            $customer = $this->customers[($index * 2) % count($this->customers)];
            $status = ['pending', 'in_progress', 'resolved'][$index % 3];
            $createdAt = $this->now->copy()->subDays(30 - $index * 2)->setTime(9, 0);
            $ticketCode = sprintf('SUP-VV-%03d', $index);

            DB::table('support_requests')->updateOrInsert(
                ['ticket_code' => $ticketCode],
                [
                    'user_id' => $customer->id,
                    'full_name' => $customer->full_name,
                    'email' => $customer->email,
                    'phone' => $customer->phone,
                    'category' => $categories[$index % count($categories)],
                    'priority' => $priorities[$index % count($priorities)],
                    'subject' => $subjects[$index % count($subjects)],
                    'description' => 'Nhờ ViVuGo hỗ trợ xử lý sớm giúp em. Cảm ơn đội ngũ!',
                    'status' => $status,
                    'assigned_to' => $status === 'pending' ? null : $this->supportStaff->id,
                    'started_at' => $status === 'pending' ? null : $createdAt->copy()->addHours(2),
                    'resolved_at' => $status === 'resolved' ? $createdAt->copy()->addHours(30) : null,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ],
            );

            $requestId = DB::table('support_requests')->where('ticket_code', $ticketCode)->value('id');

            DB::table('support_request_messages')->where('support_request_id', $requestId)->delete();

            DB::table('support_request_messages')->insert([
                'support_request_id' => $requestId,
                'sender_id' => $customer->id,
                'sender_type' => 'customer',
                'message' => 'Chào ViVuGo, '.mb_strtolower($subjects[$index % count($subjects)]).', nhờ bên mình kiểm tra giúp.',
                'created_at' => $createdAt->copy()->addMinutes(5),
                'updated_at' => $createdAt->copy()->addMinutes(5),
            ]);

            if ($status !== 'pending') {
                DB::table('support_request_messages')->insert([
                    'support_request_id' => $requestId,
                    'sender_id' => $this->supportStaff->id,
                    'sender_type' => 'support_staff',
                    'message' => 'ViVuGo đã tiếp nhận yêu cầu và đang xử lý, sẽ phản hồi trong 24h.',
                    'created_at' => $createdAt->copy()->addHours(3),
                    'updated_at' => $createdAt->copy()->addHours(3),
                ]);
            }
        }
    }

    private function seedGuideLeaveRequests(): void
    {
        $statuses = ['pending', 'approved', 'rejected'];

        foreach (array_slice($this->guides, 0, 3) as $index => $guide) {
            $status = $statuses[$index];
            $startDate = $this->now->copy()->addDays(30 + $index * 6)->toDateString();
            $endDate = $this->now->copy()->addDays(32 + $index * 6)->toDateString();

            $this->upsert('guide_leave_requests', [
                'guide_id' => $guide->id,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ], [
                'user_id' => $guide->user_id,
                'reason' => 'Xin nghỉ phép việc gia đình',
                'status' => $status,
                'admin_note' => $status === 'pending' ? null : 'Đã xem xét theo lịch phân công',
                'admin_id' => $status === 'pending' ? null : $this->admin->id,
                'reviewed_at' => $status === 'pending' ? null : $this->now->copy()->subDays(1),
                'cancel_reason' => null,
                'cancelled_at' => null,
                'deleted_at' => null,
            ]);
        }
    }

    private function seedAttendance(): void
    {
        $pastFixtures = array_values(array_filter(
            $this->departureFixtures,
            fn (array $fixture) => $fixture['phase'] === 'past',
        ));

        // Điểm danh cho 4 chuyến đã hoàn thành là đủ minh họa luồng.
        foreach (array_slice($pastFixtures, 0, 4) as $fixtureIndex => $fixture) {
            $departure = $fixture['departure'];
            $sessionName = 'Điểm danh khởi hành '.self::MARKER;

            $sessionId = DB::table('attendance_sessions')
                ->where('tour_departure_id', $departure->id)
                ->where('name', $sessionName)
                ->value('id');

            $departureDate = Carbon::parse($departure->departure_date)->setTime(7, 0);

            $sessionValues = [
                'scheduled_date' => $departure->departure_date,
                'boundary' => 'departure',
                'note' => 'Phiên điểm danh dữ liệu demo',
                'status' => 'closed',
                'created_by' => $this->admin->id,
                'created_at' => $departureDate,
                'updated_at' => $departureDate,
            ];

            if ($sessionId) {
                DB::table('attendance_sessions')->where('id', $sessionId)->update($sessionValues);
            } else {
                $sessionId = DB::table('attendance_sessions')->insertGetId(array_merge($sessionValues, [
                    'tour_departure_id' => $departure->id,
                    'name' => $sessionName,
                ]));
            }

            $participantIds = DB::table('booking_participants')
                ->join('bookings', 'bookings.id', '=', 'booking_participants.booking_id')
                ->where('bookings.tour_departure_id', $departure->id)
                ->where('bookings.status', 'completed')
                ->orderBy('booking_participants.id')
                ->limit(12)
                ->pluck('booking_participants.id');

            DB::table('attendances')->where('attendance_session_id', $sessionId)->delete();

            $guideUserId = $this->guides[$fixtureIndex % count($this->guides)]->user_id;

            foreach ($participantIds as $index => $participantId) {
                $status = ['checked_in', 'checked_out', 'checked_in', 'absent'][$index % 4];

                DB::table('attendances')->insert([
                    'attendance_session_id' => $sessionId,
                    'booking_participant_id' => $participantId,
                    'status' => $status,
                    'checked_in_at' => $status === 'absent' ? null : $departureDate->copy()->addMinutes(10 + $index),
                    'checked_out_at' => $status === 'checked_out' ? $departureDate->copy()->addHours(9) : null,
                    'checked_in_by' => $status === 'absent' ? null : $guideUserId,
                    'checked_out_by' => $status === 'checked_out' ? $guideUserId : null,
                    'note' => $status === 'absent' ? 'Khách báo bận đột xuất' : null,
                    'note_updated_by' => $guideUserId,
                    'created_at' => $departureDate,
                    'updated_at' => $departureDate,
                ]);
            }
        }
    }

    private function synchronize(): void
    {
        TourDeparture::query()->each(function (TourDeparture $departure): void {
            $bookedSlots = Booking::query()
                ->where('tour_departure_id', $departure->id)
                ->whereIn('status', ['pending', 'confirmed', 'completed'])
                ->sum('number_of_people');

            $departure->update(['booked_slots' => min($bookedSlots, $departure->total_slots)]);
        });

        Tour::query()->each(function (Tour $tour): void {
            $availableSlots = TourDeparture::query()
                ->where('tour_id', $tour->id)
                ->where('status', 'open')
                ->whereDate('departure_date', '>=', $this->now)
                ->selectRaw('MAX(total_slots - booked_slots) as available_slots')
                ->value('available_slots');

            $tour->update(['available_slots' => max(0, (int) ($availableSlots ?? 0))]);
        });

        DB::table('promotions')->orderBy('id')->pluck('id')->each(function (int $promotionId): void {
            $usageCount = DB::table('promotion_usages')->where('promotion_id', $promotionId)->count();

            DB::table('promotions')->where('id', $promotionId)->update(['used_count' => $usageCount]);
        });
    }

    /**
     * @param  array<string, mixed>  $keys
     * @param  array<string, mixed>  $values
     */
    private function upsert(string $table, array $keys, array $values): void
    {
        DB::table($table)->updateOrInsert($keys, array_merge($values, [
            'created_at' => $this->now,
            'updated_at' => $this->now,
        ]));
    }
}
