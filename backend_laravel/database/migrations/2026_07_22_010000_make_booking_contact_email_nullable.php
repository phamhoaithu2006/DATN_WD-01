<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_contacts', function (Blueprint $table) {
            $table->string('contact_email', 150)->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('booking_contacts')
            ->whereNull('contact_email')
            ->update(['contact_email' => '']);

        Schema::table('booking_contacts', function (Blueprint $table) {
            $table->string('contact_email', 150)->nullable(false)->change();
        });
    }
};
