<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partner_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained('partners')->cascadeOnDelete();
            $table->string('service_name', 200)->comment('VD: Hà Nội → Phú Quốc');
            $table->string('service_code', 50)->nullable()->comment('VD: VN-1831');
            $table->enum('service_type', [
                'flight',
                'hotel',
                'restaurant',
                'transport',
                'train',
                'cruise',
                'insurance',
                'attraction'
            ]);
            // Thông tin chung
            $table->time('depart_time')->nullable()->comment('Giờ khởi hành / check-in / mở cửa');
            $table->time('arrive_time')->nullable()->comment('Giờ hạ cánh / check-out / đóng cửa');
            $table->string('origin', 150)->nullable()->comment('Điểm đi / địa điểm');
            $table->string('destination', 150)->nullable()->comment('Điểm đến');
            $table->string('vehicle_type', 100)->nullable()->comment('Loại máy bay / xe / tàu...');
            $table->string('seat_class', 100)->nullable()->comment('Hạng ghế / loại phòng / loại cabin');
            // Lịch khai thác trong tuần (1=T2, 2=T3...7=CN)
            $table->json('operate_days')->nullable()->comment('[1,3,4,6,7] = T2,T4,T5,T7,CN');
            // Chính sách đặt
            $table->integer('domestic_booking_hours')->nullable()->comment('Đặt nội địa tối thiểu X giờ');
            $table->integer('international_booking_hours')->nullable()->comment('Đặt quốc tế tối thiểu X giờ');
            $table->string('confirmation_time', 50)->nullable()->comment('VD: 1 - 10 phút');
            // Dịch vụ đi kèm (amenities)
            $table->json('amenities')->nullable()->comment('VD: ["Bữa sáng trên máy bay", "WiFi"]');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->softDeletes();
            $table->timestamps();

            $table->index('partner_id');
            $table->index('service_type');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_services');
    }
};
