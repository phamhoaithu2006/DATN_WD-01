<?php

namespace Database\Factories;

use App\Models\Faq;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Faq>
 */
class FaqFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category' => fake()->randomElement(array_keys(Faq::CATEGORY_LABELS)),
            'question' => fake()->unique()->sentence().'?',
            'answer' => fake()->paragraph(),
            'keywords' => fake()->words(4),
            'sort_order' => fake()->numberBetween(1, 500),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (): array => ['is_active' => false]);
    }

    public function forCategory(string $category): static
    {
        return $this->state(fn (): array => ['category' => $category]);
    }
}
