<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\BookingAuditLog;
use App\Models\BookingContact;
use App\Models\BookingParticipant;
use App\Models\BookingStatusHistory;
use App\Models\Payment;
use App\Models\TourDeparture;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class BookingRefundSeeder extends Seeder
{
    public const BOOKING_CODE = 'BKSEED-REFUND-001';

    public const BOOKING_CODES = [
        'BKSEED-REFUND-001',
        'BKSEED-REFUND-002',
        'BKSEED-REFUND-003',
        'BKSEED-REFUND-004',
    ];

    private const BOOKING_FIXTURES = [
        [
            'code' => 'BKSEED-REFUND-001',
            'customer_email' => 'customer01@gmail.com',
            'participant_names' => ['Nguyễn Minh Anh', 'Trần Ngọc Hà'],
        ],
        [
            'code' => 'BKSEED-REFUND-002',
            'customer_email' => 'customer02@gmail.com',
            'participant_names' => ['Trần Quốc Bảo', 'Lê Hoàng Mai'],
        ],
        [
            'code' => 'BKSEED-REFUND-003',
            'customer_email' => 'customer03@gmail.com',
            'participant_names' => ['Lê Hoàng Duy', 'Phạm Ngọc Lan'],
        ],
        [
            'code' => 'BKSEED-REFUND-004',
            'customer_email' => 'customer04@gmail.com',
            'participant_names' => ['Phạm Thùy Dương', 'Hoàng Gia Hân'],
        ],
    ];

    private const CANCELLATION_REASON = 'Admin hủy booking để chờ xử lý hoàn tiền.';

    public function run(): void
    {
        DB::transaction(function (): void {
            $admin = $this->resolveUser('admin', 'admin@gmail.com');

            if (! $admin) {
                throw new RuntimeException(
                    'Không thể seed booking chờ hoàn tiền vì thiếu tài khoản Admin đang hoạt động.'
                );
            }

            $customers = $this->resolveCustomers();
            $departures = $this->resolveDepartures(count(self::BOOKING_FIXTURES));
            $now = now();

            foreach (self::BOOKING_FIXTURES as $index => $fixture) {
                $customer = $customers->get($fixture['customer_email']);
                $departure = $departures->get($index);

                if (! $customer || ! $departure) {
                    throw new RuntimeException(
                        "Không thể seed booking {$fixture['code']} vì thiếu dữ liệu khách hàng hoặc lịch khởi hành."
                    );
                }

                $this->seedBooking($fixture, $customer, $departure, $admin, $now, $index);
            }
        });
    }

    /**
     * @param  array{code: string, customer_email: string, participant_names: array<int, string>}  $fixture
     */
    private function seedBooking(
        array $fixture,
        User $customer,
        TourDeparture $departure,
        User $admin,
        Carbon $now,
        int $index
    ): void {
        $unitPrice = $this->resolveUnitPrice($departure);

        if ($unitPrice <= 0) {
            throw new RuntimeException(
                "Không thể seed booking chờ hoàn tiền vì lịch {$departure->id} chưa có giá hợp lệ."
            );
        }

        $numberOfPeople = 2;
        $totalAmount = $unitPrice * $numberOfPeople;
        $cancelledAt = $now->copy()->subHours(2 + $index);
        $idempotencyKey = sprintf('seed-refund-booking-%03d', $index + 1);

        $booking = Booking::updateOrCreate(
            ['booking_code' => $fixture['code']],
            [
                'idempotency_key' => $idempotencyKey,
                'user_id' => $customer->id,
                'tour_id' => $departure->tour_id,
                'tour_departure_id' => $departure->id,
                'number_of_people' => $numberOfPeople,
                'unit_price' => $unitPrice,
                'discount_amount' => 0,
                'total_amount' => $totalAmount,
                'status' => 'cancelled',
                'payment_status' => 'refund_pending',
                'slot_committed_at' => $now->copy()->subHours(4 + $index),
                'note' => 'Booking dữ liệu mẫu phục vụ kiểm thử trung tâm hoàn tiền.',
                'cancel_reason' => self::CANCELLATION_REASON,
                'cancellation_reason' => 'admin_cancelled',
                'resolution_status' => 'refund_pending',
                'cancelled_at' => $cancelledAt,
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
                'special_request' => 'Vui lòng thông báo khi Admin hoàn tất giao dịch hoàn tiền.',
            ]
        );

        foreach (range(1, $numberOfPeople) as $participantIndex) {
            $identityNumber = sprintf(
                'RFDSEED%d%02d',
                $booking->id,
                $participantIndex
            );

            BookingParticipant::updateOrCreate(
                [
                    'booking_id' => $booking->id,
                    'identity_number' => $identityNumber,
                ],
                [
                    'full_name' => $fixture['participant_names'][$participantIndex - 1],
                    'phone' => $customer->phone,
                    'phone_normalized' => $customer->phone,
                    'birth_date' => $now->copy()->subYears(28 + $participantIndex + $index)->toDateString(),
                    'gender' => $participantIndex === 1 ? 'male' : 'female',
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
                'amount' => $totalAmount,
                'transaction_code' => 'VNPAY-'.$fixture['code'],
                'gateway_response' => [
                    'seeded' => true,
                    'state' => 'refund_pending',
                ],
                // Giao dịch vẫn thành công cho tới khi Admin xác nhận hoàn tiền.
                'status' => 'success',
                'paid_at' => $now->copy()->subHours(6 + $index),
                'refund_proof_path' => null,
                'refunded_at' => null,
                'expires_at' => null,
            ]
        );

        BookingStatusHistory::query()->firstOrCreate(
            [
                'booking_id' => $booking->id,
                'changed_by' => $admin->id,
                'old_status' => 'confirmed',
                'new_status' => 'cancelled',
            ],
            [
                'note' => self::CANCELLATION_REASON,
            ]
        );

        $this->ensureAuditLog(
            booking: $booking,
            admin: $admin,
            action: 'admin_cancelled',
            statusBefore: 'confirmed',
            statusAfter: 'cancelled',
            paymentStatusBefore: 'paid',
            paymentStatusAfter: 'refund_pending',
            reason: self::CANCELLATION_REASON,
            metadata: [
                'seed_source' => 'booking_refund_seeder',
                'seed_key' => $fixture['code'],
            ]
        );

        $this->ensureAuditLog(
            booking: $booking,
            admin: $admin,
            action: 'payment_refund_pending',
            statusBefore: 'cancelled',
            statusAfter: 'cancelled',
            paymentStatusBefore: 'paid',
            paymentStatusAfter: 'refund_pending',
            reason: 'Giao dịch đã thanh toán và đang chờ Admin xác nhận hoàn tiền.',
            metadata: [
                'seed_source' => 'booking_refund_seeder',
                'seed_key' => $fixture['code'],
            ]
        );
    }

    private function resolveUser(string $roleName, string $email): ?User
    {
        $user = User::query()
            ->where('email', $email)
            ->where('status', 'active')
            ->whereHas('role', fn ($query) => $query->where('name', $roleName))
            ->first();

        if ($user) {
            return $user;
        }

        return User::query()
            ->where('status', 'active')
            ->whereHas('role', fn ($query) => $query->where('name', $roleName))
            ->orderBy('id')
            ->first();
    }

    private function resolveCustomers(): Collection
    {
        $emails = collect(self::BOOKING_FIXTURES)
            ->pluck('customer_email')
            ->unique()
            ->values();
        $customers = User::query()
            ->whereIn('email', $emails->all())
            ->where('status', 'active')
            ->whereHas('role', fn ($query) => $query->where('name', 'customer'))
            ->get()
            ->keyBy('email');
        $missingEmails = $emails->diff($customers->keys());

        if ($missingEmails->isNotEmpty()) {
            throw new RuntimeException(
                'Không thể seed booking chờ hoàn tiền vì thiếu tài khoản khách hàng: '
                .$missingEmails->implode(', ').'.'
            );
        }

        return $customers;
    }

    private function resolveDepartures(int $count): Collection
    {
        $departures = TourDeparture::query()
            ->whereDate('departure_date', '>', today()->toDateString())
            ->whereIn('status', ['open', 'confirmed', 'in_progress'])
            ->with('tour:id,title,base_price,discount_price')
            ->orderBy('departure_date')
            ->orderBy('id')
            ->limit($count)
            ->get();

        if ($departures->count() < $count) {
            throw new RuntimeException(
                'Không thể seed booking chờ hoàn tiền vì chưa có đủ lịch khởi hành tương lai đang hoạt động.'
            );
        }

        return $departures;
    }

    private function resolveUnitPrice(TourDeparture $departure): float
    {
        return (float) (
            $departure->discount_price
            ?? $departure->base_price
            ?? $departure->price
            ?? $departure->tour?->discount_price
            ?? $departure->tour?->base_price
            ?? 0
        );
    }

    private function ensureAuditLog(
        Booking $booking,
        User $admin,
        string $action,
        string $statusBefore,
        string $statusAfter,
        string $paymentStatusBefore,
        string $paymentStatusAfter,
        string $reason,
        array $metadata
    ): void {
        BookingAuditLog::query()->firstOrCreate(
            [
                'booking_id' => $booking->id,
                'action' => $action,
            ],
            [
                'booking_code' => $booking->booking_code,
                'actor_id' => $admin->id,
                'actor_name' => $admin->full_name,
                'status_before' => $statusBefore,
                'status_after' => $statusAfter,
                'payment_status_before' => $paymentStatusBefore,
                'payment_status_after' => $paymentStatusAfter,
                'reason' => $reason,
                'metadata' => $metadata,
            ]
        );
    }
}
