<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('destination_places', function (Blueprint $table) {
            $table->id();
            $table->foreignId('destination_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->string('name', 180);
            $table->string('slug', 220)->unique();
            $table->string('address', 500)->nullable();
            $table->text('description')->nullable();
            $table->string('thumbnail_url', 500)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active')->index();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['destination_id', 'status']);
            $table->unique(['destination_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('destination_places');
    }
};
