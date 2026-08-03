<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('customer-booking-create', function (Request $request): Limit {
            return Limit::perMinute(3)->by('booking-create:'.($request->user()?->id ?? $request->ip()));
        });

        RateLimiter::for('customer-booking-payment', function (Request $request): Limit {
            $booking = $request->route('booking');
            $bookingId = is_object($booking) && method_exists($booking, 'getKey')
                ? $booking->getKey()
                : $booking;

            return Limit::perMinute(5)->by('booking-payment:'
                .($request->user()?->id ?? $request->ip())
                .':'.$bookingId);
        });
    }
}
