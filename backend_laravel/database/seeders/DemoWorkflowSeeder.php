<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Guide;
use App\Models\Review;
use App\Models\Tour;
use App\Models\TourDeparture;
use App\Models\User;
use App\Services\GuideReviewService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoWorkflowSeeder extends Seeder
{
    private User $admin;

    private User $customer;

    private User $support;

    private User $guideUser;

    private Guide $guide;

    private Carbon $now;

    public function run(): void
    {
        $this->now = now();
        $this->admin = User::query()->where('email', 'admin@vivugo.vn')->firstOrFail();
        $this->customer = User::query()->where('email', 'customer@vivugo.vn')->firstOrFail();
        $this->support = User::query()->where('email', 'support@vivugo.vn')->firstOrFail();
        $this->guideUser = User::query()->where('email', 'guide@vivugo.vn')->firstOrFail();
        $this->guide = Guide::query()->where('user_id', $this->guideUser->id)->firstOrFail();

        DB::transaction(function (): void {
            $bookings = $this->seedCustomerBookingJourney();
            $this->seedCustomerFeatures($bookings);
            $this->seedSupportJourney($bookings);
            $this->seedGuideJourney($bookings['ongoing']);
            $this->seedNotifications($bookings);
            $this->seedOperationalRecords($bookings);
            $this->synchronizeBookedSlots();
            $this->synchronizePromotionUsage();
        });

        $this->command->info('Đã seed dữ liệu demo cho các luồng khách hàng, thanh toán, hỗ trợ, HDV và quản trị.');
    }

    /** @return array<string, Booking> */
    private function seedCustomerBookingJourney(): array
    {
        $haLong = Tour::query()->where('slug', 'ha-long-du-thuyen-2-ngay-1-dem-test')->firstOrFail();
        $ninhBinh = Tour::query()->where('slug', 'ha-noi-ninh-binh-3-ngay-2-dem-test')->firstOrFail();

        $haLongOpen = $this->departure($haLong, 'future', 'open');
        $ninhBinhOpen = $this->departure($ninhBinh, 'future', 'open');
        $ninhBinhOngoing = $this->departure($ninhBinh, 'ongoing');
        $haLongCompleted = $this->departure($haLong, 'past', 'completed');
        $promotionId = DB::table('promotions')->where('code', 'WELCOME50')->value('id');

        $fixtures = [
            'pending' => [
                'code' => 'BK-DEMO-PENDING', 'tour' => $haLong, 'departure' => $haLongOpen,
                'people' => 2, 'status' => 'pending', 'payment_status' => 'unpaid',
                'method' => 'vnpay', 'gateway_status' => 'pending', 'expires_at' => $this->now->copy()->addMinutes(15),
                'created_at' => $this->now->copy()->subMinutes(2), 'note' => 'Đơn mẫu để thử nút Tiếp tục thanh toán và Hủy đơn.',
            ],
            'paid_upcoming' => [
                'code' => 'BK-DEMO-PAID', 'tour' => $ninhBinh, 'departure' => $ninhBinhOpen,
                'people' => 3, 'status' => 'confirmed', 'payment_status' => 'paid',
                'method' => 'vnpay', 'gateway_status' => 'success', 'paid_at' => $this->now->copy()->subDays(2),
                'created_at' => $this->now->copy()->subDays(2), 'promotion_id' => $promotionId,
                'discount' => 50000, 'note' => 'Đơn đã thanh toán, chờ ngày khởi hành.',
            ],
            'ongoing' => [
                'code' => 'BK-DEMO-ONGOING', 'tour' => $ninhBinh, 'departure' => $ninhBinhOngoing,
                'people' => 4, 'status' => 'confirmed', 'payment_status' => 'paid',
                'method' => 'cod', 'gateway_status' => 'success', 'paid_at' => $this->now->copy()->subDays(4),
                'created_at' => $this->now->copy()->subDays(5), 'note' => 'Đơn mẫu cho chuyến đi đang diễn ra.',
            ],
            'completed' => [
                'code' => 'BK-DEMO-COMPLETED', 'tour' => $haLong, 'departure' => $haLongCompleted,
                'people' => 2, 'status' => 'completed', 'payment_status' => 'paid',
                'method' => 'vnpay', 'gateway_status' => 'success', 'paid_at' => $this->now->copy()->subDays(20),
                'created_at' => $this->now->copy()->subDays(24), 'note' => 'Đơn hoàn thành để thử đánh giá tour và HDV.',
            ],
            'cancelled' => [
                'code' => 'BK-DEMO-CANCELLED', 'tour' => $ninhBinh, 'departure' => $ninhBinhOpen,
                'people' => 1, 'status' => 'cancelled', 'payment_status' => 'refunded',
                'method' => 'vnpay', 'gateway_status' => 'refunded', 'paid_at' => $this->now->copy()->subDays(8),
                'created_at' => $this->now->copy()->subDays(9), 'cancelled_at' => $this->now->copy()->subDays(7),
                'cancel_reason' => 'Khách thay đổi kế hoạch cá nhân.', 'note' => 'Đơn đã hủy và hoàn tiền.',
            ],
            'expired' => [
                'code' => 'BK-DEMO-EXPIRED', 'tour' => $haLong, 'departure' => $haLongOpen,
                'people' => 1, 'status' => 'cancelled', 'payment_status' => 'failed',
                'method' => 'vnpay', 'gateway_status' => 'failed', 'expires_at' => $this->now->copy()->subHour(),
                'created_at' => $this->now->copy()->subHours(2), 'cancelled_at' => $this->now->copy()->subHour(),
                'cancel_reason' => 'Hết thời gian giữ chỗ thanh toán.', 'note' => 'Đơn hết hạn để kiểm thử trạng thái thất bại.',
            ],
        ];

        $bookings = [];

        foreach ($fixtures as $key => $fixture) {
            $bookings[$key] = $this->upsertBooking($fixture);
        }

        $this->seedCompletedReview($bookings['completed']);

        return $bookings;
    }

    /** @param array<string, mixed> $fixture */
    private function upsertBooking(array $fixture): Booking
    {
        $departure = $fixture['departure'];
        $unitPrice = (float) ($departure->discount_price ?? $departure->base_price ?? $departure->price);
        $discount = (float) ($fixture['discount'] ?? 0);
        $total = ($unitPrice * $fixture['people']) - $discount;
        $createdAt = $fixture['created_at'];

        $booking = Booking::query()->updateOrCreate(
            ['booking_code' => $fixture['code']],
            [
                'user_id' => $this->customer->id,
                'tour_id' => $fixture['tour']->id,
                'tour_departure_id' => $departure->id,
                'promotion_id' => $fixture['promotion_id'] ?? null,
                'staff_id' => in_array($fixture['status'], ['confirmed', 'completed'], true) ? $this->support->id : null,
                'number_of_people' => $fixture['people'],
                'unit_price' => $unitPrice,
                'discount_amount' => $discount,
                'total_amount' => $total,
                'status' => $fixture['status'],
                'payment_status' => $fixture['payment_status'],
                'note' => $fixture['note'],
                'cancel_reason' => $fixture['cancel_reason'] ?? null,
                'cancelled_at' => $fixture['cancelled_at'] ?? null,
            ]
        );

        $booking->forceFill(['created_at' => $createdAt, 'updated_at' => $createdAt])->saveQuietly();

        DB::table('booking_contacts')->updateOrInsert(
            ['booking_id' => $booking->id],
            [
                'contact_name' => $this->customer->full_name,
                'contact_email' => $this->customer->email,
                'contact_phone' => $this->customer->phone,
                'address' => '25 Tràng Tiền, Hoàn Kiếm, Hà Nội',
                'special_request' => $fixture['people'] > 1 ? 'Có một hành khách ăn chay.' : null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]
        );

        DB::table('booking_participants')->where('booking_id', $booking->id)->delete();
        $participantNames = [
            1 => $this->customer->full_name,
            2 => 'Trần Thu Hà',
            3 => 'Nguyễn Gia Bảo',
            4 => 'Lê Hoàng Nam',
        ];

        foreach (range(1, $fixture['people']) as $position) {
            DB::table('booking_participants')->insert([
                'booking_id' => $booking->id,
                'full_name' => $participantNames[$position] ?? 'Hành khách mẫu '.$position,
                'phone' => $position === 1 ? $this->customer->phone : null,
                'birth_date' => $this->now->copy()->subYears(25 + $position)->toDateString(),
                'gender' => $position % 2 === 0 ? 'female' : 'male',
                'identity_number' => 'DEMO'.$booking->id.str_pad((string) $position, 2, '0', STR_PAD_LEFT),
                'participant_type' => 'adult',
                'unit_price' => $unitPrice,
                'pricing_rule_label' => 'Người lớn',
                'pricing_type' => 'fixed',
                'pricing_value' => $unitPrice,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
        }

        DB::table('payments')->updateOrInsert(
            ['booking_id' => $booking->id],
            [
                'payment_method' => $fixture['method'],
                'amount' => $total,
                'transaction_code' => $fixture['gateway_status'] === 'success' ? 'VNPAY-DEMO-'.$booking->id : null,
                'gateway_response' => json_encode(['demo' => true, 'booking_code' => $fixture['code']]),
                'status' => $fixture['gateway_status'],
                'paid_at' => $fixture['paid_at'] ?? null,
                'expires_at' => $fixture['expires_at'] ?? null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]
        );

        DB::table('booking_status_histories')->where('booking_id', $booking->id)->delete();
        DB::table('booking_status_histories')->insert([
            'booking_id' => $booking->id,
            'changed_by' => $this->customer->id,
            'old_status' => null,
            'new_status' => 'pending',
            'note' => 'Khách hàng tạo đơn đặt tour.',
            'created_at' => $createdAt,
        ]);

        if ($fixture['status'] !== 'pending') {
            DB::table('booking_status_histories')->insert([
                'booking_id' => $booking->id,
                'changed_by' => $fixture['status'] === 'cancelled' ? $this->customer->id : $this->admin->id,
                'old_status' => 'pending',
                'new_status' => $fixture['status'],
                'note' => $fixture['cancel_reason'] ?? 'Cập nhật trạng thái theo vòng đời đơn hàng.',
                'created_at' => $fixture['cancelled_at'] ?? $createdAt->copy()->addHour(),
            ]);
        }

        if (! empty($fixture['promotion_id'])) {
            DB::table('promotion_usages')->updateOrInsert(
                ['promotion_id' => $fixture['promotion_id'], 'booking_id' => $booking->id],
                ['user_id' => $this->customer->id, 'discount_amount' => $discount, 'used_at' => $createdAt]
            );
        }

        return $booking;
    }

    /** @param array<string, Booking> $bookings */
    private function seedCustomerFeatures(array $bookings): void
    {
        $tourIds = Tour::query()
            ->whereIn('slug', ['ha-long-du-thuyen-2-ngay-1-dem-test', 'da-nang-hoi-an-3-ngay-2-dem'])
            ->pluck('id');

        foreach ($tourIds as $tourId) {
            $this->upsert('wishlists', ['user_id' => $this->customer->id, 'tour_id' => $tourId], []);
        }

        $cancelledPaymentId = DB::table('payments')->where('booking_id', $bookings['cancelled']->id)->value('id');
        DB::table('refund_requests')->updateOrInsert(
            ['booking_id' => $bookings['cancelled']->id],
            [
                'payment_id' => $cancelledPaymentId,
                'requested_by' => $this->customer->id,
                'approved_by' => $this->admin->id,
                'amount' => $bookings['cancelled']->total_amount,
                'reason' => 'Khách hủy trước ngày khởi hành theo chính sách.',
                'status' => 'refunded',
                'requested_at' => $this->now->copy()->subDays(7),
                'processed_at' => $this->now->copy()->subDays(6),
            ]
        );
    }

    /** @param array<string, Booking> $bookings */
    private function seedSupportJourney(array $bookings): void
    {
        $requests = [
            ['SUP-DEMO-001', 'payment', 'high', 'Không quay lại được sau khi thanh toán VNPay', 'pending', null, null],
            ['SUP-DEMO-002', 'account', 'medium', 'Cần cập nhật số điện thoại tài khoản', 'in_progress', $this->support->id, null],
            ['SUP-DEMO-003', 'feedback', 'low', 'Góp ý về thông tin lịch trình tour', 'resolved', $this->support->id, $this->now->copy()->subDay()],
        ];

        foreach ($requests as $index => [$code, $category, $priority, $subject, $status, $assignedTo, $resolvedAt]) {
            DB::table('support_requests')->updateOrInsert(
                ['ticket_code' => $code],
                [
                    'user_id' => $this->customer->id,
                    'full_name' => $this->customer->full_name,
                    'email' => $this->customer->email,
                    'phone' => $this->customer->phone,
                    'category' => $category,
                    'priority' => $priority,
                    'subject' => $subject,
                    'description' => 'Nội dung yêu cầu mẫu có đủ thông tin để nhân viên hỗ trợ tiếp nhận và xử lý.',
                    'status' => $status,
                    'assigned_to' => $assignedTo,
                    'started_at' => $assignedTo ? $this->now->copy()->subDays(2) : null,
                    'resolved_at' => $resolvedAt,
                    'created_at' => $this->now->copy()->subDays(3 - $index),
                    'updated_at' => $this->now,
                ]
            );
        }

        $requestId = DB::table('support_requests')->where('ticket_code', 'SUP-DEMO-001')->value('id');
        DB::table('support_request_attachments')->updateOrInsert(
            ['support_request_id' => $requestId, 'original_name' => 'anh-loi-thanh-toan.png'],
            ['file_path' => 'support/demo/anh-loi-thanh-toan.png', 'mime_type' => 'image/png', 'size' => 245760, 'created_at' => $this->now, 'updated_at' => $this->now]
        );

        $legacyTicketId = DB::table('support_tickets')->where('ticket_code', 'TKT-DEMO-001')->value('id');
        $ticketData = [
            'user_id' => $this->customer->id,
            'booking_id' => $bookings['paid_upcoming']->id,
            'assigned_staff_id' => $this->support->id,
            'subject' => 'Xác nhận điểm đón cho đơn đã thanh toán',
            'priority' => 'medium',
            'status' => 'in_progress',
            'created_at' => $this->now->copy()->subDay(),
            'updated_at' => $this->now,
        ];
        if ($legacyTicketId) {
            DB::table('support_tickets')->where('id', $legacyTicketId)->update($ticketData);
        } else {
            $legacyTicketId = DB::table('support_tickets')->insertGetId(array_merge(['ticket_code' => 'TKT-DEMO-001'], $ticketData));
        }
        DB::table('support_messages')->where('support_ticket_id', $legacyTicketId)->delete();
        DB::table('support_messages')->insert([
            ['support_ticket_id' => $legacyTicketId, 'sender_id' => $this->customer->id, 'message' => 'Cho tôi hỏi xe sẽ đón ở địa chỉ nào?', 'attachment_url' => null, 'created_at' => $this->now->copy()->subHours(20), 'updated_at' => $this->now->copy()->subHours(20)],
            ['support_ticket_id' => $legacyTicketId, 'sender_id' => $this->support->id, 'message' => 'Xe đón tại Nhà hát Lớn Hà Nội, vui lòng có mặt trước 15 phút.', 'attachment_url' => null, 'created_at' => $this->now->copy()->subHours(19), 'updated_at' => $this->now->copy()->subHours(19)],
        ]);

        $conversationId = $this->conversation('demo-customer-conversation', $this->customer->id);
        DB::table('chat_messages')->where('chat_conversation_id', $conversationId)->delete();
        DB::table('chat_messages')->insert([
            ['chat_conversation_id' => $conversationId, 'role' => 'user', 'content' => 'Tour Hạ Long còn lịch nào trong tháng này?', 'is_fallback' => false, 'created_at' => $this->now->copy()->subMinutes(12), 'updated_at' => $this->now->copy()->subMinutes(12)],
            ['chat_conversation_id' => $conversationId, 'role' => 'assistant', 'content' => 'ViVuGo đang có lịch Hạ Long 2 ngày 1 đêm, bạn có thể xem ngày khởi hành trong trang chi tiết tour.', 'is_fallback' => false, 'created_at' => $this->now->copy()->subMinutes(11), 'updated_at' => $this->now->copy()->subMinutes(11)],
            ['chat_conversation_id' => $conversationId, 'role' => 'user', 'content' => 'Tôi có thể mang thú cưng theo không?', 'is_fallback' => false, 'created_at' => $this->now->copy()->subMinutes(10), 'updated_at' => $this->now->copy()->subMinutes(10)],
            ['chat_conversation_id' => $conversationId, 'role' => 'assistant', 'content' => 'Mình chưa có đủ thông tin về chính sách thú cưng. Bạn vui lòng gửi yêu cầu hỗ trợ để được xác nhận.', 'is_fallback' => true, 'created_at' => $this->now->copy()->subMinutes(9), 'updated_at' => $this->now->copy()->subMinutes(9)],
        ]);
    }

    private function seedGuideJourney(Booking $ongoingBooking): void
    {
        $futureDeparture = TourDeparture::query()
            ->whereDate('departure_date', '>=', $this->now->copy()->addDays(10)->toDateString())
            ->where('status', 'open')
            ->orderBy('departure_date')
            ->firstOrFail();

        $this->upsert('tour_guide_assignments', ['tour_departure_id' => $futureDeparture->id, 'guide_id' => $this->guide->id], [
            'role' => 'lead', 'status' => 'assigned', 'assigned_by' => $this->admin->id,
            'assigned_at' => $this->now->copy()->subDay(), 'note' => 'Lịch mẫu của tài khoản guide@vivugo.vn.',
            'notes' => 'Chuẩn bị danh sách khách và liên hệ nhà xe.',
        ]);

        DB::table('tour_guide_assignments')
            ->where('guide_id', $this->guide->id)
            ->where('notes', 'Đăng nhập guide@vivugo.vn để thực hành điểm danh.')
            ->where('tour_departure_id', '!=', $ongoingBooking->tour_departure_id)
            ->delete();

        $this->upsert('tour_guide_assignments', ['tour_departure_id' => $ongoingBooking->tour_departure_id, 'guide_id' => $this->guide->id], [
            'role' => 'lead', 'status' => 'confirmed', 'assigned_by' => $this->admin->id,
            'assigned_at' => $this->now->copy()->subDays(3), 'note' => 'Đoàn mẫu để thử check-in và check-out.',
            'notes' => 'Đăng nhập guide@vivugo.vn để thực hành điểm danh.',
        ]);

        $this->seedAttendanceJourney($ongoingBooking);

        $leaveFixtures = [
            ['pending', 45, 47, null, null],
            ['approved', 60, 62, 'Đã duyệt, không trùng lịch dẫn tour.', $this->admin->id],
            ['rejected', 75, 77, 'Thời gian nghỉ trùng lịch tour đã phân công.', $this->admin->id],
            ['cancelled', 90, 91, null, null],
        ];
        foreach ($leaveFixtures as [$status, $from, $to, $adminNote, $adminId]) {
            $start = $this->now->copy()->addDays($from)->toDateString();
            DB::table('guide_leave_requests')->updateOrInsert(
                ['guide_id' => $this->guide->id, 'start_date' => $start, 'end_date' => $this->now->copy()->addDays($to)->toDateString()],
                [
                    'user_id' => $this->guideUser->id,
                    'reason' => 'Nghỉ phép cá nhân theo kế hoạch.',
                    'status' => $status,
                    'admin_note' => $adminNote,
                    'admin_id' => $adminId,
                    'reviewed_at' => $adminId ? $this->now->copy()->subDay() : null,
                    'cancel_reason' => $status === 'cancelled' ? 'HDV đã sắp xếp lại được công việc.' : null,
                    'cancelled_at' => $status === 'cancelled' ? $this->now->copy()->subDay() : null,
                    'created_at' => $this->now->copy()->subDays(3),
                    'updated_at' => $this->now,
                    'deleted_at' => null,
                ]
            );
        }

        $pendingLeaveId = DB::table('guide_leave_requests')
            ->where('guide_id', $this->guide->id)->where('status', 'pending')->value('id');
        DB::table('guide_leave_request_attachments')->updateOrInsert(
            ['guide_leave_request_id' => $pendingLeaveId, 'file_path' => 'guide-leave/demo/giay-xac-nhan.pdf'],
            ['original_name' => 'giay-xac-nhan.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 128000, 'created_at' => $this->now, 'updated_at' => $this->now]
        );

        DB::table('guide_replacement_requests')->updateOrInsert(
            ['tour_departure_id' => $futureDeparture->id, 'current_guide_id' => $this->guide->id],
            [
                'requested_by' => $this->guideUser->id,
                'reason' => 'Có lịch khám sức khỏe đột xuất trùng ngày khởi hành.',
                'evidence_path' => 'guide-replacement-evidence/demo-confirmation.pdf',
                'status' => 'pending',
                'replacement_guide_id' => null,
                'reviewed_by' => null,
                'reviewed_at' => null,
                'admin_note' => null,
                'created_at' => $this->now->copy()->subHours(5),
                'updated_at' => $this->now,
            ]
        );
    }

    private function seedAttendanceJourney(Booking $booking): void
    {
        DB::table('attendance_sessions')
            ->where('name', 'Điểm danh demo check-in/check-out')
            ->where('tour_departure_id', '!=', $booking->tour_departure_id)
            ->delete();

        $sessionId = DB::table('attendance_sessions')
            ->where('tour_departure_id', $booking->tour_departure_id)
            ->where('name', 'Điểm danh demo check-in/check-out')
            ->value('id');

        $sessionData = [
            'note' => 'Mỗi hành khách mẫu đại diện cho một trạng thái điểm danh.',
            'status' => 'active',
            'created_by' => $this->guideUser->id,
            'created_at' => $this->now,
            'updated_at' => $this->now,
        ];

        if ($sessionId) {
            DB::table('attendance_sessions')->where('id', $sessionId)->update($sessionData);
        } else {
            $sessionId = DB::table('attendance_sessions')->insertGetId(array_merge([
                'tour_departure_id' => $booking->tour_departure_id,
                'name' => 'Điểm danh demo check-in/check-out',
            ], $sessionData));
        }

        $participants = DB::table('booking_participants')
            ->where('booking_id', $booking->id)
            ->orderBy('id')
            ->get()
            ->values();

        $attendanceFixtures = [
            ['not_checked_in', null, null, 'Chưa đến điểm tập trung.'],
            ['checked_in', $this->now->copy()->subMinutes(30), null, 'Đã có mặt tại điểm đón.'],
            ['absent', null, null, 'Khách báo không tham gia chuyến đi.'],
            ['checked_out', $this->now->copy()->subHours(2), $this->now->copy()->subMinutes(10), 'Đã hoàn tất hành trình.'],
        ];

        DB::table('attendances')->where('attendance_session_id', $sessionId)->delete();

        foreach ($participants as $index => $participant) {
            [$status, $checkedInAt, $checkedOutAt, $note] = $attendanceFixtures[$index];

            DB::table('attendances')->insert([
                'attendance_session_id' => $sessionId,
                'booking_participant_id' => $participant->id,
                'checked_in_at' => $checkedInAt,
                'checked_in_by' => $checkedInAt ? $this->guideUser->id : null,
                'checked_out_at' => $checkedOutAt,
                'checked_out_by' => $checkedOutAt ? $this->guideUser->id : null,
                'status' => $status,
                'note' => $note,
                'note_updated_by' => $this->guideUser->id,
                'created_at' => $this->now,
                'updated_at' => $this->now,
            ]);
        }
    }

    /** @param array<string, Booking> $bookings */
    private function seedNotifications(array $bookings): void
    {
        $draftId = DB::table('notification_drafts')->where('title', 'Ưu đãi dành cho khách hàng thân thiết')->value('id');
        $draftData = [
            'message' => 'Nhập mã WELCOME50 để nhận ưu đãi cho hành trình tiếp theo.',
            'target_type' => 'role',
            'target_ids' => json_encode([$this->customer->role_id]),
            'status' => 'draft',
            'created_at' => $this->now->copy()->subDay(),
            'updated_at' => $this->now,
            'deleted_at' => null,
        ];
        if ($draftId) {
            DB::table('notification_drafts')->where('id', $draftId)->update($draftData);
        } else {
            $draftId = DB::table('notification_drafts')->insertGetId(array_merge(['title' => 'Ưu đãi dành cho khách hàng thân thiết'], $draftData));
        }

        $notifications = [
            [$this->customer->id, 'Đơn hàng đang chờ thanh toán', 'Đơn BK-DEMO-PENDING sẽ hết thời gian giữ chỗ sau 15 phút.', 'payment', 'unread', ['booking_id' => $bookings['pending']->id, 'booking_code' => $bookings['pending']->booking_code]],
            [$this->customer->id, 'Thanh toán thành công', 'Đơn BK-DEMO-PAID đã được xác nhận.', 'payment', 'read', ['booking_id' => $bookings['paid_upcoming']->id]],
            [$this->customer->id, 'Chuyến đi sắp khởi hành', 'Vui lòng kiểm tra điểm đón và giấy tờ tùy thân.', 'booking', 'unread', ['booking_id' => $bookings['paid_upcoming']->id]],
            [$this->support->id, 'Yêu cầu hỗ trợ mới', 'Khách hàng vừa gửi yêu cầu SUP-DEMO-001 về thanh toán.', 'support', 'unread', ['ticket_code' => 'SUP-DEMO-001']],
            [$this->admin->id, 'HDV gửi yêu cầu đổi lịch', 'HDV Phạm Quốc Đạt vừa gửi yêu cầu thay thế.', 'system', 'unread', ['notification_type' => 'guide_replacement_request']],
            [$this->guideUser->id, 'Bạn có lịch dẫn tour mới', 'Vui lòng xem chi tiết lịch khởi hành và xác nhận chuẩn bị.', 'system', 'unread', ['notification_type' => 'guide_assignment']],
        ];

        foreach ($notifications as [$userId, $title, $message, $type, $status, $data]) {
            DB::table('notifications')->updateOrInsert(
                ['user_id' => $userId, 'title' => $title],
                [
                    'draft_id' => $title === 'Ưu đãi dành cho khách hàng thân thiết' ? $draftId : null,
                    'message' => $message,
                    'type' => $type,
                    'data' => json_encode($data),
                    'read_at' => $status === 'read' ? $this->now->copy()->subHour() : null,
                    'status' => $status,
                    'created_at' => $this->now->copy()->subMinutes(30),
                    'updated_at' => $this->now,
                ]
            );
        }
    }

    /** @param array<string, Booking> $bookings */
    private function seedOperationalRecords(array $bookings): void
    {
        DB::table('system_logs')->updateOrInsert(
            ['action' => 'demo.payment.completed', 'user_id' => $this->customer->id],
            [
                'level' => 'info',
                'message' => 'Thanh toán mẫu đã được ghi nhận thành công.',
                'context' => json_encode(['booking_id' => $bookings['paid_upcoming']->id]),
                'ip_address' => '127.0.0.1',
                'user_agent' => 'ViVuGo Demo Seeder',
                'created_at' => $this->now->copy()->subDays(2),
            ]
        );

        $this->seedPartners();
    }

    private function seedPartners(): void
    {
        $categories = [
            ['Khách sạn', 'DT-KS-001', 'Sunrise Hội An Resort', 'hotel'],
            ['Vận chuyển', 'DT-VC-001', 'ViVuGo Transport', 'transport'],
            ['Nhà hàng', 'DT-NH-001', 'Nhà hàng Biển Xanh', 'restaurant'],
        ];

        foreach ($categories as [$categoryName, $code, $name, $serviceType]) {
            $categoryId = DB::table('service_categories')->where('name', $categoryName)->value('id');
            if (! $categoryId) {
                continue;
            }

            if (DB::getDriverName() === 'sqlite') {
                DB::table('partner_service_types')->updateOrInsert(
                    ['slug' => str($categoryName)->slug()->toString()],
                    ['name' => $categoryName, 'created_at' => $this->now, 'updated_at' => $this->now]
                );
                $categoryId = DB::table('partner_service_types')
                    ->where('slug', str($categoryName)->slug()->toString())
                    ->value('id');
            }

            $partnerId = DB::table('partners')->where('partner_code', $code)->value('id');
            $partnerData = [
                'service_type_id' => $categoryId,
                'name' => $name,
                'contact_person' => 'Nguyễn Thanh Bình',
                'phone' => '0909000001',
                'email' => strtolower(str_replace(' ', '.', $code)).'@example.test',
                'address' => 'Địa chỉ đối tác mẫu tại Việt Nam',
                'website' => 'https://example.test',
                'description' => 'Đối tác mẫu phục vụ vận hành và xây dựng tour.',
                'logo_url' => null,
                'average_rating' => 4.7,
                'contract_start' => $this->now->copy()->subMonths(3)->toDateString(),
                'contract_end' => $this->now->copy()->addYear()->toDateString(),
                'status' => 'active',
                'is_visible' => true,
                'deleted_at' => null,
                'created_at' => $this->now,
                'updated_at' => $this->now,
            ];
            if ($partnerId) {
                DB::table('partners')->where('id', $partnerId)->update($partnerData);
            } else {
                $partnerId = DB::table('partners')->insertGetId(array_merge(['partner_code' => $code], $partnerData));
            }

            DB::table('partner_services')->updateOrInsert(
                ['partner_id' => $partnerId, 'service_code' => $code.'-SV'],
                [
                    'service_name' => 'Dịch vụ tiêu chuẩn cho đoàn ViVuGo',
                    'service_type' => $serviceType,
                    'depart_time' => '07:00:00',
                    'arrive_time' => '22:00:00',
                    'origin' => 'Hà Nội',
                    'destination' => 'Điểm đến theo lịch trình',
                    'vehicle_type' => $serviceType === 'transport' ? 'Xe 29 chỗ' : null,
                    'seat_class' => $serviceType === 'hotel' ? 'Phòng Deluxe' : null,
                    'operate_days' => json_encode([1, 2, 3, 4, 5, 6, 7]),
                    'domestic_booking_hours' => 24,
                    'international_booking_hours' => 72,
                    'confirmation_time' => 'Trong 30 phút',
                    'amenities' => json_encode(['Hỗ trợ đoàn', 'Xác nhận nhanh']),
                    'status' => 'active',
                    'deleted_at' => null,
                    'created_at' => $this->now,
                    'updated_at' => $this->now,
                ]
            );
        }
    }

    private function seedCompletedReview(Booking $booking): void
    {
        $guideId = DB::table('tour_guide_assignments')
            ->where('tour_departure_id', $booking->tour_departure_id)
            ->value('guide_id');

        if (! $guideId) {
            return;
        }

        Review::query()->updateOrCreate(
            ['booking_id' => $booking->id, 'guide_id' => $guideId],
            [
                'user_id' => $this->customer->id,
                'tour_id' => $booking->tour_id,
                'tour_departure_id' => $booking->tour_departure_id,
                'rating' => 5,
                'comment' => 'Tour tổ chức tốt, hướng dẫn viên nhiệt tình và đúng giờ.',
                'status' => 'visible',
            ]
        );

        app(GuideReviewService::class)->refreshGuideRating($guideId);
        app(GuideReviewService::class)->refreshTourRating($booking->tour_id);
    }

    private function departure(Tour $tour, string $period, ?string $status = null): TourDeparture
    {
        return TourDeparture::query()
            ->where('tour_id', $tour->id)
            ->when($status, fn ($query) => $query->where('status', $status))
            ->when($period === 'future', fn ($query) => $query->whereDate('departure_date', '>', $this->now))
            ->when($period === 'past', fn ($query) => $query->whereDate('return_date', '<', $this->now))
            ->when($period === 'ongoing', fn ($query) => $query
                ->whereDate('departure_date', '<=', $this->now)
                ->whereDate('return_date', '>=', $this->now))
            ->orderBy('departure_date')
            ->firstOrFail();
    }

    private function conversation(string $sessionId, ?int $userId): int
    {
        $id = DB::table('chat_conversations')->where('session_id', $sessionId)->value('id');
        if ($id) {
            DB::table('chat_conversations')->where('id', $id)->update(['user_id' => $userId, 'updated_at' => $this->now]);

            return $id;
        }

        return DB::table('chat_conversations')->insertGetId([
            'session_id' => $sessionId, 'user_id' => $userId, 'created_at' => $this->now, 'updated_at' => $this->now,
        ]);
    }

    private function synchronizeBookedSlots(): void
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
    }

    private function synchronizePromotionUsage(): void
    {
        DB::table('promotions')->orderBy('id')->each(function (object $promotion): void {
            DB::table('promotions')->where('id', $promotion->id)->update([
                'used_count' => DB::table('promotion_usages')->where('promotion_id', $promotion->id)->count(),
                'updated_at' => $this->now,
            ]);
        });
    }

    /** @param array<string, mixed> $keys @param array<string, mixed> $values */
    private function upsert(string $table, array $keys, array $values): void
    {
        DB::table($table)->updateOrInsert($keys, array_merge($values, [
            'created_at' => $this->now,
            'updated_at' => $this->now,
        ]));
    }
}
