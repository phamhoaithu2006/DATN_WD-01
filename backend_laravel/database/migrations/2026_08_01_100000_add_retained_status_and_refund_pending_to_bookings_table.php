<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * LƯU Ý QUAN TRỌNG:
     * Migration này giả định cột `status` hiện tại của bạn đã có sẵn:
     * ENUM('pending','confirmed','departed','completed','cancelled')
     * (đúng theo Rule::in trong Admin\BookingController.php bạn gửi).
     *
     * Nếu enum thực tế trong DB của bạn khác (ví dụ chưa có 'departed',
     * hoặc có thêm giá trị khác), hãy sửa lại danh sách ENUM bên dưới
     * cho khớp 100% với DB thật trước khi chạy migrate, nếu không dữ liệu
     * cũ có thể bị chuyển thành chuỗi rỗng.
     *
     * Thêm:
     * - status: 'retained' (bảo lưu do sự cố mưa bão)
     * - payment_status: 'refund_pending' (đang chờ admin xử lý hoàn tiền)
     */
    public function up(): void
    {
        // SQLite không có ENUM; cột string hiện tại đã chấp nhận các giá trị mới.
        // Bỏ qua ALTER TABLE kiểu MySQL để test dùng SQLite vẫn chạy được.
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement(
            "ALTER TABLE bookings MODIFY COLUMN status "
                . "ENUM('pending','confirmed','departed','completed','cancelled','retained') "
                . "NOT NULL DEFAULT 'pending'"
        );

        DB::statement(
            "ALTER TABLE bookings MODIFY COLUMN payment_status "
                . "ENUM('unpaid','paid','failed','refunded','refund_pending') "
                . "NOT NULL DEFAULT 'unpaid'"
        );
    }

    /**
     * Reverse the migrations.
     *
     * Nếu đã có booking mang status='retained' hoặc payment_status='refund_pending',
     * cần cập nhật lại dữ liệu đó trước khi rollback.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement(
            "ALTER TABLE bookings MODIFY COLUMN status "
                . "ENUM('pending','confirmed','departed','completed','cancelled') "
                . "NOT NULL DEFAULT 'pending'"
        );

        DB::statement(
            "ALTER TABLE bookings MODIFY COLUMN payment_status "
                . "ENUM('unpaid','paid','failed','refunded') "
                . "NOT NULL DEFAULT 'unpaid'"
        );
    }
};
