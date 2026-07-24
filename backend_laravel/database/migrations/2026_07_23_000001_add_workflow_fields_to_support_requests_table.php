<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('support_requests')) {
            return;
        }

        Schema::table('support_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('support_requests', 'needs_more_info')) {
                $table->boolean('needs_more_info')
                    ->default(false)
                    ->after('status');
            }

            if (! Schema::hasColumn('support_requests', 'info_request_message')) {
                $table->text('info_request_message')
                    ->nullable()
                    ->after('needs_more_info');
            }

            if (! Schema::hasColumn('support_requests', 'info_requested_at')) {
                $table->timestamp('info_requested_at')
                    ->nullable()
                    ->after('info_request_message');
            }

            if (! Schema::hasColumn('support_requests', 'admin_request_status')) {
                $table->string('admin_request_status', 30)
                    ->nullable()
                    ->after('info_requested_at');
            }

            if (! Schema::hasColumn('support_requests', 'admin_request_content')) {
                $table->text('admin_request_content')
                    ->nullable()
                    ->after('admin_request_status');
            }

            if (! Schema::hasColumn('support_requests', 'admin_requested_by')) {
                $table->unsignedBigInteger('admin_requested_by')
                    ->nullable()
                    ->after('admin_request_content');
            }

            if (! Schema::hasColumn('support_requests', 'admin_requested_at')) {
                $table->timestamp('admin_requested_at')
                    ->nullable()
                    ->after('admin_requested_by');
            }

            if (! Schema::hasColumn('support_requests', 'admin_processed_by')) {
                $table->unsignedBigInteger('admin_processed_by')
                    ->nullable()
                    ->after('admin_requested_at');
            }

            if (! Schema::hasColumn('support_requests', 'admin_processed_at')) {
                $table->timestamp('admin_processed_at')
                    ->nullable()
                    ->after('admin_processed_by');
            }

            if (! Schema::hasColumn('support_requests', 'customer_has_unread_update')) {
                $table->boolean('customer_has_unread_update')
                    ->default(false)
                    ->after('admin_processed_at');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('support_requests')) {
            return;
        }

        $columns = [
            'needs_more_info',
            'info_request_message',
            'info_requested_at',
            'admin_request_status',
            'admin_request_content',
            'admin_requested_by',
            'admin_requested_at',
            'admin_processed_by',
            'admin_processed_at',
            'customer_has_unread_update',
        ];

        $existingColumns = array_values(array_filter(
            $columns,
            fn (string $column) => Schema::hasColumn('support_requests', $column)
        ));

        if ($existingColumns === []) {
            return;
        }

        Schema::table('support_requests', function (Blueprint $table) use ($existingColumns) {
            $table->dropColumn($existingColumns);
        });
    }
};