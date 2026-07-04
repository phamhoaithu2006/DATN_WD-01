<?php

namespace App\Services;

use App\Models\Tour;
use App\Models\TourAgePricingRule;
use App\Models\TourDeparture;
use Carbon\CarbonInterface;

class TourPricingService
{
    public function resolveAdultPrice(Tour $tour, ?TourDeparture $departure = null): float
    {
        if ($departure && $departure->price !== null) {
            return (float) $departure->price;
        }

        if ($tour->discount_price !== null) {
            return (float) $tour->discount_price;
        }

        return (float) $tour->base_price;
    }

    public function resolveRuleForAge(Tour $tour, int $age): ?TourAgePricingRule
    {
        $rules = $tour->relationLoaded('agePricingRules')
            ? $tour->agePricingRules
            : $tour->agePricingRules()->where('is_active', true)->get();

        return $rules
            ->filter(fn (TourAgePricingRule $rule) => $rule->is_active)
            ->first(function (TourAgePricingRule $rule) use ($age) {
                if ($age < $rule->min_age) {
                    return false;
                }

                if ($rule->max_age !== null && $age > $rule->max_age) {
                    return false;
                }

                return true;
            });
    }

    public function calculateParticipantPrice(
        Tour $tour,
        ?TourDeparture $departure,
        CarbonInterface $birthDate,
        ?CarbonInterface $travelDate = null
    ): array {
        $travelDate ??= $departure?->departure_date ?? now();
        $adultPrice = $this->resolveAdultPrice($tour, $departure);
        $age = (int) $birthDate->diffInYears($travelDate);
        $rule = $this->resolveRuleForAge($tour, $age);

        if (! $rule) {
            return [
                'age' => $age,
                'adult_price' => $adultPrice,
                'unit_price' => $adultPrice,
                'rule' => null,
            ];
        }

        $unitPrice = match ($rule->pricing_type) {
            'free' => 0.0,
            'fixed' => (float) $rule->price_value,
            default => round($adultPrice * ((float) $rule->price_value) / 100, 2),
        };

        return [
            'age' => $age,
            'adult_price' => $adultPrice,
            'unit_price' => $unitPrice,
            'rule' => $rule,
        ];
    }
}
