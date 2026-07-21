# Audit Business Model — Đánh giá tour và hướng dẫn viên

## Phạm vi và nguyên tắc

- Business Rule: `BR-035` đến `BR-053` trong `docs/reverse-engineering/03-business-rules-brd.md`.
- Tài liệu đối chiếu bổ sung: `02-module-analysis.md`, `04-srs.md`, `05-use-cases.md`, `06-process-and-state-diagrams.md`, `07-database-erd.md`, `08-api-specification.md`, `09-permission-crud-matrices.md`, `10-unverified-findings.md`.
- Chỉ đánh giá độ khớp giữa mệnh đề nghiệp vụ đã ghi và source code. Không đánh giá style, naming, performance, architecture hoặc design pattern.
- `Đúng`: toàn bộ mệnh đề của rule được chứng minh. `Sai`: source thực thi trái mệnh đề. `Thiếu`: chỉ chứng minh được một phần hoặc không có phần bắt buộc.

## Bảng tổng hợp

| Business Rule | Đã triển khai | File chính | Hàm chính | Đúng / Sai / Thiếu | Mức độ ảnh hưởng |
| --- | --- | --- | --- | --- | --- |
| BR-035 | Có | `backend_laravel/app/Services/BookingReviewEligibilityService.php` | `isReviewable()` | Đúng | — |
| BR-036 | Có | `backend_laravel/app/Http/Controllers/Api/Customer/CustomerDashboardController.php` | `bookings()` | Đúng | — |
| BR-037 | Có | `backend_laravel/app/Http/Controllers/Api/Customer/TourReviewController.php` | `store()` | Đúng | — |
| BR-038 | Có | `backend_laravel/app/Http/Requests/Customer/StoreTourReviewRequest.php`; `backend_laravel/app/Http/Requests/Customer/UpdateTourReviewRequest.php`; `backend_laravel/routes/api.php` | `rules()` | Đúng | — |
| BR-039 | Có | `backend_laravel/app/Http/Controllers/Api/Customer/TourReviewController.php` | `store()`, `normalizeComment()` | Đúng | — |
| BR-040 | Có | `backend_laravel/app/Http/Controllers/Api/Customer/TourReviewController.php` | `update()` | Đúng | — |
| BR-041 | Có | `backend_laravel/app/Services/TourReviewService.php` | `refreshTourRating()` | Đúng | — |
| BR-042 | Có | `backend_laravel/app/Http/Controllers/Api/TourReviewController.php` | `index()` | Đúng | — |
| BR-043 | Có | `backend_laravel/app/Http/Resources/PublicTourReviewResource.php` | `toArray()`, `maskName()` | Đúng | — |
| BR-044 | Có | `backend_laravel/app/Http/Controllers/Api/Admin/TourReviewController.php` | `index()`, `show()`, `updateStatus()` | Đúng | — |
| BR-045 | Có | `backend_laravel/database/migrations/2026_07_21_000000_create_tour_reviews_table.php` | `up()`, `down()` và helper migration | Đúng | — |
| BR-046 | Có | `backend_laravel/app/Http/Controllers/Api/Customer/GuideReviewController.php` | `store()` | Đúng | — |
| BR-047 | Có | `backend_laravel/app/Http/Controllers/Api/Customer/GuideReviewController.php` | `store()` | Đúng | — |
| BR-048 | Có | `backend_laravel/app/Http/Controllers/Api/Customer/GuideReviewController.php` | `store()` | Đúng | — |
| BR-049 | Có | `backend_laravel/app/Services/GuideReviewService.php` | `refreshGuideRating()` | Đúng | — |
| BR-050 | Có | `backend_laravel/app/Services/GuideReviewService.php` | `completedAssignmentsQuery()` | Đúng | — |
| BR-051 | Có | `backend_laravel/app/Services/GuideReviewNotificationService.php` | `syncForUser()`, `markAsCompleted()` | Đúng | — |
| BR-052 | Có | `backend_laravel/app/Services/TourReviewService.php`; `backend_laravel/app/Services/GuideReviewService.php`; `backend_laravel/app/Http/Controllers/Api/Customer/GuideReviewController.php` | Các hàm refresh/store | Đúng | — |
| BR-053 | Có | `backend_laravel/app/Services/GuideAssignmentService.php` | `getTourForDeparture()`, `getDestinationIds()`, `eligibleGuidesQuery()` | Đúng | — |

## Phân tích chi tiết

### BR-035 — Điều kiện booking được đánh giá

**Business Rule.** Booking `cancelled` không được đánh giá; booking `completed` được đánh giá; nếu chưa completed thì cần departure tồn tại và thỏa một trong hai nhánh: departure `completed`, hoặc booking `confirmed` có `return_date` trước hôm nay.

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Services/BookingReviewEligibilityService.php:7` — `App\Services\BookingReviewEligibilityService::isReviewable()` tại dòng 9–31.
- Route sử dụng rule: `GET /api/profile/bookings`, `POST /api/customer/tour-reviews`, `POST /api/customer/guide-reviews` trong `backend_laravel/routes/api.php:100-112`.
- Service: `BookingReviewEligibilityService`; được gọi qua `TourReviewService::isBookingReviewable()` và `GuideReviewService::isBookingReviewable()`.
- Model: `App\Models\Booking`, `App\Models\TourDeparture`.
- Middleware: `auth:sanctum`, `role:customer` tại group route customer.
- Action: Không sử dụng. Use Case class: Không sử dụng. Domain Service riêng: Không sử dụng ngoài service nêu trên. Repository: Không sử dụng. Policy/Gate: Không sử dụng trong luồng; quyền nằm ở middleware/controller. Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng cho phép tính eligibility này.

#### Database

- Read: `bookings.status`, `bookings.tour_departure_id`; `tour_departures.status`, `tour_departures.return_date` qua relation `Booking::tourDeparture()`.
- Insert/Update/Delete: Không có; hàm chỉ đọc.
- Migration: `backend_laravel/database/migrations/2026_06_10_220060_create_bookings_table.php`; `backend_laravel/database/migrations/2026_06_10_220040_create_tour_departures_table.php`.
- Transaction/Rollback/Lock: Không có trong chính hàm. Khi được gọi từ customer tour-review create, controller bao hàm nó trong `DB::transaction()` và đã khóa booking/tour; guide-review gọi trước transaction và không khóa booking.
- Idempotent: Hàm chỉ đọc và không thay đổi dữ liệu.
- Audit Log: Không sử dụng.

#### Validation, Authorization, Exception và Data Integrity

- Validation nghiệp vụ được viết thành các nhánh `if`/boolean trong `isReviewable()`; không phải Form Request.
- Customer tour/guide review còn xác minh booking thuộc `request->user()` trong controller; lịch sử booking scope theo `user_id`.
- Hàm không ném exception; controller chuyển kết quả `false` thành `ValidationException` ở field `booking_id`.
- Lost Update/Duplicate/Dirty Write/Deadlock/Data Loss: Không phát sinh từ hàm chỉ đọc. **[Suy luận từ source code]** Race Condition: guide-review đánh giá eligibility trước transaction và không khóa booking; tài liệu không đặt rule đồng thời nên không lập BUG.

#### Kết luận

**Đúng.** Tất cả nhánh trạng thái/ngày trong rule khớp trực tiếp dòng 11–30 của service.

### BR-036 — Lịch sử booking trả điều kiện review và đánh giá tour hiện tại

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerDashboardController.php:13` — `CustomerDashboardController::bookings()` dòng 37–64.
- Route: `GET /api/profile/bookings` (`backend_laravel/routes/api.php:99`).
- Service: `BookingReviewEligibilityService::isReviewable()`; Controller thêm `can_review_tour` tại dòng 52.
- Model/Resource: `Booking`, relation `tourReview`; `CustomerTourReviewResource::toArray()` tại `backend_laravel/app/Http/Resources/CustomerTourReviewResource.php:13-40`.
- Middleware: `auth:sanctum`, `role:customer`. Policy/Gate: Không sử dụng; ownership bằng `where('user_id', $request->user()->id)`.
- Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng trong luồng này.

#### Database

- Read: bookings của user cùng `tours`, `tour_departures`, `payments`, `tour_reviews`; các cột review được resource projection.
- Insert/Update/Delete: Không có.
- Migration chính: `2026_06_10_220060_create_bookings_table.php`, `2026_07_21_000000_create_tour_reviews_table.php`.
- Transaction/Rollback/Lock/Audit Log: Không sử dụng; endpoint chỉ đọc.
- Idempotent: GET chỉ đọc.

#### Validation, Authorization, Exception và Data Integrity

- Query/body validation: Không có input nghiệp vụ.
- Chỉ customer đã xác thực được route; controller chỉ lấy booking của chính user.
- Exception tường minh: Không có; lỗi DB/framework đi theo handler Laravel.
- Lost Update/Duplicate/Dirty Write/Deadlock/Race Condition/Data Loss: Không có ghi dữ liệu.

#### Kết luận

**Đúng.** Hai field `can_review_tour` và `tour_review` được gắn trực tiếp tại dòng 52–55.

### BR-037 — Ownership, eligibility và một tour review cho mỗi booking

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Customer/TourReviewController.php:17` — `TourReviewController::store()` dòng 23–72.
- Route: `POST /api/customer/tour-reviews` (`backend_laravel/routes/api.php:111`).
- Request/Service: `StoreTourReviewRequest`; `TourReviewService::isBookingReviewable()`, `refreshTourRating()`.
- Model: `Booking`, `Tour`, `TourReview`.
- Middleware: `auth:sanctum`, `role:customer`, `throttle:10,1`; Policy/Gate: Không sử dụng. Ownership tại `where('user_id', $request->user()->id)->findOrFail(...)` dòng 29–32.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

#### Database

- Read/Lock: khóa `bookings` thuộc user và `tours` liên quan bằng `lockForUpdate()`; kiểm tra tồn tại `tour_reviews.booking_id`.
- Insert: `tour_reviews.user_id`, `tour_id`, `booking_id`, `tour_departure_id`, `rating`, `comment`, `status`.
- Update: `tours.average_rating`, `tours.review_count` qua service.
- Delete: Không có.
- Unique/FK: `tour_reviews.booking_id` nullable unique/FK tại `backend_laravel/database/migrations/2026_07_21_000000_create_tour_reviews_table.php:16`.
- Transaction: `DB::transaction()` dòng 27–60. Rollback: Laravel rollback toàn bộ DB mutation nếu closure ném exception. Lock: booking, tour và tour row trong refresh.
- Idempotent: Không dùng idempotency key; lần gọi tuần tự thứ hai trả `409` và không tạo dòng thứ hai. Unique DB là lớp bảo vệ bổ sung.
- Audit Log: Không có bảng audit; timestamps của `tour_reviews` được ghi tự động.

#### Validation, Authorization, Exception và Data Integrity

- Validation request: `booking_id` required/integer/exists; rating và comment theo BR-038.
- Authorization: customer + ownership booking. Booking người khác dẫn tới `ModelNotFoundException`/HTTP 404.
- Exception: booking chưa đủ điều kiện ném `ValidationException`/422; review đã tồn tại trả JSON 409; missing booking/tour 404.
- Duplicate: được ngăn bằng booking row lock, kiểm tra tồn tại và unique constraint. Lost Update/Dirty Write/Data Loss trong flow tuần tự: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**. Deadlock runtime: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; source không có handler riêng ngoài transaction framework.

#### Kết luận

**Đúng.** Source chứng minh ownership, eligibility, conflict 409 và unique ở DB.

### BR-038 — Validation và rate limit của tour review

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Requests/Customer/StoreTourReviewRequest.php:8` và `UpdateTourReviewRequest.php:8` — `rules()` dòng 18–24/18–23.
- Route: POST và PUT tour review tại `backend_laravel/routes/api.php:111-114`, mỗi route có `throttle:10,1`.
- Service/Repository/Model operation: Không dùng để validate; Laravel Form Request xử lý trước controller. Model liên quan: `TourReview`.
- Middleware: `auth:sanctum`, `role:customer`, throttle. Policy/Gate: Không sử dụng; Form Request `authorize()` chỉ kiểm user khác null.
- Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

#### Database

- Validation DB: migration thêm CHECK `rating BETWEEN 1 AND 5` khi driver khác SQLite (`2026_07_21_000000_create_tour_reviews_table.php:29-31`); `comment` là text nullable.
- Insert/Update/Delete: Form Request không mutation.
- Transaction/Rollback/Lock/Idempotent/Audit Log: Không áp dụng cho layer validation; mutation nằm tại BR-037/BR-040.

#### Validation, Authorization, Exception và Data Integrity

- Create: `booking_id|required|integer|exists:bookings,id`; `rating|required|integer|between:1,5`; `comment|nullable|string|max:2000`.
- Update: rating/comment cùng rule, không nhận booking ID.
- Validation fail trả 422 theo Laravel; vượt rate limit trả 429 từ throttle middleware.
- Data Integrity: rating được bảo vệ cả request và CHECK ngoài SQLite; trên SQLite chỉ có validation API, đúng như migration source.

#### Kết luận

**Đúng.** Kiểu, biên, độ dài và throttle khớp mệnh đề.

### BR-039 — Trạng thái mặc định và chuẩn hóa comment của tour review

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Customer/TourReviewController.php` — `store()` dòng 43–51, `normalizeComment()` dòng 111–116.
- Model: `backend_laravel/app/Models/TourReview.php:10`; `$attributes['status']='visible'` dòng 28–30.
- Route: `POST /api/customer/tour-reviews`.
- Service: `TourReviewService` chỉ xử lý eligibility/rating aggregate. Middleware: customer auth + throttle.
- Action/Use Case/Domain Service/Repository/Policy/Gate/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng trong phần rule này.

#### Database

- Insert: `tour_reviews.status='visible'`; comment là kết quả `trim`, chuỗi rỗng thành `NULL`.
- Migration: status enum default visible và comment nullable tại `2026_07_21_000000_create_tour_reviews_table.php:19-20`.
- Transaction/Rollback/Lock: cùng transaction/lock nêu tại BR-037.
- Idempotent: POST lặp không tạo mới vì rule BR-037; không có idempotency key.
- Audit Log: timestamps; không có audit-log table.

#### Validation, Authorization, Exception và Data Integrity

- Comment trước chuẩn hóa đã qua nullable/string/max 2000.
- Authorization/exception giống BR-037.
- Duplicate được ngăn theo booking; bằng chứng về các loại rủi ro ghi dữ liệu khác trái rule: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

#### Kết luận

**Đúng.** Controller gán status tường minh và helper thực hiện đúng trim/null.

### BR-040 — Customer chỉ sửa review của mình và không thay đổi moderation status

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Customer/TourReviewController.php` — `update()` dòng 75–100.
- Route: `PUT /api/customer/tour-reviews/{tourReview}` (`backend_laravel/routes/api.php:112-114`).
- Request/Service/Model: `UpdateTourReviewRequest`, `TourReviewService::refreshTourRating()`, `TourReview`.
- Migration: `backend_laravel/database/migrations/2026_07_21_000000_create_tour_reviews_table.php`.
- Middleware: `auth:sanctum`, `role:customer`, `throttle:10,1`; Policy/Gate: Không sử dụng. Ownership ở `where('user_id', ...)->findOrFail()` dòng 80–83.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

#### Database

- Update: chỉ `tour_reviews.rating`, `tour_reviews.comment`, automatic `updated_at`; không có `status` trong update array. Sau đó update aggregate tour.
- Insert/Delete: Không có.
- Transaction: `DB::transaction()`; Rollback tự động khi exception thoát closure. Lock: review row và tour row trong refresh.
- Idempotent: Không có idempotency key; cùng payload giữ cùng rating/comment/status nhưng `updated_at` vẫn được ghi lại.
- Audit Log: Không có; moderation fields không bị chạm.

#### Validation, Authorization, Exception và Data Integrity

- Rating required integer 1–5; comment nullable string max 2000.
- Review người khác hoặc không tồn tại trả 404 do query scope owner.
- Hidden/spam giữ status vì update array không chứa status; aggregate chỉ tính visible.
- Lost Update được hạn chế bằng `lockForUpdate()` trên review; transaction cập nhật review và aggregate cùng commit.

#### Kết luận

**Đúng.** Source không có đường customer ghi `status`, `moderated_by` hoặc `moderated_at`.

### BR-041 — Chỉ review visible tham gia aggregate tour

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Services/TourReviewService.php:9` — `refreshTourRating()` dòng 20–40; `TourReview::scopeVisible()` tại `backend_laravel/app/Models/TourReview.php:65-68`.
- Call sites: customer `TourReviewController::store()/update()`; admin `TourReviewController::updateStatus()`.
- Routes: POST/PUT customer review; PATCH `/api/admin/tour-reviews/{tourReview}/status`.
- Model: `TourReview`, `Tour`.
- Migration: `backend_laravel/database/migrations/2026_07_21_000000_create_tour_reviews_table.php`; `backend_laravel/database/migrations/2026_06_10_220020_create_tours_table.php`.
- Middleware/Authorization: customer hoặc admin theo route. Policy/Gate không sử dụng.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

#### Database

- Read: `tour_reviews` lọc `status='visible'`, `tour_id`; `COUNT(*)`, `AVG(rating)`.
- Update: `tours.average_rating` làm tròn 2 chữ số và `tours.review_count`.
- Insert/Delete: Không có trong service.
- Transaction: service không tự mở transaction nhưng cả ba write call site đều gọi trong `DB::transaction()`.
- Lock: `Tour::query()->lockForUpdate()->find($tourId)` trước aggregate/update.
- Rollback: aggregate update rollback cùng create/update/moderation nếu exception thoát transaction.
- Idempotent: phép refresh là tái tính toàn bộ từ source rows; gọi lại trên cùng dữ liệu cho cùng giá trị.
- Audit Log: Không dùng.

#### Validation, Authorization, Exception và Data Integrity

- Status hợp lệ ở customer create cố định visible và admin Form Request enum; rating 1–5 ở customer request/DB CHECK ngoài SQLite.
- Tour không còn tồn tại thì service return không update; các call site create khóa/findOrFail tour, update/moderation phụ thuộc FK tour cascade. Bằng chứng về orphan từ flow source bình thường: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- Lock tour giúp serialize aggregate tour. Bằng chứng về việc guide-review runtime ghi aggregate tour: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

#### Kết luận

**Đúng.** Cả bộ lọc visible, transaction call sites và tour row lock đều có bằng chứng trực tiếp.

### BR-042 — API công khai chỉ trả review visible của tour published

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/TourReviewController.php:14` — `TourReviewController::index()` dòng 20–61.
- Route: `GET /api/tours/{slug}/reviews`, được khai báo trước route `GET /api/tours/{slug}` tại `backend_laravel/routes/api.php:167-170`.
- Service: `TourReviewService::summaryForTour()` dòng 43–68.
- Model/Resource: `Tour`, `TourReview`, `PublicTourReviewResource`.
- Migration: `backend_laravel/database/migrations/2026_07_21_000000_create_tour_reviews_table.php`; `backend_laravel/database/migrations/2026_06_10_220020_create_tours_table.php`.
- Middleware/Policy/Gate: Không sử dụng; đây là API public.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

#### Database

- Read: tour theo `slug` và `status='published'`; tour reviews theo `tour_id`, `status='visible'`, rating tùy chọn; summary group theo rating trên toàn bộ visible review của tour.
- Insert/Update/Delete: Không có.
- Transaction/Rollback/Lock/Audit Log: Không sử dụng; endpoint chỉ đọc.
- Idempotent: GET chỉ đọc.

#### Validation, Authorization, Exception và Data Integrity

- `rating`: nullable integer 1–5; `sort`: `newest|oldest|highest|lowest`; `per_page`: nullable integer 5–50, mặc định 10.
- Sort mặc định newest; các nhánh order nằm ở dòng 42–47.
- Tour không published/không tồn tại trả 404; query sai trả 422.
- Summary không bị rating filter chi phối vì service nhận riêng tour ID; đúng mệnh đề “toàn bộ visible”.
- Lost Update/Duplicate/Dirty Write/Deadlock/Race Condition/Data Loss: Không có mutation.

#### Kết luận

**Đúng.** Filter, sort, pagination, published/visible scope và summary 1–5 đều khớp.

### BR-043 — Projection công khai che thông tin khách hàng

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Resources/PublicTourReviewResource.php:9` — `toArray()` dòng 14–31, `maskName()` dòng 34–45.
- Route sử dụng: response của `GET /api/tours/{slug}/reviews`; controller chỉ eager-load `user:id,full_name` và `tour:id,title,slug` (`TourReviewController.php:33-36`).
- Service: Không sử dụng trong projection. Model: `TourReview`, `User`, `Tour`.
- Migration: `backend_laravel/database/migrations/2026_07_21_000000_create_tour_reviews_table.php`; `backend_laravel/database/migrations/0001_01_01_000000_create_users_table.php`; `backend_laravel/database/migrations/2026_06_10_220020_create_tours_table.php`.
- Middleware/Policy/Gate: Không sử dụng; public.
- Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

#### Database

- Read: review `id/rating/comment/created_at/updated_at`; user chỉ `id/full_name`; tour `id/title/slug`.
- Response không chứa user ID, email, booking, departure, moderator.
- Insert/Update/Delete/Transaction/Rollback/Lock/Idempotency/Audit Log: Không áp dụng; resource chỉ chuyển dữ liệu.

#### Validation, Authorization, Exception và Data Integrity

- Tên rỗng trả `Khách hàng ViVuGo`; tên có các phần được biến thành chữ cái đầu + dấu chấm bằng `Str::substr`.
- Không có exception nghiệp vụ trong resource.
- Bằng chứng các field bị rule cấm xuất hiện trong array trả về dòng 19–31: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

#### Kết luận

**Đúng.** Projection công khai chỉ chứa đúng các nhóm dữ liệu được mô tả và tên đã viết tắt.

### BR-044 — Admin tìm kiếm, xem và đổi status tour review

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Admin/TourReviewController.php:16` — `index()` dòng 22–69, `show()` dòng 71–82, `updateStatus()` dòng 84–104.
- Request: `backend_laravel/app/Http/Requests/Admin/UpdateTourReviewStatusRequest.php:10` — `rules()` dòng 20–24.
- Routes: `GET /api/admin/tour-reviews`, `GET /api/admin/tour-reviews/{tourReview}`, `PATCH /api/admin/tour-reviews/{tourReview}/status` tại `backend_laravel/routes/api.php:201-205`.
- Service: `TourReviewService::refreshTourRating()`.
- Model/Resource: `TourReview`, `Tour`, `User`, `Booking`, `TourDeparture`, `AdminTourReviewResource`.
- Migration: `backend_laravel/database/migrations/2026_07_21_000000_create_tour_reviews_table.php`.
- Middleware: `auth:sanctum`, `role:admin`; Policy/Gate: Không sử dụng.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

#### Database

- Read/list: filter `status`, `rating`, `tour_id`, `created_at` range; search comment, user name/email, tour title, booking code; paginate 15 mặc định.
- Update: `tour_reviews.status`, `moderated_by`, `moderated_at`, `updated_at`; refresh `tours.average_rating/review_count`.
- Insert/Delete: Không có endpoint/controller method.
- Transaction: status update dùng `DB::transaction()`; Rollback tự động khi exception thoát. Lock: review row và tour row.
- Idempotent: không có idempotency key; lặp cùng status vẫn cập nhật lại moderator/time.
- Audit: moderation actor/time nằm trên `tour_reviews`; không có audit-log table/version history.

#### Validation, Authorization, Exception và Data Integrity

- List validation: search nullable string max100; status enum; rating 1–5; tour tồn tại; dates và `to_date >= from_date`; per-page 5–100.
- Status body bắt buộc và thuộc `visible|hidden|spam` lấy từ `TourReview::STATUSES`.
- Chỉ admin route; test hiện hữu còn xác nhận customer/guide/support bị 403.
- Review không tồn tại 404; validation sai 422.
- Transaction và locks giữ moderation/aggregate cùng commit. Không có hard delete hoặc update content từ admin routes.

#### Kết luận

**Đúng.** Tất cả filter/action/status/audit fields và việc không có sửa/xóa nội dung được source chứng minh.

### BR-045 — Backfill và rollback dữ liệu tour review

#### Source Code

- File/Class/Hàm: `backend_laravel/database/migrations/2026_07_21_000000_create_tour_reviews_table.php` — anonymous migration class; `up()` dòng 10–35, `down()` dòng 37–47, `moveLegacyTourReviews()` dòng 49–87, `restoreLegacyTourReviews()` dòng 89–117, `refreshTourRatingsFrom()` dòng 119–148.
- Route/Middleware/Policy: Không áp dụng; chạy qua Laravel migration command.
- Model: Không dùng Eloquent; query builder thao tác bảng `reviews`, `tour_reviews`, `tours`.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Job/Scheduler/Notification/Queue/Cache/API integration: Không sử dụng.
- Command: lifecycle migration do Artisan `migrate`/`migrate:rollback`; command custom riêng: Không sử dụng.
- Trigger/Stored Procedure: Không sử dụng.

#### Database

- `up`: create `tour_reviews`; read legacy `reviews WHERE guide_id IS NULL`; insert từng dòng vào `tour_reviews`; nếu booking trùng thì set `booking_id=NULL`; delete legacy row đã insert; update mọi `tours.average_rating/review_count` từ visible `tour_reviews`.
- `down`: insert toàn bộ `tour_reviews` về `reviews` với `guide_id=NULL`; update aggregate tour từ visible `reviews`; drop `tour_reviews`.
- FK/index/unique: user/tour cascade; booking unique nullable và null-on-delete; departure/moderator null-on-delete; public/admin composite indexes; rating CHECK ngoài SQLite.
- Transaction: không có `DB::transaction()` tường minh trong migration. Rollback nghiệp vụ là `down()`, không phải rollback transaction. Lock: Không sử dụng.
- Idempotent: Laravel migration repository ngăn chạy `up` đã ghi nhận; bản thân method không có guard `Schema::hasTable('tour_reviews')` trước create.
- Audit Log: created/updated timestamps được bảo tồn; `moderated_by/at` của legacy row được đặt null.

#### Validation, Authorization, Exception và Data Integrity

- Nếu insert trả false, migration ném `RuntimeException` trước khi delete nguồn; chunk size 500.
- **[Suy luận từ source code]** Data Integrity: up insert trước delete; nếu delete lỗi sau insert thì dữ liệu tồn tại ở cả hai bảng vì không có transaction tường minh. Down insert trước drop. Đây là rủi ro source, không phải mệnh đề trái rule nên không lập BUG.
- Khi rollback, `refreshTourRatingsFrom('reviews')` lọc `tour_id` và `status='visible'` nhưng không lọc `guide_id IS NULL` (dòng 134–137). Đây là hành vi đã chứng minh; rule chỉ tuyên bố lọc visible nên vẫn khớp. Tác động nghiệp vụ ngoài phạm vi mệnh đề được ghi nhận để test rollback.
- Authorization/request validation: Không áp dụng.

#### Kết luận

**Đúng.** Thứ tự backfill/restore, cách xử lý booking trùng, xóa nguồn, tính visible và drop bảng đều khớp mệnh đề.

### BR-046 — Customer chỉ review HDV từ booking của mình và đã đủ điều kiện

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Customer/GuideReviewController.php:19` — `store()` dòng 83–159.
- Service: `GuideReviewService::isBookingReviewable()` (`backend_laravel/app/Services/GuideReviewService.php:17-20`) ủy quyền cho `BookingReviewEligibilityService::isReviewable()`.
- Route: `POST /api/customer/guide-reviews` (`backend_laravel/routes/api.php:110`).
- Model: `Booking`, `TourDeparture`, `Review`, `Guide`.
- Migration: `backend_laravel/database/migrations/2026_06_10_220100_create_reviews_table.php`; `backend_laravel/database/migrations/2026_07_11_112416_add_guide_context_to_reviews_table.php`.
- Middleware: `auth:sanctum`, `role:customer`; Policy/Gate: Không dùng. Ownership tại `where('user_id', $user->id)->findOrFail()` dòng 88–96.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng. Notification service chỉ đánh dấu reminder sau khi review lưu.

#### Database

- Read: booking của user, tour, departure, assignment; sau đó review/guide/notification theo các rule kế tiếp.
- Insert/Update: `reviews`, `guides`, `notifications` trong flow store; Delete không có.
- Transaction: review mutation dòng 113–144; eligibility/ownership check diễn ra trước transaction. Rollback: mutation trong closure rollback khi exception thoát. Lock: Không có trên booking/guide trong flow này.
- Idempotent: cặp booking-guide được upsert tuần tự bằng `firstOrNew`; không có idempotency key.
- Audit Log: timestamps review; không có audit-log riêng.

#### Validation, Authorization, Exception và Data Integrity

- Booking ID phải tồn tại theo Form Request, sau đó phải thuộc user.
- Eligibility false ném ValidationException/422; booking khác chủ 404.
- **[Suy luận từ source code]** Race giữa thay đổi booking và review xuất phát từ việc source không khóa booking; tài liệu không đưa yêu cầu concurrency nên không lập BUG.

#### Kết luận

**Đúng.** Ownership và cùng service eligibility với tour review được gọi trực tiếp.

### BR-047 — Guide phải được assignment trên departure của booking

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Customer/GuideReviewController.php` — `store()` dòng 88–111.
- Route: `POST /api/customer/guide-reviews`.
- Service: không tách riêng phép kiểm assignment; controller eager-load `tourDeparture.guideAssignments` với `status != cancelled` và tìm `guide_id`.
- Model: `Booking`, `TourDeparture`, canonical `App\Models\TourGuideAssignment`, `Guide`, `Review`.
- Migration: `backend_laravel/database/migrations/2026_06_28_092905_create_tour_guide_assignments_table.php`.
- Middleware: customer auth/role; Policy/Gate không dùng.
- Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng cho phép kiểm này.

#### Database

- Read: `tour_guide_assignments.tour_departure_id`, `guide_id`, `status` qua relation departure.
- Insert/Update/Delete: Không phát sinh nếu không có assignment; flow review ở BR-048 nếu hợp lệ.
- Transaction/Rollback/Lock: phép kiểm xảy ra trước transaction, không lock.
- Idempotent/Audit Log: Không áp dụng cho phép kiểm.

#### Validation, Authorization, Exception và Data Integrity

- `guide_id` required/integer/exists tại Form Request; controller bổ sung rule assignment.
- Không có assignment hợp lệ ném ValidationException field `guide_id`, HTTP 422.
- File `backend_laravel/app/Models/TourGuideAssignments.php` và `GuideDestination.php` có khai báo class trùng/sai đã được tài liệu nguồn ghi nhận; flow này import canonical `App\Models\TourGuideAssignment` và autoload từ `app/Models/TourGuideAssignment.php`. Bằng chứng endpoint sử dụng hai file sai: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; vì vậy không lập BUG.

#### Kết luận

**Đúng.** Controller chỉ xét assignment của đúng departure và đã loại status `cancelled`.

### BR-048 — Validation và upsert guide review theo booking-guide

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Requests/Customer/StoreGuideReviewRequest.php:8` — `rules()` dòng 23–30; `backend_laravel/app/Http/Controllers/Api/Customer/GuideReviewController.php` — `store()` dòng 113–158.
- Route: `POST /api/customer/guide-reviews`.
- Service: `GuideReviewService::refreshGuideRating()`, `GuideReviewNotificationService::markAsCompleted()`.
- Model: `Review`; status default visible tại `backend_laravel/app/Models/Review.php:22-24`.
- Middleware: customer auth/role; throttle riêng cho route này: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- Policy/Gate/Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng. Notification service có sử dụng như nêu trên.

#### Database

- Insert/update: `reviews.user_id`, `tour_id`, `booking_id`, `guide_id`, `tour_departure_id`, `rating`, `comment`; status chỉ set visible khi record mới.
- Unique: `(booking_id, guide_id)` tại `backend_laravel/database/migrations/2026_07_11_112416_add_guide_context_to_reviews_table.php:29`.
- Transaction: `DB::transaction()` bao gồm save review, refresh guide aggregate và mark notification read. Rollback tự động khi exception thoát.
- Lock: Không sử dụng. Idempotent: gọi tuần tự cùng cặp không tạo record thứ hai mà update record hiện tại; gọi đồng thời không có lock/application idempotency key, DB unique ngăn hai dòng trùng nhưng source không xử lý riêng unique exception.
- Audit Log: timestamps; không có audit-log/history.

#### Validation, Authorization, Exception và Data Integrity

- `booking_id`, `guide_id`: required/integer/exists; rating required/integer/1–5; comment nullable/string/max2000.
- Ownership/eligibility/assignment theo BR-046/047.
- Existing review giữ status vì fill array không có status; new review gán visible.
- Duplicate tuần tự được ngăn bằng firstOrNew và DB unique. **[Suy luận từ source code]** Trong race concurrent, execution path dẫn đến constraint exception vì không lock; đây không phải mệnh đề rule bị source thực thi trái nên không lập BUG.

#### Kết luận

**Đúng.** Validation, key upsert, status create/update và unique DB khớp.

### BR-049 — Aggregate guide chỉ từ visible guide review

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Services/GuideReviewService.php:11` — `refreshGuideRating()` dòng 38–52.
- Call site/Route: `Customer\GuideReviewController::store()` dòng 135; `POST /api/customer/guide-reviews`.
- Model: `Review::scopeVisible()`, `Guide`.
- Migration: `backend_laravel/database/migrations/2026_06_10_220100_create_reviews_table.php`; `backend_laravel/database/migrations/2026_07_11_112416_add_guide_context_to_reviews_table.php`; `backend_laravel/database/migrations/2026_06_14_145318_create_guides_table.php`.
- Middleware: customer auth/role tại endpoint; Policy/Gate không dùng.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng cho aggregate.

#### Database

- Read: `reviews` với `guide_id` và `status='visible'`, COUNT/AVG rating.
- Update: chỉ `guides.average_rating`, `guides.review_count`.
- Insert/Delete: Không có trong service.
- Transaction: được gọi bên trong transaction của guide-review store. Rollback: cùng transaction. Lock: Không có `lockForUpdate()` trên guide hay review aggregate.
- Idempotent: refresh cùng tập review cho cùng giá trị.
- Audit Log: Không dùng.

#### Validation, Authorization, Exception và Data Integrity

- Rating đã qua Form Request; status new visible/existing được giữ.
- **[Suy luận từ source code]** Concurrent reviews cho cùng guide không được serialize bởi guide-row lock; execution path cho phép aggregate cuối không phản ánh đủ transaction cạnh tranh. Rule không quy định concurrency nên ghi nhận rủi ro, không lập BUG.
- Không có update bảng `tours` trong method.

#### Kết luận

**Đúng.** Query visible theo đúng guide và update chỉ bảng guides.

### BR-050 — Review visible và lịch sử tour hoàn tất của guide

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Customer/GuideReviewController.php` — `reviewsResponse()` dòng 171–200, `tourHistoryResponse()` dòng 203–257; `backend_laravel/app/Services/GuideReviewService.php` — `completedAssignmentsQuery()` dòng 22–36.
- Routes: `GET /api/customer/guides/{guide}/reviews`, `GET /api/customer/guides/{guide}/tour-history`; guide-self endpoints `/api/guide/reviews`, `/api/guide/tour-history` gọi cùng service/response logic qua `Api\Guide\GuideReviewController`.
- Service: `GuideReviewService`.
- Model: `Review`, `Guide`, `TourGuideAssignment`, `TourDeparture`; canonical assignment model được dùng.
- Migration: `backend_laravel/database/migrations/2026_06_10_220100_create_reviews_table.php`; `backend_laravel/database/migrations/2026_07_11_112416_add_guide_context_to_reviews_table.php`; `backend_laravel/database/migrations/2026_06_28_092905_create_tour_guide_assignments_table.php`.
- Middleware: customer endpoints customer role; self endpoints tour-guide role. Policy/Gate không dùng.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

#### Database

- Reviews read: `reviews.status='visible' AND guide_id=?`; rating filter nếu có.
- History read: assignment cùng guide `status != cancelled`; departure `status='completed'` hoặc `return_date < today`; visible review của guide theo departure.
- Insert/Update/Delete/Transaction/Rollback/Lock/Audit Log: Không dùng; read-only.
- Idempotent: GET read-only.

#### Validation, Authorization, Exception và Data Integrity

- `per_page` được clamp 1–50; rating/keyword/from/to được dùng trực tiếp, validation tường minh cho các filter: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**. Rule không tuyên bố có validation này.
- Customer được phép xem guide bất kỳ tồn tại; guide-self scope theo guide profile hiện tại. Auth/role tại routes.
- File canonical `TourGuideAssignment.php` có cột DB `note`; dù `$fillable` chứa `notes`, đọc `$assignment->note` vẫn đọc attribute từ model. Không có mutation note trong rule này và không lập BUG.
- Không mutation nên không có rủi ro ghi dữ liệu.

#### Kết luận

**Đúng.** Visible filter và hai nhánh completed/ngày về được chứng minh trực tiếp.

### BR-051 — Notification nhắc đánh giá HDV không trùng

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Services/GuideReviewNotificationService.php:13` — `syncForUser()` dòng 15–102, `syncAllEligibleCustomers()` dòng 104–123, `markAsCompleted()` dòng 125–136, `eligibleBookingsQuery()` dòng 138–158.
- Command: `backend_laravel/app/Console/Commands/SendGuideReviewReminders.php:9` — signature `guide-reviews:send-reminders`, `handle()` dòng 15–39.
- Scheduler: `backend_laravel/routes/console.php:13` — hourly + `withoutOverlapping()`.
- HTTP route: Không có route riêng; `markAsCompleted()` được gọi từ POST guide review.
- Model: `User`, `Booking`, `TourGuideAssignment`, `Review` qua booking relation, `Notification`.
- Migration: `backend_laravel/database/migrations/2026_06_10_220130_create_notifications_table.php`; `backend_laravel/database/migrations/2026_06_10_220100_create_reviews_table.php`; `backend_laravel/database/migrations/2026_07_11_112416_add_guide_context_to_reviews_table.php`.
- Middleware/Policy/Gate: Không áp dụng command. Service tự kiểm role name customer.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

#### Database

- Read: eligible booking, assignment không `cancelled/canceled`, review đã có; notification JSON keys `kind`, `booking_id`, `guide_id`.
- Insert: một `notifications` row cho mỗi key chưa tồn tại, type booking, unread và JSON action payload.
- Update: matching notifications `status='read'`, `read_at=now()` khi review tồn tại/lưu xong.
- Delete: Không có.
- Transaction: `syncForUser()` dùng `DB::transaction()`; Rollback tự động cho lỗi thoát. Lock: user row `lockForUpdate()` để serialize sync cùng user. `markAsCompleted()` tự nó không mở transaction, nhưng call từ guide-review nằm trong transaction.
- Idempotent: existence check + per-user lock làm cho sync tuần tự/cạnh tranh cùng user không tạo thêm key trùng; không có unique constraint DB cho JSON key.
- Audit Log: notification có read status/time; không có audit-log table.

#### Validation, Authorization, Exception và Data Integrity

- User không có role customer trả count 0. Command `--user-id` không tồn tại trả failure; user khác role được service trả 0.
- Command scheduler có lock `withoutOverlapping`; đây là scheduler mutex, không phải DB row lock.
- Notification/Queue: ghi notification đồng bộ; không dispatch queue/job, không email/SMS/push/webhook.
- Duplicate được ngăn ở application bằng user lock + JSON existence check; DB không có unique key nên insert ngoài service không bị constraint này.

#### Kết luận

**Đúng.** Key chống trùng, trạng thái read, command hourly và scheduler overlap lock đều có source.

### BR-052 — Tách aggregate tour review và guide review

#### Source Code

- Tour side: `backend_laravel/app/Services/TourReviewService.php` — `refreshTourRating()` đọc `TourReview` và update `Tour`.
- Guide side: `backend_laravel/app/Services/GuideReviewService.php` — `refreshGuideRating()` đọc `Review` theo `guide_id` và update `Guide`.
- Guide write flow: `backend_laravel/app/Http/Controllers/Api/Customer/GuideReviewController.php::store()` dòng 113–144; không gọi `TourReviewService` hoặc update `Tour`.
- Routes: customer/admin/public tour review; customer guide review như các BR trước.
- Model: `TourReview`, `Review`, `Tour`, `Guide`. `reviews.guide_id` nullable theo migration nhưng guide runtime query bắt buộc đúng `guide_id`; `tour_reviews` là bảng riêng.
- Middleware/Policy: theo từng endpoint. Policy/Gate riêng: Không sử dụng.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng cho aggregate. Notification chỉ thuộc guide-review reminder.

#### Database

- Tour aggregate: read `tour_reviews` visible; update `tours.average_rating/review_count`.
- Guide aggregate: read `reviews` visible theo guide; update `guides.average_rating/review_count`.
- Migration: `2026_07_21_000000_create_tour_reviews_table.php`, `2026_06_10_220100_create_reviews_table.php`, `2026_07_11_112416_add_guide_context_to_reviews_table.php`.
- Transaction/Rollback/Lock/Idempotency: theo BR-041 và BR-049. Tour refresh có tour row lock; guide refresh không có guide row lock.
- Audit Log: Không sử dụng.

#### Validation, Authorization, Exception và Data Integrity

- Customer guide-review validation không cho `guide_id` thiếu; controller còn kiểm assignment.
- Test source hiện hữu xác nhận sau guide-review, guide aggregate đổi còn tour aggregate giữ 0 (`backend_laravel/tests/Feature/GuideReviewApiTest.php:123-153`).
- Rollback migration tour review tính lại tour từ toàn bộ visible `reviews` mà không lọc `guide_id` như ghi tại BR-045; đây là hành vi rollback legacy, không phải lời gọi của guide-review runtime mà rule đang mô tả.
- File `GuideDestination.php`/`TourGuideAssignments.php` khai báo class bất nhất không nằm trong hai aggregate service. Bằng chứng làm flow này sai: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

#### Kết luận

**Đúng.** Hai service, hai model nguồn và hai bảng aggregate đích tách biệt trong runtime; guide-review controller không cập nhật tour.

### BR-053 — Tập guide đủ điều kiện nghiêm ngặt theo toàn bộ điểm đến

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Services/GuideAssignmentService.php:16` — `getTourForDeparture()` dòng 35–61, `getDestinationIds()` dòng 70–88, `eligibleGuidesQuery()` dòng 100–199.
- Routes sử dụng: `GET /api/admin/tour-departures/{departure}/guide-candidates`, `POST .../auto-assign-guide`, `POST .../assign-guide` tại `backend_laravel/routes/api.php:425-439`.
- Controller: `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php`; methods `candidates()`, `autoAssign()`, `assign()`.
- Service: `GuideAssignmentService`. Model: `Guide`, `Tour`, `TourDeparture`, `Destination` qua belongs-to-many relation.
- Middleware: `auth:sanctum`, `role:admin`; Policy/Gate: Không sử dụng.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng cho candidate query.

#### Database

- Read: `tours.destination_id`; pivot `tour_destinations`; `guides.status/user_id`; pivot `guide_destinations`; assignments/departures cho các rule schedule tiếp theo.
- Điều kiện khu vực: service lặp từng destination ID và thêm một `whereHas('destinations', id)`; guide phải có tất cả, không chỉ giao một phần.
- Khi tập destination rỗng: trả `Guide::query()->whereRaw('1 = 0')`.
- Insert/Update/Delete: Không có trong candidate query.
- Migration: `backend_laravel/database/migrations/2026_06_10_220020_create_tours_table.php`; `backend_laravel/database/migrations/2026_06_10_220210_create_tour_destinations_table.php`; `backend_laravel/database/migrations/2026_06_14_145318_create_guides_table.php`; `backend_laravel/database/migrations/2026_07_07_055358_create_guide_destinations_table.php`.
- Transaction/Rollback/Lock: candidate GET không transaction/lock; auto/strict gọi query bên trong transaction và lock guide được chọn theo BR-056/057.
- Idempotent: query chỉ đọc. Audit Log: Không sử dụng.

#### Validation, Authorization, Exception và Data Integrity

- Guide phải `status='active'` và `whereHas('user')`; không destination trả danh sách rỗng.
- Chỉ admin qua route group. Departure không tồn tại trả 404 từ route binding.
- `backend_laravel/app/Models/GuideDestination.php` không cung cấp model pivot hợp lệ vì khai báo class khác; flow này dùng `Guide::destinations()` belongs-to-many và không import file đó. Bằng chứng endpoint sai từ bất nhất class: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; vì vậy không lập BUG.
- Không mutation nên không có Lost Update/Duplicate/Dirty Write/Data Loss từ chính query.

#### Kết luận

**Đúng.** Active/user, hợp nhất hai nguồn destination, điều kiện “tất cả” và nhánh query rỗng đều có source trực tiếp.

## Danh sách BUG

**Không có BUG được lập cho BR-035–BR-053.** Các rủi ro concurrency/rollback đã ghi trong phần Data Integrity không được chuyển thành BUG vì source vẫn triển khai đúng mệnh đề tài liệu và tài liệu không quy định kết quả đồng thời tương ứng.
