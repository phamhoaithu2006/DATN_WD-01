<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            $table->string('partner_code', 20)->unique()->nullable()->after('id');
            $table->decimal('average_rating', 3, 1)->default(0)->after('logo_url');
            $table->date('contract_start')->nullable()->after('average_rating');
            $table->date('contract_end')->nullable()->after('contract_start');
            $table->boolean('is_visible')->default(true)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('partners', function (Blueprint $table) {
            $table->dropColumn(['partner_code', 'average_rating', 'contract_start', 'contract_end', 'is_visible']);
        });
    }
};
