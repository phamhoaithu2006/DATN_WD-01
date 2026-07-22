# Audit Business Model — Xác thực, tài khoản và catalog (BR-001–BR-020)

## Phạm vi và nguyên tắc

- Baseline tài liệu: `docs/reverse-engineering/03-business-rules-brd.md` (BR-001–BR-020), đối chiếu thêm `04-srs.md`, `05-use-cases.md`, `07-database-erd.md`, `08-api-specification.md` và `09-permission-crud-matrices.md`.
- Baseline source: `backend_laravel/routes/api.php`, controller, service, model, migration và test liên quan trong repository hiện tại.
- `Đúng`: toàn bộ mệnh đề của Business Rule có bằng chứng trực tiếp trong source. `Sai`: source thực thi trái mệnh đề. `Thiếu`: chỉ có bằng chứng cho một phần bắt buộc.
- Không đánh giá code style, clean code, naming, performance, architecture hoặc design pattern; không đề xuất sửa/refactor.
- Trong phạm vi này không có thư mục/layer `Actions`, `UseCases`, `Domain Services`, `Repositories`, `Observers`, `Listeners`, `Events` hoặc `Jobs`. Khi từng rule không gọi thành phần tương ứng, tài liệu ghi `Không sử dụng`.
- Trạng thái hậu sửa ngày 2026-07-22 giữ nguyên chẩn đoán lịch sử của BUG-AB-002 và bổ sung bằng chứng `Resolved` từ source/test hiện tại.

## Bảng tổng hợp

| Business Rule | Đã triển khai | File | Hàm | Đúng / Sai / Thiếu | Mức độ ảnh hưởng |
|---|---|---|---|---|---|
| BR-001 | Có | `AuthController.php`; migrations users/roles/settings/tokens | `register()` | Đúng | Resolved — BUG-AB-002; mức độ lịch sử Medium |
| BR-002 | Có | `AuthController.php` | `login()` | Đúng | — |
| BR-003 | Có | `AuthController.php`; `Setting.php` | `login()`, `logout()` | Đúng | — |
| BR-004 | Có | `CheckRole.php`; `routes/api.php`; `bootstrap/app.php` | `handle()` | Đúng | — |
| BR-005 | Có | `CustomerController.php` | `updateProfile()` | Đúng | Resolved — BUG-AB-002; mức độ lịch sử Medium |
| BR-006 | Có | `CustomerController.php`; `Setting.php` | `changePassword()` | Đúng | — |
| BR-007 | Có | `CustomerController.php` | `forgotPassword()`, `resetPassword()` | Đúng | — |
| BR-008 | Có | `routes/api.php`; `CustomerManagerController.php` | `index_role()` | Đúng | — |
| BR-009 | Có | `PublicCatalogController.php` | `availableToursQuery()`, `applyAvailableTourConstraints()`, `applyAvailableDepartureConstraints()` | Đúng | — |
| BR-010 | Có | `PublicCatalogController.php` | `home()`, `categories()`, `destinations()` | Đúng | — |
| BR-011 | Có | `PublicCatalogController.php` | `home()`, `maskReviewerName()` | Đúng | — |
| BR-012 | Có | `Banner.php`; `PublicWidgetController.php` | `scopeVisible()`, `index()` | Đúng | — |
| BR-013 | Có | `TourManagerController.php` | `store()` | Đúng | — |
| BR-014 | Có | `TourManagerController.php` | `store()`, `update()`, `syncItineraries()`, `syncAgePricingRules()` | Đúng | — |
| BR-015 | Có | `TourManagerController.php` | `validateAgePricingRules()`, `syncAgePricingRules()` | Đúng | — |
| BR-016 | Có | `TourManagerController.php`; `Tour.php` | `destroy()`, `hide()`, `unhide()` | Đúng | — |
| BR-017 | Có | `TourDepartureController.php` | `store()`, `calculateReturnDate()` | Đúng | — |
| BR-018 | Có | `TourDepartureMutationGuard.php`; `TourDepartureController.php` | `isLocked()`, `assertCanMutate()`, `update()`, `destroy()` | Đúng | — |
| BR-019 | Có | `TourDepartureController.php`; hai notification service | `update()`, `sendForUpdatedDeparture()`, `notifyTourDepartureUpdated()` | Đúng | — |
| BR-020 | Có | `TourDepartureController.php` | `update()`, `destroy()` | Đúng | — |

## Phân tích chi tiết

### BR-001 — Đăng ký tài khoản customer

**Business Rule.** Đăng ký validate `full_name`, email/SĐT duy nhất và password được confirm với độ dài tối thiểu lấy từ setting; user mới có role `customer`, status `active`, password được hash.

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/AuthController.php` — `App\Http\Controllers\Api\AuthController::register()`.
- Route: `POST /api/auth/register`, khai báo tại `backend_laravel/routes/api.php`, middleware `throttle:5,1`.
- Service/Action/Use Case/Domain Service/Repository: Không sử dụng.
- Model: `backend_laravel/app/Models/User.php` (`User`), `Role.php` (`Role`), `Setting.php` (`Setting`).
- Observer/Listener/Event/Policy/Job/Command/Scheduler: Không sử dụng.
- Middleware: throttle; route public, không dùng `auth:sanctum`/role.
- Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.
- Migration: `0001_01_01_000000_create_users_table.php`; `2026_06_10_215900_create_roles_table.php`; `2026_06_10_215910_add_vivugo_columns_to_users_table.php`; `2026_06_10_055225_create_personal_access_tokens_table.php`; `2026_06_13_000001_create_settings_table.php`.
- Test hậu sửa: `backend_laravel/tests/Feature/AuthBookingBusinessModelRegressionTest.php` — `đăng ký từ chối chuỗi dài hơn giới hạn cột users`.

**Database**

- Read: `settings.key/value`, `roles.name` (`customer`), kiểm tra `users.email`, `users.phone` qua validation.
- Insert: `users.role_id/full_name/email/phone/password/status`; `personal_access_tokens.tokenable_type/tokenable_id/name/token/abilities/expires_at` qua Sanctum.
- Update/Delete/Soft Delete/Restore/Pivot/History/Audit Log: Không có trong `register()`.
- Transaction: Không có `DB::transaction()`; rollback ứng dụng: Không có.
- Lock: Không có. Idempotent: Không có idempotency key; request hợp lệ mới sinh user/token.

**Validation và Authorization**

- `full_name`: required|string|max:150; `email`: required|email|max:150|unique:users,email; `phone`: required|string|max:20|unique:users,phone; `password`: required|string|`Password::min(Setting::intValueFor(..., 8))`|confirmed.
- Guest được phép; mọi actor đều đi qua cùng route public. Vượt throttle trả `429`; validation trả `422`.
- `Role::where('name', 'customer')->firstOrFail()` phát sinh not-found nếu role thiếu. Không có try/catch nghiệp vụ.

**Notification/Queue/Exception/Data Integrity**

- Notification/Queue/Audit Log: Không sử dụng.
- Exception: Laravel validation; `ModelNotFoundException` từ `firstOrFail`; lỗi DB không được bắt tại method.
- Data integrity: migration có unique cho `users.email` nhưng không có unique cho `users.phone`; validation ứng dụng kiểm tra phone trước insert. Giới hạn validation `full_name/email/phone` hiện khớp các cột 150/150/20. Không có row lock/transaction bảo vệ chuỗi check-then-insert của phone.

**Kết luận: Đúng.** Toàn bộ mệnh đề BR-001 có code trực tiếp; sai lệch giới hạn validation/schema của BUG-AB-002 đã được xử lý và có test hồi quy.

### BR-002 — Đăng nhập bằng email hoặc SĐT

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/AuthController.php` — `AuthController::login()`.
- Route: `POST /api/auth/login`, `throttle:6,1`.
- Service/Action/Use Case/Domain Service/Repository: Không sử dụng.
- Model: `User`, relation `User::role()`; migration `0001_01_01_000000_create_users_table.php`, `2026_06_10_215910_add_vivugo_columns_to_users_table.php`.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.
- Middleware: throttle; route public.

**Database**

- Read: `users.email/phone/password/status/role_id`, `roles`; Insert token khi thành công.
- Update/Delete/Audit: Không có đối với user; Sanctum tạo token.
- Transaction/Rollback/Lock: Không có. Idempotent: mỗi login thành công tạo token mới, không có guard chống lặp.

**Validation/Authorization/Exception**

- `identifier` required|string; `password` required|string; `remember` sometimes|boolean.
- Email được lower-case khi query. Nhánh phone loại ký tự không phải số và thử thêm dạng `0...` nếu bắt đầu `84`.
- Sai user/password trả `401`; status khác `active` trả `403`; đúng trả token. Không có Policy/Gate.
- Data integrity: chỉ đọc user trước khi tạo token; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về lost update, dirty write hoặc data loss trong method.

**Kết luận: Đúng.** Các nhánh email/SĐT, chuyển `84`, mã `401/403` khớp đầy đủ.

### BR-003 — Thời hạn token và logout

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/AuthController.php` — class `AuthController`, methods `login()`, `logout()`; `backend_laravel/app/Models/Setting.php` — class `Setting`, methods `intValueFor()`, `boolValueFor()`; model `backend_laravel/app/Models/User.php` dùng trait `HasApiTokens`.
- Route: `POST /api/auth/login`; `POST /api/auth/logout` dưới `auth:sanctum`.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.
- Migration: `2026_06_10_055225_create_personal_access_tokens_table.php`; `2026_06_13_000001_create_settings_table.php`.

**Database và kiểm soát**

- Read settings `session_timeout_minutes`, `allow_remember_login`; insert token với `expires_at`; logout delete đúng `currentAccessToken()`.
- Transaction/Rollback/Lock: Không có. Idempotent: logout lần sau bằng token đã xóa không còn qua được Sanctum; không có idempotency handler riêng.
- Validation: `remember` sometimes|boolean. Authorization: logout cần token hợp lệ; login public.
- Notification/Queue/Audit: Không sử dụng. Exception: authentication/validation theo framework.
- Data integrity: `personal_access_tokens.token` có unique; không có update nhiều bảng trong một transaction.

**Kết luận: Đúng.** Mặc định 120 phút, remember 30 ngày khi setting cho phép và xóa token hiện tại đều có bằng chứng.

### BR-004 — Middleware role

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Middleware/CheckRole.php` — `CheckRole::handle()`; `backend_laravel/bootstrap/app.php` đăng ký alias `role`; `backend_laravel/routes/api.php` gắn middleware.
- Route: các group `auth:sanctum`, `role:customer`, `role:admin`, `role:tour guide`, `role:support staff`.
- Model: `User`, `Role`; migrations roles/users.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database và kiểm soát**

- Read `users.role_id`, `roles.name`; không ghi DB.
- Transaction/Rollback/Lock/Idempotency/Audit: Không áp dụng vì chỉ kiểm soát request.
- Validation: role hiện tại và danh sách role đều `trim` + `mb_strtolower`, dùng `in_array(..., true)`.
- Authorization: thiếu user trả `401` trong middleware; auth exception API cũng được render `401` ở `bootstrap/app.php`; role rỗng/sai trả `403` với JSON.
- Policy/Gate: Không sử dụng; `AppServiceProvider::boot()` không đăng ký Gate trong source đã truy vết.
- Exception: response trực tiếp, không try/catch.
- Data integrity: middleware chỉ đọc user/role và không ghi dữ liệu; lost update, duplicate, dirty write, deadlock, race condition và data loss không áp dụng cho method này.

**Kết luận: Đúng.** Thứ tự route group Sanctum rồi role và kết quả `401/403` được chứng minh.

### BR-005 — Customer cập nhật hồ sơ

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerController.php` — `CustomerController::updateProfile()`.
- Route: `PUT /api/profile/update` trong group `auth:sanctum`, `role:customer`.
- Model/Migration: `User`; `0001_01_01_000000_create_users_table.php`; `2026_06_10_215910_add_vivugo_columns_to_users_table.php`.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.
- Storage integration: Laravel `Storage::disk('public')` cho `avatars`.
- Test hậu sửa: `backend_laravel/tests/Feature/AuthBookingBusinessModelRegressionTest.php` — các test `cập nhật hồ sơ ... giới hạn cột users`.

**Database**

- Update `users.full_name`, `users.phone`, và `users.avatar_url` khi có file; không insert/delete DB.
- File: lưu avatar mới; chỉ xóa file cũ nếu parsed path bắt đầu `/storage/avatars/`.
- Transaction/Rollback/Lock: Không có. Idempotent: không có cơ chế idempotency; upload lặp tạo file mới.
- Audit Log/History: Không có.

**Validation/Authorization/Exception/Data Integrity**

- `full_name` required|string|max:150; `phone` nullable|string|max:20; `avatar` nullable|image|mimes jpg,jpeg,png,webp|max:5120 KB.
- Chỉ current customer qua route middleware; method lấy `$request->user()`.
- Validation/file/DB exception không được catch.
- Data integrity: file mới được lưu và nhánh avatar nội bộ xóa file cũ trước `$user->update()`. Không có transaction kết hợp filesystem/DB. Giới hạn `full_name/phone` hiện khớp các cột 150/20.

**Kết luận: Đúng.** Mọi mệnh đề BR-005 khớp code; sai lệch schema của BUG-AB-002 đã được xử lý và có test biên 20/21 ký tự cho SĐT.

### BR-006 — Đổi mật khẩu khi biết mật khẩu hiện tại

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerController.php` — class `CustomerController`, method `changePassword()`; `backend_laravel/app/Models/Setting.php` — class `Setting`, method `intValueFor()`.
- Route: `PUT /api/profile/change-password`, `auth:sanctum`, `role:customer`.
- Model/Migration: `User`, `Setting`; migrations users/settings.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database và kiểm soát**

- Read setting + current `users.password`; update `users.password` bằng `Hash::make()`.
- Transaction/Rollback/Lock/Audit/History: Không có. Idempotent: gọi lặp với cùng current password cũ thất bại sau lần đầu.
- Validation: `current_password` required; `new_password` required + Password min động + confirmed.
- Authorization: customer đã xác thực, chỉ current user. Sai mật khẩu cũ trả `400`; validation trả `422`.
- Notification/Queue: Không sử dụng.
- Exception: sai mật khẩu cũ được xử lý bằng response `400`; validation không hợp lệ trả `422`; method không có `try/catch` riêng.
- Data integrity: một row update; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về lost update/duplicate/data loss trong method.

**Kết luận: Đúng.**

### BR-007 — OTP quên/reset mật khẩu

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerController.php` — class `CustomerController`, methods `forgotPassword()`, `resetPassword()`.
- Routes: `POST /api/forgot-password` (`throttle:5,1`); `POST /api/reset-password` (public, không throttle tại route).
- Model/Migration: `User`, `Setting`; `2026_06_13_144107_add_otp_to_users_table.php`; users/settings migrations.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database**

- `forgotPassword`: read user theo email/SĐT; update `users.otp`; không ghi `otp_expires_at`; trả `otp_in_db`.
- `resetPassword`: read user/OTP; update `users.password`, set `users.otp = null`.
- Transaction/Rollback/Lock: Không có. Idempotent: OTP bị xóa sau reset thành công nên cùng OTP không dùng lại qua method.
- Audit/History: Không có.

**Validation/Authorization/Notification/Exception**

- Forgot: `identifier` required. Reset: identifier/otp/password required; password min động + confirmed.
- Public; forgot throttle 5/phút, reset không có throttle tại route.
- Notification email/SMS/push/webhook/queue: Không sử dụng. Source không gán/kiểm `otp_expires_at`.
- User không tồn tại ở forgot trả `404`; OTP/user sai ở reset trả `400`; validation `422`.
- Data integrity: OTP mới ghi đè OTP cũ trên cùng user; đây là thao tác trực tiếp được source thể hiện. Không có lock/version.

**Kết luận: Đúng.** BR-007 mô tả cả phần có triển khai và phần `otp_expires_at`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; hai vế đều khớp source.

### BR-008 — Danh sách role công khai và admin

**Source Code**

- File/Class/Method: `backend_laravel/routes/api.php`; `backend_laravel/app/Http/Controllers/Api/Admin/CustomerManagerController.php` — `CustomerManagerController::index_role()`.
- Routes: `GET /api/roles` public; `GET /api/admin/roles` trong group admin.
- Model/Migration: `Role`; `2026_06_10_215900_create_roles_table.php`.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database và kiểm soát**

- Read toàn bộ `roles`; không ghi DB; không transaction/rollback/lock/audit.
- Authorization: route thứ nhất không có auth; route thứ hai có `auth:sanctum`, `role:admin` từ outer group.
- Validation: không có input/rule. Exception nghiệp vụ: Không sử dụng.
- Idempotent: read-only.
- Data integrity: endpoint chỉ đọc bảng `roles`, không có write nên không phát sinh lost update, duplicate, dirty write hoặc data loss từ method.

**Kết luận: Đúng.**

### BR-009 — Tour khả dụng trên trang chủ

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/PublicCatalogController.php` — `availableToursQuery()`, `applyAvailableTourConstraints()`, `applyAvailableDepartureConstraints()`, được gọi bởi `home()`.
- Route: `GET /api/home`, public.
- Model/Migration: `Tour`, `TourDeparture`; `2026_06_10_220020_create_tours_table.php`; `2026_06_10_220040_create_tour_departures_table.php`.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database và kiểm soát**

- Read `tours.status` và `tour_departures.status/departure_date/total_slots/booked_slots`; không ghi DB.
- Điều kiện đúng source: tour `published`; tồn tại departure `open`; `departure_date >= today`; biểu thức `COALESCE(total_slots,0)-COALESCE(booked_slots,0) > 0`.
- Validation request: không có; authorization public; transaction/rollback/lock/audit: không áp dụng; idempotent read-only.
- Exception/Notification/Queue: Không sử dụng.
- Data integrity: query chỉ đọc, không thay đổi `tours` hoặc `tour_departures`.

**Kết luận: Đúng.**

### BR-010 — Category/destination công khai

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/PublicCatalogController.php` — class `PublicCatalogController`, methods `home()`, `categories()`, `destinations()`.
- Routes: `GET /api/home`, `/api/catalog/categories`, `/api/catalog/destinations`, public.
- Model/Migration: `Category`, `Destination`, `Tour`, `TourDeparture`; migrations categories/destinations/tours/departures.
- Các layer Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database và kiểm soát**

- `categories()`/`destinations()` lọc `status=active`. Riêng `home()` còn `whereHas(tours)` với toàn bộ constraint BR-009 và giới hạn 6.
- Không ghi DB, transaction, rollback, lock hay audit; read-only idempotent.
- Validation: Không có input validation. Authorization: public, route không gắn `auth:sanctum` hoặc role middleware. Exception nghiệp vụ riêng: Không sử dụng.
- Data integrity: các method chỉ đọc category/destination/tour/departure, không ghi dữ liệu.
- Đối chiếu tài liệu: câu BR-010 khớp source. API Specification #4/#5 có câu diễn giải “có tour published/bookable” cho endpoint catalog độc lập, nhưng controller hai endpoint không có `whereHas`; đây là bất nhất tài liệu nội bộ, không phải mệnh đề BR-010.

**Kết luận: Đúng.**

### BR-011 — Review trên home và ẩn danh khách

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/PublicCatalogController.php` — class `PublicCatalogController`, methods `home()`, `maskReviewerName()`.
- Route: `GET /api/home`, public.
- Model/Migration: `TourReview`, `Tour`, `User`; `2026_07_21_000000_create_tour_reviews_table.php`; tours/users migrations.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database và kiểm soát**

- Read review `status=visible`, `comment IS NOT NULL` và `comment != ''`, tour `published`; eager-load chỉ tour id/title/slug và user id/full_name; latest, limit 3.
- Response map chỉ có id/rating/comment/reviewer_name/tour_title/tour_slug/created_at; không email/booking.
- Không ghi DB/transaction/rollback/lock/audit; idempotent read-only. Authorization: public, không có auth/role middleware. Validation: không có input validation.
- Exception/Notification/Queue: Không sử dụng.
- Data integrity: method chỉ đọc và project dữ liệu review, không thay đổi bảng nghiệp vụ.

**Kết luận: Đúng.**

### BR-012 — Widget công khai theo trạng thái và kỳ hiệu lực

**Source Code**

- File/Class/Method: `backend_laravel/app/Models/Banner.php` — `Banner::scopeVisible()`; `backend_laravel/app/Http/Controllers/Api/PublicWidgetController.php` — `index()`.
- Route: `GET /api/widgets`, public; model `Banner`; migrations banners/widget columns.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database và kiểm soát**

- Read `banners` với `status=active`, `start_date` null/<=now, `end_date` null/>=now; optional position; page khớp JSON/null/rỗng; sort `sort_order`, rồi id giảm.
- Validation: position/page nullable|string. Authorization public.
- Không write/transaction/rollback/lock/audit; read-only idempotent. Exception riêng/notification/queue: Không sử dụng.
- Data integrity: endpoint chỉ đọc bảng `banners`, không có mutation dữ liệu.

**Kết luận: Đúng.**

### BR-013 — Admin tạo tour

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Admin/TourManagerController.php` — `store()`.
- Route: `POST /api/admin/tours`, outer + nested `auth:sanctum`, `role:admin`.
- Model/Migration: `Tour`, `User`; `2026_06_10_220020_create_tours_table.php`, cùng migrations category/destination.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng; Storage được dùng nếu upload ảnh.

**Database**

- Insert `tours.category_id/destination_id/created_by/title/slug/.../duration_days/duration_nights/base_price/max_slots/available_slots/status` và các dòng con nếu payload có.
- `duration_nights=max(duration_days-1,0)`; `created_by=$request->user()->id`.
- Transaction: `DB::transaction()` bao toàn bộ create tour + DB image/itinerary/age rules; rollback tự động nếu closure ném exception. Lock: Không có. Idempotent: Không; slug DB unique.
- Audit Log/History: Không có.

**Validation/Authorization/Exception/Data Integrity**

- Các field cốt lõi: category_id/destination_id integer required; title max255; duration_days integer min1; base_price numeric; max_slots integer; status in draft,published,hidden,cancelled; cùng validation ảnh/itinerary/rule.
- Chỉ admin. ValidationException `422`, model/FK/unique exception không catch tại method.
- File ảnh được lưu trong DB transaction nhưng rollback DB không xóa file đã ghi; source không có cleanup trong catch. Đây là trạng thái filesystem/DB có bằng chứng; không có Business Rule yêu cầu atomic filesystem nên không lập BUG.

**Kết luận: Đúng.**

### BR-014 — Đồng bộ dữ liệu con của tour trong transaction

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Admin/TourManagerController.php` — class `TourManagerController`, methods `store()`, `update()`, `syncItineraries()`, `syncAgePricingRules()`; models `Tour`, `TourImage`, `TourItinerary`, `TourItineraryImage`, `TourAgePricingRule`.
- Routes: `POST /api/admin/tours`; `PUT /api/admin/tours/{id}`; admin middleware.
- Migrations: `2026_06_10_220020_create_tours_table.php`, `2026_06_10_220030_create_tour_images_table.php`, `2026_06_27_000001_create_tour_itineraries_table.php`, `2026_06_27_000002_create_tour_itinerary_images_table.php`, `2026_07_03_120000_create_tour_age_pricing_rules_table.php`.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng; Storage cho file tour.

**Database và kiểm soát**

- Insert/update tour và images; khi request update tồn tại `itinerary`, delete toàn bộ `tour_itineraries` cũ rồi insert payload; FK cascade delete images cũ. Tương tự delete/insert `tour_age_pricing_rules` khi key tồn tại.
- Transaction: cả store/update và thao tác dòng con trong `DB::transaction()`; rollback DB khi exception. Lock: Không có. Idempotent: PUT không có version/idempotency guard; cùng payload itinerary tiếp tục delete/recreate IDs.
- Validation đầy đủ nằm trong `store()`/`update()`; authorization admin; exception validation/framework, không custom catch.
- Audit/Notification/Queue: Không sử dụng.
- Data integrity: delete rồi insert nằm cùng transaction nên DB rollback phục hồi khi insert lỗi; file vật lý không thuộc DB rollback như đã ghi tại BR-013.

**Kết luận: Đúng.**

### BR-015 — Ràng buộc nhóm giá theo tuổi

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Admin/TourManagerController.php` — class `TourManagerController`, methods `validateAgePricingRules()`, `syncAgePricingRules()`; route create/update tour; model `TourAgePricingRule`; migration `backend_laravel/database/migrations/2026_07_03_120000_create_tour_age_pricing_rules_table.php`.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.
- Middleware: admin group.

**Database và kiểm soát**

- Delete/insert `tour_age_pricing_rules` khi sync; `free` ghi `price_value=0`.
- Validation request: label required/max150; min/max age integer min0; type enum; price numeric min0; percentage bị method chặn >100; max<min bị chặn; sau sort min_age, khoảng sau có min<=max trước bị chặn.
- Transaction/Rollback: được gọi bên trong transaction của store/update. Lock: Không có. Idempotent: sync lặp tạo IDs mới.
- Authorization admin; ValidationException với field cụ thể; không notification/queue/audit.
- Data integrity: migration không khai báo unique/check chống overlap; controller là nơi thực thi rule. **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về luồng ghi age rule khác ngoài controller/service đã truy vết trong phạm vi rule.

**Kết luận: Đúng.**

### BR-016 — Soft delete, hide và unhide tour

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Admin/TourManagerController.php` — class `TourManagerController`, methods `destroy()`, `hide()`, `unhide()`; model `backend_laravel/app/Models/Tour.php` dùng `SoftDeletes`.
- Routes: `DELETE /api/admin/tours/{id}`, `PATCH /{id}/hide`, `PATCH /{id}/unhide`; admin middleware.
- Migration: `2026_06_10_220020_create_tours_table.php` có `deleted_at` và status enum.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database và kiểm soát**

- Delete: update `tours.deleted_at` qua SoftDeletes. Hide: update status `hidden`; unhide chỉ khi current status `hidden`, rồi update `published`.
- Transaction/Rollback/Lock/Audit: Không có. Idempotency: hide lặp vẫn ghi hidden; unhide lặp lần sau trả `400`.
- Validation: route ID, `findOrFail`; authorization admin. Exceptions: `404`, unhide state sai `400`.
- Notification/Queue: Không sử dụng. Data integrity: một row mỗi action; không có optimistic/pessimistic lock.

**Kết luận: Đúng.**

### BR-017 — Tạo lịch khởi hành

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureController.php` — `store()`, `calculateReturnDate()`, `normalizeDeparturePrices()`.
- Route: `POST /api/admin/tours/{tourId}/departures`, admin middleware.
- Service: `backend_laravel/app/Services/AdminNotificationService.php::notifyTourDepartureCreated()` sau insert. Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.
- Model/Migration: `Tour`, `TourDeparture`, `Notification`; `2026_06_10_220040_create_tour_departures_table.php`, `2026_07_06_000001_add_base_and_discount_price_to_tour_departures_table.php`, notifications migrations.

**Database và kiểm soát**

- Read tour; insert `tour_departures.tour_id/departure_date/return_date/price/base_price/discount_price/total_slots/booked_slots/status`; `booked_slots=0`; notification service ghi notification admin theo implementation.
- `return_date = departure_date + max(tour.duration_nights,0)`.
- Transaction/Rollback/Lock: Không có trong `store()`. Idempotent: Không có; gửi lặp tạo departure mới.
- Validation: departure_date required/date/>=today; base/discount nullable numeric min0; total_slots integer min1; status enum; discount>base bị `ValidationException`.
- Authorization admin; exception validation/404; không catch.
- Audit Log: Không sử dụng. Notification: có, đồng bộ trực tiếp; Queue: Không sử dụng.
- Data integrity: departure được insert trước khi gọi notification; không có transaction gộp hai thao tác. Source không có rollback departure nếu notification ném exception.

**Kết luận: Đúng.**

### BR-018 — Khóa sửa/xóa/phân công departure đã bắt đầu hoặc đã qua

**Source Code**

- File/Class/Method: `backend_laravel/app/Services/TourDepartureMutationGuard.php` — `isLocked()`, `assertCanMutate()`; `TourDepartureController::update()`, `destroy()`; `TourDepartureGuideAssignmentController::{candidates,autoAssign,assign,cancel,directCandidates,directAssign}`; `GuideAssignmentService::{autoAssign,assignSpecific}`.
- Routes: `PUT/DELETE /api/admin/tours/departures/{id}` và sáu route candidate/assignment theo departure; admin middleware.
- Model/Migration: `TourDeparture`, `TourGuideAssignment`; departures/assignments migrations.
- Service: `TourDepartureMutationGuard`, `GuideAssignmentService`. Action/Use Case/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng riêng cho guard.

**Database và kiểm soát**

- Guard đọc `departure_date`; nếu `startOfDay <= today` ném ValidationException trước mutation/candidate query. Sáu action assignment đều gọi guard; các write path khóa departure và kiểm tra lại guard trong transaction.
- Update/delete có các write riêng mô tả BR-019/020. Assignment write có transaction/row lock; guard tự thân không mở transaction. Idempotent: không áp dụng cho nhánh bị chặn.
- Validation/authorization: admin + guard; lỗi field `departure` trả `422`.
- Regression: `GuideBusinessModelRegressionTest.php` xác minh cả sáu API trả `422` với departure ngày hôm nay. `BUG-XD-001` đã **Resolved**.
- Audit/Queue: Không sử dụng; notification chỉ thuộc nhánh update/delete controller, không phải guard.
- Data integrity: nhánh guard bị chặn ném exception trước mutation; tính toàn vẹn của write update/delete được truy vết riêng tại BR-019/BR-020.

**Kết luận: Đúng.**

### BR-019 — Xác nhận thay đổi departure có booking và gửi thông báo

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureController.php` — class `TourDepartureController`, method `update()`; `backend_laravel/app/Services/TourDepartureChangeNotificationService.php` — class `TourDepartureChangeNotificationService`, method `sendForUpdatedDeparture()`; `backend_laravel/app/Services/AdminNotificationService.php` — class `AdminNotificationService`, method `notifyTourDepartureUpdated()`.
- Route: `PUT /api/admin/tours/departures/{id}`, admin middleware.
- Models: `TourDeparture`, `Booking`, `Notification`, `NotificationDraft`, `TourGuideAssignment`; migrations departures/bookings/notifications/drafts.
- Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database**

- Read departure/tour và count booking liên kết có status không thuộc `cancelled/canceled`.
- Update các field departure thay đổi. Nếu có booking: insert `notification_drafts` sent và bulk insert `notifications` cho customer/guide; luôn gọi notification admin theo service.
- `change_reason`/`confirm_booked_change` không ghi vào departure; nội dung reason/changes được lưu trong notification payload/message.
- Transaction: save departure và tạo notification được gọi trong một `DB::transaction()`; exception rollback DB. Lock: Không có `lockForUpdate()` trên departure. Idempotent: không có request key; lần gọi lại sau khi state đã giống trả “không có thông tin nào thay đổi”.

**Validation/Authorization/Exception/Data Integrity**

- `change_reason` required|string|min3|max1000; confirm nullable|boolean; field update theo enum/range; slot còn chịu BR-020.
- Có booking và chưa confirm trả `409` + `BOOKED_DEPARTURE_CONFIRMATION_REQUIRED`; auth admin; guard BR-018 chạy trước validation.
- Notification đồng bộ, Queue/Webhook/Email/SMS/Push: Không sử dụng trong service này. Audit log chuyên biệt: Không sử dụng.
- **[Suy luận từ source code]** Không có row/version lock; hai request update đồng thời lấy old values/count trước transaction và save từ instance đã load. Đây là chuỗi source xác định không có locking; hậu quả cụ thể ngoài source không được khẳng định.

**Kết luận: Đúng.**

### BR-020 — Không giảm slot dưới booked và không xóa departure có booking

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureController.php` — class `TourDepartureController`, methods `update()`, `destroy()`; routes `PUT /api/admin/tours/departures/{id}` và `DELETE /api/admin/tours/departures/{id}`.
- Model/Migration: `TourDeparture`, `Booking`; departures/bookings migrations.
- Service: `TourDepartureMutationGuard` chạy trước; `AdminNotificationService` được gọi trong destroy hợp lệ. Các layer Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database và kiểm soát**

- Update: so `payload.total_slots` với `tour_departures.booked_slots`; thấp hơn ném ValidationException, không save.
- Delete: `$departure->bookings()->exists()` kiểm mọi booking, không loại cancelled; nếu tồn tại trả `422`. Nếu không có, transaction tạo notification admin rồi delete vật lý departure.
- Transaction/Rollback: update write + notification theo BR-019 trong transaction; destroy notification + delete trong transaction. Lock: không có. Idempotent: delete lần hai `404`; nhánh bị chặn không đổi DB.
- Validation/authorization: admin, guard date, slot integer min1; exception `404/422`.
- Audit Log: Không sử dụng; Notification có ở destroy; Queue: Không sử dụng.
- Data integrity: FK `bookings.tour_departure_id` là restrictOnDelete, đồng thời controller chặn bằng exists.

**Kết luận: Đúng.**

## BUG thuộc module

### BUG-AB-002 — Giới hạn độ dài API lớn hơn giới hạn cột dữ liệu — Resolved

- Business Rule/Requirement liên quan: BR-001, BR-005; FR-001; API Specification #2 và #30. Phần booking của cùng BUG được dẫn tiếp ở module `02-booking-payment.md`.
- **Chẩn đoán lịch sử:** API đăng ký từng cho phép `full_name` dài tối đa 255 ký tự và không đặt giới hạn độ dài tường minh cho `email`/`phone`; API cập nhật hồ sơ từng cho phép `full_name` tối đa 255. Migration giới hạn `users.full_name` và `users.email` ở 150 ký tự, `users.phone` ở 20 ký tự.
- File/Hàm tại thời điểm chẩn đoán:
  - `backend_laravel/app/Http/Controllers/Api/AuthController.php` — `register()` (`full_name max:255`; `email`/`phone` không có rule `max`).
  - `backend_laravel/app/Http/Controllers/Api/Customer/CustomerController.php` — `updateProfile()` (`full_name max:255`).
  - `backend_laravel/database/migrations/2026_06_10_215910_add_vivugo_columns_to_users_table.php` — `up()` (`full_name VARCHAR(150)`, `email VARCHAR(150)` trên driver không phải SQLite, `phone VARCHAR(20)`).
- Bằng chứng lịch sử: payload `full_name` dài 151–255, email hợp lệ dài hơn 150 hoặc phone dài hơn 20 không bị validation tương ứng loại chỉ vì độ dài, nhưng vượt giới hạn migration. Kết quả DB cụ thể (reject hay truncate) phụ thuộc driver/chế độ DB; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** để khẳng định một trong hai kết quả runtime tại thời điểm audit.
- Mức độ ảnh hưởng: Medium.
- Điều kiện tái hiện lịch sử: gọi đăng ký với từng payload có `full_name` 151 ký tự, email hợp lệ dài hơn 150 hoặc phone dài hơn 20; gọi cập nhật profile với `full_name` 151 ký tự; validation cũ cho phép đi tiếp trước bước ghi.
- **Post-fix / Trạng thái: Resolved.** `AuthController::register()` hiện giới hạn `full_name/email/phone` lần lượt 150/150/20; `CustomerController::updateProfile()` giới hạn `full_name/phone` là 150/20, khớp migration users.
- Bằng chứng test hậu sửa: `backend_laravel/tests/Feature/AuthBookingBusinessModelRegressionTest.php` kiểm 151 ký tự cho `full_name`, email dài hơn 150 và phone 21 đều trả `422`; profile chấp nhận phone 20, từ chối phone 21.
- Source conformance hậu sửa: BR-001 và BR-005 **Đúng**.

## Các thành phần không tìm thấy trong phạm vi BR-001–BR-020

- Repository, Action, Use Case class, Domain Service theo layer riêng, Observer, Listener, Event, Job: Không sử dụng.
- Policy/Gate nghiệp vụ: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- Trigger hoặc Stored Procedure DB: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- Queue cho notification departure: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; các insert diễn ra đồng bộ.
- Audit log chuyên biệt cho thay đổi profile/tour/departure: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**. Notification và booking status history không được tự gán nhãn thành audit log khi source không khai báo như vậy.
