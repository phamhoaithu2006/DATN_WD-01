<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Destination;
use Illuminate\Http\JsonResponse;

class PublicCatalogController extends Controller
{
    public function categories(): JsonResponse
    {
        $categories = Category::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'description', 'status']);

        return response()->json([
            'status' => 'success',
            'data' => $categories,
        ]);
    }

    public function destinations(): JsonResponse
    {
        $destinations = Destination::query()
            ->where('status', 'active')
            ->orderBy('country')
            ->orderBy('province_city')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'slug',
                'province_city',
                'country',
                'thumbnail_url',
                'status',
            ]);

        return response()->json([
            'status' => 'success',
            'data' => $destinations,
        ]);
    }
}
