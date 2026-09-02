<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->addIndexIfMissing('tours', 'status');
        $this->addIndexIfMissing('tours', 'category_id');
        $this->addIndexIfMissing('tours', 'province_id');
        $this->addIndexIfMissing('tour_departures', 'tour_id');
        $this->addIndexIfMissing('tour_departures', 'departure_date');
        $this->addIndexIfMissing('tour_departures', 'status');
        $this->addIndexIfMissing('tour_reviews', 'tour_id');
        $this->addIndexIfMissing('tour_reviews', 'rating');
        $this->addIndexIfMissing('bookings', 'tour_id');
        $this->addIndexIfMissing('bookings', 'status');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ([
            'tours' => ['status', 'category_id', 'province_id'],
            'tour_departures' => ['tour_id', 'departure_date', 'status'],
            'tour_reviews' => ['tour_id', 'rating'],
            'bookings' => ['tour_id', 'status'],
        ] as $table => $columns) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            foreach ($columns as $column) {
                $index = "{$table}_{$column}_index";
                if ($this->indexExists($table, $index)) {
                    Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropIndex($index));
                }
            }
        }
    }

    private function addIndexIfMissing(string $table, string $column): void
    {
        if (!Schema::hasTable($table)) {
            return;
        }

        $index = "{$table}_{$column}_index";
        if (!$this->indexExists($table, $index)) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->index($column));
        }
    }

    private function indexExists(string $table, string $indexName): bool
    {
        return DB::select("SHOW INDEXES FROM `{$table}` WHERE Key_name = ?", [$indexName]) !== [];
    }
};
