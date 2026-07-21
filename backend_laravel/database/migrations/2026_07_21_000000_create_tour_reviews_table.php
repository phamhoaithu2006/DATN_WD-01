<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tour_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('tour_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('booking_id')->nullable()->unique()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('tour_departure_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->enum('status', ['visible', 'hidden', 'spam'])->default('visible');
            $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamp('moderated_at')->nullable();
            $table->timestamps();

            $table->index(['tour_id', 'status', 'created_at'], 'tour_reviews_public_index');
            $table->index(['status', 'rating', 'created_at'], 'tour_reviews_admin_index');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE tour_reviews ADD CONSTRAINT tour_reviews_rating_check CHECK (rating BETWEEN 1 AND 5)');
        }

        $this->moveLegacyTourReviews();
        $this->refreshTourRatingsFrom('tour_reviews');
    }

    public function down(): void
    {
        $this->restoreLegacyTourReviews();
        $this->refreshTourRatingsFrom('reviews');

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE tour_reviews DROP CHECK tour_reviews_rating_check');
        }

        Schema::dropIfExists('tour_reviews');
    }

    private function moveLegacyTourReviews(): void
    {
        if (! Schema::hasTable('reviews') || ! Schema::hasColumn('reviews', 'guide_id')) {
            return;
        }

        DB::table('reviews')
            ->whereNull('guide_id')
            ->orderBy('id')
            ->chunkById(500, function ($reviews): void {
                foreach ($reviews as $review) {
                    $bookingId = $review->booking_id;

                    if ($bookingId !== null && DB::table('tour_reviews')->where('booking_id', $bookingId)->exists()) {
                        $bookingId = null;
                    }

                    $inserted = DB::table('tour_reviews')->insert([
                        'user_id' => $review->user_id,
                        'tour_id' => $review->tour_id,
                        'booking_id' => $bookingId,
                        'tour_departure_id' => $review->tour_departure_id,
                        'rating' => $review->rating,
                        'comment' => $review->comment,
                        'status' => $review->status,
                        'moderated_by' => null,
                        'moderated_at' => null,
                        'created_at' => $review->created_at,
                        'updated_at' => $review->updated_at,
                    ]);

                    if (! $inserted) {
                        throw new RuntimeException("Không thể chuyển đánh giá cũ #{$review->id} sang tour_reviews.");
                    }

                    DB::table('reviews')->where('id', $review->id)->delete();
                }
            });
    }

    private function restoreLegacyTourReviews(): void
    {
        if (! Schema::hasTable('tour_reviews') || ! Schema::hasTable('reviews')) {
            return;
        }

        DB::table('tour_reviews')
            ->orderBy('id')
            ->chunkById(500, function ($reviews): void {
                foreach ($reviews as $review) {
                    $inserted = DB::table('reviews')->insert([
                        'user_id' => $review->user_id,
                        'tour_id' => $review->tour_id,
                        'booking_id' => $review->booking_id,
                        'guide_id' => null,
                        'tour_departure_id' => $review->tour_departure_id,
                        'rating' => $review->rating,
                        'comment' => $review->comment,
                        'status' => $review->status,
                        'created_at' => $review->created_at,
                        'updated_at' => $review->updated_at,
                    ]);

                    if (! $inserted) {
                        throw new RuntimeException("Không thể khôi phục đánh giá tour #{$review->id} về reviews.");
                    }
                }
            });
    }

    private function refreshTourRatingsFrom(string $reviewsTable): void
    {
        if (
            ! Schema::hasTable('tours')
            || ! Schema::hasColumn('tours', 'average_rating')
            || ! Schema::hasColumn('tours', 'review_count')
        ) {
            return;
        }

        DB::table('tours')
            ->select('id')
            ->orderBy('id')
            ->chunkById(500, function ($tours) use ($reviewsTable): void {
                foreach ($tours as $tour) {
                    $summary = DB::table($reviewsTable)
                        ->where('tour_id', $tour->id)
                        ->where('status', 'visible')
                        ->selectRaw('COUNT(*) as review_count, COALESCE(AVG(rating), 0) as average_rating')
                        ->first();

                    DB::table('tours')
                        ->where('id', $tour->id)
                        ->update([
                            'average_rating' => round((float) ($summary->average_rating ?? 0), 2),
                            'review_count' => (int) ($summary->review_count ?? 0),
                        ]);
                }
            });
    }
};
