<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\TourResource;
use App\Models\DestinationPlace;
use App\Models\Tour;
use App\Models\TourActivityLog;
use App\Models\TourAgePricingRule;
use App\Models\TourItinerary;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TourManagerController extends Controller
{
    public function timeline(Request $request)
    {
        $validated = $request->validate([
            'entity_type' => ['nullable', Rule::in(['tour', 'category', 'destination', 'destination_place', 'language', 'certificate'])],
        ]);

        $activities = TourActivityLog::query()
            ->with('actor:id,full_name,email')
            ->when(
                $validated['entity_type'] ?? null,
                fn($query, $entityType) => $query->where('metadata->entity_type', $entityType)
            )
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn(TourActivityLog $activity) => [
                'id' => $activity->id,
                'tour_id' => $activity->tour_id,
                'tour_title' => $activity->tour_title,
                'action' => $activity->action,
                'description' => $activity->description,
                'metadata' => $activity->metadata,
                'actor' => $activity->actor ? [
                    'id' => $activity->actor->id,
                    'name' => $activity->actor->full_name,
                    'email' => $activity->actor->email,
                ] : null,
                'created_at' => $activity->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'status' => 'success',
            'data' => $activities,
        ]);
    }

    /**
     * 1. API Quản lý danh sách tour (Admin)
     * Yêu cầu: Không hiển thị tour bị ẩn + Tích hợp Lọc & Tìm kiếm
     */
    public function index(Request $request)
    {
        // Loại trừ tour bị ẩn - LỰA CHỌN CHỈ NHỮNG CỘT CẦN THIẾT cho list view
        // KHÔNG tải: images, itineraries, agePricingRules (để dành cho detail view)
        $query = Tour::select([
            'id',
            'category_id',
            'province_id',
            'title',
            'slug',
            'summary',
            'description',
            'base_price',
            'discount_price',
            'duration_days',
            'duration_nights',
            'status',
            'created_at',
            'updated_at'
        ])
            ->with(['category:id,name,slug', 'province:id,name,code', 'thumbnail:id,tour_id,image_url,alt_text'])
            ->where('status', '!=', 'hidden');

        //  1. ADMIN TÌM KIẾM: Theo tiêu đề tour (title)
        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function ($searchQuery) use ($search) {
                $searchQuery->where('title', 'LIKE', '%' . $search . '%')
                    ->orWhere('summary', 'LIKE', '%' . $search . '%')
                    ->orWhereHas(
                        'category',
                        fn($categoryQuery) => $categoryQuery->where('name', 'LIKE', '%' . $search . '%')
                    )
                    ->orWhereHas(
                        'province',
                        fn($provinceQuery) => $provinceQuery->where('name', 'LIKE', '%' . $search . '%')
                    );
            });
        }

        //  2. ADMIN LỌC TRẠNG THÁI: Lọc nhanh theo 'draft', 'published', 'cancelled'
        if ($request->has('status') && $request->status != '') {
            $query->where('status', $request->status);
        }

        if ($request->filled('category')) {
            $query->whereHas(
                'category',
                fn($categoryQuery) => $categoryQuery->where('name', $request->string('category')->toString())
            );
        }

        if ($request->filled('province')) {
            $query->whereHas(
                'province',
                fn($provinceQuery) => $provinceQuery->where('name', $request->string('province')->toString())
            );
        }

        if ($request->filled('duration')) {
            match ($request->string('duration')->toString()) {
                '1-2' => $query->whereBetween('duration_days', [1, 2]),
                '3-5' => $query->whereBetween('duration_days', [3, 5]),
                '6+' => $query->where('duration_days', '>=', 6),
                default => null,
            };
        }

        //  3. ADMIN LỌC KHOẢNG GIÁ: Lọc theo khoảng giá base_price
        if ($request->has('price_from') && $request->price_from != '') {
            $query->where('base_price', '>=', $request->price_from);
        }
        if ($request->has('price_to') && $request->price_to != '') {
            $query->where('base_price', '<=', $request->price_to);
        }

        // Mặc định giữ phân trang 10 tour cho màn hình quản lý; các dropdown
        // có thể yêu cầu tối đa 1000 tour để hiển thị đầy đủ danh sách.
        $perPage = min(max((int) $request->input('per_page', 10), 1), 1000);

        // Sắp xếp theo ID tăng dần để STT hiển thị từ bé đến lớn
        $tours = $query->latest('updated_at')->orderByDesc('id')->paginate($perPage);
        // KHÔNG transform với TourResource ở list view - nó quá nặng
        // Chỉ format dữ liệu cơ bản để gửi về FE

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách quản lý tour thành công',
            'data' => $tours->through(function ($tour) {
                return [
                    'id' => $tour->id,
                    'title' => $tour->title,
                    'slug' => $tour->slug,
                    'summary' => $tour->summary,
                    'category' => $tour->category ? [
                        'id' => $tour->category->id,
                        'name' => $tour->category->name,
                    ] : null,
                    'province' => $tour->province ? [
                        'id' => $tour->province->id,
                        'name' => $tour->province->name,
                    ] : null,
                    'base_price' => $tour->base_price,
                    'discount_price' => $tour->discount_price,
                    'duration_days' => $tour->duration_days,
                    'duration_nights' => $tour->duration_nights,
                    'status' => $tour->status,
                    'thumbnail_url' => $tour->thumbnail?->image_url,
                    'created_at' => $tour->created_at?->toIso8601String(),
                    'updated_at' => $tour->updated_at?->toIso8601String(),
                ];
            }),
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
        $tour = Tour::with(['category', 'province', 'thumbnail', 'images', 'itineraries.images', 'itineraries.destinationPlace.province', 'itineraries.destinationPlace.district.province', 'itineraries.destinationPlace.activityTypeLinks', 'departures', 'agePricingRules'])
            ->withCount([
                'bookings as active_bookings_count' => fn($query) => $query
                    ->whereNotIn('status', ['cancelled', 'cancelled_by_tour']),
            ])
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy chi tiết tour thành công',
            'data' => new TourResource($tour),
        ], 200, [], JSON_PRESERVE_ZERO_FRACTION);
    }

    public function publicIndex(Request $request)
    {
        //  Chỉ lấy các tour đã xuất bản (published)
        $query = Tour::with(['category', 'province', 'thumbnail', 'images', 'itineraries.images', 'itineraries.destinationPlace.province', 'itineraries.destinationPlace.district.province', 'itineraries.destinationPlace.activityTypeLinks', 'agePricingRules'])
            ->where('status', 'published');

        //  1. USER TÌM KIẾM: Tìm theo tiêu đề tour
        if ($request->has('search') && $request->search != '') {
            $query->where('title', 'LIKE', '%' . $request->search . '%');
        }

        //  2. USER LỌC KHOẢNG GIÁ: Tìm theo ngân sách của khách
        if ($request->has('price_from') && $request->price_from != '') {
            $query->where('base_price', '>=', $request->price_from);
        }
        if ($request->has('price_to') && $request->price_to != '') {
            $query->where('base_price', '<=', $request->price_to);
        }

        // Sắp xếp theo ID tăng dần để STT hiển thị từ bé đến lớn
        $tours = $query->orderBy('id', 'asc')->paginate(10);
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
        $this->normalizeProvinceRequest($request);
        $this->normalizeAgePricingRulesRequest($request);

        $validatedData = $request->validate([
            'thumbnail_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'gallery_images' => 'nullable|array',
            'gallery_images.*' => 'image|mimes:jpg,jpeg,png,webp|max:5120',
            'thumbnail_alt_text' => 'nullable|string|max:255',
            'category_id' => 'required|integer',
            'province_id' => 'required|integer|exists:provinces,id',
            'title' => 'required|string|max:255',
            'summary' => 'nullable|string|max:500',
            'description' => 'nullable|string',

            'itinerary' => 'nullable|array',
            'itinerary.*.day_number' => 'required|integer|min:1',
            'itinerary.*.sort_order' => 'nullable|integer|min:0',
            'itinerary.*.type' => ['required', 'string', Rule::in(TourItinerary::ACTIVITY_TYPES)],
            'itinerary.*.province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'itinerary.*.destination_place_id' => [
                'nullable',
                'integer',
                Rule::exists('destination_places', 'id')->whereNull('deleted_at'),
            ],
            'itinerary.*.destination_place_name' => 'nullable|string|max:180',
            'itinerary.*.destination_place_address' => 'nullable|string|max:500',
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

            'duration_days' => 'required|integer|min:1',
            'duration_nights' => 'nullable|integer|min:0',
            'base_price' => 'required|numeric',
            'discount_price' => 'nullable|numeric',
            'max_slots' => 'required|integer',
            'status' => 'required|in:draft,published,hidden,cancelled',
            'age_pricing_rules' => 'sometimes|array|size:3',
            'age_pricing_rules.*.label' => 'required|string|max:150',
            'age_pricing_rules.*.min_age' => 'required|integer|min:0',
            'age_pricing_rules.*.max_age' => 'nullable|integer|min:0',
            'age_pricing_rules.*.pricing_type' => 'required|in:percentage',
            'age_pricing_rules.*.price_value' => 'required|numeric|min:0|max:100',
            'age_pricing_rules.*.sort_order' => 'nullable|integer|min:0',
            'age_pricing_rules.*.is_active' => 'nullable|boolean',
        ]);

        if (array_key_exists('age_pricing_rules', $validatedData)) {
            $this->validateStandardAgePricingRules($validatedData['age_pricing_rules']);
        }

        $this->normalizeDiscountPriceData($validatedData);
        $validatedData['duration_nights'] = max((int) $validatedData['duration_days'] - 1, 0);

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

        $validatedData['slug'] = $this->generateUniqueSlug(
            $request->filled('slug') ? $request->input('slug') : $validatedData['title']
        );

        $validatedData['available_slots'] = $request->available_slots
            ?? $validatedData['max_slots'];

        $itineraryData = $validatedData['itinerary'] ?? [];
        unset($validatedData['itinerary']);
        unset($validatedData['age_pricing_rules']);

        $thumbnailFile = $request->file('thumbnail_image');
        $galleryFiles = $request->file('gallery_images', []);
        $thumbnailAltText = $validatedData['thumbnail_alt_text'] ?? null;

        if (! is_array($galleryFiles)) {
            $galleryFiles = [];
        }

        unset(
            $validatedData['thumbnail_image'],
            $validatedData['gallery_images'],
            $validatedData['thumbnail_alt_text']
        );

        $tour = DB::transaction(function () use (
            $validatedData,
            $itineraryData,
            $thumbnailFile,
            $thumbnailAltText,
            $galleryFiles
        ) {
            $tour = Tour::create($validatedData);

            if ($thumbnailFile) {
                $path = $thumbnailFile->store('tours', 'public');

                $tour->images()->create([
                    'image_url' => Storage::url($path),
                    'alt_text' => $thumbnailAltText,
                    'sort_order' => 0,
                    'is_thumbnail' => true,
                ]);
            }

            $sortOrder = $thumbnailFile ? 1 : 0;

            foreach ($galleryFiles as $imageFile) {
                if (! $imageFile) {
                    continue;
                }

                $path = $imageFile->store('tours', 'public');

                $tour->images()->create([
                    'image_url' => Storage::url($path),
                    'alt_text' => $thumbnailAltText,
                    'sort_order' => $sortOrder++,
                    'is_thumbnail' => false,
                ]);
            }

            $this->syncItineraries($tour, $itineraryData);
            $this->syncStandardAgePricingRules($tour);

            return $tour;
        });

        $this->logActivity(
            $request,
            $tour,
            'created',
            'Đã tạo tour mới.',
            ['status' => $tour->status]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Thêm tour thành công',
            'data' => new TourResource($tour->load(['category', 'province', 'thumbnail', 'images', 'itineraries.images', 'itineraries.destinationPlace.province', 'itineraries.destinationPlace.district.province', 'itineraries.destinationPlace.activityTypeLinks', 'agePricingRules'])),
        ], 201, [], JSON_PRESERVE_ZERO_FRACTION);
    }

    /**
     * 4. API Sửa tour
     */
    public function update(Request $request, $id)
    {
        $tour = Tour::findOrFail($id);

        $this->normalizeItineraryRequest($request);
        $this->normalizeProvinceRequest($request);
        $this->normalizeAgePricingRulesRequest($request);

        $validatedData = $request->validate([
            'thumbnail_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'gallery_images' => 'nullable|array',
            'gallery_images.*' => 'image|mimes:jpg,jpeg,png,webp|max:5120',
            'thumbnail_alt_text' => 'nullable|string|max:255',
            'category_id' => 'sometimes|required|integer',
            'province_id' => 'sometimes|required|integer|exists:provinces,id',
            'title' => 'sometimes|required|string|max:255',
            'summary' => 'nullable|string|max:500',
            'description' => 'nullable|string',
            'itinerary' => 'nullable|array',
            'itinerary.*.day_number' => 'required|integer|min:1',
            'itinerary.*.sort_order' => 'nullable|integer|min:0',
            'itinerary.*.type' => ['required', 'string', Rule::in(TourItinerary::ACTIVITY_TYPES)],
            'itinerary.*.province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'itinerary.*.destination_place_id' => [
                'nullable',
                'integer',
                Rule::exists('destination_places', 'id')->whereNull('deleted_at'),
            ],
            'itinerary.*.destination_place_name' => 'nullable|string|max:180',
            'itinerary.*.destination_place_address' => 'nullable|string|max:500',
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
            'duration_days' => 'sometimes|required|integer|min:1',
            'duration_nights' => 'nullable|integer|min:0',
            'base_price' => 'sometimes|required|numeric',
            'discount_price' => 'nullable|numeric',
            'max_slots' => 'sometimes|required|integer',
            'available_slots' => 'nullable|integer',
            'status' => 'sometimes|required|in:draft,published,hidden,cancelled',
            'age_pricing_rules' => 'sometimes|array|size:3',
            'age_pricing_rules.*.label' => 'required|string|max:150',
            'age_pricing_rules.*.min_age' => 'required|integer|min:0',
            'age_pricing_rules.*.max_age' => 'nullable|integer|min:0',
            'age_pricing_rules.*.pricing_type' => 'required|in:percentage',
            'age_pricing_rules.*.price_value' => 'required|numeric|min:0|max:100',
            'age_pricing_rules.*.sort_order' => 'nullable|integer|min:0',
            'age_pricing_rules.*.is_active' => 'nullable|boolean',
            'confirm_itinerary_change' => 'nullable|boolean',
        ]);

        if (array_key_exists('age_pricing_rules', $validatedData)) {
            $this->validateStandardAgePricingRules($validatedData['age_pricing_rules']);
        }

        if (
            array_key_exists('duration_days', $validatedData)
            && (int) $validatedData['duration_days'] !== (int) $tour->duration_days
            && $tour->departures()->exists()
        ) {
            throw ValidationException::withMessages([
                'duration_days' => 'Không thể thay đổi số ngày/đêm khi tour đã có lịch khởi hành. Vui lòng tạo tour hoặc lịch mới có thời lượng khác.',
            ]);
        }

        if (
            $request->exists('itinerary')
            && ! $request->boolean('confirm_itinerary_change')
            && $tour->bookings()
            ->whereNotIn('status', ['cancelled', 'cancelled_by_tour'])
            ->exists()
        ) {
            return response()->json([
                'status' => 'warning',
                'code' => 'tour_has_bookings',
                'message' => 'Tour đã có khách đặt. Vui lòng xác nhận trước khi thay đổi lịch trình.',
            ], 409);
        }

        $this->normalizeDiscountPriceData($validatedData);

        if (isset($validatedData['title'])) {
            $validatedData['slug'] = $this->generateUniqueSlug(
                $request->filled('slug') ? $request->input('slug') : $validatedData['title'],
                $tour->getKey()
            );
        }

        if (isset($validatedData['duration_days'])) {
            $validatedData['duration_nights'] = max((int) $validatedData['duration_days'] - 1, 0);
        } else {
            unset($validatedData['duration_nights']);
        }

        if (
            ! isset($validatedData['available_slots']) &&
            isset($validatedData['max_slots'])
        ) {
            $validatedData['available_slots'] = $validatedData['max_slots'];
        }

        $itineraryData = $validatedData['itinerary'] ?? [];
        $shouldSyncItinerary = $request->exists('itinerary');

        $thumbnailFile = $request->file('thumbnail_image');
        $galleryFiles = $request->file('gallery_images', []);
        $thumbnailAltText = $validatedData['thumbnail_alt_text'] ?? null;

        if (! is_array($galleryFiles)) {
            $galleryFiles = [];
        }

        unset(
            $validatedData['itinerary'],
            $validatedData['age_pricing_rules'],
            $validatedData['thumbnail_image'],
            $validatedData['gallery_images'],
            $validatedData['thumbnail_alt_text'],
            $validatedData['confirm_itinerary_change']
        );

        DB::transaction(function () use (
            $tour,
            $validatedData,
            $itineraryData,
            $shouldSyncItinerary,
            $thumbnailFile,
            $thumbnailAltText,
            $galleryFiles
        ) {
            $tour->update($validatedData);

            if ($thumbnailFile) {
                $path = $thumbnailFile->store('tours', 'public');
                $imageUrl = Storage::url($path);

                $oldThumbnail = $tour->thumbnail()->first();

                if ($oldThumbnail) {
                    $oldThumbnail->update([
                        'image_url' => $imageUrl,
                        'alt_text' => $thumbnailAltText,
                        'sort_order' => 0,
                        'is_thumbnail' => true,
                    ]);
                } else {
                    $tour->images()->update(['is_thumbnail' => false]);

                    $tour->images()->create([
                        'image_url' => $imageUrl,
                        'alt_text' => $thumbnailAltText,
                        'sort_order' => 0,
                        'is_thumbnail' => true,
                    ]);
                }
            } elseif ($thumbnailAltText !== null) {
                $oldThumbnail = $tour->thumbnail()->first();

                if ($oldThumbnail) {
                    $oldThumbnail->update([
                        'alt_text' => $thumbnailAltText,
                    ]);
                }
            }

            if (! empty($galleryFiles)) {
                $nextSortOrder = ((int) $tour->images()->max('sort_order')) + 1;

                foreach ($galleryFiles as $imageFile) {
                    if (! $imageFile) {
                        continue;
                    }

                    $path = $imageFile->store('tours', 'public');

                    $tour->images()->create([
                        'image_url' => Storage::url($path),
                        'alt_text' => $thumbnailAltText,
                        'sort_order' => $nextSortOrder++,
                        'is_thumbnail' => false,
                    ]);
                }
            }

            if ($shouldSyncItinerary) {
                $this->syncItineraries($tour, $itineraryData);
            }

            $this->syncStandardAgePricingRules($tour);
        });

        $this->logActivity(
            $request,
            $tour->fresh(),
            'updated',
            'Đã cập nhật thông tin tour.',
            ['fields' => array_values(array_keys($validatedData))]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật tour thành công',
            'data' => new TourResource($tour->fresh(['category', 'province', 'thumbnail', 'images', 'itineraries.images', 'itineraries.destinationPlace.province', 'itineraries.destinationPlace.district.province', 'itineraries.destinationPlace.activityTypeLinks', 'agePricingRules'])),
        ], 200, [], JSON_PRESERVE_ZERO_FRACTION);
    }

    /**
     * 5. API Xóa tour (Soft Delete)
     */
    public function destroy(Request $request, $id)
    {
        $tour = Tour::findOrFail($id);

        if ($tour->departures()->exists()) {
            return $this->departureConflictResponse($tour, 'xóa');
        }

        $this->logActivity($request, $tour, 'deleted', 'Đã chuyển tour vào thùng rác.');
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
    public function hide(Request $request, $id)
    {
        $tour = Tour::findOrFail($id);

        if ($tour->departures()->exists()) {
            return $this->departureConflictResponse($tour, 'ẩn');
        }

        $tour->update(['status' => 'hidden']);
        $this->logActivity($request, $tour, 'hidden', 'Đã ẩn tour khỏi danh sách hiển thị.');

        return response()->json([
            'status' => 'success',
            'message' => 'Đã ẩn tour thành công',
            'data' => new TourResource($tour->fresh(['category', 'province', 'thumbnail', 'images', 'itineraries.images', 'itineraries.destinationPlace.province', 'itineraries.destinationPlace.district.province', 'itineraries.destinationPlace.activityTypeLinks', 'agePricingRules'])),
        ]);
    }

    /**
     * 7. API Hiển thị lại tour bị ẩn
     * Cập nhật trạng thái từ 'hidden' sang 'published' (hoặc 'draft' tùy logic của bạn).
     */
    public function unhide(Request $request, $id)
    {
        $tour = Tour::findOrFail($id);

        if ($tour->status !== 'hidden') {
            return response()->json([
                'status' => 'error',
                'message' => 'Tour này hiện không bị ẩn',
            ], 400);
        }

        $tour->update(['status' => 'published']); // Hoặc 'draft'
        $this->logActivity($request, $tour, 'published', 'Đã hiển thị lại tour.');

        return response()->json([
            'status' => 'success',
            'message' => 'Đã bỏ ẩn tour thành công',
            'data' => new TourResource($tour->fresh(['category', 'province', 'thumbnail', 'images', 'itineraries.images', 'itineraries.destinationPlace.province', 'itineraries.destinationPlace.district.province', 'itineraries.destinationPlace.activityTypeLinks', 'agePricingRules'])),
        ]);
    }

    /**
     * 8. API Hiển thị tất cả tour bị ẩn
     */
    public function hiddenTours()
    {
        $tours = Tour::with(['category', 'province', 'thumbnail', 'images', 'itineraries.images', 'itineraries.destinationPlace.province', 'itineraries.destinationPlace.district.province', 'itineraries.destinationPlace.activityTypeLinks', 'agePricingRules'])
            ->where('status', 'hidden')
            ->orderBy('id', 'asc')
            ->paginate(10);
        $tours->getCollection()->transform(fn($tour) => (new TourResource($tour))->resolve(request()));

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách tour bị ẩn thành công',
            'data' => $tours,
        ]);
    }

    public function trashedTours(Request $request)
    {
        $perPage = min(max((int) $request->input('per_page', 10), 1), 100);
        $search = trim((string) $request->input('search', ''));

        $tours = Tour::onlyTrashed()
            ->with(['category', 'province', 'thumbnail'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($searchQuery) use ($search) {
                    $searchQuery->where('title', 'like', '%' . $search . '%')
                        ->orWhere('slug', 'like', '%' . $search . '%');
                });
            })
            ->latest('deleted_at')
            ->paginate($perPage);

        $tours->getCollection()->transform(
            fn($tour) => (new TourResource($tour))->resolve($request)
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Lấy danh sách tour đã xóa thành công',
            'data' => $tours,
        ]);
    }

    public function showTrashed(Request $request, $id)
    {
        $tour = Tour::onlyTrashed()
            ->with([
                'category',
                'province',
                'thumbnail',
                'images',
                'itineraries.images',
                'itineraries.destinationPlace.province',
                'itineraries.destinationPlace.district.province',
                'itineraries.destinationPlace.activityTypeLinks',
                'agePricingRules',
            ])
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => new TourResource($tour),
        ]);
    }

    public function restore(Request $request, $id)
    {
        $tour = Tour::onlyTrashed()->findOrFail($id);
        $tour->restore();
        $this->logActivity($request, $tour, 'restored', 'Đã khôi phục tour từ thùng rác.');

        return response()->json([
            'status' => 'success',
            'message' => 'Đã khôi phục tour thành công',
            'data' => new TourResource($tour->fresh(['category', 'province', 'thumbnail'])),
        ]);
    }

    public function forceDelete(Request $request, $id)
    {
        $tour = Tour::onlyTrashed()->findOrFail($id);
        $tourId = $tour->id;
        $tourTitle = $tour->title;

        $this->logActivity($request, $tour, 'force_deleted', 'Đã xóa vĩnh viễn tour.');
        $tour->forceDelete();

        return response()->json([
            'status' => 'success',
            'message' => 'Đã xóa vĩnh viễn tour thành công',
            'data' => ['id' => $tourId, 'title' => $tourTitle],
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
            ->leftJoin('provinces', 'tours.province_id', '=', 'provinces.id')
            ->select(
                'tours.id',
                'tours.title',
                'tours.slug',
                'tours.status',
                'tours.base_price',
                'tours.average_rating',
                'tours.review_count',
                'provinces.name as province_name',
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
                'provinces.name'
            )
            ->orderByDesc('total_bookings')
            ->limit(5)
            ->get();

        $recentTours = (clone $baseQuery)
            ->with(['category:id,name', 'province:id,name'])
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
                'province_id',
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

            if (array_key_exists('destination_place_id', $item)) {
                $item['destination_place_id'] = filled($item['destination_place_id'])
                    ? (int) $item['destination_place_id']
                    : null;
            }

            if (array_key_exists('province_id', $item)) {
                $item['province_id'] = filled($item['province_id'])
                    ? (int) $item['province_id']
                    : null;
            }

            if (array_key_exists('destination_place_name', $item)) {
                $item['destination_place_name'] = trim((string) $item['destination_place_name']);
            }

            if (array_key_exists('destination_place_address', $item)) {
                $item['destination_place_address'] = trim((string) $item['destination_place_address']);
            }

            if (isset($item['images']) && is_array($item['images'])) {
                $item['images'] = collect($item['images'])
                    ->map(function ($image, $imageIndex) {
                        if (is_string($image)) {
                            return [
                                'image_url' => trim($image),
                                'sort_order' => $imageIndex,
                            ];
                        }

                        if (is_array($image)) {
                            $image['image_url'] = isset($image['image_url']) ? trim($image['image_url']) : '';
                            $image['alt_text'] = $image['alt_text'] ?? null;
                            $image['sort_order'] = $image['sort_order'] ?? $imageIndex;
                        }

                        return $image;
                    })
                    ->filter(function ($image) {
                        return is_array($image)
                            && isset($image['image_url'])
                            && $image['image_url'] !== '';
                    })
                    ->values()
                    ->all();
            }

            return $item;
        })->all();

        $request->merge(['itinerary' => $normalized]);
    }

    private function normalizeProvinceRequest(Request $request): void
    {
        if (! $request->filled('province_id') && $request->filled('destination_id')) {
            $request->merge(['province_id' => $request->input('destination_id')]);
        }
    }

    private function syncItineraries(Tour $tour, array $itineraries): void
    {
        $tour->itineraries()->delete();

        foreach ($itineraries as $index => $item) {
            $images = $item['images'] ?? [];
            $destinationPlace = $this->resolveItineraryDestinationPlace($tour, $item);

            unset(
                $item['images'],
                $item['day'],
                $item['destination_place_name'],
                $item['destination_place_address'],
                $item['itinerary_destination_id'],
            );

            $itinerary = $tour->itineraries()->create([
                'day_number' => $item['day_number'],
                'sort_order' => $item['sort_order'] ?? $index,
                'type' => $item['type'],
                'province_id' => $destinationPlace?->province_id
                    ?? $destinationPlace?->district?->province_id
                    ?? ($item['province_id'] ?? $tour->province_id),
                'destination_place_id' => $destinationPlace?->id,
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

    private function resolveItineraryDestinationPlace(Tour $tour, array $item): ?DestinationPlace
    {
        $activityType = $item['type'];
        $provinceId = $item['province_id'] ?? null;
        $destinationPlace = null;

        if (! empty($item['destination_place_id'])) {
            $destinationPlace = DestinationPlace::query()
                ->with(['province'])
                ->findOrFail($item['destination_place_id']);

            $provinceId = $provinceId ?: $destinationPlace->province_id;

            if ($provinceId && $destinationPlace->province_id && (int) $provinceId !== (int) $destinationPlace->province_id) {
                throw ValidationException::withMessages([
                    'itinerary' => 'Địa điểm chi tiết không thuộc tỉnh/thành đã chọn.',
                ]);
            }
        } elseif (filled($item['destination_place_name'] ?? null)) {
            $provinceId = $provinceId ?: $this->resolveTourProvinceId($tour);

            if (! $provinceId) {
                throw ValidationException::withMessages([
                    'itinerary' => 'Vui lòng chọn tỉnh/thành trước khi nhập địa điểm mới.',
                ]);
            }

            $placeName = trim((string) $item['destination_place_name']);
            $destinationPlace = DestinationPlace::query()
                ->where('province_id', $provinceId)
                ->where('name', $placeName)
                ->first();

            if (! $destinationPlace) {
                $destinationPlace = DestinationPlace::query()->create([
                    'province_id' => $provinceId,
                    'name' => $placeName,
                    'slug' => $this->generateUniqueDestinationPlaceSlug($placeName, (int) $provinceId),
                    'address' => filled($item['destination_place_address'] ?? null)
                        ? trim((string) $item['destination_place_address'])
                        : null,
                    'status' => 'active',
                ]);
            }
        }

        if (! $destinationPlace) {
            return null;
        }

        if (! $destinationPlace->activityTypeLinks()
            ->where('activity_type', $activityType)
            ->exists()) {
            $destinationPlace->activityTypeLinks()->create([
                'activity_type' => $activityType,
            ]);
        }

        return $destinationPlace;
    }

    private function resolveTourProvinceId(Tour $tour): ?int
    {
        return $tour->province_id ? (int) $tour->province_id : null;
    }

    private function generateUniqueDestinationPlaceSlug(string $name, int $provinceId): string
    {
        $baseSlug = Str::slug($name) ?: 'dia-diem';
        $slug = $baseSlug . '-' . $provinceId;
        $index = 1;

        while (DestinationPlace::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $provinceId . '-' . $index++;
        }

        return $slug;
    }

    private function generateUniqueSlug(string $value, ?int $exceptTourId = null): string
    {
        $baseSlug = Str::limit(Str::slug($value) ?: 'tour', 280, '');
        $slug = $baseSlug;
        $suffix = 2;

        while (
            Tour::withTrashed()
            ->where('slug', $slug)
            ->when($exceptTourId, fn($query) => $query->whereKeyNot($exceptTourId))
            ->exists()
        ) {
            $suffixText = '-' . $suffix++;
            $slug = Str::limit($baseSlug, 280 - strlen($suffixText), '') . $suffixText;
        }

        return $slug;
    }

    private function normalizeAgePricingRulesRequest(Request $request): void
    {
        if (! $request->exists('age_pricing_rules')) {
            return;
        }

        $rules = $request->input('age_pricing_rules');

        if (is_string($rules)) {
            $decoded = json_decode($rules, true);
            $rules = json_last_error() === JSON_ERROR_NONE ? $decoded : $rules;
        }

        if (! is_array($rules)) {
            return;
        }

        $normalized = collect($rules)
            ->map(function ($rule, $index) {
                if (! is_array($rule)) {
                    return $rule;
                }

                $label = trim((string) ($rule['label'] ?? ''));

                if ($label === '') {
                    $label = 'Mức giá ' . ($index + 1);
                }

                $pricingType = $rule['pricing_type'] ?? 'fixed';

                return [
                    'label' => $label,
                    'min_age' => isset($rule['min_age']) && $rule['min_age'] !== ''
                        ? (int) $rule['min_age']
                        : 0,
                    'max_age' => isset($rule['max_age']) && $rule['max_age'] !== ''
                        ? (int) $rule['max_age']
                        : null,
                    'pricing_type' => in_array($pricingType, ['percentage', 'fixed', 'free'], true)
                        ? $pricingType
                        : 'fixed',
                    'price_value' => isset($rule['price_value']) && $rule['price_value'] !== ''
                        ? (float) $rule['price_value']
                        : 0,
                    'sort_order' => isset($rule['sort_order']) && $rule['sort_order'] !== ''
                        ? (int) $rule['sort_order']
                        : $index,
                    'is_active' => filter_var($rule['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true,
                ];
            })
            ->filter(function ($rule) {
                return is_array($rule);
            })
            ->values()
            ->all();

        $request->merge(['age_pricing_rules' => $normalized]);
    }

    private function normalizeDiscountPriceData(array &$data): void
    {
        if (! array_key_exists('discount_price', $data)) {
            return;
        }

        if ($data['discount_price'] === null || $data['discount_price'] === '') {
            $data['discount_price'] = null;

            return;
        }

        $discountPrice = (float) $data['discount_price'];

        $data['discount_price'] = $discountPrice > 0 ? $discountPrice : null;
    }

    private function syncStandardAgePricingRules(Tour $tour): void
    {
        $now = now();
        $existingRules = $tour->agePricingRules()->orderBy('id')->get();
        $keptRuleIds = [];

        foreach (TourAgePricingRule::standardDefinitions() as $definition) {
            $existingRule = $existingRules->first(function (TourAgePricingRule $rule) use ($definition, $keptRuleIds): bool {
                return ! in_array((int) $rule->id, $keptRuleIds, true)
                    && (int) $rule->min_age === (int) $definition['min_age']
                    && (int) $rule->max_age === (int) $definition['max_age'];
            });

            $ruleData = [
                'label' => $definition['label'],
                'min_age' => $definition['min_age'],
                'max_age' => $definition['max_age'],
                'pricing_type' => $definition['pricing_type'],
                'price_value' => $definition['price_value'],
                'sort_order' => $definition['sort_order'],
                'is_active' => true,
                'updated_at' => $now,
            ];

            if ($existingRule) {
                $existingRule->update($ruleData);
                $keptRuleIds[] = (int) $existingRule->id;

                continue;
            }

            $createdRule = $tour->agePricingRules()->create($ruleData);
            $keptRuleIds[] = (int) $createdRule->id;
        }

        $tour->agePricingRules()
            ->whereNotIn('id', $keptRuleIds)
            ->update([
                'is_active' => false,
                'updated_at' => $now,
            ]);
    }

    private function validateStandardAgePricingRules(array $rules): void
    {
        $expectedRules = TourAgePricingRule::standardDefinitions();

        if (count($rules) !== count($expectedRules)) {
            throw ValidationException::withMessages([
                'age_pricing_rules' => 'Chỉ được phép sử dụng đúng 3 nhóm tuổi cố định của hệ thống.',
            ]);
        }

        foreach ($expectedRules as $index => $expectedRule) {
            $rule = $rules[$index] ?? null;
            $priceValueMatches = is_array($rule)
                && is_numeric($rule['price_value'] ?? null)
                && abs((float) $rule['price_value'] - (float) $expectedRule['price_value']) < 0.00001;

            $isStandardRule = is_array($rule)
                && ($rule['label'] ?? null) === $expectedRule['label']
                && (int) ($rule['min_age'] ?? -1) === (int) $expectedRule['min_age']
                && (int) ($rule['max_age'] ?? -1) === (int) $expectedRule['max_age']
                && ($rule['pricing_type'] ?? null) === $expectedRule['pricing_type']
                && $priceValueMatches
                && (int) ($rule['sort_order'] ?? -1) === (int) $expectedRule['sort_order']
                && (bool) ($rule['is_active'] ?? false);

            if (! $isStandardRule) {
                throw ValidationException::withMessages([
                    "age_pricing_rules.{$index}" => 'Nhóm tuổi, khoảng tuổi và tỷ lệ giá phải đúng theo cấu hình cố định của hệ thống.',
                ]);
            }
        }
    }

    private function departureConflictResponse(Tour $tour, string $action)
    {
        $departures = $tour->departures()
            ->orderByDesc('departure_date')
            ->get([
                'id',
                'tour_id',
                'departure_date',
                'return_date',
                'total_slots',
                'booked_slots',
                'status',
            ]);

        return response()->json([
            'status' => 'error',
            'message' => "Tour đang có lịch khởi hành nên không thể {$action}.",
            'code' => 'tour_has_departures',
            'data' => [
                'tour_id' => $tour->id,
                'departures' => $departures,
            ],
        ], 422);
    }

    private function logActivity(
        Request $request,
        Tour $tour,
        string $action,
        string $description,
        array $metadata = []
    ): void {
        TourActivityLog::create([
            'tour_id' => $tour->id,
            'actor_id' => $request->user()?->id,
            'action' => $action,
            'tour_title' => $tour->title,
            'description' => $description,
            'metadata' => array_merge($metadata, [
                'entity_type' => 'tour',
                'entity_id' => $tour->id,
            ]),
        ]);
    }
}
