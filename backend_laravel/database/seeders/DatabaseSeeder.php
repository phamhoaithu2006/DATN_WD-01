<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\BookingContact;
use App\Models\BookingParticipant;
use App\Models\Category;
use App\Models\Destination;
use App\Models\DestinationPlace;
use App\Models\Guide;
use App\Models\Payment;
use App\Models\Role;
use App\Models\SupportStaff;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\TourGuideAssignment;
use App\Models\TourImage;
use App\Models\TourItinerary;
use App\Models\TourItineraryImage;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $roles = collect([
                'admin' => 'Quản trị viên',
                'customer' => 'Khách hàng',
                'tour guide' => 'Hướng dẫn viên',
                'support staff' => 'Nhân viên hỗ trợ',
            ])->mapWithKeys(function (string $description, string $name): array {
                $role = Role::updateOrCreate(
                    ['name' => $name],
                    ['description' => $description]
                );

                return [$name => $role];
            });

            $password = Hash::make('password');

            $admin = $this->upsertUser(
                $roles['admin']->id,
                'Quản trị viên',
                'admin@gmail.com',
                '0900000000',
                $password
            );

            foreach (range(1, 20) as $number) {
                $index = str_pad((string) $number, 2, '0', STR_PAD_LEFT);

                $this->upsertUser(
                    $roles['customer']->id,
                    "Khách hàng {$index}",
                    "customer{$index}@gmail.com",
                    '09100000'.$index,
                    $password
                );
            }

            foreach (range(1, 10) as $number) {
                $index = str_pad((string) $number, 2, '0', STR_PAD_LEFT);
                $user = $this->upsertUser(
                    $roles['tour guide']->id,
                    "Hướng dẫn viên {$index}",
                    "guide{$index}@gmail.com",
                    '09200000'.$index,
                    $password
                );

                Guide::updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'guide_code' => "HDV{$index}",
                        'certificate_type' => $number % 2 === 0 ? 'Quốc tế' : 'Nội địa',
                        'experience_years' => $number,
                        'average_rating' => 0,
                        'review_count' => 0,
                        'status' => 'active',
                    ]
                );
            }

            foreach (range(1, 10) as $number) {
                $index = str_pad((string) $number, 2, '0', STR_PAD_LEFT);
                $user = $this->upsertUser(
                    $roles['support staff']->id,
                    "Nhân viên hỗ trợ {$index}",
                    "support{$index}@gmail.com",
                    '09300000'.$index,
                    $password
                );

                SupportStaff::updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'name' => $user->full_name,
                        'email' => $user->email,
                        'role' => 'customer_service',
                        'specialization' => 'Hỗ trợ khách hàng',
                        'experience_years' => $number,
                        'status' => 'active',
                        'performance_rating' => 5,
                    ]
                );
            }

            $this->seedTourData($admin);
        });
    }

    private function seedTourData(User $admin): void
    {
        $categoryData = [
            ['name' => 'Tour biển đảo', 'slug' => 'tour-bien-dao', 'description' => 'Khám phá biển xanh, đảo đẹp và các hoạt động nghỉ dưỡng.', 'thumbnail_url' => 'https://activities.his-j.com/images/tour/HAN0176/Tr00100420240505194550387.jpg'],
            ['name' => 'Tour văn hóa', 'slug' => 'tour-van-hoa', 'description' => 'Tìm hiểu di sản, lịch sử và văn hóa địa phương.', 'thumbnail_url' => 'https://www.travelanddestinations.com/wp-content/uploads/2017/05/Beautiful-Streets-in-Old-Town-Hoi-An.jpg'],
            ['name' => 'Tour sinh thái', 'slug' => 'tour-sinh-thai', 'description' => 'Trải nghiệm thiên nhiên, rừng, sông nước và hệ sinh thái.', 'thumbnail_url' => 'https://mediaen.vietnamplus.vn/images/cc571c067c64d4f85fb35f04673bf2962ba3bd265180754e12d52fc3270d71aaa2fede9de9e58424e10f987b501829b0cb5f9e8079d3a87fb9e397eb2c72b976ad58f530c02deb4f11bdeb0f9148b8d3/Trang_An_scenic_landscape_complex.jpg'],
            ['name' => 'Tour nghỉ dưỡng', 'slug' => 'tour-nghi-duong', 'description' => 'Hành trình thư giãn tại các điểm đến nổi tiếng.', 'thumbnail_url' => 'https://www.uncovervietnam.com/wp-content/uploads/2019/01/Ho-Xua-Huong-Lake-Da-Lat.jpg'],
            ['name' => 'Tour khám phá', 'slug' => 'tour-kham-pha', 'description' => 'Chinh phục cảnh quan và trải nghiệm các vùng đất mới.', 'thumbnail_url' => 'https://giadinh.mediacdn.vn/296230595582509056/2021/4/22/photo-4-16190245695591168383030.jpg'],
        ];

        $categories = collect($categoryData)->mapWithKeys(function (array $data): array {
            $category = Category::updateOrCreate(
                ['slug' => $data['slug']],
                $data + ['status' => 'active']
            );

            return [$data['slug'] => $category];
        });

        $destinationData = [
            ['name' => 'Hạ Long', 'slug' => 'ha-long', 'province_city' => 'Quảng Ninh', 'place' => 'Vịnh Hạ Long', 'place_slug' => 'vinh-ha-long', 'address' => 'Thành phố Hạ Long, Quảng Ninh', 'image' => 'https://activities.his-j.com/images/tour/HAN0176/Tr00100420240505194550387.jpg'],
            ['name' => 'Hà Nội', 'slug' => 'ha-noi', 'province_city' => 'Hà Nội', 'place' => 'Văn Miếu - Quốc Tử Giám', 'place_slug' => 'van-mieu-quoc-tu-giam', 'address' => '58 Quốc Tử Giám, Đống Đa, Hà Nội', 'image' => 'https://vj-prod-website-cms.s3.ap-southeast-1.amazonaws.com/2215893667-1686805098352.jpg'],
            ['name' => 'Ninh Bình', 'slug' => 'ninh-binh', 'province_city' => 'Ninh Bình', 'place' => 'Quần thể Tràng An', 'place_slug' => 'quan-the-trang-an', 'address' => 'Hoa Lư, Ninh Bình', 'image' => 'https://mediaen.vietnamplus.vn/images/cc571c067c64d4f85fb35f04673bf2962ba3bd265180754e12d52fc3270d71aaa2fede9de9e58424e10f987b501829b0cb5f9e8079d3a87fb9e397eb2c72b976ad58f530c02deb4f11bdeb0f9148b8d3/Trang_An_scenic_landscape_complex.jpg'],
            ['name' => 'Sa Pa', 'slug' => 'sa-pa', 'province_city' => 'Lào Cai', 'place' => 'Đỉnh Fansipan', 'place_slug' => 'dinh-fansipan', 'address' => 'Sa Pa, Lào Cai', 'image' => 'https://giadinh.mediacdn.vn/296230595582509056/2021/4/22/photo-4-16190245695591168383030.jpg'],
            ['name' => 'Huế', 'slug' => 'hue', 'province_city' => 'Huế', 'place' => 'Đại Nội Huế', 'place_slug' => 'dai-noi-hue', 'address' => '23/8, Thuận Hòa, Huế', 'image' => 'https://amajourneyasia.com/media/ckeditor/hue-citadel.jpg'],
            ['name' => 'Đà Nẵng', 'slug' => 'da-nang', 'province_city' => 'Đà Nẵng', 'place' => 'Bà Nà Hills', 'place_slug' => 'ba-na-hills', 'address' => 'Hòa Vang, Đà Nẵng', 'image' => 'https://imagel.sekainavi.com/vietnam/play/contents_list_thumb/201304/Good_49_sum640_1365595239.JPG'],
            ['name' => 'Hội An', 'slug' => 'hoi-an', 'province_city' => 'Quảng Nam', 'place' => 'Phố cổ Hội An', 'place_slug' => 'pho-co-hoi-an', 'address' => 'Minh An, Hội An, Quảng Nam', 'image' => 'https://www.travelanddestinations.com/wp-content/uploads/2017/05/Beautiful-Streets-in-Old-Town-Hoi-An.jpg'],
            ['name' => 'Đà Lạt', 'slug' => 'da-lat', 'province_city' => 'Lâm Đồng', 'place' => 'Hồ Xuân Hương', 'place_slug' => 'ho-xuan-huong', 'address' => 'Phường 1, Đà Lạt, Lâm Đồng', 'image' => 'https://www.uncovervietnam.com/wp-content/uploads/2019/01/Ho-Xua-Huong-Lake-Da-Lat.jpg'],
            ['name' => 'Nha Trang', 'slug' => 'nha-trang', 'province_city' => 'Khánh Hòa', 'place' => 'Vịnh Nha Trang', 'place_slug' => 'vinh-nha-trang', 'address' => 'Thành phố Nha Trang, Khánh Hòa', 'image' => 'https://abayre.vn/landscape/nhatrang-hero.webp'],
            ['name' => 'Phú Quốc', 'slug' => 'phu-quoc', 'province_city' => 'Kiên Giang', 'place' => 'Bãi Sao', 'place_slug' => 'bai-sao-phu-quoc', 'address' => 'An Thới, Phú Quốc, Kiên Giang', 'image' => 'https://ik.imagekit.io/tvlk/blog/2023/09/bai-sao-17.jpg?tr=dpr-2%2Cw-675'],
        ];

        $destinations = collect();
        $places = collect();

        foreach ($destinationData as $data) {
            $destination = Destination::updateOrCreate(
                ['slug' => $data['slug']],
                [
                    'name' => $data['name'],
                    'province_city' => $data['province_city'],
                    'country' => 'Việt Nam',
                    'description' => "Điểm đến {$data['name']} nổi tiếng với cảnh quan và văn hóa đặc sắc.",
                    'thumbnail_url' => $data['image'],
                    'status' => 'active',
                ]
            );

            $place = DestinationPlace::updateOrCreate(
                ['slug' => $data['place_slug']],
                [
                    'destination_id' => $destination->id,
                    'name' => $data['place'],
                    'address' => $data['address'],
                    'description' => "Tham quan {$data['place']}, địa danh tiêu biểu của {$data['name']}.",
                    'thumbnail_url' => $data['image'],
                    'status' => 'active',
                ]
            );

            $destinations->put($data['slug'], $destination);
            $places->put($data['slug'], $place);
        }

        $tourData = [
            ['title' => 'Hạ Long kỳ quan biển đảo', 'slug' => 'ha-long-ky-quan-bien-dao', 'category' => 'tour-bien-dao', 'destination' => 'ha-long', 'days' => 3, 'nights' => 2, 'price' => 4290000],
            ['title' => 'Hà Nội nghìn năm văn hiến', 'slug' => 'ha-noi-nghin-nam-van-hien', 'category' => 'tour-van-hoa', 'destination' => 'ha-noi', 'days' => 2, 'nights' => 1, 'price' => 2390000],
            ['title' => 'Tràng An non nước hữu tình', 'slug' => 'trang-an-non-nuoc-huu-tinh', 'category' => 'tour-sinh-thai', 'destination' => 'ninh-binh', 'days' => 2, 'nights' => 1, 'price' => 2690000],
            ['title' => 'Sa Pa chinh phục Fansipan', 'slug' => 'sa-pa-chinh-phuc-fansipan', 'category' => 'tour-kham-pha', 'destination' => 'sa-pa', 'days' => 3, 'nights' => 2, 'price' => 3990000],
            ['title' => 'Huế hành trình di sản', 'slug' => 'hue-hanh-trinh-di-san', 'category' => 'tour-van-hoa', 'destination' => 'hue', 'days' => 3, 'nights' => 2, 'price' => 3590000],
            ['title' => 'Đà Nẵng nghỉ dưỡng Bà Nà', 'slug' => 'da-nang-nghi-duong-ba-na', 'category' => 'tour-nghi-duong', 'destination' => 'da-nang', 'days' => 4, 'nights' => 3, 'price' => 5790000],
            ['title' => 'Hội An sắc màu phố cổ', 'slug' => 'hoi-an-sac-mau-pho-co', 'category' => 'tour-van-hoa', 'destination' => 'hoi-an', 'days' => 2, 'nights' => 1, 'price' => 2890000],
            ['title' => 'Đà Lạt thành phố ngàn hoa', 'slug' => 'da-lat-thanh-pho-ngan-hoa', 'category' => 'tour-nghi-duong', 'destination' => 'da-lat', 'days' => 3, 'nights' => 2, 'price' => 3890000],
            ['title' => 'Nha Trang biển xanh gọi mời', 'slug' => 'nha-trang-bien-xanh-goi-moi', 'category' => 'tour-bien-dao', 'destination' => 'nha-trang', 'days' => 4, 'nights' => 3, 'price' => 5490000],
            ['title' => 'Phú Quốc thiên đường đảo ngọc', 'slug' => 'phu-quoc-thien-duong-dao-ngoc', 'category' => 'tour-bien-dao', 'destination' => 'phu-quoc', 'days' => 4, 'nights' => 3, 'price' => 6490000],
        ];

        $seededTours = collect();

        foreach ($tourData as $data) {
            $destination = $destinations[$data['destination']];
            $place = $places[$data['destination']];
            $tour = Tour::updateOrCreate(
                ['slug' => $data['slug']],
                [
                    'category_id' => $categories[$data['category']]->id,
                    'destination_id' => $destination->id,
                    'created_by' => $admin->id,
                    'title' => $data['title'],
                    'summary' => "Khám phá {$destination->name} và tham quan {$place->name} trong hành trình {$data['days']} ngày.",
                    'description' => "Hành trình đưa du khách đến {$destination->name}, trải nghiệm văn hóa địa phương, thưởng thức ẩm thực và khám phá {$place->name}.",
                    'itinerary' => "Ngày 1: Khởi hành và tham quan {$place->name}. Các ngày tiếp theo: trải nghiệm, nghỉ dưỡng và khám phá {$destination->name}.",
                    'duration_days' => $data['days'],
                    'duration_nights' => $data['nights'],
                    'base_price' => $data['price'],
                    'discount_price' => $data['price'] - 300000,
                    'max_slots' => 30,
                    'available_slots' => 30,
                    'status' => 'published',
                    'average_rating' => 0,
                    'review_count' => 0,
                ]
            );

            $tour->destinations()->sync([$destination->id => ['sort_order' => 1]]);

            TourImage::updateOrCreate(
                ['tour_id' => $tour->id, 'is_thumbnail' => true],
                [
                    'image_url' => $destination->thumbnail_url,
                    'alt_text' => "Ảnh {$data['title']}",
                    'sort_order' => 1,
                ]
            );

            $this->seedTourItinerary($tour, $destination, $place, $data['days']);
            $seededTours->push($tour);
        }

        $this->seedTourDepartures($seededTours, $admin);
        $this->seedTourBookings();
    }

    /**
     * Tạo 20 hành khách cho mỗi lịch bằng 4 booking, mỗi booking 5 người.
     * Tài khoản khách chỉ được xếp lại sau khi tour trước đã kết thúc và
     * không đặt lặp lại cùng một tour trong tập dữ liệu seeder.
     */
    private function seedTourBookings(): void
    {
        $customerRoleId = (int) Role::query()->where('name', 'customer')->value('id');
        $customers = User::query()
            ->where('role_id', $customerRoleId)
            ->where('status', 'active')
            ->orderBy('id')
            ->get();
        $customerAvailableFrom = [];
        $customerTourHistory = [];
        $extraCustomerNumber = 1;

        Booking::query()
            ->whereNotIn('status', ['cancelled', 'cancelled_by_tour'])
            ->where('booking_code', 'not like', 'BKSEED-%')
            ->with('tourDeparture:id,departure_date,return_date')
            ->get()
            ->each(function (Booking $booking) use (&$customerAvailableFrom, &$customerTourHistory): void {
                if (! $booking->tourDeparture) {
                    return;
                }

                $availableFrom = Carbon::parse(
                    $booking->tourDeparture->return_date
                    ?? $booking->tourDeparture->departure_date
                )->addDay()->startOfDay();
                $currentAvailableFrom = $customerAvailableFrom[$booking->user_id] ?? null;

                if (! $currentAvailableFrom || $availableFrom->gt($currentAvailableFrom)) {
                    $customerAvailableFrom[$booking->user_id] = $availableFrom;
                }

                $customerTourHistory[$booking->user_id][(int) $booking->tour_id] = true;
            });

        $departures = TourDeparture::query()
            ->whereBetween('departure_date', [today()->toDateString(), today()->endOfMonth()->toDateString()])
            ->where('status', 'open')
            ->with(['tour.agePricingRules'])
            ->orderBy('departure_date')
            ->orderBy('id')
            ->get();

        foreach ($departures as $departure) {
            $departureDate = $departure->departure_date->copy()->startOfDay();
            $returnDate = ($departure->return_date ?? $departure->departure_date)->copy()->startOfDay();
            $adultRule = $departure->tour->agePricingRules
                ->first(function ($rule): bool {
                    $minAge = (int) ($rule->min_age ?? 0);
                    $maxAge = $rule->max_age === null ? null : (int) $rule->max_age;

                    return $rule->is_active
                        && $rule->pricing_type !== 'free'
                        && $minAge >= 12
                        && ($maxAge === null || $maxAge >= 120);
                });
            $unitPrice = (float) (
                $departure->discount_price
                ?? $departure->base_price
                ?? $departure->price
                ?? $departure->tour->discount_price
                ?? $departure->tour->base_price
            );

            foreach (range(1, 4) as $bookingIndex) {
                $customer = $customers->first(function (User $candidate) use (
                    $customerAvailableFrom,
                    $customerTourHistory,
                    $departureDate,
                    $departure
                ): bool {
                    $availableFrom = $customerAvailableFrom[$candidate->id] ?? null;
                    $alreadyBookedTour = $customerTourHistory[$candidate->id][$departure->tour_id] ?? false;

                    return ! $alreadyBookedTour
                        && ($availableFrom === null || $availableFrom->lte($departureDate));
                });

                if (! $customer) {
                    $customer = $this->createExtraCustomer($extraCustomerNumber++, $customerRoleId);
                    $customers->push($customer);
                }

                $customerAvailableFrom[$customer->id] = $returnDate->copy()->addDay();
                $customerTourHistory[$customer->id][$departure->tour_id] = true;
                $bookingCode = sprintf('BKSEED-%d-%02d', $departure->id, $bookingIndex);
                $booking = Booking::updateOrCreate(
                    ['booking_code' => $bookingCode],
                    [
                        'idempotency_key' => 'seed-'.sha1($bookingCode),
                        'user_id' => $customer->id,
                        'tour_id' => $departure->tour_id,
                        'tour_departure_id' => $departure->id,
                        'number_of_people' => 5,
                        'unit_price' => $unitPrice,
                        'discount_amount' => 0,
                        'total_amount' => $unitPrice * 5,
                        'status' => 'confirmed',
                        'payment_status' => 'paid',
                        'slot_committed_at' => now(),
                        'note' => 'Booking dữ liệu mẫu được tạo tự động.',
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
                        'special_request' => null,
                    ]
                );

                foreach (range(1, 5) as $participantIndex) {
                    $identityNumber = sprintf(
                        'SEED%06d%02d',
                        $booking->id,
                        $participantIndex
                    );

                    BookingParticipant::updateOrCreate(
                        [
                            'booking_id' => $booking->id,
                            'identity_number' => $identityNumber,
                        ],
                        [
                            'full_name' => "{$customer->full_name} - Thành viên {$participantIndex}",
                            'phone' => null,
                            'phone_normalized' => null,
                            'birth_date' => Carbon::create(1980 + (($booking->id + $participantIndex) % 20), 5, 15)->toDateString(),
                            'gender' => $participantIndex % 2 === 0 ? 'female' : 'male',
                            'participant_type' => 'adult',
                            'unit_price' => $unitPrice,
                            'pricing_rule_label' => $adultRule?->label ?? 'Người lớn',
                            'pricing_type' => $adultRule?->pricing_type ?? 'percentage',
                            'pricing_value' => $adultRule?->price_value ?? 100,
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
                        'expires_at' => null,
                    ]
                );
            }

            $committedSlots = (int) Booking::query()
                ->where('tour_departure_id', $departure->id)
                ->whereNotIn('status', ['cancelled', 'cancelled_by_tour'])
                ->whereNotNull('slot_committed_at')
                ->sum('number_of_people');

            $departure->update([
                'total_slots' => max((int) $departure->total_slots, $committedSlots),
                'booked_slots' => $committedSlots,
                // Lịch mẫu đã có đủ khách thanh toán nên được chốt để HDV thao tác.
                'status' => $departureDate->lte(today()) && $returnDate->gte(today())
                    ? 'in_progress'
                    : 'confirmed',
            ]);
        }
    }

    private function createExtraCustomer(int $number, int $roleId): User
    {
        $index = str_pad((string) $number, 7, '0', STR_PAD_LEFT);

        return $this->upsertUser(
            $roleId,
            "Khách đặt tour bổ sung {$index}",
            "booking.customer{$index}@gmail.com",
            '095'.$index,
            Hash::make('password')
        );
    }

    /**
     * Tạo 5 lịch cho mỗi tour, phủ kín mọi ngày từ hôm nay đến cuối tháng
     * và phân HDV không bị trùng khoảng thời gian dẫn tour.
     *
     * @param  Collection<int, Tour>  $tours
     */
    private function seedTourDepartures(Collection $tours, User $admin): void
    {
        $startDate = today();
        $endDate = $startDate->copy()->endOfMonth();
        $dates = collect();

        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            $dates->push($date->copy());
        }

        if ($dates->isEmpty() || $tours->isEmpty()) {
            return;
        }

        $departurePlans = collect();

        foreach ($tours->values() as $tourIndex => $tour) {
            foreach (range(0, 4) as $occurrence) {
                $sequence = $tourIndex + ($occurrence * $tours->count());
                $departurePlans->push([
                    'tour' => $tour,
                    'date' => $dates[$sequence % $dates->count()]->copy(),
                    'sequence' => $sequence,
                ]);
            }
        }

        $departurePlans = $departurePlans
            ->sortBy(fn (array $plan): string => $plan['date']->format('Y-m-d').'-'.str_pad((string) $plan['sequence'], 3, '0', STR_PAD_LEFT))
            ->values();

        $guides = Guide::query()
            ->where('status', 'active')
            ->with('user')
            ->orderBy('id')
            ->get();
        $guideAvailableFrom = [];
        $extraGuideNumber = 1;

        foreach ($departurePlans as $plan) {
            /** @var Tour $tour */
            $tour = $plan['tour'];
            /** @var Carbon $departureDate */
            $departureDate = $plan['date'];
            $returnDate = $departureDate->copy()->addDays(max(1, $tour->duration_days) - 1);

            $departure = TourDeparture::updateOrCreate(
                [
                    'tour_id' => $tour->id,
                    'departure_date' => $departureDate->toDateString(),
                ],
                [
                    'departure_at' => $departureDate->copy()->setTime(6, 30),
                    'return_date' => $returnDate->toDateString(),
                    'departure_location' => 'Văn phòng ViVuGo',
                    'price' => $tour->discount_price ?? $tour->base_price,
                    'base_price' => $tour->base_price,
                    'discount_price' => $tour->discount_price,
                    'total_slots' => 30,
                    'booked_slots' => 0,
                    'status' => 'open',
                ]
            );

            $guide = $guides->first(function (Guide $candidate) use ($guideAvailableFrom, $departureDate): bool {
                $availableFrom = $guideAvailableFrom[$candidate->id] ?? null;

                return $availableFrom === null || $availableFrom->lte($departureDate);
            });

            if (! $guide) {
                $guide = $this->createExtraGuide($extraGuideNumber++);
                $guides->push($guide);
            }

            $guideAvailableFrom[$guide->id] = $returnDate->copy()->addDay()->startOfDay();
            $guide->destinations()->syncWithoutDetaching([$tour->destination_id]);

            TourGuideAssignment::updateOrCreate(
                [
                    'tour_departure_id' => $departure->id,
                    'role' => 'lead',
                ],
                [
                    'guide_id' => $guide->id,
                    'status' => 'assigned',
                    'assigned_by' => $admin->id,
                    'assigned_at' => now(),
                    'notes' => 'Phân công tự động bởi DatabaseSeeder.',
                ]
            );
        }
    }

    private function createExtraGuide(int $number): Guide
    {
        $index = str_pad((string) $number, 2, '0', STR_PAD_LEFT);
        $roleId = (int) Role::query()->where('name', 'tour guide')->value('id');
        $user = $this->upsertUser(
            $roleId,
            "Hướng dẫn viên bổ sung {$index}",
            "guide.extra{$index}@gmail.com",
            '09400000'.$index,
            Hash::make('password')
        );

        return Guide::updateOrCreate(
            ['user_id' => $user->id],
            [
                'guide_code' => "HDVBS{$index}",
                'certificate_type' => 'Nội địa',
                'experience_years' => 3,
                'average_rating' => 0,
                'review_count' => 0,
                'status' => 'active',
            ]
        );
    }

    private function seedTourItinerary(
        Tour $tour,
        Destination $destination,
        DestinationPlace $place,
        int $totalDays
    ): void {
        foreach (range(1, $totalDays) as $day) {
            $isFirstDay = $day === 1;
            $isLastDay = $day === $totalDays;

            if ($isFirstDay) {
                $steps = [
                    [
                        'type' => 'departure',
                        'title' => "Đón khách và khởi hành đến {$destination->name}",
                        'start_time' => '06:30:00',
                        'end_time' => '08:00:00',
                        'duration' => '1 giờ 30 phút',
                        'transport' => 'Xe du lịch',
                        'description' => "Hướng dẫn viên đón đoàn, phổ biến lịch trình và khởi hành chuyến tham quan {$destination->name}.",
                    ],
                    [
                        'type' => 'sightseeing',
                        'title' => "Tham quan {$place->name}",
                        'start_time' => '08:30:00',
                        'end_time' => '11:30:00',
                        'duration' => '3 giờ',
                        'transport' => 'Xe du lịch',
                        'description' => "Tham quan và tìm hiểu nét đặc trưng tại {$place->name}, {$place->address}.",
                    ],
                    [
                        'type' => 'meal',
                        'title' => "Thưởng thức ẩm thực {$destination->name}",
                        'start_time' => '11:30:00',
                        'end_time' => '13:00:00',
                        'duration' => '1 giờ 30 phút',
                        'transport' => null,
                        'description' => 'Dùng bữa tại nhà hàng địa phương với các món ăn đặc trưng trong chương trình.',
                    ],
                    [
                        'type' => 'free_time',
                        'title' => "Tự do khám phá {$destination->name}",
                        'start_time' => '14:00:00',
                        'end_time' => '17:00:00',
                        'duration' => '3 giờ',
                        'transport' => null,
                        'description' => 'Du khách tự do chụp ảnh, mua sắm đặc sản và nghỉ ngơi theo nhu cầu.',
                    ],
                ];
            } elseif ($isLastDay) {
                $steps = [
                    [
                        'type' => 'sightseeing',
                        'title' => "Buổi sáng tại {$place->name}",
                        'start_time' => '08:00:00',
                        'end_time' => '10:30:00',
                        'duration' => '2 giờ 30 phút',
                        'transport' => 'Xe du lịch',
                        'description' => "Tiếp tục khám phá cảnh quan, văn hóa và các góc đẹp tại {$place->name}.",
                    ],
                    [
                        'type' => 'meal',
                        'title' => 'Ăn trưa và chuẩn bị trả phòng',
                        'start_time' => '11:00:00',
                        'end_time' => '12:30:00',
                        'duration' => '1 giờ 30 phút',
                        'transport' => null,
                        'description' => "Đoàn dùng bữa trưa, nghỉ ngơi và chuẩn bị kết thúc hành trình tại {$destination->name}.",
                    ],
                    [
                        'type' => 'return',
                        'title' => 'Khởi hành về điểm đón ban đầu',
                        'start_time' => '13:00:00',
                        'end_time' => '17:00:00',
                        'duration' => '4 giờ',
                        'transport' => 'Xe du lịch',
                        'description' => "Tạm biệt {$destination->name}, đưa du khách về điểm đón và kết thúc chương trình.",
                    ],
                ];
            } else {
                $steps = [
                    [
                        'type' => 'sightseeing',
                        'title' => "Khám phá {$place->name} - ngày {$day}",
                        'start_time' => '08:00:00',
                        'end_time' => '11:00:00',
                        'duration' => '3 giờ',
                        'transport' => 'Xe du lịch',
                        'description' => "Khám phá sâu hơn về thiên nhiên, lịch sử và đời sống địa phương quanh {$place->name}.",
                    ],
                    [
                        'type' => 'meal',
                        'title' => 'Ăn trưa tại nhà hàng địa phương',
                        'start_time' => '11:30:00',
                        'end_time' => '13:00:00',
                        'duration' => '1 giờ 30 phút',
                        'transport' => null,
                        'description' => "Thưởng thức thực đơn địa phương và nghỉ trưa tại {$destination->name}.",
                    ],
                    [
                        'type' => 'free_time',
                        'title' => "Trải nghiệm tự do tại {$destination->name}",
                        'start_time' => '14:00:00',
                        'end_time' => '17:00:00',
                        'duration' => '3 giờ',
                        'transport' => null,
                        'description' => 'Tham gia hoạt động tự chọn, chụp ảnh, mua sắm hoặc nghỉ dưỡng.',
                    ],
                ];
            }

            foreach ($steps as $index => $step) {
                $sortOrder = $index + 1;
                $isSightseeing = $step['type'] === 'sightseeing';
                $itinerary = TourItinerary::updateOrCreate(
                    [
                        'tour_id' => $tour->id,
                        'day_number' => $day,
                        'sort_order' => $sortOrder,
                    ],
                    [
                        ...$step,
                        'destination_place_id' => $isSightseeing ? $place->id : null,
                    ]
                );

                if ($isSightseeing && $place->thumbnail_url) {
                    TourItineraryImage::updateOrCreate(
                        ['tour_itinerary_id' => $itinerary->id, 'sort_order' => 1],
                        [
                            'image_url' => $place->thumbnail_url,
                            'alt_text' => "{$place->name} - ngày {$day}",
                        ]
                    );
                }
            }
        }
    }

    private function upsertUser(
        int $roleId,
        string $fullName,
        string $email,
        string $phone,
        string $password
    ): User {
        return User::updateOrCreate(
            ['email' => $email],
            [
                'role_id' => $roleId,
                'full_name' => $fullName,
                'phone' => $phone,
                'password' => $password,
                'status' => 'active',
            ]
        );
    }
}
