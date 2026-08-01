<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Guide;
use App\Models\Notification;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\TourGuideAssignment;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TourFinalizationDemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->removeLegacyDemoTours();
        $this->removeCancelledFixtures();

        $customer = User::query()->where('email', 'customer@vivugo.vn')->firstOrFail();
        $guide = Guide::query()->where('guide_code', 'HDV001')->firstOrFail();
        $insufficientTour = Tour::query()->where('slug', 'ha-long-5-sao-2n1d')->firstOrFail();
        $weatherTour = Tour::query()->where('slug', 'sa-pa-ban-lang-4n3d')->firstOrFail();

        $this->seedCancelledDeparture(
            $insufficientTour,
            now()->addDays(21)->startOfDay(),
            $customer,
            $guide,
            'BK-SEED-CANCEL-INSUFFICIENT',
            8,
            'insufficient_participants',
            'Tour bị hủy do không đủ tối thiểu 10 khách.',
        );
        $this->seedCancelledDeparture(
            $weatherTour,
            now()->addDays(24)->startOfDay(),
            $customer,
            $guide,
            'BK-SEED-CANCEL-WEATHER',
            6,
            'weather_disaster',
            'Tour bị hủy do mưa bão hoặc thời tiết xấu.',
        );
        $this->seedConfirmedDeparture($insufficientTour, now()->addDays(30)->startOfDay(), $customer, $guide);

        $this->command?->info('Đã seed 2 lịch đã hủy và 1 lịch đã xác nhận trên các tour có sẵn trong Quản lý tour.');
    }

    private function seedConfirmedDeparture(Tour $tour, CarbonInterface $departureAt, User $customer, Guide $guide): void
    {
        $this->removeDepartures(DB::table('bookings')->where('booking_code', 'BK-SEED-CONFIRMED-10')->pluck('tour_departure_id')->all());
        $departure = TourDeparture::query()->create([
            'tour_id' => $tour->id, 'departure_date' => $departureAt->toDateString(), 'departure_at' => $departureAt,
            'return_date' => $departureAt->copy()->addDays(max((int) $tour->duration_days - 1, 0))->toDateString(),
            'departure_location' => 'Hà Nội', 'price' => $tour->discount_price ?? $tour->base_price,
            'total_slots' => max((int) $tour->max_slots, 30), 'booked_slots' => 10, 'status' => 'confirmed',
        ]);
        $departure->statusHistories()->create(['old_status' => 'open', 'new_status' => 'confirmed', 'reason' => 'minimum_participants_met']);
        $booking = Booking::query()->create([
            'booking_code' => 'BK-SEED-CONFIRMED-10', 'user_id' => $customer->id, 'tour_id' => $tour->id,
            'tour_departure_id' => $departure->id, 'number_of_people' => 10, 'unit_price' => $tour->discount_price ?? $tour->base_price,
            'discount_amount' => 0, 'total_amount' => ($tour->discount_price ?? $tour->base_price) * 10,
            'status' => 'confirmed', 'payment_status' => 'paid',
        ]);
        $booking->contact()->create(['contact_name' => $customer->full_name, 'contact_email' => $customer->email, 'contact_phone' => $customer->phone]);
        $booking->participants()->createMany(collect(range(1, 10))->map(fn (int $number) => ['full_name' => "Khách xác nhận {$number}", 'participant_type' => 'adult', 'unit_price' => $booking->unit_price])->all());
        $booking->payment()->create(['payment_method' => 'vnpay', 'amount' => $booking->total_amount, 'transaction_code' => 'SEED-CONFIRMED-10', 'status' => 'success', 'paid_at' => now()]);
        $booking->statusHistories()->create(['old_status' => 'pending', 'new_status' => 'confirmed', 'note' => 'Eligible for tour finalization.']);
        TourGuideAssignment::query()->updateOrCreate(['guide_id' => $guide->id, 'tour_departure_id' => $departure->id], ['role' => 'lead', 'status' => 'assigned', 'assigned_at' => now()]);
    }

    private function seedCancelledDeparture(Tour $tour, CarbonInterface $departureAt, User $customer, Guide $guide, string $bookingCode, int $people, string $reason, string $note): void
    {
        $departure = TourDeparture::query()->updateOrCreate([
            'tour_id' => $tour->id,
            'departure_date' => $departureAt->toDateString(),
        ], [
            'departure_at' => $departureAt,
            'return_date' => $departureAt->copy()->addDays(max((int) $tour->duration_days - 1, 0))->toDateString(),
            'departure_location' => 'Hà Nội',
            'price' => $tour->discount_price ?? $tour->base_price,
            'total_slots' => max((int) $tour->max_slots, 30),
            'booked_slots' => $people,
            'status' => 'cancelled',
            'cancellation_reason' => $reason,
        ]);
        $departure->statusHistories()->create([
            'old_status' => 'open',
            'new_status' => 'cancelled',
            'reason' => $reason,
        ]);

        $booking = Booking::query()->create([
            'booking_code' => $bookingCode,
            'user_id' => $customer->id,
            'tour_id' => $tour->id,
            'tour_departure_id' => $departure->id,
            'number_of_people' => $people,
            'unit_price' => $tour->discount_price ?? $tour->base_price,
            'discount_amount' => 0,
            'total_amount' => ($tour->discount_price ?? $tour->base_price) * $people,
            'status' => 'cancelled_by_tour',
            'payment_status' => 'paid',
            'cancel_reason' => $note,
            'cancellation_reason' => $reason === 'weather_disaster'
                ? 'tour_cancelled_weather_disaster'
                : 'tour_cancelled_insufficient_participants',
            'resolution_status' => 'pending_selection',
            'cancelled_at' => now(),
        ]);
        $booking->contact()->create([
            'contact_name' => $customer->full_name,
            'contact_email' => $customer->email,
            'contact_phone' => $customer->phone,
        ]);
        $booking->participants()->createMany(collect(range(1, $people))->map(fn (int $number) => [
            'full_name' => "Khách hủy {$number}",
            'participant_type' => 'adult',
            'unit_price' => $tour->discount_price ?? $tour->base_price,
        ])->all());
        $booking->payment()->create([
            'payment_method' => 'vnpay',
            'amount' => $booking->total_amount,
            'transaction_code' => "SEED-{$bookingCode}",
            'status' => 'success',
            'paid_at' => now(),
        ]);
        $booking->statusHistories()->create([
            'old_status' => 'confirmed',
            'new_status' => 'cancelled_by_tour',
            'note' => $note,
        ]);
        TourGuideAssignment::query()->updateOrCreate([
            'guide_id' => $guide->id,
            'tour_departure_id' => $departure->id,
        ], [
            'role' => 'lead',
            'status' => 'assigned',
            'assigned_at' => now(),
            'notes' => 'Phân công HDV cho lịch khởi hành đã hủy.',
        ]);

        $this->seedCancellationNotifications($tour, $departure, $booking, $guide, $people, $reason);
    }

    private function seedCancellationNotifications(Tour $tour, TourDeparture $departure, Booking $booking, Guide $guide, int $people, string $reason): void
    {
        $departureAt = $departure->departure_at?->format('d/m/Y H:i') ?? $departure->departure_date?->format('d/m/Y');
        $customerMessage = "Tour {$tour->title} dự kiến khởi hành vào {$departureAt} đã bị hủy do {$this->customerCancellationReason($reason)}.\n\nMã booking: {$booking->booking_code}\n\nQuý khách có thể lựa chọn:\n1. Chuyển sang ngày khởi hành khác;\n2. Chuyển sang tour khác;\n3. Nhận hoàn tiền;\n4. Chuyển thành số dư hoặc voucher nếu hệ thống hỗ trợ.\n\nVui lòng truy cập chi tiết booking để lựa chọn phương án xử lý.";
        $data = [
            'kind' => 'tour_cancellation',
            'tour_id' => $tour->id,
            'tour_departure_id' => $departure->id,
            'booking_id' => $booking->id,
            'cancellation_reason' => $reason,
        ];
        $this->upsertNotification($booking->user_id, 'Tour đã bị hủy', $customerMessage, $data);

        $adminMessage = "Tour {$tour->id} – {$tour->title} đã bị hủy.\n\nThời gian khởi hành: {$departureAt}\nLý do: {$this->adminCancellationReason($reason)}\nSố khách tối thiểu: 10\nSố khách bị ảnh hưởng: {$people}\nSố booking bị ảnh hưởng: 1";
        User::query()->whereHas('role', fn ($query) => $query->where('name', 'admin'))->each(function (User $admin) use ($adminMessage, $data): void {
            $this->upsertNotification($admin->id, 'Tour đã bị hủy', $adminMessage, $data);
        });

        $guideMessage = "Tour {$tour->id} – {$tour->title}, dự kiến khởi hành vào {$departureAt}, đã bị hủy.\n\nLý do: {$this->adminCancellationReason($reason)}\n\nBạn không cần thực hiện tour này.";
        $this->upsertNotification($guide->user_id, 'Tour đã bị hủy', $guideMessage, $data);
    }

    private function upsertNotification(int $userId, string $title, string $message, array $data): void
    {
        Notification::query()->updateOrCreate([
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
        ], [
            'type' => 'system',
            'status' => 'unread',
            'data' => json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
        ]);
    }

    private function customerCancellationReason(string $reason): string
    {
        return $reason === 'weather_disaster'
            ? 'mưa bão hoặc thời tiết xấu'
            : 'không đủ tối thiểu 10 khách';
    }

    private function adminCancellationReason(string $reason): string
    {
        return $reason === 'weather_disaster'
            ? 'Mưa bão hoặc thời tiết xấu.'
            : 'Không đủ tối thiểu 10 khách để khởi hành.';
    }

    private function removeCancelledFixtures(): void
    {
        $departureIds = DB::table('bookings')
            ->whereIn('booking_code', ['BK-SEED-CANCEL-INSUFFICIENT', 'BK-SEED-CANCEL-WEATHER', 'BK-SEED-CONFIRMED-10'])
            ->pluck('tour_departure_id');
        $this->removeDepartures($departureIds->all());
    }

    private function removeLegacyDemoTours(): void
    {
        Notification::query()->where('message', 'like', 'Tour DEMO%')->delete();

        $tours = Tour::withTrashed()->whereIn('slug', [
            'demo-tour-khong-du-10-khach',
            'demo-tour-du-10-khach',
            'demo-tour-huy-mua-bao',
        ])->get();
        $departureIds = TourDeparture::query()->whereIn('tour_id', $tours->pluck('id'))->pluck('id');
        $this->removeDepartures($departureIds->all());
        $tours->each->forceDelete();
    }

    /** @param array<int, int> $departureIds */
    private function removeDepartures(array $departureIds): void
    {
        if ($departureIds === []) {
            return;
        }

        $bookingIds = DB::table('bookings')->whereIn('tour_departure_id', $departureIds)->pluck('id');
        DB::table('payments')->whereIn('booking_id', $bookingIds)->delete();
        DB::table('booking_participants')->whereIn('booking_id', $bookingIds)->delete();
        DB::table('booking_contacts')->whereIn('booking_id', $bookingIds)->delete();
        DB::table('booking_status_histories')->whereIn('booking_id', $bookingIds)->delete();
        DB::table('bookings')->whereIn('id', $bookingIds)->delete();
        DB::table('tour_finalization_outbox')->whereIn('tour_departure_id', $departureIds)->delete();
        DB::table('tour_departure_status_histories')->whereIn('tour_departure_id', $departureIds)->delete();
        DB::table('tour_guide_assignments')->whereIn('tour_departure_id', $departureIds)->delete();
        DB::table('tour_departures')->whereIn('id', $departureIds)->delete();
    }
}
