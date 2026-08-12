<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('districts')
            ->whereNull('code')
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('destination_places')
                    ->whereColumn('destination_places.district_id', 'districts.id');
            })
            ->delete();
    }

    public function down(): void
    {
        // Các dòng seed thử đã lỗi thời, không khôi phục khi rollback.
    }
};
