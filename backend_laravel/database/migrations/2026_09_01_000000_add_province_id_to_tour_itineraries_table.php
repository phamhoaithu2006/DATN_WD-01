<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tour_itineraries', function (Blueprint $table) {
            $table->foreignId('province_id')
                ->nullable()
                ->after('type')
                ->constrained('provinces')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });

        DB::table('tour_itineraries')
            ->select(['id', 'tour_id', 'destination_place_id'])
            ->orderBy('id')
            ->chunkById(200, function ($itineraries): void {
                foreach ($itineraries as $itinerary) {
                    $provinceId = null;

                    if ($itinerary->destination_place_id) {
                        $place = DB::table('destination_places')
                            ->leftJoin('districts', 'districts.id', '=', 'destination_places.district_id')
                            ->where('destination_places.id', $itinerary->destination_place_id)
                            ->select([
                                'destination_places.province_id',
                                'districts.province_id as district_province_id',
                            ])
                            ->first();

                        $provinceId = $place?->province_id ?? $place?->district_province_id;
                    }

                    $provinceId ??= DB::table('tours')
                        ->where('id', $itinerary->tour_id)
                        ->value('province_id');

                    if ($provinceId) {
                        DB::table('tour_itineraries')
                            ->where('id', $itinerary->id)
                            ->update(['province_id' => $provinceId]);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::table('tour_itineraries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('province_id');
        });
    }
};
