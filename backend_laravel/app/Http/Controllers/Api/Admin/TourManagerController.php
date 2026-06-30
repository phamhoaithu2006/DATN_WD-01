<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\TourResource;
use App\Models\Tour;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TourManagerController extends Controller
{
    /**
     * 1. API Quản lý danh sách tour (Admin)
     * Yêu cầu: Không hiển thị tour bị ẩn + Tích hợp Lọc & Tìm kiếm
     */
    public function index(Request $request)
    {
        // Loại trừ tour bị ẩn
        $query = Tour::with(['category', 'destination', 'itineraries.images'])
            ->where('status', '!=', 'hidden');

        //  1. ADMIN TÌM KIẾM: Theo tiêu đề tour (title)
        if ($request->has('search') && $request->search != '') {
            $query->where('title', 'LIKE', '%'.$request->search.'%');
        }

        //  2. ADMIN LỌC TRẠNG THÁI: Lọc nhanh theo 'draft', 'published', 'cancelled'
        if ($request->has('status') && $request->status != '') {
            $query->where('status', $request->status);
        }

        //  3. ADMIN LỌC KHOẢNG GIÁ: Lọc theo khoảng giá base_price
        if ($request->has('price_from') && $request->price_from != '') {
            $query->where('base_price', '>=', $request->price_from);
        }
        if ($request->has('price_to') && $request->price_to != '') {
            $query->where('base_price', '<=', $request->price_to);
        }

        // Giữ nguyên logic sắp xếp và phân trang theo ID giảm dần của bạn
        $tours = $query->orderBy('id', 'desc')->paginate(10);
        $tours->getCollection()->transform(fn($tour) => (new TourResource($tour))->resolve($request));

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách quản lý tour thành công',
            'data' => $tours,
        ]);
    }

    /**
     * 2. API Hiển thị tất cả danh sách tour (User)
     * Chỉ lấy danh sách tour chưa ẩn và đã được published + Tích hợp Lọc & Tìm kiếm
     */
    /**
     * API Xem chi tiết một tour (Admin)
     */
    public function show($id)
    {
        $tour = Tour::with(['category', 'destination', 'itineraries.images', 'departures'])
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy chi tiết tour thành công',
            'data' => new TourResource($tour),
        ]);
    }

    public function publicIndex(Request $request)
    {
        //  Chỉ lấy các tour đã xuất bản (published)
        $query = Tour::with(['category', 'destination', 'itineraries.images'])
            ->where('status', 'published');

        //  1. USER TÌM KIẾM: Tìm theo tiêu đề tour
        if ($request->has('search') && $request->search != '') {
            $query->where('title', 'LIKE', '%'.$request->search.'%');
        }

        //  2. USER LỌC KHOẢNG GIÁ: Tìm theo ngân sách của khách
        if ($request->has('price_from') && $request->price_from != '') {
            $query->where('base_price', '>=', $request->price_from);
        }
        if ($request->has('price_to') && $request->price_to != '') {
            $query->where('base_price', '<=', $request->price_to);
        }

        // Giữ nguyên logic sắp xếp và phân trang theo ID giảm dần của bạn
        $tours = $query->orderBy('id', 'desc')->paginate(10);
        $tours->getCollection()->transform(fn($tour) => (new TourResource($tour))->resolve($request));

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách tour thành công',
            'data' => $tours,
        ]);
    }

    /**
     * 3. API Thêm tour
     */
    public function store(Request $request)
    {
        $this->normalizeItineraryRequest($request);

        $validatedData = $request->validate([
            'category_id' => 'required|integer',
            'destination_id' => 'required|integer',
            'title' => 'required|string|max:255',
            'summary' => 'nullable|string|max:500',
            'description' => 'nullable|string',

            'itinerary' => 'nullable|array',
            'itinerary.*.day_number' => 'required|integer|min:1',
            'itinerary.*.sort_order' => 'nullable|integer|min:0',
            'itinerary.*.type' => 'required|string|in:departure,transport,sightseeing,meal,free_time,return',
            'itinerary.*.title' => 'required|string|max:255',
            'itinerary.*.start_time' => 'nullable|date_format:H:i',
            'itinerary.*.end_time' => 'nullable|date_format:H:i',
            'itinerary.*.duration' => 'nullable|string|max:100',
            'itinerary.*.transport' => 'nullable|string|max:255',
            'itinerary.*.description' => 'nullable|string',

            'itinerary.*.images' => 'nullable|array',
            'itinerary.*.images.*.image_url' => 'required_with:itinerary.*.images|string|max:500',
            'itinerary.*.images.*.alt_text' => 'nullable|string|max:255',
            'itinerary.*.images.*.sort_order' => 'nullable|integer|min:0',

            'duration_days' => 'required|integer',
            'duration_nights' => 'required|integer',
            'base_price' => 'required|numeric',
            'max_slots' => 'required|integer',
            'status' => 'required|in:draft,published,hidden,cancelled',
        ]);

        // Lấy user đang đăng nhập qua token Sanctum
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Bạn chưa đăng nhập hoặc token đã hết hạn.',
            ], 401);
        }

        // Backend tự gắn người tạo tour
        $validatedData['created_by'] = $user->id;

        $validatedData['slug'] = $request->slug
            ?? Str::slug($validatedData['title']);

        $validatedData['available_slots'] = $request->available_slots
            ?? $validatedData['max_slots'];

        $itineraryData = $validatedData['itinerary'] ?? [];
        unset($validatedData['itinerary']);

        $tour = DB::transaction(function () use ($validatedData, $itineraryData) {
            $tour = Tour::create($validatedData);

            $this->syncItineraries($tour, $itineraryData);

            return $tour;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Thêm tour thành công',
            'data' => new TourResource($tour->load(['category', 'destination', 'itineraries.images']))
        ], 201);
    }

    /**
     * 4. API Sửa tour
     */
    public function update(Request $request, $id)
    {
        $tour = Tour::findOrFail($id);
        $this->normalizeItineraryRequest($request);

        $validatedData = $request->validate([
            'category_id' => 'sometimes|required|integer',
            'destination_id' => 'sometimes|required|integer',
            'title' => 'sometimes|required|string|max:255',
            'summary' => 'nullable|string|max:500',
            'description' => 'nullable|string',
            'itinerary' => 'nullable|array',
            'itinerary.*.day_number' => 'required|integer|min:1',
            'itinerary.*.sort_order' => 'nullable|integer|min:0',
            'itinerary.*.type' => 'required|string|in:departure,transport,sightseeing,meal,free_time,return',
            'itinerary.*.title' => 'required|string|max:255',
            'itinerary.*.start_time' => 'nullable|date_format:H:i',
            'itinerary.*.end_time' => 'nullable|date_format:H:i',
            'itinerary.*.duration' => 'nullable|string|max:100',
            'itinerary.*.transport' => 'nullable|string|max:255',
            'itinerary.*.description' => 'nullable|string',
            'itinerary.*.images' => 'nullable|array',
            'itinerary.*.images.*.image_url' => 'required_with:itinerary.*.images|string|max:500',
            'itinerary.*.images.*.alt_text' => 'nullable|string|max:255',
            'itinerary.*.images.*.sort_order' => 'nullable|integer|min:0',
            'duration_days' => 'sometimes|required|integer',
            'duration_nights' => 'sometimes|required|integer',
            'base_price' => 'sometimes|required|numeric',
            'discount_price' => 'nullable|numeric',
            'max_slots' => 'sometimes|required|integer',
            'available_slots' => 'nullable|integer',
            'status' => 'sometimes|required|in:draft,published,hidden,cancelled',
        ]);

        if (isset($validatedData['title']) && ! $request->has('slug')) {
            $validatedData['slug'] = Str::slug($validatedData['title']);
        }

        if (
            ! isset($validatedData['available_slots']) &&
            isset($validatedData['max_slots'])
        ) {
            $validatedData['available_slots'] = $validatedData['max_slots'];
        }

        $itineraryData = $validatedData['itinerary'] ?? [];
        $shouldSyncItinerary = $request->exists('itinerary');
        unset($validatedData['itinerary']);

        DB::transaction(function () use ($tour, $validatedData, $itineraryData, $shouldSyncItinerary) {
            $tour->update($validatedData);

            if ($shouldSyncItinerary) {
                $this->syncItineraries($tour, $itineraryData);
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật tour thành công',
            'data' => new TourResource($tour->fresh(['category', 'destination', 'itineraries.images'])),
        ]);
    }

    /**
     * 5. API Xóa tour (Soft Delete)
     */
    public function destroy($id)
    {
        $tour = Tour::findOrFail($id);
        $tour->delete(); // Chạy soft delete do Model có cấu hình SoftDeletes

        return response()->json([
            'status' => 'success',
            'message' => 'Đã xóa tour thành công',
        ]);
    }

    /**
     * 6. API Ẩn tour
     * Cập nhật trạng thái thành 'hidden'. Sẽ không hiện trong danh sách Admin (index) và User (publicIndex).
     */
    public function hide($id)
    {
        $tour = Tour::findOrFail($id);
        $tour->update(['status' => 'hidden']);

        return response()->json([
            'status' => 'success',
            'message' => 'Đã ẩn tour thành công',
            'data' => new TourResource($tour->fresh(['category', 'destination', 'itineraries.images'])),
        ]);
    }

    /**
     * 7. API Hiển thị lại tour bị ẩn
     * Cập nhật trạng thái từ 'hidden' sang 'published' (hoặc 'draft' tùy logic của bạn).
     */
    public function unhide($id)
    {
        $tour = Tour::findOrFail($id);

        if ($tour->status !== 'hidden') {
            return response()->json([
                'status' => 'error',
                'message' => 'Tour này hiện không bị ẩn',
            ], 400);
        }

        $tour->update(['status' => 'published']); // Hoặc 'draft'

        return response()->json([
            'status' => 'success',
            'message' => 'Đã bỏ ẩn tour thành công',
            'data' => new TourResource($tour->fresh(['category', 'destination', 'itineraries.images'])),
        ]);
    }

    /**
     * 8. API Hiển thị tất cả tour bị ẩn
     */
    public function hiddenTours()
    {
        $tours = Tour::with(['category', 'destination', 'itineraries.images'])
            ->where('status', 'hidden')
            ->orderBy('id', 'desc')
            ->paginate(10);
        $tours->getCollection()->transform(fn($tour) => (new TourResource($tour))->resolve(request()));

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách tour bị ẩn thành công',
            'data' => $tours,
        ]);
    }

    public function statistics(Request $request)
    {
        $year = $request->input('year', Carbon::now()->year);
        $baseQuery = Tour::query()->withoutTrashed();

        $totals = (clone $baseQuery)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published")
            ->selectRaw("SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft")
            ->selectRaw("SUM(CASE WHEN status = 'hidden' THEN 1 ELSE 0 END) as hidden")
            ->selectRaw("SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled")
            ->selectRaw('COALESCE(AVG(base_price), 0) as average_price')
            ->selectRaw('COALESCE(AVG(average_rating), 0) as average_rating')
            ->first();

        $topTours = DB::table('bookings')
            ->join('tours', 'bookings.tour_id', '=', 'tours.id')
            ->leftJoin('destinations', 'tours.destination_id', '=', 'destinations.id')
            ->select(
                'tours.id',
                'tours.title',
                'tours.slug',
                'tours.status',
                'tours.base_price',
                'tours.average_rating',
                'tours.review_count',
                'destinations.name as destination_name',
                'destinations.province_city',
                DB::raw('COUNT(bookings.id) as total_bookings'),
                DB::raw('SUM(bookings.total_amount) as total_revenue'),
                DB::raw('SUM(bookings.number_of_people) as total_guests')
            )
            ->whereYear('bookings.created_at', $year)
            ->where('bookings.status', '!=', 'cancelled')
            ->groupBy(
                'tours.id',
                'tours.title',
                'tours.slug',
                'tours.status',
                'tours.base_price',
                'tours.average_rating',
                'tours.review_count',
                'destinations.name',
                'destinations.province_city'
            )
            ->orderByDesc('total_bookings')
            ->limit(5)
            ->get();

        $recentTours = (clone $baseQuery)
            ->with(['category:id,name', 'destination:id,name,province_city'])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get([
                'id',
                'title',
                'slug',
                'status',
                'base_price',
                'average_rating',
                'review_count',
                'category_id',
                'destination_id',
                'created_at',
            ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy thống kê tour thành công',
            'data' => [
                'year' => (int) $year,
                'total' => (int) ($totals->total ?? 0),
                'published' => (int) ($totals->published ?? 0),
                'draft' => (int) ($totals->draft ?? 0),
                'hidden' => (int) ($totals->hidden ?? 0),
                'cancelled' => (int) ($totals->cancelled ?? 0),
                'average_price' => (float) ($totals->average_price ?? 0),
                'average_rating' => round((float) ($totals->average_rating ?? 0), 2),
                'top_tours' => $topTours,
                'recent_tours' => $recentTours,
            ],
        ]);
    }

    private function normalizeItineraryRequest(Request $request): void
    {
        if (! $request->exists('itinerary')) {
            return;
        }

        $itinerary = $request->input('itinerary');

        if (is_string($itinerary)) {
            $decoded = json_decode($itinerary, true);
            $itinerary = json_last_error() === JSON_ERROR_NONE ? $decoded : $itinerary;
        }

        if (! is_array($itinerary)) {
            return;
        }

        $normalized = collect($itinerary)->map(function ($item, $index) {
            if (! is_array($item)) {
                return $item;
            }

            if (! isset($item['day_number']) && isset($item['day'])) {
                $item['day_number'] = $item['day'];
            }

            $item['sort_order'] = $item['sort_order'] ?? $index;

            if (isset($item['images']) && is_array($item['images'])) {
                $item['images'] = collect($item['images'])->map(function ($image, $imageIndex) {
                    if (is_string($image)) {
                        return [
                            'image_url' => $image,
                            'sort_order' => $imageIndex,
                        ];
                    }

                    if (is_array($image)) {
                        $image['sort_order'] = $image['sort_order'] ?? $imageIndex;
                    }

                    return $image;
                })->all();
            }

            return $item;
        })->all();

        $request->merge(['itinerary' => $normalized]);
    }

    private function syncItineraries(Tour $tour, array $itineraries): void
    {
        $tour->itineraries()->delete();

        foreach ($itineraries as $index => $item) {
            $images = $item['images'] ?? [];
            unset($item['images'], $item['day']);

            $itinerary = $tour->itineraries()->create([
                'day_number' => $item['day_number'],
                'sort_order' => $item['sort_order'] ?? $index,
                'type' => $item['type'],
                'title' => $item['title'],
                'start_time' => $item['start_time'] ?? null,
                'end_time' => $item['end_time'] ?? null,
                'duration' => $item['duration'] ?? null,
                'transport' => $item['transport'] ?? null,
                'description' => $item['description'] ?? null,
            ]);

            foreach ($images as $imageIndex => $image) {
                $itinerary->images()->create([
                    'image_url' => $image['image_url'],
                    'alt_text' => $image['alt_text'] ?? null,
                    'sort_order' => $image['sort_order'] ?? $imageIndex,
                ]);
            }
        }
    }
}
