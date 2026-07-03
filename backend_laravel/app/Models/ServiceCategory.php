<?php

namespace App\Models;

use Database\Factories\ServiceCategoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ServiceCategory extends Model
{
    /** @use HasFactory<ServiceCategoryFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'status' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (ServiceCategory $serviceCategory): void {
            $serviceCategory->slug = self::generateUniqueSlug($serviceCategory->name);
        });

        static::updating(function (ServiceCategory $serviceCategory): void {
            if ($serviceCategory->isDirty('name')) {
                $serviceCategory->slug = self::generateUniqueSlug($serviceCategory->name, $serviceCategory->getKey());
            }
        });
    }

    public static function generateUniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $baseSlug = Str::slug(trim($name));

        if ($baseSlug === '') {
            $baseSlug = 'service-category';
        }

        $slug = $baseSlug;
        $suffix = 2;

        while (
            self::withTrashed()
                ->when($ignoreId !== null, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug = $baseSlug.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }

    public function partners(): HasMany
    {
        return $this->hasMany(Partner::class, 'service_type_id');
    }
}
