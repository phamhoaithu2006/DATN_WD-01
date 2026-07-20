<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('db:backup --scheduled')->everyMinute();
Schedule::command('vnpay:expire-pending-payments')->everyMinute();
Schedule::command('guide-reviews:send-reminders')->hourly()->withoutOverlapping();
