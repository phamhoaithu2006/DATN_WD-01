<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provinces', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120)->unique();
            $table->string('code', 20)->nullable()->unique();
            $table->timestamps();
        });

        Schema::create('districts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('province_id')->constrained()->cascadeOnDelete();
            $table->string('name', 150);
            $table->string('code', 20)->nullable();
            $table->timestamps();
            $table->unique(['province_id', 'name']);
        });

        Schema::create('destination_province', function (Blueprint $table) {
            $table->foreignId('destination_id')->constrained()->cascadeOnDelete();
            $table->foreignId('province_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['destination_id', 'province_id']);
        });

        Schema::table('destination_places', function (Blueprint $table) {
            $table->foreignId('district_id')->nullable()->after('district_name')->constrained()->nullOnDelete();
        });

        $areas = [
            'Thái Bình' => ['Thành phố Thái Bình', 'Đông Hưng', 'Hưng Hà', 'Kiến Xương', 'Quỳnh Phụ', 'Thái Thụy', 'Tiền Hải', 'Vũ Thư'],
            'Đà Nẵng' => ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ', 'Hòa Vang', 'Hoàng Sa'],
            'Quảng Nam' => ['Thành phố Tam Kỳ', 'Thành phố Hội An', 'Điện Bàn', 'Duy Xuyên', 'Đại Lộc', 'Đông Giang', 'Tây Giang', 'Nam Giang', 'Phước Sơn', 'Hiệp Đức', 'Thăng Bình', 'Tiên Phước', 'Bắc Trà My', 'Nam Trà My', 'Núi Thành', 'Phú Ninh', 'Nông Sơn'],
            'Hà Nội' => ['Ba Đình', 'Hoàn Kiếm', 'Tây Hồ', 'Long Biên', 'Cầu Giấy', 'Đống Đa', 'Hai Bà Trưng', 'Hoàng Mai', 'Thanh Xuân', 'Hà Đông', 'Bắc Từ Liêm', 'Nam Từ Liêm', 'Ba Vì', 'Chương Mỹ', 'Đan Phượng', 'Đông Anh', 'Gia Lâm', 'Hoài Đức', 'Mê Linh', 'Mỹ Đức', 'Phú Xuyên', 'Phúc Thọ', 'Quốc Oai', 'Sóc Sơn', 'Thạch Thất', 'Thanh Oai', 'Thanh Trì', 'Thường Tín', 'Ứng Hòa', 'Sơn Tây'],
            'Quảng Ninh' => ['Thành phố Hạ Long', 'Thành phố Cẩm Phả', 'Thành phố Uông Bí', 'Thành phố Móng Cái', 'Đông Triều', 'Quảng Yên', 'Ba Chẽ', 'Bình Liêu', 'Cô Tô', 'Đầm Hà', 'Hải Hà', 'Tiên Yên', 'Vân Đồn'],
            'Ninh Bình' => ['Thành phố Hoa Lư', 'Tam Điệp', 'Gia Viễn', 'Kim Sơn', 'Nho Quan', 'Yên Khánh', 'Yên Mô'],
            'Lào Cai' => ['Thành phố Lào Cai', 'Sa Pa', 'Bát Xát', 'Bảo Thắng', 'Bảo Yên', 'Bắc Hà', 'Mường Khương', 'Si Ma Cai', 'Văn Bàn'],
            'Huế' => ['Quận Phú Xuân', 'Quận Thuận Hóa', 'Phong Điền', 'Hương Thủy', 'Hương Trà', 'A Lưới', 'Phú Lộc', 'Phú Vang', 'Quảng Điền'],
            'Lâm Đồng' => ['Thành phố Đà Lạt', 'Thành phố Bảo Lộc', 'Bảo Lâm', 'Cát Tiên', 'Đạ Huoai', 'Đạ Tẻh', 'Đam Rông', 'Di Linh', 'Đơn Dương', 'Đức Trọng', 'Lạc Dương', 'Lâm Hà'],
            'Khánh Hòa' => ['Thành phố Nha Trang', 'Thành phố Cam Ranh', 'Ninh Hòa', 'Cam Lâm', 'Diên Khánh', 'Khánh Sơn', 'Khánh Vĩnh', 'Trường Sa', 'Vạn Ninh'],
            'Kiên Giang' => ['Thành phố Rạch Giá', 'Thành phố Hà Tiên', 'Thành phố Phú Quốc', 'An Biên', 'An Minh', 'Châu Thành', 'Giang Thành', 'Giồng Riềng', 'Gò Quao', 'Hòn Đất', 'Kiên Hải', 'Kiên Lương', 'Tân Hiệp', 'U Minh Thượng', 'Vĩnh Thuận'],
        ];

        foreach ($areas as $provinceName => $districtNames) {
            $provinceId = DB::table('provinces')->insertGetId(['name' => $provinceName, 'created_at' => now(), 'updated_at' => now()]);
            foreach ($districtNames as $districtName) {
                DB::table('districts')->insert(['province_id' => $provinceId, 'name' => $districtName, 'created_at' => now(), 'updated_at' => now()]);
            }
        }

        foreach (DB::table('destinations')->select('id', 'province_city')->get() as $destination) {
            $provinceId = DB::table('provinces')->where('name', $destination->province_city)->value('id');
            if ($provinceId) {
                DB::table('destination_province')->insertOrIgnore(['destination_id' => $destination->id, 'province_id' => $provinceId, 'created_at' => now(), 'updated_at' => now()]);
            }
        }

        foreach (DB::table('destination_places')->whereNotNull('district_name')->select('id', 'destination_id', 'district_name')->get() as $place) {
            $provinceIds = DB::table('destination_province')->where('destination_id', $place->destination_id)->pluck('province_id');
            $districtId = DB::table('districts')->whereIn('province_id', $provinceIds)->where('name', $place->district_name)->value('id');
            if ($districtId) DB::table('destination_places')->where('id', $place->id)->update(['district_id' => $districtId]);
        }
    }

    public function down(): void
    {
        Schema::table('destination_places', fn (Blueprint $table) => $table->dropConstrainedForeignId('district_id'));
        Schema::dropIfExists('destination_province');
        Schema::dropIfExists('districts');
        Schema::dropIfExists('provinces');
    }
};
