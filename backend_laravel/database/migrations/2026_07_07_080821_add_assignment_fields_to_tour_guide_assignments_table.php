<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $hasRole = Schema::hasColumn('tour_guide_assignments', 'role');
        $hasStatus = Schema::hasColumn('tour_guide_assignments', 'status');
        $hasAssignedBy = Schema::hasColumn('tour_guide_assignments', 'assigned_by');
        $hasAssignedAt = Schema::hasColumn('tour_guide_assignments', 'assigned_at');
        $hasNotes = Schema::hasColumn('tour_guide_assignments', 'notes');

        Schema::table('tour_guide_assignments', function (
            Blueprint $table
        ) use (
            $hasRole,
            $hasStatus,
            $hasAssignedBy,
            $hasAssignedAt,
            $hasNotes
        ) {
            if (!$hasRole) {
                $table->string('role', 20)
                    ->default('lead')
                    ->after('guide_id');
            }

            if (!$hasStatus) {
                $table->string('status', 20)
                    ->default('assigned')
                    ->after('role');
            }

            if (!$hasAssignedBy) {
                $table->foreignId('assigned_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete()
                    ->after('status');
            }

            if (!$hasAssignedAt) {
                $table->timestamp('assigned_at')
                    ->nullable()
                    ->after('assigned_by');
            }

            if (!$hasNotes) {
                $table->text('notes')
                    ->nullable()
                    ->after('assigned_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tour_guide_assignments', function (Blueprint $table) {
            if (Schema::hasColumn('tour_guide_assignments', 'assigned_by')) {
                $table->dropForeign(['assigned_by']);
                $table->dropColumn('assigned_by');
            }

            $columns = [
                'role',
                'assigned_at',
                'notes',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('tour_guide_assignments', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};