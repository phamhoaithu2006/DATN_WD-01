<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Banner extends Model
{
    public const TYPES = ['image', 'html'];

    public const POSITIONS = [
        'home_hero',
        'home_middle',
        'tour_detail',
        'sidebar',
        'footer',
    ];

    public const DISPLAY_PAGES = [
        'home',
        'tour_detail',
        'other',
    ];

    protected $fillable = [
        'title',
        'display_title',
        'type',
        'image_url',
        'html_content',
        'link_url',
        'position',
        'display_pages',
        'sort_order',
        'start_date',
        'end_date',
        'status',
    ];

    protected $casts = [
        'display_pages' => 'array',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
    ];

    public function scopeVisible(Builder $query): Builder
    {
        $now = now();

        return $query
            ->where('status', 'active')
            ->where(function (Builder $dateQuery) use ($now) {
                $dateQuery->whereNull('start_date')
                    ->orWhere('start_date', '<=', $now);
            })
            ->where(function (Builder $dateQuery) use ($now) {
                $dateQuery->whereNull('end_date')
                    ->orWhere('end_date', '>=', $now);
            });
    }
}
