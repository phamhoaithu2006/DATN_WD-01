<?php

namespace Database\Seeders;

use App\Models\TourDeparture;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class GuideReplacementRequestSeeder extends Seeder
{
    public const SEED_KEY = 'guide-replacement-pending';

    public const SEED_REASON = 'HDV cần đổi lịch cá nhân và đề nghị Admin bố trí người thay thế phù hợp.';

    public function run(): void
    {
        DB::transaction(function (): void {
            if ($this->findSeededRequest()) {
                return;
            }

            $candidate = $this->resolveCandidate();

            DB::table('guide_replacement_requests')->insert([
                'tour_departure_id' => $candidate['departure']->id,
                'current_guide_id' => $candidate['guide']->id,
                'requested_by' => $candidate['guide']->user_id,
                'reason' => self::SEED_REASON,
                'evidence_path' => null,
                'status' => 'pending',
                'replacement_guide_id' => null,
                'reviewed_by' => null,
                'reviewed_at' => null,
                'admin_note' => null,
                'created_at' => now()->subHour(),
                'updated_at' => now()->subHour(),
            ]);
        });
    }

    private function findSeededRequest(): ?object
    {
        return DB::table('guide_replacement_requests')
            ->where('reason', self::SEED_REASON)
            ->orderByDesc('id')
            ->first();
    }

    /**
     * @return array{departure: TourDeparture, guide: object}
     */
    private function resolveCandidate(): array
    {
        $departures = TourDeparture::query()
            ->whereDate('departure_date', '>', today()->toDateString())
            ->whereIn('status', ['open', 'confirmed', 'in_progress'])
            ->with([
                'guideAssignments' => fn ($query) => $query
                    ->where('status', 'assigned')
                    ->orderBy('id'),
                'guideAssignments.guide.user',
            ])
            ->orderBy('departure_date')
            ->orderBy('id')
            ->get();

        foreach ($departures as $departure) {
            $assignment = $departure->guideAssignments->first();
            $guide = $assignment?->guide;

            if (! $guide || ! $guide->user || ! $guide->user_id) {
                continue;
            }

            $hasExistingRequest = DB::table('guide_replacement_requests')
                ->where('tour_departure_id', $departure->id)
                ->where('current_guide_id', $guide->id)
                ->exists();

            if ($hasExistingRequest) {
                continue;
            }

            return [
                'departure' => $departure,
                'guide' => $guide,
            ];
        }

        throw new RuntimeException(
            'Không thể seed yêu cầu đổi HDV vì chưa có lịch tương lai được phân công HDV và chưa có yêu cầu trùng.'
        );
    }
}
