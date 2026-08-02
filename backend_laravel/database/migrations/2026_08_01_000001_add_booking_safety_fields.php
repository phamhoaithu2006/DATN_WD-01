<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table): void {
            $table->string('idempotency_key', 64)->nullable()->after('booking_code');
            $table->unique(['user_id', 'idempotency_key'], 'bookings_user_idempotency_key_unique');
        });

        Schema::table('booking_contacts', function (Blueprint $table): void {
            $table->string('phone_normalized', 20)->nullable()->after('contact_phone');
            $table->index('phone_normalized', 'booking_contacts_phone_normalized_index');
        });

        Schema::table('booking_participants', function (Blueprint $table): void {
            $table->string('phone_normalized', 20)->nullable()->after('phone');
            $table->index('phone_normalized', 'booking_participants_phone_normalized_index');
        });

        DB::table('booking_contacts')->orderBy('id')->select(['id', 'contact_phone'])->each(function (object $contact): void {
            DB::table('booking_contacts')->where('id', $contact->id)->update([
                'phone_normalized' => $this->normalizePhone($contact->contact_phone),
            ]);
        });

        DB::table('booking_participants')->orderBy('id')->select(['id', 'phone'])->each(function (object $participant): void {
            DB::table('booking_participants')->where('id', $participant->id)->update([
                'phone_normalized' => $this->normalizePhone($participant->phone),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('booking_participants', function (Blueprint $table): void {
            $table->dropIndex('booking_participants_phone_normalized_index');
            $table->dropColumn('phone_normalized');
        });

        Schema::table('booking_contacts', function (Blueprint $table): void {
            $table->dropIndex('booking_contacts_phone_normalized_index');
            $table->dropColumn('phone_normalized');
        });

        Schema::table('bookings', function (Blueprint $table): void {
            $table->dropUnique('bookings_user_idempotency_key_unique');
            $table->dropColumn('idempotency_key');
        });
    }

    private function normalizePhone(?string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $phone);

        if (str_starts_with($digits, '84') && strlen($digits) === 11) {
            $digits = '0'.substr($digits, 2);
        }

        return $digits !== '' ? $digits : null;
    }
};
