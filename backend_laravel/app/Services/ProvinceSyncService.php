<?php

namespace App\Services;

use App\Models\Province;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class ProvinceSyncService
{
    private const ENDPOINT = 'https://provinces.open-api.vn/api/p/';

    /**
     * @return array{created: int, updated: int, skipped: int}
     */
    public function sync(): array
    {
        $response = Http::acceptJson()
            ->connectTimeout(5)
            ->timeout(15)
            ->retry(3, 250, throw: false)
            ->get(self::ENDPOINT);

        if ($response->failed()) {
            throw new RuntimeException('Không thể lấy dữ liệu tỉnh/thành từ Provinces Open API.');
        }

        $provinces = $this->validatedProvinces($response->json());

        return DB::transaction(function () use ($provinces): array {
            $result = ['created' => 0, 'updated' => 0, 'skipped' => 0];

            foreach ($provinces as $provinceData) {
                $province = Province::query()
                    ->where('code', $provinceData['code'])
                    ->first();

                if ($province === null) {
                    $province = Province::query()
                        ->where('name', $provinceData['name'])
                        ->first();
                }

                if ($province === null) {
                    Province::query()->create($provinceData);
                    $result['created']++;

                    continue;
                }

                if ($province->name === $provinceData['name'] && $province->code === $provinceData['code']) {
                    $result['skipped']++;

                    continue;
                }

                $province->update($provinceData);
                $result['updated']++;
            }

            return $result;
        });
    }

    /**
     * @return list<array{code: string, name: string}>
     */
    private function validatedProvinces(mixed $payload): array
    {
        if (! is_array($payload) || $payload === []) {
            throw new RuntimeException('Dữ liệu tỉnh/thành từ Provinces Open API không hợp lệ.');
        }

        $provinces = [];
        $codes = [];
        $names = [];

        foreach ($payload as $province) {
            if (! is_array($province) || ! isset($province['code']) || ! is_string($province['name'] ?? null)) {
                throw new RuntimeException('Dữ liệu tỉnh/thành từ Provinces Open API không hợp lệ.');
            }

            $code = trim((string) $province['code']);
            $name = $this->normalizedName($province['name']);

            if ($code === '' || $name === '' || isset($codes[$code]) || isset($names[$name])) {
                throw new RuntimeException('Dữ liệu tỉnh/thành từ Provinces Open API không hợp lệ.');
            }

            $codes[$code] = true;
            $names[$name] = true;
            $provinces[] = ['code' => $code, 'name' => $name];
        }

        return $provinces;
    }

    private function normalizedName(string $name): string
    {
        return trim((string) preg_replace('/^(Tỉnh|Thành phố)\s+/u', '', trim($name)));
    }
}
