<?php

namespace App\Console\Commands;

use App\Jobs\DeliverTourFinalizationOutbox;
use App\Models\TourDeparture;
use App\TourFinalizationService;
use Illuminate\Console\Command;

class FinalizeTourDepartures extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tours:finalize-departures';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Confirm or cancel departures when their 72-hour booking cutoff is reached.';

    /**
     * Execute the console command.
     */
    public function handle(TourFinalizationService $service): int
    {
        $dueDepartures = TourDeparture::query()
            ->where('status', 'open')
            ->where(function ($query): void {
                $query
                    ->where('departure_at', '<=', now()->addHours(72))
                    // Dữ liệu cũ chưa có departure_at vẫn phải được chốt theo
                    // ngày khởi hành, tránh bị coi là tour đang diễn ra khi 0 khách.
                    ->orWhere(function ($legacyQuery): void {
                        $legacyQuery->whereNull('departure_at')
                            ->whereDate('departure_date', '<=', now()->addDays(3)->toDateString());
                    });
            })
            ->orderBy('id')
            ->get();

        $finalized = 0;
        foreach ($dueDepartures as $departure) {
            $outbox = $service->finalize($departure);
            if (! $outbox) {
                continue;
            }

            DeliverTourFinalizationOutbox::dispatch($outbox->id)->afterCommit();
            $finalized++;
        }

        $this->info("Finalized {$finalized} tour departure(s).");

        return self::SUCCESS;
    }
}
