<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('partners') || ! Schema::hasTable('service_categories')) {
            return;
        }

        $idMap = $this->copyPartnerTypesToServiceCategories();

        $this->dropPartnersServiceTypeForeign();
        $this->remapPartners($idMap);
        $this->addPartnersServiceCategoryForeign();
    }

    public function down(): void
    {
        if (! Schema::hasTable('partners') || ! Schema::hasTable('partner_service_types')) {
            return;
        }

        $idMap = $this->copyServiceCategoriesToPartnerTypes();

        $this->dropPartnersServiceTypeForeign();
        $this->remapPartners($idMap);
        $this->addPartnersPartnerServiceTypeForeign();
    }

    /**
     * @return array<int, int>
     */
    private function copyPartnerTypesToServiceCategories(): array
    {
        if (! Schema::hasTable('partner_service_types')) {
            return [];
        }

        $map = [];

        DB::table('partner_service_types')
            ->orderBy('id')
            ->get()
            ->each(function (object $type) use (&$map): void {
                $serviceCategory = DB::table('service_categories')
                    ->where('slug', $type->slug)
                    ->orWhere('name', $type->name)
                    ->first();

                if (! $serviceCategory) {
                    $id = DB::table('service_categories')->insertGetId([
                        'name' => $type->name,
                        'slug' => $type->slug,
                        'description' => null,
                        'status' => true,
                        'created_at' => $type->created_at ?? now(),
                        'updated_at' => $type->updated_at ?? now(),
                        'deleted_at' => null,
                    ]);
                } else {
                    $id = (int) $serviceCategory->id;
                }

                $map[(int) $type->id] = $id;
            });

        return $map;
    }

    /**
     * @return array<int, int>
     */
    private function copyServiceCategoriesToPartnerTypes(): array
    {
        $map = [];

        DB::table('service_categories')
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->get()
            ->each(function (object $category) use (&$map): void {
                $partnerType = DB::table('partner_service_types')
                    ->where('slug', $category->slug)
                    ->orWhere('name', $category->name)
                    ->first();

                if (! $partnerType) {
                    $id = DB::table('partner_service_types')->insertGetId([
                        'name' => $category->name,
                        'slug' => $category->slug,
                        'created_at' => $category->created_at ?? now(),
                        'updated_at' => $category->updated_at ?? now(),
                    ]);
                } else {
                    $id = (int) $partnerType->id;
                }

                $map[(int) $category->id] = $id;
            });

        return $map;
    }

    /**
     * @param  array<int, int>  $idMap
     */
    private function remapPartners(array $idMap): void
    {
        if (! Schema::hasColumn('partners', 'service_type_id')) {
            return;
        }

        foreach ($idMap as $fromId => $toId) {
            DB::table('partners')
                ->where('service_type_id', $fromId)
                ->update(['service_type_id' => $toId]);
        }
    }

    private function dropPartnersServiceTypeForeign(): void
    {
        if (DB::getDriverName() === 'sqlite' || ! Schema::hasColumn('partners', 'service_type_id')) {
            return;
        }

        Schema::table('partners', function (Blueprint $table): void {
            $table->dropForeign(['service_type_id']);
        });
    }

    private function addPartnersServiceCategoryForeign(): void
    {
        if (DB::getDriverName() === 'sqlite' || ! Schema::hasColumn('partners', 'service_type_id')) {
            return;
        }

        Schema::table('partners', function (Blueprint $table): void {
            $table->foreign('service_type_id')
                ->references('id')
                ->on('service_categories')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });
    }

    private function addPartnersPartnerServiceTypeForeign(): void
    {
        if (DB::getDriverName() === 'sqlite' || ! Schema::hasColumn('partners', 'service_type_id')) {
            return;
        }

        Schema::table('partners', function (Blueprint $table): void {
            $table->foreign('service_type_id')
                ->references('id')
                ->on('partner_service_types')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });
    }
};
