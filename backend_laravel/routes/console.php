<?php

use App\Models\DestinationPlace;
use App\Models\TourActivityLog;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('db:backup --scheduled')->everyMinute();
Schedule::command('vnpay:expire-pending-payments')->everyMinute();
Schedule::command('guide-reviews:send-reminders')->hourly()->withoutOverlapping();
Schedule::command('tours:finalize-departures')->everyMinute()->withoutOverlapping();

Schedule::call(function (): void {
    DestinationPlace::onlyTrashed()
        ->where('deleted_at', '<=', now()->subDays(30))
        ->chunkById(100, function ($places): void {
            foreach ($places as $place) {
                $snapshot = [
                    'name' => $place->name,
                    'province' => $place->province?->name,
                    'district' => $place->district_name,
                    'address' => $place->address,
                    'description' => $place->description,
                    'thumbnail_url' => $place->thumbnail_url,
                    'status' => $place->status,
                    'activity_types' => $place->activity_types,
                ];
                $placeId = $place->id;
                $placeName = $place->name;

                DB::transaction(function () use ($place): void {
                    $place->activityTypeLinks()->delete();
                    $place->forceDelete();
                });

                TourActivityLog::record(
                    null,
                    'place_force_deleted',
                    $placeName,
                    'Hệ thống tự động xóa vĩnh viễn điểm đến sau 30 ngày trong thùng rác.',
                    'destination_place',
                    $placeId,
                    [
                        'data' => $snapshot,
                        'automatic' => true,
                        'force_deleted_at' => now()->toIso8601String(),
                    ]
                );
            }
        });
})->dailyAt('02:00')->name('destination-places:purge-trash')->withoutOverlapping();
