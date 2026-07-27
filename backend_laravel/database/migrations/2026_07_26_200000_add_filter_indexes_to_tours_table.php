<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Index phục vụ bộ lọc tour nâng cao (thời lượng, đánh giá).
     * Giá (base_price) và trạng thái (status) đã có index từ migration tạo bảng.
     */
    public function up(): void
    {
        Schema::table('tours', function (Blueprint $table) {
            $table->index('duration_days', 'idx_tours_duration');
            $table->index('average_rating', 'idx_tours_rating');
        });
    }

    public function down(): void
    {
        Schema::table('tours', function (Blueprint $table) {
            $table->dropIndex('idx_tours_duration');
            $table->dropIndex('idx_tours_rating');
        });
    }
};
