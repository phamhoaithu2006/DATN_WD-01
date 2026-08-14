<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('destination_places', function (Blueprint $table) {
            $table->dropForeign(['destination_id']);
            $table->foreignId('destination_id')->nullable()->change();
            $table->foreignId('province_id')
                ->nullable()
                ->after('destination_id')
                ->constrained()
                ->nullOnDelete();
            $table->index(['province_id', 'status']);
        });

        DB::table('destination_places')
            ->select(['destination_places.id', 'destination_places.destination_id'])
            ->whereNull('destination_places.province_id')
            ->orderBy('destination_places.id')
            ->get()
            ->each(function (object $place): void {
                $provinceId = DB::table('destination_province')
                    ->where('destination_id', $place->destination_id)
                    ->value('province_id');

                if ($provinceId) {
                    DB::table('destination_places')
                        ->where('id', $place->id)
                        ->update(['province_id' => $provinceId]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('destination_places', function (Blueprint $table) {
            $table->dropIndex(['province_id', 'status']);
            $table->dropConstrainedForeignId('province_id');
            $table->foreignId('destination_id')->nullable(false)->change();
            $table->foreign('destination_id')->references('id')->on('destinations')->restrictOnDelete();
        });
    }
};
