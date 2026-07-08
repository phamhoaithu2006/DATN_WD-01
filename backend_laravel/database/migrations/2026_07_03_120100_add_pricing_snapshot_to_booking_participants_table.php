<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_participants', function (Blueprint $table) {
            $table->decimal('unit_price', 12, 2)->nullable()->after('participant_type');
            $table->string('pricing_rule_label', 150)->nullable()->after('unit_price');
            $table->enum('pricing_type', ['percentage', 'fixed', 'free'])->nullable()->after('pricing_rule_label');
            $table->decimal('pricing_value', 12, 2)->nullable()->after('pricing_type');
        });
    }

    public function down(): void
    {
        Schema::table('booking_participants', function (Blueprint $table) {
            $table->dropColumn([
                'unit_price',
                'pricing_rule_label',
                'pricing_type',
                'pricing_value',
            ]);
        });
    }
};
