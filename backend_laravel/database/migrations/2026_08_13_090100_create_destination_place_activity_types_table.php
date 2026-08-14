<?php

use App\Models\TourItinerary;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('destination_place_activity_types', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('destination_place_id');
            $table->string('activity_type', 40);
            $table->timestamps();

            $table->foreign('destination_place_id', 'dpat_place_fk')
                ->references('id')
                ->on('destination_places')
                ->cascadeOnDelete();
            $table->unique(['destination_place_id', 'activity_type'], 'dpat_place_type_unique');
            $table->index('activity_type', 'dpat_activity_type_idx');
        });

        DB::table('tour_itineraries')
            ->whereNotNull('destination_place_id')
            ->select(['destination_place_id', 'type'])
            ->distinct()
            ->get()
            ->each(function (object $item): void {
                DB::table('destination_place_activity_types')->insertOrIgnore([
                    'destination_place_id' => $item->destination_place_id,
                    'activity_type' => $item->type,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });

        DB::table('destination_places')
            ->where('status', 'active')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('destination_place_activity_types')
                    ->whereColumn(
                        'destination_place_activity_types.destination_place_id',
                        'destination_places.id',
                    );
            })
            ->select('id')
            ->orderBy('id')
            ->get()
            ->each(function (object $place): void {
                DB::table('destination_place_activity_types')->insert([
                    'destination_place_id' => $place->id,
                    'activity_type' => TourItinerary::ACTIVITY_SIGHTSEEING,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('destination_place_activity_types');
    }
};
