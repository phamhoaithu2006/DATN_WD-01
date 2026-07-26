<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TourFilterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Tham số cũ (keyword, category_id, destination_id, duration_days, min_price, max_price,
     * departure_date, start_date) được giữ nguyên để frontend hiện tại không gãy.
     * Tham số mới phục vụ bộ lọc nâng cao: q, price_min/price_max, categories[], destinations[],
     * duration[] (bucket), date_from/date_to, rating_min.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:255'],
            'keyword' => ['nullable', 'string', 'max:255'],

            'price_min' => ['nullable', 'numeric', 'min:0'],
            'price_max' => ['nullable', 'numeric', 'min:0', 'gte:price_min'],
            'min_price' => ['nullable', 'numeric', 'min:0'],
            'max_price' => ['nullable', 'numeric', 'min:0'],

            'category_id' => ['nullable', 'integer', 'min:1'],
            'categories' => ['nullable', 'array'],
            'categories.*' => ['integer', 'min:1'],

            'destination_id' => ['nullable', 'integer', 'min:1'],
            'destinations' => ['nullable', 'array'],
            'destinations.*' => ['integer', 'min:1'],

            'duration_days' => ['nullable', 'integer', 'min:1'],
            'duration' => ['nullable', 'array'],
            'duration.*' => ['in:1-3,4-7,8+'],

            'departure_date' => ['nullable', 'date'],
            'start_date' => ['nullable', 'date'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],

            'rating_min' => ['nullable', 'integer', 'between:1,5'],

            'guests' => ['nullable', 'integer', 'min:1'],
            'min_slots' => ['nullable', 'integer', 'min:1'],

            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],

            'sort' => [
                'nullable',
                'in:latest,newest,price_asc,price_desc,departure_soon,rating_desc,duration_asc,duration_desc,popular',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'price_max.gte' => 'Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.',
            'date_to.after_or_equal' => 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.',
            'rating_min.between' => 'Mức đánh giá phải từ 1 đến 5 sao.',
        ];
    }

    /**
     * Chuẩn hóa toàn bộ tham số (cũ + mới) về một mảng filter thống nhất.
     *
     * @return array<string, mixed>
     */
    public function filters(): array
    {
        $data = $this->validated();

        $keyword = $data['q'] ?? $data['keyword'] ?? null;

        $categoryIds = collect($data['categories'] ?? [])
            ->when(isset($data['category_id']), fn ($ids) => $ids->push($data['category_id']))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $destinationIds = collect($data['destinations'] ?? [])
            ->when(isset($data['destination_id']), fn ($ids) => $ids->push($data['destination_id']))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        return [
            'keyword' => $keyword !== null ? trim($keyword) : null,
            'category_ids' => $categoryIds,
            'destination_ids' => $destinationIds,

            'duration_days' => $data['duration_days'] ?? null,
            'duration_buckets' => array_values(array_unique($data['duration'] ?? [])),

            'departure_date' => $data['departure_date'] ?? $data['start_date'] ?? null,
            'date_from' => $data['date_from'] ?? null,
            'date_to' => $data['date_to'] ?? null,

            'guests' => isset($data['guests']) || isset($data['min_slots'])
                ? (int) ($data['guests'] ?? $data['min_slots'])
                : null,

            // Ép về int để PDO bind PARAM_INT: bind chuỗi/float (PARAM_STR) khi so sánh
            // với biểu thức CASE trên sqlite sẽ so theo thứ tự kiểu (INTEGER < TEXT) và luôn sai.
            'min_price' => isset($data['price_min']) || isset($data['min_price'])
                ? (int) ($data['price_min'] ?? $data['min_price'])
                : null,
            'max_price' => isset($data['price_max']) || isset($data['max_price'])
                ? (int) ($data['price_max'] ?? $data['max_price'])
                : null,

            'rating_min' => isset($data['rating_min']) ? (int) $data['rating_min'] : null,

            'per_page' => (int) ($data['per_page'] ?? 12),
            'sort' => ($data['sort'] ?? 'latest') === 'newest' ? 'latest' : ($data['sort'] ?? 'latest'),
        ];
    }
}
