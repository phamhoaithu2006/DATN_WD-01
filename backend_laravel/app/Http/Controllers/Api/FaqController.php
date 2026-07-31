<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IndexFaqRequest;
use App\Http\Resources\FaqResource;
use App\Services\FaqService;
use Illuminate\Http\JsonResponse;

class FaqController extends Controller
{
    public function __construct(private readonly FaqService $faqService) {}

    public function index(IndexFaqRequest $request): JsonResponse
    {
        $faqs = $this->faqService->list($request->validated());

        return response()->json([
            'success' => true,
            'message' => $faqs->isEmpty()
                ? 'Không tìm thấy câu hỏi thường gặp phù hợp.'
                : 'Danh sách câu hỏi thường gặp.',
            'data' => [
                'items' => FaqResource::collection($faqs)->resolve($request),
                'categories' => $this->faqService->categoryOptions(),
                'total' => $faqs->count(),
            ],
        ]);
    }
}
