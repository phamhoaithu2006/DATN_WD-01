<?php

namespace Database\Factories;

use App\Models\TourReview;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TourReview>
 */
class TourReviewFactory extends Factory
{
    public function definition(): array
    {
        return [
            'rating' => fake()->numberBetween(1, 5),
            'comment' => fake()->sentence(),
            'status' => 'visible',
        ];
    }
}
