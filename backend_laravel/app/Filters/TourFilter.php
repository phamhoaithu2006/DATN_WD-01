<?php

namespace App\Filters;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

/**
 * Bộ lọc thuộc tính tour theo pattern pipeline: mỗi tiêu chí một method.
 * Thêm tiêu chí mới = thêm một method cùng tên camelCase với key filter,
 * không cần sửa controller.
 *
 * Các điều kiện phụ thuộc lịch khởi hành (khoảng ngày, giá bán, số khách)
 * nằm ở TourController::applyDepartureConditions vì dùng chung biểu thức giá.
 */
class TourFilter
{
    /**
     * @param array<string, mixed> $params
     */
    public function __construct(protected array $params) {}

    public function apply(Builder $query): Builder
    {
        foreach ($this->params as $key => $value) {
            if ($value === null || $value === [] || $value === '') {
                continue;
            }

            $method = Str::camel($key);

            if (method_exists($this, $method)) {
                $this->{$method}($query, $value);
            }
        }

        return $query;
    }

    protected function keyword(Builder $query, string $keyword): void
    {
        $like = '%' . $keyword . '%';

        $query->where(function (Builder $subQuery) use ($like) {
            $subQuery
                ->where('tours.title', 'like', $like)
                ->orWhere('tours.summary', 'like', $like)
                ->orWhere('tours.description', 'like', $like)
                ->orWhereHas('category', fn (Builder $q) => $q->where('name', 'like', $like))
                ->orWhereHas('destination', fn (Builder $q) => $q->where('name', 'like', $like))
                ->orWhereHas('destinations', fn (Builder $q) => $q->where('name', 'like', $like));
        });
    }

    /**
     * @param array<int, int> $ids
     */
    protected function categoryIds(Builder $query, array $ids): void
    {
        $query->whereIn('tours.category_id', $ids);
    }

    /**
     * Hỗ trợ cả destination_id cũ trong bảng tours và bảng tour_destinations mới.
     *
     * @param array<int, int> $ids
     */
    protected function destinationIds(Builder $query, array $ids): void
    {
        $query->where(function (Builder $subQuery) use ($ids) {
            $subQuery
                ->whereIn('tours.destination_id', $ids)
                ->orWhereHas('destinations', fn (Builder $q) => $q->whereKey($ids));
        });
    }

    protected function durationDays(Builder $query, int $days): void
    {
        $query->where('tours.duration_days', $days);
    }

    /**
     * @param array<int, string> $buckets Các bucket: 1-3, 4-7, 8+
     */
    protected function durationBuckets(Builder $query, array $buckets): void
    {
        $query->where(function (Builder $subQuery) use ($buckets) {
            foreach ($buckets as $bucket) {
                match ($bucket) {
                    '1-3' => $subQuery->orWhereBetween('tours.duration_days', [1, 3]),
                    '4-7' => $subQuery->orWhereBetween('tours.duration_days', [4, 7]),
                    '8+' => $subQuery->orWhere('tours.duration_days', '>=', 8),
                    default => null,
                };
            }
        });
    }

    protected function ratingMin(Builder $query, int $rating): void
    {
        $query->where('tours.average_rating', '>=', $rating);
    }
}
