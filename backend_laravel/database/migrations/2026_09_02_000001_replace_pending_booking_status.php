<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const MYSQL_STATUSES_WITH_LEGACY = "'pending','awaiting_payment','confirmed','departed','completed','cancelled','cancelled_by_tour','retained'";

    private const MYSQL_STATUSES = "'awaiting_payment','confirmed','departed','completed','cancelled','cancelled_by_tour','retained'";

    public function up(): void
    {
        if (! DB::getSchemaBuilder()->hasTable('bookings')) {
            return;
        }

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            // Thêm giá trị mới trước để các bản ghi cũ có thể được chuyển an toàn.
            DB::statement(
                'ALTER TABLE bookings MODIFY COLUMN status ENUM('.self::MYSQL_STATUSES_WITH_LEGACY.') NOT NULL DEFAULT \'awaiting_payment\''
            );
        }

        DB::table('bookings')
            ->where('status', 'pending')
            ->update(['status' => 'awaiting_payment']);

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            // Loại bỏ hoàn toàn pending khỏi enum để không thể tạo lại trạng thái cũ.
            DB::statement(
                'ALTER TABLE bookings MODIFY COLUMN status ENUM('.self::MYSQL_STATUSES.') NOT NULL DEFAULT \'awaiting_payment\''
            );
        }
    }

    public function down(): void
    {
        if (! DB::getSchemaBuilder()->hasTable('bookings')) {
            return;
        }

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement(
                'ALTER TABLE bookings MODIFY COLUMN status ENUM('.self::MYSQL_STATUSES_WITH_LEGACY.') NOT NULL DEFAULT \'pending\''
            );
        }

        DB::table('bookings')
            ->where('status', 'awaiting_payment')
            ->update(['status' => 'pending']);

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement(
                "ALTER TABLE bookings MODIFY COLUMN status ENUM('pending','confirmed','departed','completed','cancelled','cancelled_by_tour','retained') NOT NULL DEFAULT 'pending'"
            );
        }
    }
};
