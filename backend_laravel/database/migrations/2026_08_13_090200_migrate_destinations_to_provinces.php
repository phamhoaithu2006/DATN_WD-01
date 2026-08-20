<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tourHasLegacyDestination = Schema::hasColumn('tours', 'destination_id');

        if (! Schema::hasColumn('tours', 'province_id')) {
            Schema::table('tours', function (Blueprint $table) use ($tourHasLegacyDestination): void {
                $column = $table->foreignId('province_id')->nullable();
                if ($tourHasLegacyDestination) {
                    $column->after('destination_id');
                }
                $table->index('province_id');
            });
        }

        $destinationProvinceIds = Schema::hasTable('destination_province')
            ? DB::table('destination_province')->select('destination_id', 'province_id')
                ->orderBy('destination_id')->get()->groupBy('destination_id')
                ->map(fn ($rows) => (int) $rows->first()->province_id)
            : collect();

        if ($tourHasLegacyDestination) {
            $provinceIdsByName = DB::table('provinces')->pluck('id', 'name')
                ->map(fn ($id) => (int) $id);

            DB::table('tours')->select(['id', 'destination_id'])->whereNull('province_id')
                ->orderBy('id')->get()
                ->each(function (object $tour) use ($destinationProvinceIds, $provinceIdsByName): void {
                    $provinceId = $destinationProvinceIds->get((int) $tour->destination_id);
                    if (! $provinceId && Schema::hasTable('destinations')) {
                        $provinceName = DB::table('destinations')->where('id', $tour->destination_id)
                            ->value('province_city');
                        $provinceId = $provinceName ? $provinceIdsByName->get($provinceName) : null;
                    }
                    if (! $provinceId) {
                        throw new RuntimeException("Không thể ánh xạ tour #{$tour->id} sang tỉnh/thành.");
                    }
                    DB::table('tours')->where('id', $tour->id)->update(['province_id' => $provinceId]);
                });

            Schema::table('tours', function (Blueprint $table): void {
                $table->dropForeign(['destination_id']);
                $table->foreignId('province_id')->nullable(false)->change();
                $table->foreign('province_id')->references('id')->on('provinces')->restrictOnDelete();
                $table->dropColumn('destination_id');
            });
        }

        if (! Schema::hasTable('guide_provinces')) {
            Schema::create('guide_provinces', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('guide_id')->constrained('guides')->cascadeOnDelete();
                $table->foreignId('province_id')->constrained('provinces')->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['guide_id', 'province_id']);
            });
        }

        if (Schema::hasTable('guide_destinations') && Schema::hasTable('destination_province')) {
            DB::table('guide_destinations')
                ->join('destination_province', 'guide_destinations.destination_id', '=', 'destination_province.destination_id')
                ->select('guide_destinations.guide_id', 'destination_province.province_id')
                ->orderBy('guide_destinations.id')->get()
                ->each(function (object $assignment): void {
                    DB::table('guide_provinces')->insertOrIgnore([
                        'guide_id' => $assignment->guide_id,
                        'province_id' => $assignment->province_id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                });
        }

        if (Schema::hasColumn('destination_places', 'destination_id')) {
            $provinceIdsByName = DB::table('provinces')->pluck('id', 'name')
                ->map(fn ($id) => (int) $id);

            DB::table('destination_places')->select(['id', 'destination_id'])->whereNull('province_id')
                ->orderBy('id')->get()
                ->each(function (object $place) use ($destinationProvinceIds, $provinceIdsByName): void {
                    $provinceId = $destinationProvinceIds->get((int) $place->destination_id);
                    if (! $provinceId && Schema::hasTable('destinations')) {
                        $provinceName = DB::table('destinations')->where('id', $place->destination_id)
                            ->value('province_city');
                        $provinceId = $provinceName ? $provinceIdsByName->get($provinceName) : null;
                    }
                    if (! $provinceId) {
                        throw new RuntimeException("Không thể ánh xạ địa điểm #{$place->id} sang tỉnh/thành.");
                    }
                    DB::table('destination_places')->where('id', $place->id)
                        ->update(['province_id' => $provinceId]);
                });

            Schema::table('destination_places', function (Blueprint $table): void {
                $table->dropForeign(['province_id']);
                $table->dropIndex(['destination_id', 'status']);
                $table->dropUnique(['destination_id', 'name']);
                $table->dropColumn('destination_id');
                $table->foreignId('province_id')->nullable(false)->change();
                $table->foreign('province_id')->references('id')->on('provinces')->restrictOnDelete();
                $table->unique(['province_id', 'name']);
            });
        }

        Schema::dropIfExists('tour_destinations');
        Schema::dropIfExists('guide_destinations');
        Schema::dropIfExists('destination_province');
        Schema::dropIfExists('destinations');
    }

    public function down(): void
    {
        throw new RuntimeException(
            'Migration chuyển destinations sang provinces không hỗ trợ rollback tự động vì đã loại bỏ dữ liệu danh mục cũ.'
        );
    }
};
