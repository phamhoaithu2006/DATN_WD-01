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
        Schema::create('tours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('destination_id')->constrained()->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->string('title', 255);
            $table->string('slug', 280)->unique();
            $table->string('summary', 500)->nullable();
            $table->longText('description')->nullable();
            $table->longText('itinerary')->nullable();
            $table->unsignedInteger('duration_days');
            $table->unsignedInteger('duration_nights')->default(0);
            $table->decimal('base_price', 12, 2);
            $table->decimal('discount_price', 12, 2)->nullable();
            $table->unsignedInteger('max_slots');
            $table->unsignedInteger('available_slots');
            $table->enum('status', ['draft', 'published', 'hidden', 'cancelled'])->default('draft')->index();
            $table->decimal('average_rating', 3, 2)->default(0);
            $table->unsignedInteger('review_count')->default(0);
            $table->softDeletes();
            $table->timestamps();

            $table->index('base_price');

            if (DB::getDriverName() !== 'sqlite') {
                $table->fullText(['title', 'summary', 'description']);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tours');
    }
};
