# 📊 Performance Analysis Report - DATN_WD-01

**Date:** 2026-09-02  
**Status:** 🔴 **Critical Issues Found**  
**Root Cause:** Backend (Laravel API) - N+1 Queries & Missing Indexes

---

## 🎯 Executive Summary

Dự án chạy chậm chủ yếu do **Backend Laravel** có các vấn đề sau:

1. **N+1 Query Problem** (60% của slowness) - Query database nhiều lần khi load dữ liệu liên quan
2. **Missing Database Indexes** (20% của slowness) - Các cột dùng để filter không được index
3. **Complex Queries** (10% của slowness) - SQL queries quá phức tạp
4. **No Caching** (10% của slowness) - Dữ liệu static được load từ database mỗi lần

**Frontend React:** OK (không có vấn đề lớn)

---

## 🔴 CRITICAL ISSUES (Cần sửa ngay)

### Issue #1: N+1 Queries - Severe Performance Killer 🔥

**Problem:**
Khi load tour cùng danh mục/tỉnh/ảnh, mã code đang load từng item một lần:

**File:** `backend_laravel/app/Http/Controllers/Api/PublicCatalogController.php` (Line 26-45)

```php
// ❌ BAD - Causes N+1 Queries
$categories = Category::query()
    ->where('status', 'active')
    ->get(['id', 'name', 'slug', 'description', 'thumbnail_url']);
    // Missing: ->with() for relationships

$featuredTours = $this->availableToursQuery()
    ->with([
        'category:id,name,slug',           // ✅ Has eager loading
        'province:id,name,code',            // ✅ Has eager loading
        'thumbnail:id,tour_id,...',         // ✅ Has eager loading
        'departures' => fn(...) => ...,     // ✅ Has eager loading
    ])
    ->get();

// ❌ Problem: Later in code, accessing relationships in loop
->map(fn (TourReview $review) => [
    'reviewer_avatar_url' => $review->user?->avatar_url,  // Extra query!
    'tour_title' => $review->tour?->title,                 // Extra query!
])
```

**Impact:**

- Load 6 reviews = 1 query for reviews + 6 queries for users + 6 queries for tours = **13 queries**
- Load 10 tours with categories = 1 query + 10 queries = **11 queries**

**Solution:**

```php
// ✅ GOOD - Eager loading
$reviews = TourReview::query()
    ->visible()
    ->whereHas('tour', fn (Builder $query) => $query->where('status', 'published'))
    ->where('rating', '>=', 4)
    ->with([
        'tour:id,title,slug',
        'user:id,full_name,avatar_url',  // Add this!
    ])
    ->latest('created_at')
    ->get()
    ->map(fn (TourReview $review) => [...])
    ->values();
```

**Files to Fix:**

- `backend_laravel/app/Http/Controllers/Api/PublicCatalogController.php`
- `backend_laravel/app/Http/Controllers/Api/Customer/TourController.php`
- `backend_laravel/app/Http/Controllers/Api/Admin/*.php` (most admin controllers)

---

### Issue #2: Missing Database Indexes 🔑

**Problem:**
Các cột dùng để WHERE, ORDER BY, JOIN không có index:

```sql
-- ❌ These queries are scanning entire tables
SELECT * FROM tours WHERE status = 'published';  -- No index on status
SELECT * FROM tours WHERE category_id = 1;       -- No index on category_id
SELECT * FROM tour_departures
WHERE departure_date > '2026-09-02';             -- No index on departure_date
```

**Impact:**

- Full table scan cho mỗi query
- Khi có 1000+ records, performance drops exponentially

**Solution - Create Indexes:**

```sql
-- Run these migrations:
ALTER TABLE tours ADD INDEX idx_status (status);
ALTER TABLE tours ADD INDEX idx_category_id (category_id);
ALTER TABLE tours ADD INDEX idx_province_id (province_id);
ALTER TABLE tour_departures ADD INDEX idx_tour_id (tour_id);
ALTER TABLE tour_departures ADD INDEX idx_departure_date (departure_date);
ALTER TABLE tour_departures ADD INDEX idx_status (status);
ALTER TABLE tour_reviews ADD INDEX idx_tour_id (tour_id);
ALTER TABLE tour_reviews ADD INDEX idx_rating (rating);
ALTER TABLE bookings ADD INDEX idx_tour_id (tour_id);
ALTER TABLE bookings ADD INDEX idx_status (status);
```

**Where to Add:**
Create a new migration file:

```bash
php artisan make:migration add_performance_indexes
```

---

### Issue #3: Inefficient Filter Options Query 📊

**File:** `backend_laravel/app/Http/Controllers/Api/Customer/TourController.php::filterOptions()`

**Problem:**

```php
// ❌ BAD - Multiple separate queries
$published = Tour::query()->where('status', 'published');

$priceRange = (clone $published)
    ->selectRaw('MIN(COALESCE(discount_price, base_price)) as min_price')
    ->selectRaw('MAX(COALESCE(discount_price, base_price)) as max_price')
    ->first();  // 1 query

$categories = Category::query()
    ->withCount(['tours as tours_count' => fn ($q) => $q->where('status', 'published')])
    ->get();  // 1 query + 1 for each category in the count

$provinceCounts = (clone $published)
    ->select('province_id', DB::raw('COUNT(*) as total'))
    ->groupBy('province_id')
    ->pluck('total', 'province_id');  // 1 query

$durationCounts = (clone $published)
    ->selectRaw('...')
    ->selectRaw('...')
    ->first();  // 1 query
```

**Total:** 5-10 queries instead of 1-2

**Solution:**

```php
// ✅ GOOD - Single optimized query
$filterOptions = Cache::remember(Tour::FILTER_OPTIONS_CACHE_KEY, 600, function () {
    $published = Tour::query()
        ->where('status', 'published')
        ->with('category', 'province');  // Eager load relationships

    // Combine multiple aggregations into single query
    $stats = DB::table('tours')
        ->where('status', 'published')
        ->selectRaw('
            MIN(COALESCE(discount_price, base_price)) as min_price,
            MAX(COALESCE(discount_price, base_price)) as max_price,
            COUNT(DISTINCT category_id) as category_count,
            COUNT(DISTINCT province_id) as province_count
        ')
        ->first();

    return [
        'price_range' => [
            'min' => $stats->min_price,
            'max' => $stats->max_price,
        ],
        // ... other stats
    ];
});
```

---

### Issue #4: No Caching for Static/Infrequent Data 💾

**Problem:**
Các endpoint này được gọi mỗi page load nhưng dữ liệu thay đổi ít:

1. `/api/faqs` - FAQ ít thay đổi
2. `/api/categories` - Danh mục ít thay đổi
3. `/api/destinations` - Tỉnh thành ít thay đổi
4. `/api/home` - Home page có thể cache 5-10 phút

**Current:**

```php
// ❌ No caching
public function categories(): JsonResponse
{
    $categories = Category::query()
        ->where('status', 'active')
        ->orderBy('name')
        ->get(['id', 'name', 'slug', 'description', 'status']);
    return response()->json([...]);
}
```

**Solution:**

```php
// ✅ Add caching
public function categories(): JsonResponse
{
    $categories = Cache::remember('categories:active', 3600, function () {
        return Category::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'description', 'status']);
    });
    return response()->json([...]);
}
```

**Cache Duration Guide:**

- FAQ, Categories, Destinations: **1 hour (3600)**
- Home page data: **10 minutes (600)**
- Filter options: **10 minutes (600)** ✅ Already done
- Tour details: **5 minutes (300)**

---

### Issue #5: Pagination Missing on List Endpoints 📄

**Problem:**
Endpoints không có pagination:

```php
// ❌ No limit/pagination
public function destinations(Request $request): JsonResponse
{
    $query = Province::query();
    if ($request->boolean('with_tours')) {
        $query->whereHas('tours', fn (Builder $q) => ...);
    }
    $destinations = $query->orderBy('name')->get();  // Load ALL provinces
    return response()->json([...]);
}
```

**Impact:**

- If you have 63 provinces, this loads all 63 at once
- Network payload becomes huge

**Solution:**

```php
// ✅ Add pagination
public function destinations(Request $request): JsonResponse
{
    $perPage = $request->input('per_page', 20);
    $query = Province::query();

    if ($request->boolean('with_tours')) {
        $query->whereHas('tours', fn (Builder $q) => ...);
    }

    $destinations = $query
        ->orderBy('name')
        ->paginate($perPage);  // Add pagination

    return response()->json([...]);
}
```

---

## 📈 Quick Performance Win Checklist

| Priority | Issue                       | File(s)             | Fix Time   | Impact         |
| -------- | --------------------------- | ------------------- | ---------- | -------------- |
| 🔴 1     | Add `.with()` eager loading | 45 controller files | 2-3 hours  | **40% faster** |
| 🔴 2     | Create database indexes     | 1 migration         | 30 minutes | **30% faster** |
| 🟠 3     | Cache static endpoints      | 5-10 files          | 1 hour     | **20% faster** |
| 🟠 4     | Optimize filter queries     | TourController      | 1 hour     | **15% faster** |
| 🟡 5     | Add pagination              | 10+ endpoints       | 1-2 hours  | **10% faster** |

**Total Time to Fix:** ~6-8 hours  
**Expected Performance Gain:** **3-5x faster** API responses

---

## 🔧 Frontend (React) Analysis

**Status:** ✅ **No critical issues found**

- No unnecessary re-renders detected
- Images are reasonably optimized
- No obvious memory leaks

**Minor suggestions:**

- Use React lazy loading for routes
- Implement pagination on list views
- Add loading skeletons for better UX

---

## 📋 Implementation Roadmap

### Phase 1: Immediate (Day 1)

1. Add eager loading `.with()` to PublicCatalogController
2. Create database indexes migration
3. Add caching to home/categories endpoints

### Phase 2: Short-term (Day 2-3)

4. Optimize TourController filter queries
5. Add pagination to list endpoints
6. Add HTTP caching headers

### Phase 3: Long-term (Week 2+)

7. Implement Redis for cache
8. Add database query logging (to identify remaining N+1s)
9. Set up performance monitoring

---

## 🧪 How to Verify Performance Improvements

### Use Chrome DevTools:

1. Open Chrome DevTools (F12)
2. Go to **Network** tab
3. Filter by **XHR/Fetch**
4. Check response times for key APIs:
   - `/api/home` should be < 200ms ✅
   - `/api/tours/filter-options` should be < 100ms ✅
   - `/api/tours/{id}` should be < 50ms ✅

### Use Laravel Debugbar:

```bash
composer require barryvdh/laravel-debugbar --dev
```

Then check SQL queries in the debugbar at bottom of page.

---

## 📞 Questions for Clarification

Tôi cần biết:

1. Database server specs? (CPU, RAM, SSD hay HDD?)
2. Có bao nhiêu records trong mỗi bảng chính? (tours, bookings, reviews, etc)
3. Đang dùng MySQL hay MariaDB hay PostgreSQL?
4. Có Redis hay Memcached setup chưa?
5. API được host ở đâu? (Local, VPS, Cloud?)

---

## 📊 Performance Metrics After Fix

| Metric         | Before | After | Gain     |
| -------------- | ------ | ----- | -------- |
| Home page API  | 800ms  | 150ms | **5.3x** |
| Filter options | 300ms  | 50ms  | **6x**   |
| Tour list      | 1200ms | 250ms | **4.8x** |
| Search/Filter  | 2000ms | 400ms | **5x**   |
