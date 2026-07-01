<?php

use App\Models\Role;
use App\Models\SupportStaff;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_staff', function (Blueprint $table) {
            $table->foreignId('user_id')
                ->nullable()
                ->unique()
                ->after('id')
                ->constrained('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });

        $supportRoleId = Role::where('name', 'support staff')->value('id');

        if (! $supportRoleId) {
            return;
        }

        $supportUsers = User::query()
            ->where('role_id', $supportRoleId)
            ->get();

        foreach ($supportUsers as $user) {
            $supportStaff = SupportStaff::where('email', $user->email)->first();

            if ($supportStaff) {
                $supportStaff->update([
                    'user_id' => $user->id,
                    'name' => $user->full_name,
                    'email' => $user->email,
                    'status' => $user->status === 'inactive' ? 'inactive' : $supportStaff->status,
                    'hidden_at' => $user->status === 'inactive' ? Carbon::now() : $supportStaff->hidden_at,
                ]);

                continue;
            }

            SupportStaff::create([
                'user_id' => $user->id,
                'name' => $user->full_name,
                'email' => $user->email,
                'role' => 'customer_service',
                'status' => $user->status === 'inactive' ? 'inactive' : 'active',
                'performance_rating' => 5,
                'hidden_at' => $user->status === 'inactive' ? Carbon::now() : null,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('support_staff', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
