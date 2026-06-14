<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicWidgetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'position' => ['nullable', 'string'],
            'page' => ['nullable', 'string'],
        ]);

        $widgets = Banner::query()
            ->visible()
            ->when($request->position, fn ($query) => $query->where('position', $request->position))
            ->when($request->page, function ($query) use ($request) {
                $query->where(function ($pageQuery) use ($request) {
                    $pageQuery->whereNull('display_pages')
                        ->orWhereJsonLength('display_pages', 0)
                        ->orWhereJsonContains('display_pages', $request->page);
                });
            })
            ->orderBy('sort_order')
            ->latest('id')
            ->get();

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách widget hiển thị thành công',
            'data' => $widgets,
        ]);
    }
}
