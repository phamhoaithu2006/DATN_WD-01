<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tour_age_pricing_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tour_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('label', 150);
            $table->unsignedInteger('min_age')->default(0);
            $table->unsignedInteger('max_age')->nullable();
            $table->enum('pricing_type', ['percentage', 'fixed', 'free']);
            $table->decimal('price_value', 12, 2)->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tour_id', 'is_active']);
            $table->index(['tour_id', 'min_age', 'max_age']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tour_age_pricing_rules');
    }
};
