<?php

namespace App\Services;

use App\Models\Faq;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

class FaqService
{
    /** @return Collection<int, Faq> */
    public function list(array $filters): Collection
    {
        $faqs = Faq::query()
            ->active()
            ->forCategory($filters['category'] ?? null)
            ->ordered()
            ->get([
                'id',
                'category',
                'question',
                'answer',
                'keywords',
                'sort_order',
                'created_at',
                'updated_at',
            ]);

        $search = $this->normalizeSearchText($filters['search'] ?? '');

        if ($search === '') {
            return $faqs;
        }

        return $faqs
            ->filter(fn (Faq $faq): bool => str_contains(
                $this->normalizeSearchText($this->searchableText($faq)),
                $search,
            ))
            ->values();
    }

    /** @return list<array{key: string, label: string}> */
    public function categoryOptions(): array
    {
        return collect(Faq::CATEGORY_LABELS)
            ->map(fn (string $label, string $key): array => compact('key', 'label'))
            ->values()
            ->all();
    }

    private function searchableText(Faq $faq): string
    {
        return implode(' ', [
            $faq->question,
            $faq->answer,
            ...($faq->keywords ?? []),
        ]);
    }

    private function normalizeSearchText(string $value): string
    {
        return Str::squish(Str::ascii(Str::lower($value)));
    }
}
