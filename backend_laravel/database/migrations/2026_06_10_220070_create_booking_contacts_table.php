<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('booking_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->unique()->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('contact_name', 150);
            $table->string('contact_email', 150);
            $table->string('contact_phone', 20)->index();
            $table->string('address', 255)->nullable();
            $table->text('special_request')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_contacts');
    }
};
