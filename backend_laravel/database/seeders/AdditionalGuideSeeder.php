<?php

namespace Database\Seeders;

use App\Models\Guide;
use App\Models\GuideSpecialization;
use App\Models\Language;
use App\Models\LanguageLevel;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdditionalGuideSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $guideRole = Role::query()->where('name', 'tour guide')->firstOrFail();
        $specializations = GuideSpecialization::query()->pluck('id', 'name');
        $languages = Language::query()->get()->keyBy('name');

        $guides = [
            ['code' => 'HDV005', 'name' => 'Nguyễn Minh Tuấn', 'email' => 'tuan.nm@vivugo.vn', 'phone' => '0912200005', 'years' => 6, 'specializations' => ['Nội địa'], 'languages' => [['Tiếng Anh', 'C1']]],
            ['code' => 'HDV006', 'name' => 'Trần Thu Hà', 'email' => 'ha.tt@vivugo.vn', 'phone' => '0912200006', 'years' => 4, 'specializations' => ['Nội địa', 'Quốc tế'], 'languages' => [['Tiếng Anh', 'B2'], ['Tiếng Trung', 'HSK4']]],
            ['code' => 'HDV007', 'name' => 'Lê Quốc Bảo', 'email' => 'bao.lq@vivugo.vn', 'phone' => '0912200007', 'years' => 7, 'specializations' => ['Quốc tế'], 'languages' => [['Tiếng Anh', 'C1'], ['Tiếng Pháp', 'B1']]],
            ['code' => 'HDV008', 'name' => 'Phạm Ngọc Lan', 'email' => 'lan.pn@vivugo.vn', 'phone' => '0912200008', 'years' => 3, 'specializations' => ['Nội địa'], 'languages' => [['Tiếng Anh', 'B2']]],
            ['code' => 'HDV009', 'name' => 'Võ Hoàng Nam', 'email' => 'nam.vh@vivugo.vn', 'phone' => '0912200009', 'years' => 9, 'specializations' => ['Nội địa', 'Quốc tế'], 'languages' => [['Tiếng Anh', 'C2'], ['Tiếng Trung', 'HSK5']]],
            ['code' => 'HDV010', 'name' => 'Đặng Thùy Linh', 'email' => 'linh.dt@vivugo.vn', 'phone' => '0912200010', 'years' => 5, 'specializations' => ['Quốc tế'], 'languages' => [['Tiếng Anh', 'C1'], ['Tiếng Pháp', 'B2']]],
            ['code' => 'HDV011', 'name' => 'Bùi Đức Long', 'email' => 'long.bd@vivugo.vn', 'phone' => '0912200011', 'years' => 8, 'specializations' => ['Nội địa'], 'languages' => [['Tiếng Anh', 'B2']]],
            ['code' => 'HDV012', 'name' => 'Đỗ Mai Phương', 'email' => 'phuong.dm@vivugo.vn', 'phone' => '0912200012', 'years' => 2, 'specializations' => ['Nội địa', 'Quốc tế'], 'languages' => [['Tiếng Anh', 'C1'], ['Tiếng Trung', 'HSK3']]],
            ['code' => 'HDV013', 'name' => 'Hồ Thanh Sơn', 'email' => 'son.ht@vivugo.vn', 'phone' => '0912200013', 'years' => 11, 'specializations' => ['Quốc tế'], 'languages' => [['Tiếng Anh', 'C2'], ['Tiếng Pháp', 'C1']]],
            ['code' => 'HDV014', 'name' => 'Ngô Khánh Vy', 'email' => 'vy.nk@vivugo.vn', 'phone' => '0912200014', 'years' => 4, 'specializations' => ['Nội địa'], 'languages' => [['Tiếng Anh', 'B2'], ['Tiếng Trung', 'HSK4']]],
        ];

        foreach ($guides as $data) {
            $user = User::withTrashed()->updateOrCreate(
                ['email' => $data['email']],
                [
                    'role_id' => $guideRole->id,
                    'full_name' => $data['name'],
                    'phone' => $data['phone'],
                    'password' => Hash::make('Guide@123'),
                    'status' => 'active',
                ]
            );
            $user->restore();

            $guide = Guide::withTrashed()->updateOrCreate(
                ['guide_code' => $data['code']],
                [
                    'user_id' => $user->id,
                    'experience_years' => $data['years'],
                    'average_rating' => 0,
                    'review_count' => 0,
                    'status' => 'active',
                ]
            );
            $guide->restore();

            $specializationIds = collect($data['specializations'])
                ->map(fn (string $name) => $specializations->get($name))
                ->filter()
                ->values()
                ->all();
            $guide->specializations()->sync($specializationIds);

            $guide->languages()->delete();
            foreach ($data['languages'] as [$languageName, $levelName]) {
                $language = $languages->get($languageName);

                if (! $language) {
                    continue;
                }

                $level = LanguageLevel::query()
                    ->where('language_id', $language->id)
                    ->where('level_name', $levelName)
                    ->first();

                if ($level) {
                    $guide->languages()->create([
                        'language_id' => $language->id,
                        'level_id' => $level->id,
                    ]);
                }
            }
        }
    }
}
