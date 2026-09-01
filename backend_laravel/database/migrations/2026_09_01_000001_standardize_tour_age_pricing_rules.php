<?php

use App\Models\TourAgePricingRule;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        foreach (DB::table('tours')->pluck('id') as $tourId) {
            $existingRules = DB::table('tour_age_pricing_rules')
                ->where('tour_id', $tourId)
                ->orderBy('id')
                ->get();
            $keptRuleIds = [];

            foreach (TourAgePricingRule::standardDefinitions() as $definition) {
                $candidate = $existingRules->first(function ($rule) use ($definition, $keptRuleIds): bool {
                    $maxAgeMatches = ($rule->max_age === null && $definition['max_age'] === null)
                        || (int) $rule->max_age === (int) $definition['max_age'];

                    return ! in_array((int) $rule->id, $keptRuleIds, true)
                        && (int) $rule->min_age === (int) $definition['min_age']
                        && $maxAgeMatches;
                });

                $ruleData = [
                    'label' => $definition['label'],
                    'min_age' => $definition['min_age'],
                    'max_age' => $definition['max_age'],
                    'pricing_type' => $definition['pricing_type'],
                    'price_value' => $definition['price_value'],
                    'sort_order' => $definition['sort_order'],
                    'is_active' => $definition['is_active'],
                    'updated_at' => $now,
                ];

                if ($candidate) {
                    DB::table('tour_age_pricing_rules')
                        ->where('id', $candidate->id)
                        ->update($ruleData);
                    $keptRuleIds[] = (int) $candidate->id;

                    continue;
                }

                $keptRuleIds[] = (int) DB::table('tour_age_pricing_rules')->insertGetId([
                    'tour_id' => $tourId,
                    ...$ruleData,
                    'created_at' => $now,
                ]);
            }

            DB::table('tour_age_pricing_rules')
                ->where('tour_id', $tourId)
                ->whereNotIn('id', $keptRuleIds)
                ->update([
                    'is_active' => false,
                    'updated_at' => $now,
                ]);
        }
    }

    public function down(): void
    {
        // Không khôi phục hoặc xóa rule cũ để bảo toàn dữ liệu nghiệp vụ.
    }
};
