<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminGuideActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $activities = Notification::query()
            ->with(['user:id,full_name,email,avatar_url', 'user.guide:id,user_id,guide_code'])
            ->whereHas('user.guide')
            ->when($request->filled('guide_id'), function ($query) use ($request) {
                $query->whereHas('user.guide', fn ($guideQuery) => $guideQuery->whereKey($request->integer('guide_id')));
            })
            ->when($request->filled('search'), function ($query) use ($request) {
                $keyword = trim((string) $request->input('search'));

                $query->where(function ($activityQuery) use ($keyword) {
                    $activityQuery
                        ->where('title', 'like', "%{$keyword}%")
                        ->orWhere('message', 'like', "%{$keyword}%")
                        ->orWhereHas('user', function ($userQuery) use ($keyword) {
                            $userQuery
                                ->where('full_name', 'like', "%{$keyword}%")
                                ->orWhere('email', 'like', "%{$keyword}%");
                        });
                });
            })
            ->latest('created_at')
            ->latest('id')
            ->paginate(min(max($request->integer('per_page', 20), 1), 100));

        $activities->setCollection($activities->getCollection()->map(function (Notification $activity) {
            return [
                'id' => $activity->id,
                'guide_id' => $activity->user?->guide?->id,
                'guide_code' => $activity->user?->guide?->guide_code,
                'guide_name' => $activity->user?->full_name,
                'guide_email' => $activity->user?->email,
                'guide_avatar' => $activity->user?->avatar_url,
                'title' => $activity->title,
                'message' => $activity->message,
                'type' => $activity->type,
                'status' => $activity->status,
                'created_at' => $activity->created_at?->toDateTimeString(),
            ];
        }));

        return response()->json([
            'message' => 'Lịch sử thao tác của hướng dẫn viên.',
            'data' => $activities,
        ]);
    }
}
