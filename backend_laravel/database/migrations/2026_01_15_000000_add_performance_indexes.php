<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // This migration predates the domain-table migrations. On a fresh
        // install those tables do not exist yet, so defer these indexes to
        // the later performance-index migration.
        if (!Schema::hasTable('tours')) {
            return;
        }

        // Add indexes only if they don't exist
        // Tours table indexes
        if (!$this->indexExists('tours', 'tours_status_index')) {
            Schema::table('tours', function (Blueprint $table) {
                $table->index('status');
            });
        }

        if (!$this->indexExists('tours', 'tours_category_id_index')) {
            Schema::table('tours', function (Blueprint $table) {
                $table->index('category_id');
            });
        }

        if (!$this->indexExists('tours', 'tours_province_id_index')) {
            Schema::table('tours', function (Blueprint $table) {
                $table->index('province_id');
            });
        }

        // Tour Departures indexes
        if (!$this->indexExists('tour_departures', 'tour_departures_tour_id_index')) {
            Schema::table('tour_departures', function (Blueprint $table) {
                $table->index('tour_id');
            });
        }

        if (!$this->indexExists('tour_departures', 'tour_departures_departure_date_index')) {
            Schema::table('tour_departures', function (Blueprint $table) {
                $table->index('departure_date');
            });
        }

        if (!$this->indexExists('tour_departures', 'tour_departures_status_index')) {
            Schema::table('tour_departures', function (Blueprint $table) {
                $table->index('status');
            });
        }

        // Tour Reviews indexes
        if (!$this->indexExists('tour_reviews', 'tour_reviews_tour_id_index')) {
            Schema::table('tour_reviews', function (Blueprint $table) {
                $table->index('tour_id');
            });
        }

        if (!$this->indexExists('tour_reviews', 'tour_reviews_rating_index')) {
            Schema::table('tour_reviews', function (Blueprint $table) {
                $table->index('rating');
            });
        }

        // Bookings indexes
        if (!$this->indexExists('bookings', 'bookings_tour_id_index')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->index('tour_id');
            });
        }

        if (!$this->indexExists('bookings', 'bookings_status_index')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->index('status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('tours')) {
            return;
        }

        Schema::table('tours', function (Blueprint $table) {
            if ($this->indexExists('tours', 'tours_status_index')) {
                $table->dropIndex('tours_status_index');
            }
            if ($this->indexExists('tours', 'tours_category_id_index')) {
                $table->dropIndex('tours_category_id_index');
            }
            if ($this->indexExists('tours', 'tours_province_id_index')) {
                $table->dropIndex('tours_province_id_index');
            }
        });

        Schema::table('tour_departures', function (Blueprint $table) {
            if ($this->indexExists('tour_departures', 'tour_departures_tour_id_index')) {
                $table->dropIndex('tour_departures_tour_id_index');
            }
            if ($this->indexExists('tour_departures', 'tour_departures_departure_date_index')) {
                $table->dropIndex('tour_departures_departure_date_index');
            }
            if ($this->indexExists('tour_departures', 'tour_departures_status_index')) {
                $table->dropIndex('tour_departures_status_index');
            }
        });

        Schema::table('tour_reviews', function (Blueprint $table) {
            if ($this->indexExists('tour_reviews', 'tour_reviews_tour_id_index')) {
                $table->dropIndex('tour_reviews_tour_id_index');
            }
            if ($this->indexExists('tour_reviews', 'tour_reviews_rating_index')) {
                $table->dropIndex('tour_reviews_rating_index');
            }
        });

        Schema::table('bookings', function (Blueprint $table) {
            if ($this->indexExists('bookings', 'bookings_tour_id_index')) {
                $table->dropIndex('bookings_tour_id_index');
            }
            if ($this->indexExists('bookings', 'bookings_status_index')) {
                $table->dropIndex('bookings_status_index');
            }
        });
    }

    /**
     * Check if an index exists on a table
     */
    private function indexExists(string $table, string $indexName): bool
    {
        $indexes = DB::select("SHOW INDEXES FROM {$table} WHERE Key_name = ?", [$indexName]);
        return count($indexes) > 0;
    }
};
