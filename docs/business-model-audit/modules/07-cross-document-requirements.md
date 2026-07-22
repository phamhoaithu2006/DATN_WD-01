# Audit Business Model — Yêu cầu xuyên tài liệu

## Phạm vi và baseline

- Audit `SR-001`–`SR-013` được chuẩn hóa tại `docs/business-model-audit/00-rule-catalog-and-methodology.md` từ FR, NFR, UC, diagram, ERD, API và ma trận nhưng chưa được câu chữ `BR-001`–`BR-096` bao phủ đầy đủ.
- Baseline lịch sử: commit `d9ddfd25c02d94ebfd1cd12ce42341cfbeaa6219`. Snapshot hậu sửa: working tree nhánh `fix/business-model-audit-bugs` kế thừa `044d8cd59083e5f7ca5a1a202b0fdc581be47bc5`; 239 route tổng cộng, gồm 238 API route.
- Không review code style, naming, performance, architecture, design pattern và không đề xuất refactor.
- Trong phạm vi SR này, source không có layer Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy riêng. Service, middleware, frontend và test chỉ được ghi khi có lời gọi/bằng chứng trực tiếp.

## Bảng tổng hợp

| Business Rule | Đã triển khai | File | Hàm | Đúng / Sai / Thiếu | Mức độ ảnh hưởng |
|---|---|---|---|---|---|
| SR-001 | Có | `Customer/TourController.php` | `index_gdkh()`, `search_gdkh()`, `filter_gdkh()`, `show_gdkh()` | Đúng | — |
| SR-002 | Có | `routes/api.php`; `AuthController.php` | closure `/auth/me`; `me()` | Đúng | — |
| SR-003 | Có | `CustomerDashboardController.php` | `summary()` | Đúng | — |
| SR-004 | Có | `WishlistController.php`; migration wishlist | `index()`, `store()`, `destroy()` | Đúng | — |
| SR-005 | Có | `AdminProfileController.php` | `show()`, `update()`, `changePassword()` | Đúng | BUG-XD-003 — Resolved |
| SR-006 | Có | `GuideProfileController.php`; `Guide.php`; migration restore certificate type | `show()`, `update()`, `changePassword()` | Đúng | BUG-XD-002 — Resolved |
| SR-007 | Có | `SupportProfileController.php` | `show()`, `update()`, `changePassword()` | Đúng | Medium — [Suy luận từ source code] nguy cơ partial update khi lần ghi thứ hai lỗi |
| SR-008 | Có | `GuideDashboardController.php` | `show()` và helper aggregate | Đúng | Low — giới hạn đếm/filter được ghi nhận |
| SR-009 | Có | `AdminTourDepartureBookingController.php` | `index()` | Đúng | — |
| SR-010 | Có | `routes/api.php` | khai báo middleware throttle | Đúng | — |
| SR-011 | Có | `GuideTourController.php` | `index()`, `upcoming()`, `ongoing()`, `completed()`, `show()` | Đúng | — |
| SR-012 | Có | `VnpayPaymentController.php` | `status()`, `paymentStatusResponse()` | Đúng | — |
| SR-013 | Có | `AdminNotificationBellController.php`; `SupportNotificationController.php` | list/count/detail/read-one/read-all | Đúng | — |

## Phân tích chi tiết

### SR-001 — Danh sách, tìm kiếm, lọc và chi tiết tour công khai

**Business Rule.** Public đọc danh sách/tìm kiếm/lọc/sắp xếp tour `published`, phân trang và xem chi tiết tour `published` theo slug.

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/TourController.php` — `TourController::{index_gdkh,search_gdkh,filter_gdkh,show_gdkh,getCustomerTourList,customerTourQuery,applyTourFilters,applyDepartureConditions,applySort,validateFilters}`.
- Route: `GET /api/tours`, `/api/tours/search`, `/api/tours/filter`, `/api/tours/{slug}` tại `backend_laravel/routes/api.php`; public, không có auth middleware.
- Resource/Model: `backend_laravel/app/Http/Resources/TourResource.php`; `Tour`, `TourDeparture`, `Category`, `Destination`, `TourImage`, itinerary và age pricing relation.
- Migration: `2026_06_10_220000_create_categories_table.php`, `2026_06_10_220010_create_destinations_table.php`, `2026_06_10_220020_create_tours_table.php`, `2026_06_10_220040_create_tour_departures_table.php`, migrations image/itinerary/age-pricing.
- Frontend: `frontend_react/src/services/customerApi.js::{fetchTours,filterTours,fetchTourDetail}`; `CustomerPage.jsx`, `TourDetailPage.jsx`, `Header.jsx` gọi service.
- Service/Action/Domain Service/Repository/Observer/Listener/Event/Policy/Gate/Job/Command/Scheduler/Notification/Queue/Cache/Audit: Không sử dụng trong flow này.

**Database**

- Read: catalog/tour/departure và quan hệ; chỉ lấy `tours.status=published`, departure eager-load là `open` và không trước hôm nay.
- Insert/Update/Delete/Soft Delete/History/Audit Log: Không có.
- Transaction/Rollback/Lock: Không có vì flow chỉ đọc. Idempotent: GET lặp không ghi dữ liệu.

**Validation, Authorization, Response và Exception**

- `keyword` nullable string tối đa 255; ID/duration/guest integer dương; date hợp lệ; giá numeric không âm; `per_page` 1–50; sort trong allowlist. Alias `start_date/min_slots` được chuẩn hóa về departure date/guests.
- Public được phép. Slug thiếu/không published đi qua `firstOrFail()`; query sai trả `422`.
- Response danh sách là `TourResource` collection phân trang; detail là một `TourResource` và có `bookings_count` loại booking cancelled.
- Data integrity: filter departure được gom vào cùng một `whereHas`, nên ngày/số khách/giá phải thỏa trên cùng departure. Không có mutation để phát sinh lost update/dirty write/data loss.

**Kết luận: Đúng.** Source triển khai đủ contract SR-001. Test hiện có chỉ xác minh route `/api/tours` public và HTTP 200; bằng chứng test tự động cho ma trận filter/detail: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

### SR-002 — Đọc phiên người dùng hiện tại

**Source Code**

- File/Class/Method: `backend_laravel/routes/api.php` — closure `GET /api/auth/me`; `backend_laravel/app/Http/Controllers/Api/AuthController.php` — `AuthController::me()` cho `GET /api/user`.
- Middleware: `/auth/me` dùng `auth:sanctum`; `/user` dùng `auth:sanctum`, `role:customer`.
- Model/Migration: `User`, `Role`, `SupportStaff`; users/roles/personal-access-token/support-staff migrations.
- Frontend: `frontend_react/src/layouts/SupportLayout.jsx` gọi `/auth/me`; auth token/guard nằm trong `authStorage.js`, `apiClient.js`, `ProtectedAdminRoute.jsx`.
- Service/Repository/Observer/Listener/Event/Policy/Gate/Notification/Queue/Cache/Audit: Không sử dụng.

**Database và kiểm soát**

- Read current `users`, relation `role`; closure còn load `supportStaff.user`. Không ghi DB.
- Validation body/query: Không có. Authorization do Sanctum và, với `/user`, `CheckRole::handle()`.
- Transaction/Rollback/Lock: Không có; GET idempotent.
- Exception: guest trả `401`; non-customer gọi `/user` trả `403`.
- Response: closure `{user}`; controller `{success:true,user,data}`. Hai envelope khác nhau đúng với source hiện tại.
- Data integrity/Notification/Queue: Không có mutation; không có cơ chế tương ứng.

**Kết luận: Đúng.** `RbacAuthorizationTest.php` test `auth me returns the authenticated user with role` assert HTTP 200, `user.id` và `user.role.name`.

### SR-003 — Customer profile summary

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerDashboardController.php` — `summary()`.
- Route: `GET /api/profile/summary`, middleware `auth:sanctum`, `role:customer`.
- Model/Migration: `User::bookings()`, `User::wishlists()`; users, bookings và `2026_06_10_220110_create_wishlists_table.php`.
- Frontend: `customerApi.js::fetchProfileSummary()`; `CustomerPage.jsx` gọi cùng `fetchWishlist()`.
- Service/Action/Repository/Observer/Listener/Event/Policy/Gate/Notification/Queue/Cache/Audit: Không sử dụng.

**Database, Validation và Exception**

- Read current user, `COUNT(bookings)` và `COUNT(wishlists)`; không insert/update/delete.
- Không có input validation. Authorization: middleware `auth:sanctum`, `role:customer` quyết định `401/403` và controller chỉ đọc `$request->user()`. Response gồm `id`, `full_name`, `email`, `phone`, `avatar_url`, `bookings_count`, `wishlist_count`.
- Transaction/Rollback/Lock: Không có; GET idempotent. Hai count được chạy độc lập, không có snapshot transaction.
- Data integrity: chỉ đọc; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về lost update, duplicate, dirty write, deadlock hoặc data loss trong method.

**Kết luận: Đúng.** Test tự động trực tiếp cho payload summary: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

### SR-004 — Wishlist customer

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/WishlistController.php` — `index()`, `store()`, `destroy()`.
- Route: `GET|POST /api/tours/wishlist`, `DELETE /api/tours/wishlist/{tour_id}` dưới `auth:sanctum`, `role:customer`.
- Model: `User::wishlists()` belongs-to-many `Tour`; `TourResource` cho danh sách. Migration `2026_06_10_220110_create_wishlists_table.php` có FK cascade và unique `(user_id,tour_id)`.
- Frontend: `customerApi.js::{fetchWishlist,addWishlist,removeWishlist}`; `CustomerPage.jsx` gọi ba function; profile/tour-detail có dữ liệu liên quan.
- Service/Repository/Observer/Listener/Event/Policy/Gate/Notification/Queue/Cache/Audit: Không sử dụng.

**Database và kiểm soát**

- Read/paginate 10 wishlist của current user; insert pivot bằng `syncWithoutDetaching`; delete pivot bằng `detach` chỉ trên relation của current user.
- Validation store: `tour_id` required, exists `tours,id`; path delete không có `whereNumber` hoặc validation tồn tại.
- Authorization/Middleware: Sanctum yêu cầu đăng nhập, `CheckRole::handle()` chỉ cho customer; mọi read/write đi qua relation của current user.
- Transaction/Rollback/Lock: không khai báo. Idempotency: add lặp không tạo thêm pivot nhờ `syncWithoutDetaching` và unique DB; delete lặp vẫn trả success và không xóa dữ liệu user khác.
- Exception: auth/role `401/403`, validation `422`; không có catch tùy biến cho lỗi constraint.
- Data Integrity: unique `(user_id,tour_id)` ngăn pivot trùng. [Suy luận từ source code] Khi hai request add cùng cặp chạy đồng thời, constraint vẫn bảo vệ invariant một row nhưng HTTP của request tranh chấp không được controller quy định.

**Kết luận: Đúng.** Test tự động wishlist: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

### SR-005 — Hồ sơ và mật khẩu admin

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Admin/AdminProfileController.php` — `show()`, `update()`, `changePassword()`.
- Route: `GET|PUT /api/admin/profile`, `PUT /api/admin/profile/password` dưới `auth:sanctum`, `role:admin`.
- Model/Migration: current `User`; `0001_01_01_000000_create_users_table.php`, `2026_06_10_215910_add_vivugo_columns_to_users_table.php`.
- Frontend admin profile route/component/caller: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** sau khi kiểm `frontend_react/src/routes/AppRoutes.jsx`, admin layout/header và services.
- Service/Repository/Observer/Listener/Event/Policy/Gate/Notification/Queue/Cache/Audit: Không sử dụng.

**Database, Validation và Exception**

- Read current user; update `users.full_name/email/phone/avatar_url` và password hash.
- Profile: fields `sometimes`; name/email max150, email unique bỏ qua current user, phone max20, `avatar_url` nullable string max500; `avatar` là JPG/JPEG/PNG/WebP tối đa 5.120 KB. Gửi đồng thời file và `avatar_url` trả `422`. Password: current required; new field `password` min6, confirmed; current sai trả `422`.
- Authorization/Middleware: Sanctum yêu cầu đăng nhập; `CheckRole::handle()` chỉ cho admin. Controller luôn lấy user từ `$request->user()`.
- Transaction/Rollback/Lock: Không có. Idempotency key: Không có. Update một row; không có history/audit/notification.
- Data Integrity: email unique được validation bảo vệ; mỗi action chỉ update current `users` row. File avatar hợp lệ được lưu dưới disk `public/avatars`, URL public được ghi vào `users.avatar_url`; input URL cũ vẫn được hỗ trợ.
- Không có transaction kết hợp filesystem và update user; rollback file khi DB update lỗi: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

**Kết luận: Đúng.** `BUG-XD-003` đã được sửa. `BusinessModelAuditBugFixTest.php` xác minh upload, lưu DB/storage, mutual exclusion và giới hạn 5.120 KB.

### SR-006 — Hồ sơ và mật khẩu tour guide

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Guide/GuideProfileController.php` — `show()`, `update()`, `changePassword()`; `backend_laravel/app/Models/Guide.php` — `$fillable` và relations.
- Route: `GET|PUT /api/guide/profile`, `PUT /api/guide/change-password`; `auth:sanctum`, `role:tour guide`.
- Model/Migration: `User`, `Guide`, `Language`, `GuideLanguage`, `GuideExperience`, `Certificate`; users/guides/language-level/guide-language/certificate/experience migrations và `2026_07_22_000000_restore_certificate_type_to_guides_table.php`.
- Frontend: `frontend_react/src/services/guideProfileApi.js`; `GuideProfilePage.jsx`; route `/guide/profile` qua guide guard.
- Service/Repository/Observer/Listener/Event/Policy/Gate/Notification/Queue/Cache/Audit: Không sử dụng.

**Database và transaction**

- Show đọc guide theo current user cùng user/languages/certificates.
- Update lưu file avatar trước; `DB::transaction()` cập nhật user/guide, sync pivot `guide_languages`, xóa/tạo lại `guide_experiences`. Exception DB tự rollback; catch xóa avatar mới và trả `500`; avatar cũ chỉ xóa sau commit.
- Password update một row user, không transaction/lock/history. Không có row lock hoặc optimistic version.
- Idempotency: không có idempotency key. Gửi lại cùng payload profile đặt lại cùng giá trị nhưng tiếp tục thực hiện sync/xóa-tạo experience và xử lý file nếu có; đổi mật khẩu lặp với mật khẩu cũ ban đầu không còn qua xác minh sau lần thành công đầu.

**Validation, Authorization và Data Integrity**

- User: name/email/phone; avatar JPG/JPEG/PNG/WebP max5120 KB. Guide: `certificate_type` max100, experience 0–40, status active/inactive. Language ID exists; `level_id` chỉ integer. Certificate ID exists; issued year 1900 đến năm hiện tại. Password cũ/mới, min6/confirmed; sai hoặc trùng cũ trả `400`.
- Không có profile trả `404`; middleware chặn guest/non-guide. `RbacAuthorizationTest.php` chỉ có negative test customer gọi `/api/guide/profile` nhận `403`.
- Controller đưa `certificate_type` vào `$guideUpdateData`; `Guide::$fillable` chứa field này và migration hậu sửa tạo `guides.certificate_type VARCHAR(100) NULL`.

**Kết luận: Đúng.** `BUG-XD-002` đã được sửa. `GuideBusinessModelRegressionTest.php` xác minh PUT/GET round-trip ở biên 100 ký tự và từ chối 101 ký tự.

### SR-007 — Hồ sơ và mật khẩu support staff

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Support/SupportProfileController.php` — `show()`, `update()`, `changePassword()`.
- Route: `GET|PUT /api/support/profile`, `PUT /api/support/change-password`; `auth:sanctum`, `role:support staff`.
- Model/Migration: `User::supportStaff()`, `SupportStaff`; users, `2026_06_22_032814_create_support_staff_table.php`, `2026_07_01_000001_add_user_id_to_support_staff_table.php`.
- Frontend: `supportProfileApi.js`; `SupportProfilePage.jsx`; route `/support/profile`.
- Service/Repository/Observer/Listener/Event/Policy/Gate/Notification/Queue/Cache/Audit: Không sử dụng.

**Database, Validation và Exception**

- Show đọc current user/role/support profile. Update ghi user và đồng bộ name/email/status sang `support_staff`; password ghi hash vào user.
- Profile validation: name/email max150, email unique, phone max20, status active/inactive. Password old/new min6/confirmed; old sai hoặc new trùng old trả `422`. Thiếu support profile khi update trả `404`.
- Authorization/Middleware: Sanctum yêu cầu đăng nhập; `CheckRole::handle()` chỉ cho support staff; controller dùng current user và relation `supportStaff` của user đó.
- Transaction/Rollback/Lock: Không có. `$user->update()` chạy trước `$supportStaff->save()`.
- Data Integrity: [Suy luận từ source code] nếu `$supportStaff->save()` lỗi sau khi `$user->update()` thành công, update user không được rollback và hai bảng ở trạng thái partial. Đây không phải BUG tài liệu vì FR/UC không quy định transaction/atomicity.
- Idempotency/audit/notification/queue: Không có cơ chế riêng.

**Kết luận: Đúng.** Hành vi chức năng SR-007 có đủ source; test tự động trực tiếp: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

### SR-008 — Dashboard tour guide

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Guide/GuideDashboardController.php` — `show()`, `departureBaseQuery()`, `bookedIncomeQuery()`, helper count/income/overview/review.
- Route: `GET /api/guide/dashboard`; `auth:sanctum`, `role:tour guide`.
- Model/Migration: `Guide`, `TourGuideAssignment`, `TourDeparture`, `Tour`, `Booking`, `Review`; guides/assignments/departures/bookings/reviews migrations.
- Frontend: `guideDashboardApi.js::getGuideDashboard()`; `GuideDashboardPage.jsx`; route `/guide`.
- Service: controller khởi tạo `TourPricingService` trong mapper. Action/Repository/Observer/Listener/Event/Policy/Gate/Notification/Queue/Cache/Audit: Không sử dụng.

**Database và response**

- Read assignment không cancelled, departure/tour, booking không cancelled có payment paid, guide review visible và các aggregate. Không ghi DB.
- Validation: không có input body/query/path cần validate cho endpoint này.
- Authorization/Middleware: Sanctum yêu cầu đăng nhập; `CheckRole::handle()` chỉ cho tour guide; dữ liệu query scope theo Guide thuộc current user.
- Exception: thiếu Guide profile là alternative response HTTP 200 với `guide.id=null`, count bằng 0 và collection rỗng; auth/role sai trả `401/403`.
- Transaction/Rollback/Lock: Không có; GET idempotent.
- `notifications_count` luôn bằng 0; controller không query notifications. `upcoming_count`/`ongoing_count` đếm collection đã giới hạn 5, `today_count` đếm collection giới hạn 6. Dashboard base query không loại `tour_departures.status=cancelled/completed` khỏi các tập date-based. Đây là giới hạn đầu ra được chứng minh; tài liệu không đặt invariant định lượng đủ rõ để lập BUG.
- Data Integrity: action chỉ đọc; không insert/update/delete. Các count/list được truy vấn riêng, không có snapshot transaction giữa các aggregate.
- FR-019 ghi precondition có Guide profile, nhưng UC-044/API #60 ghi chính xác nhánh không có profile vẫn 200; canonical SR dùng contract chi tiết hơn của UC/API.

**Kết luận: Đúng.** Source khớp SR-008 đã chuẩn hóa. Test tự động dashboard: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

### SR-009 — Admin xem khách đã booking theo departure

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Admin/AdminTourDepartureBookingController.php` — `index()`.
- Route: `GET /api/admin/tour-departures/{tourDeparture}/booked-customers`; `auth:sanctum`, `role:admin`; route-model binding.
- Service: `TourPricingService::{resolveBasePrice,resolveDiscountPrice}` được khởi tạo để trả pricing departure.
- Model/Migration: `TourDeparture`, `Tour`, `Booking`, `User`, `BookingContact`, `BookingParticipant`; departure/booking/contact/participant/users migrations.
- Frontend: `tourDepartureApi.js::getBookedCustomers()`; `TourDepartureListPage.jsx::loadBookedCustomers()`; `TourDepartureBookingModal.jsx`.
- Repository/Observer/Listener/Event/Policy/Gate/Notification/Queue/Cache/Audit: Không sử dụng.

**Database, Validation và Exception**

- Read booking đúng `tour_departure_id`, eager-load user/contact/participants; search booking code/user/contact; filter exact status/payment status; paginate.
- `search` max100; `status` và `payment_status` nullable string max50, không có enum; `per_page` 1–100. Binding thiếu trả `404`, query sai trả `422`, auth `401/403`.
- Authorization/Middleware: Sanctum yêu cầu đăng nhập; `CheckRole::handle()` chỉ cho admin.
- Response gồm departure, giá/chỗ và paginator booking với customer/contact/participants/pricing/status/note.
- Không mutation, transaction, rollback, lock, audit, notification hoặc queue. GET idempotent.
- Data Integrity: action chỉ đọc booking theo FK `tour_departure_id`; không insert/update/delete và không phát sinh duplicate/lost update/dirty write trong action.

**Kết luận: Đúng.** Test tự động trực tiếp cho endpoint #216: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

### SR-010 — Rate limiting khai báo tại route

**Source Code**

- File: `backend_laravel/routes/api.php`.
- Route/middleware: register `throttle:5,1`; login `6,1`; forgot-password `5,1`; `/api/chatbot` `20,1`; tour-review create/update `10,1`; VNPAY return/IPN `60,1`. `/api/travel-assistant` gọi `ChatBotController::handleChat` nhưng không có throttle route riêng.
- Controller/Class/Method liên quan: `AuthController::{register,login}`, `Customer\CustomerController::forgotPassword()`, `Chat\ChatBotController::handleChat()`, `Customer\TourReviewController::{store,update}`, `Customer\VnpayPaymentController::{returnStatus,ipn}`; rate decision do Laravel middleware.
- Model/Migration: rate limiter mặc định không tạo mutation nghiệp vụ trong controller; cache store tùy config. Policy/Gate/Service/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Audit: Không dùng để thực thi các limit này.

**Kiểm soát và exception**

- Vượt ngưỡng middleware trả `429`; request dưới ngưỡng tiếp tục qua validation/auth/controller tương ứng.
- Authorization: limiter khai báo trên route public và route có auth theo flow tương ứng; riêng tour-review create/update tiếp tục chịu `auth:sanctum`, `role:customer` sau throttle. Throttle không thay thế authorization của controller/route.
- Transaction/Rollback/Lock/Data mutation: Không áp dụng cho quyết định throttle. Idempotency: throttle đếm request, không biến mutation phía sau thành idempotent.
- Database: middleware throttle không insert/update/delete bảng nghiệp vụ; backend lưu counter phụ thuộc cache store theo cấu hình framework, không có migration nghiệp vụ dành riêng cho limiter.
- Queue: Không sử dụng Job/dispatch trong quyết định throttle.
- Data Integrity: limiter chỉ quyết định cho request đi tiếp hoặc trả `429`; không tạo transaction/lock/idempotency cho mutation của controller phía sau.
- `ApiRateLimitTest.php` test `login endpoint limits repeated requests`: sáu request body rỗng assert `422`, request thứ bảy assert `429`. Test trực tiếp cho các route limit còn lại: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

**Kết luận: Đúng.** Tất cả limit và ngoại lệ `/travel-assistant` khớp NFR-003/source.

### SR-011 — Tour được phân công của guide

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Guide/GuideTourController.php` — `getGuide()`, `baseQuery()`, `applyFilters()`, `sortForGuide()`, `guideStatus()`, `actionPolicy()`, `index()`, `upcoming()`, `ongoing()`, `completed()`, `show()`.
- Route: `GET /api/guide/tours`, `/upcoming`, `/ongoing`, `/completed`, `/{departureId}`; `auth:sanctum`, `role:tour guide`.
- Model/Migration: `Guide`, `TourGuideAssignment`, `TourDeparture`, `Tour`, `Booking`; guides/assignment/departure/tour/booking migrations.
- Frontend: `guideTourApi.js::{getGuideTours,getGuideTourUpcoming,getGuideTourOngoing,getGuideTourCompleted,getGuideTourDetail}`; `GuideToursPage.jsx`, `GuideAttendancePage.jsx`, guide sidebar.
- Service/Repository/Observer/Listener/Event/Policy/Gate/Notification/Queue/Cache/Audit: Không sử dụng trong năm action read này.

**Database, Validation và Authorization**

- Base query join assignment đúng guide, loại assignment `cancelled`, tính customer count từ booking non-cancelled/paid và pending replacement count.
- Authorization/Middleware: `auth:sanctum`, `role:tour guide`; controller lấy Guide theo current user và scope assignment theo `guide_id`.
- Filters `keyword`, `destination_id`, `from_date`, `to_date`, sort newest/oldest và per-page được đọc trực tiếp; không gọi validation. `per_page` cap tối đa 50 nhưng không đặt min ở helper.
- Detail bắt buộc departure nằm trong assignment của current guide và không cancelled; `firstOrFail()` trả `404` nếu sai owner/không tồn tại. Không Guide profile: list trả empty paginator 200, detail trả `data:null` 200.
- Exception: query detail sai assignment/ID trả `404`; thiếu Guide profile dùng alternative HTTP 200 nêu trên; guest/non-guide trả `401/403`.
- Read-only nên không transaction/rollback/lock/history. GET idempotent.

**Test và Data Integrity**

- `GuideTourAttendanceApiTest.php`, test `guide tour list exposes status aware actions`, assert thứ tự/guide status ongoing-upcoming-completed, quyền attendance false/true và history true.
- Test tự động cho filter, pagination, detail ownership và missing-profile: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- Không mutation nên không có duplicate/lost update/dirty write/data loss.

**Kết luận: Đúng.** Source thực thi scope assignment và nhóm thời gian theo SR-011.

### SR-012 — Customer đọc trạng thái payment VNPAY sở hữu

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/VnpayPaymentController.php` — `status()`, `paymentStatusResponse()`, `lastAttemptStatus()`.
- Route: `GET /api/customer/payments/vnpay/{payment}`, `whereNumber`, `auth:sanctum`, `role:customer`.
- Model/Migration: `Payment::booking()`, `Booking`, `Tour`, `TourDeparture`; `2026_06_10_220090_create_payments_table.php`, booking/departure/tour migrations và VNPAY expiry migration.
- Frontend service: `customerApi.js::fetchVnpayPaymentStatus()` tồn tại. Caller React cho function này: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; `VnpayPaymentResultPage.jsx` gọi public `fetchVnpayReturnStatus()`.
- Constructor có `VnpayService` và `VnpayPaymentLifecycleService`, nhưng `status()` không gọi hai service. Repository/Observer/Listener/Event/Policy/Gate/Notification/Queue/Cache/Audit: Không sử dụng.

**Database, Authorization và Response**

- Read payment/booking/tour/departure. Chỉ trả khi `payment_method=vnpay` và `booking.user_id=current user`; nếu không `abort(404)` để không lộ record.
- Authorization/Middleware: `auth:sanctum`, `role:customer`; ownership được kiểm bằng `booking.user_id=current user`.
- Không body/query validation; route binding/whereNumber. Response gồm payment status/amount/transaction/expiry, booking code/status/payment status/cancel reason, tour/date/people và last attempt.
- Exception: payment không tồn tại, không phải VNPAY hoặc không thuộc current customer đều trả `404`; guest/non-customer trả `401/403`.
- Không mutation/transaction/rollback/lock; GET idempotent.
- Data Integrity: action chỉ đọc và scope ownership qua `booking.user_id`; không insert/update/delete, duplicate, lost update hoặc dirty write trong action.
- `PaymentBookingSafetyTest.php`, test `customer can only see status of their own VNPAY payment`, assert owner 200 + đúng ID/status pending và customer khác 404.

**Kết luận: Đúng.** Backend contract và ownership có test trực tiếp; caller React cho service này: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**. Tài liệu không cam kết màn hình riêng cho endpoint này.

### SR-013 — Feed notification theo role và read-state ownership

**Source Code**

- Admin File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Admin/AdminNotificationBellController.php` — `AdminNotificationBellController::{index,unreadCount,markAsRead,markAllAsRead}`; routes `GET /api/admin/notification-bell`, `/unread-count`, `PATCH /read-all`, `/{id}/read`; `auth:sanctum`, `role:admin`.
- Support File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Support/SupportNotificationController.php` — `SupportNotificationController::{getMyNotifications,getUnreadCount,getNotificationDetail,markAsRead}`; routes #54, #56–#58; `auth:sanctum`, `role:support staff`.
- Model/Migration: `Notification`; `2026_06_10_220130_create_notifications_table.php`, `2026_06_24_161627_modify_notifications_table.php`.
- Frontend: `adminNotificationApi.js`, `components/admin/notifications/AdminNotificationBell.jsx`; `supportNotificationApi.js`, `SupportNotificationsPage.jsx`, `SupportNotificationBell.jsx`.
- Service/Repository/Observer/Listener/Event/Policy/Gate/Job/Command/Scheduler/Notification producer/Queue/Cache/Audit: Không sử dụng trong read-state flow.

**Database và kiểm soát**

- List/count/detail chỉ query `notifications.user_id=current user`. Read-one/read-all update `status=read`, `read_at=now` khi columns tồn tại; admin read-all update các unread/null-read rows của current user.
- Validation: support list paginate cố định 10; admin list dùng `per_page` mặc định 8 nhưng không validate/cap. Path id admin typed integer; support routes có `whereNumber`; không có body validation cho read actions.
- Authorization/Middleware: admin feed dùng `auth:sanctum`, `role:admin`; support inbox dùng `auth:sanctum`, `role:support staff`; mọi query/update scope `user_id=current user`.
- Exception: detail/read notification user khác hoặc ID không tồn tại trả `404`; guest/wrong role trả `401/403`.
- Transaction/Rollback/Lock/Audit history: Không có. Read-one/read-all lặp vẫn giữ trạng thái read nên idempotent về trạng thái, dù `read_at` được ghi lại khi gọi PATCH lặp.
- Data Integrity: update luôn scope user_id và không delete/insert. [Suy luận từ source code] Hai request mark-read đồng thời cùng đặt trạng thái `read`; `read_at` cuối cùng phụ thuộc thứ tự ghi, không tạo duplicate row.

**Kết luận: Đúng.** Source bao phủ feed/read-state cho hai controller cụ thể. Test tự động trực tiếp cho admin bell hoặc support inbox: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

## Bất nhất tài liệu-only, không phải BUG source mới

1. `03-business-rules-brd.md` §9.3 trỏ payment admin tới `BR-088–BR-089`; phạm vi đúng là `BR-034`.
2. Cùng §9.3 trỏ leave tới `BR-061–BR-071`; phạm vi đúng là `BR-068–BR-071`.
3. UC-037 ghi revoke notification campaign có transaction; `BR-083`, NFR-004 và source `NotificationController::revoke()` đều xác nhận không có transaction.
4. FR-019 ghi Guide profile là precondition toàn module; UC-044/API #60 xác nhận dashboard thiếu profile vẫn trả HTTP 200 payload rỗng.

## Sai lệch đã có BUG tại module khác

1. FR-005 Main/Exception Flow có câu khái quát trái BR-032/BR-034; mismatch transition admin đã được lập `BUG-AB-004`, không tạo BUG-XD trùng.

## Danh sách BUG

### BUG-XD-001 — Assignment không áp dụng mutation guard đã được FR/UC/API tuyên bố — Resolved

- Business Rule liên quan: FR-018 Preconditions; UC-030 Preconditions/Exception; API #211; đối chiếu BR-018.
- Diagnosis lịch sử: assignment source không gọi guard ở candidate/auto/strict/direct/cancel.
- Source hậu sửa: `TourDepartureGuideAssignmentController::{candidates,autoAssign,assign,directCandidates,directAssign,cancel}` gọi `TourDepartureMutationGuard`; `GuideAssignmentService::{autoAssign,assignSpecific}` và direct/cancel write flow kiểm tra lại sau khi khóa departure.
- Test: `GuideBusinessModelRegressionTest.php` xác minh cả sáu API trả `422` với `departure_date <= hôm nay` và future cancel vẫn thành công.
- Mức độ ảnh hưởng: High.
- Điều kiện tái hiện lịch sử: tạo departure có `departure_date <= hôm nay` rồi gọi assignment API; source cũ không từ chối. Hậu sửa, cùng điều kiện trả `422`.

### BUG-XD-002 — Guide cập nhật `certificate_type` hợp lệ nhưng dữ liệu bị bỏ qua — Resolved

- Business Rule liên quan: SR-006; FR-017; UC-043; API #66.
- Diagnosis lịch sử: controller nhận field, model loại khỏi mass assignment và schema migrate-fresh đã xóa cột.
- Source hậu sửa: `GuideProfileController::update()` dùng `max:100`; `Guide::$fillable` chứa field; migration `2026_07_22_000000_restore_certificate_type_to_guides_table.php` khôi phục cột nullable.
- Test: `GuideBusinessModelRegressionTest.php` xác minh lưu và đọc lại đúng.
- Mức độ ảnh hưởng: Medium.
- Điều kiện tái hiện lịch sử: PUT `certificate_type` mới từng trả success nhưng không lưu. Hậu sửa, GET đọc lại đúng giá trị.

### BUG-XD-003 — UC-019 yêu cầu upload avatar admin nhưng API chỉ nhận URL chuỗi — Resolved

- Business Rule liên quan: SR-005; UC-019; đối chiếu API #184.
- Diagnosis lịch sử: UC-019 ghi validation avatar theo type/size và ghi file public storage; source cũ không nhận file.
- File/Hàm: `backend_laravel/app/Http/Controllers/Api/Admin/AdminProfileController.php::update()`; `backend_laravel/routes/api.php`; `backend_laravel/app/Models/User.php`.
- Source hậu sửa: validation nhận `avatar` JPG/JPEG/PNG/WebP tối đa 5.120 KB, lưu `public/avatars`, ghi URL và từ chối file + URL đồng thời; input `avatar_url` vẫn tương thích.
- Test: `BusinessModelAuditBugFixTest.php` xác minh upload, validation và storage.
- Mức độ ảnh hưởng: Medium.
- Điều kiện tái hiện lịch sử: multipart `avatar` từng bị bỏ qua. Hậu sửa, file được lưu và response/DB trả URL public.

## Source Code Reference tổng hợp

- Route: `backend_laravel/routes/api.php`.
- Controllers: các controller nêu tại từng SR.
- Middleware: `backend_laravel/app/Http/Middleware/CheckRole.php`; Sanctum config/middleware Laravel.
- Models/migrations: nêu tại từng SR; constraint được lấy từ migration, không suy từ model.
- Tests: `backend_laravel/tests/Feature/RbacAuthorizationTest.php`, `ApiRateLimitTest.php`, `GuideTourAttendanceApiTest.php`, `PaymentBookingSafetyTest.php`, `GuideBusinessModelRegressionTest.php`, `BusinessModelAuditBugFixTest.php`, `BusinessModelConcurrencyMysqlTest.php`.
- Frontend: `frontend_react/src/routes/AppRoutes.jsx`, services/pages/components nêu tại từng SR.
