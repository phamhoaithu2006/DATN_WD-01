<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class PublicSettingController extends Controller
{
    public function show(): JsonResponse
    {
        $settings = Setting::query()
            ->whereIn('key', Setting::ALLOWED_KEYS)
            ->pluck('value', 'key')
            ->toArray();

        $data = collect(Setting::ALLOWED_KEYS)
            ->mapWithKeys(fn (string $key) => [$key => $settings[$key] ?? null])
            ->toArray();

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy cấu hình hiển thị thành công',
            'data' => $data,
        ]);
    }
}
