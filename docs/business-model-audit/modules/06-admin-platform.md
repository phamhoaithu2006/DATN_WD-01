# Audit Business Model — Nền tảng quản trị

## Phạm vi và baseline

- Business Rule: `BR-085`–`BR-096` tại `docs/reverse-engineering/03-business-rules-brd.md:354-365`.
- Tài liệu đối chiếu bổ sung: `FR-009`, `FR-011`–`FR-014`, `FR-017`, `FR-021`–`FR-025` trong `04-srs.md`; `UC-007`, `UC-020`–`UC-023`, `UC-027`, `UC-029`, `UC-033`–`UC-035`, `UC-039`–`UC-042` trong `05-use-cases.md`; API/ERD/state machine liên quan.
- Chỉ xác minh Business Model so với source; không review style, naming, performance, architecture, pattern và không đề xuất thay đổi.
- Trạng thái hậu sửa: các chẩn đoán `BUG-SA-002` và `BUG-SA-003` tại baseline được giữ ở cuối tài liệu để truy vết lịch sử; trạng thái hiện tại được xác minh lại bằng source, migration và automation.

## Bảng tổng hợp

| Business Rule | Đã triển khai | File chính | Hàm | Đúng / Sai / Thiếu | Mức độ ảnh hưởng |
| --- | --- | --- | --- | --- | --- |
| BR-085 | Có | `DatabaseBackupService.php`, `DatabaseBackupController.php` | `createBackup()`, `listBackups()`, `downloadPath()`, `deleteBackup()` | Đúng | High |
| BR-086 | Có | `DatabaseBackupCommand.php`, `routes/console.php` | `handle()`, `shouldRunScheduledBackup()`, `scheduledPeriodKey()` | Đúng | High |
| BR-087 | Có | `ChatBotController.php` | `handleChat()` | Đúng | Medium |
| BR-088 | Có | `ChatBotController.php` | `handleChat()`, `extractFilters()`, `buildTourQuery()`, `callGemini()` | Đúng | Medium |
| BR-089 | Có | `ChatBotController.php` | `handleChat()`, `callGemini()` | Đúng | Medium |
| BR-090 | Có | `ReportController.php` | `getOverviewStatistics()`, `getChartStatistics()` | Đúng | High |
| BR-091 | Có | `CustomerManagerController.php` | `index()`, `search()`, `store()`, `show()`, `update()`, `lock()`, `unlock()` | Đúng | High |
| BR-092 | Có | `GuideController.php`, `SupportStaffController.php` | CRUD/trash/restore/force-delete/avatar methods | Đúng | High |
| BR-093 | Có | ba controller category/destination/service category | CRUD/trash/restore methods | Đúng | Medium |
| BR-094 | Có | `LanguageController.php`, `CertificateController.php` | CRUD language/level/certificate | Đúng | Medium |
| BR-095 | Có | `SettingController.php`, `WidgetController.php` | settings `index()/update()`, widget CRUD/toggle | Đúng | High |
| BR-096 | Có | `BookingController.php` | `store()`, `update()`, `softDelete()`, `destroy()`, `releaseBookedSlots()` | Đúng | High |

Kết quả hậu sửa: **12/12 Đúng, 0 Sai, 0 Thiếu**.

## Phân tích chi tiết

### BR-085 — Backup MySQL/MariaDB và bảo vệ filename

**Business Rule:** Backup chỉ hỗ trợ MySQL/MariaDB, dùng `mysqldump` timeout 300 giây, lưu tại `storage/app/backups`; list/download/delete chỉ nhận filename đúng pattern.

**Source Code**

- Files/classes/methods: `backend_laravel/app/Services/DatabaseBackupService.php:11-179`, class `DatabaseBackupService`, methods `createBackup()`, `listBackups()`, `downloadPath()`, `deleteBackup()`, `isValidBackupFilename()`, `backupDirectory()`; `backend_laravel/app/Http/Controllers/Api/Admin/DatabaseBackupController.php:13-76`, methods `index()`, `store()`, `download()`, `destroy()`.
- Routes: `GET|POST /api/admin/backups`, `GET /api/admin/backups/{filename}/download`, `DELETE /api/admin/backups/{filename}`, `routes/api.php:208-211`.
- Service: `DatabaseBackupService`. Action, Use Case, Domain Service, Repository: Không sử dụng.
- Model: không có model backup; controller đọc `Setting` để lấy retention. Observer, Listener, Event, Policy, Job: Không sử dụng.
- Migration: không có bảng backup; settings được tạo bởi `backend_laravel/database/migrations/2026_06_13_000001_create_settings_table.php`.
- Middleware: Sanctum + `role:admin`. Command/Scheduler thuộc BR-086.
- Notification: Không sử dụng. Trigger, Stored Procedure, Queue, Cache: Không sử dụng trong BR-085.
- API integration: không gọi HTTP API; tích hợp tiến trình hệ điều hành `Symfony\Component\Process\Process` chạy binary `mysqldump`.

**Database/Filesystem**

- Không Insert/Update/Delete bảng backup. Read cấu hình connection và `settings.backup_retention_days`; create/read/delete file SQL tại `storage/app/backups`.
- `Process` nhận `--single-transaction`, `--quick`, `--routines`, `--triggers`, result file; timeout 300 tại service dòng 111-132 và 28-31.
- Filename regex `^vivugo-backup-\d{8}-\d{6}\.sql$` dòng 13; list filter dòng 50-53; download/delete validate dòng 155-161.
- Transaction DB/Rollback/Lock: Không sử dụng. Khi process thất bại, source xóa file kết quả tại dòng 33-37. Idempotent: không có idempotency key; filename theo giây.
- Audit Log: Không có.

**Validation/Authorization:** Driver phải là `mysql|mariadb`; filename phải đúng regex và file tồn tại; admin được phép, guest `401`, role khác `403`.

**Exception:** unsupported driver/dump lỗi thành `RuntimeException`, controller `store()` trả `422`; filename sai/file thiếu thành `InvalidArgumentException`, download/delete trả `404`.

**Data Integrity:** Process thất bại có delete file. Source không có lock giữa hai lần tạo cùng giây; rule không tuyên bố locking/idempotency nên không lập BUG chỉ từ điểm này.

**Kết luận:** **Đúng**.

### BR-086 — Lịch backup và retention

**Business Rule:** Scheduler gọi `db:backup --scheduled` mỗi phút; command chỉ chạy khi bật auto backup, đúng kỳ daily/weekly/monthly, qua giờ và cache chưa ghi kỳ; sau tạo prune theo retention mặc định 7.

**Source Code**

- Files/classes/methods: `backend_laravel/routes/console.php:10`, `Schedule::command(...)->everyMinute()`; `backend_laravel/app/Console/Commands/DatabaseBackupCommand.php:12-88`, class `DatabaseBackupCommand`, methods `handle()`, `shouldRunScheduledBackup()`, `scheduledPeriodKey()`; `DatabaseBackupService::createBackup()`, `pruneOldBackups()`.
- Route/Command: Artisan `db:backup {--scheduled}`; không phải HTTP route.
- Service: `DatabaseBackupService`. Action, Use Case, Domain Service, Repository: Không sử dụng.
- Model: `Setting`. Observer, Listener, Event, Policy, Job: Không sử dụng.
- Middleware/Policy: không áp dụng cho CLI. Scheduler: Có, mỗi phút. Notification: Không sử dụng.
- Cache: `Cache::get()`/`Cache::forever()` key `database_backup.last_scheduled_period`; migration `backend_laravel/database/migrations/0001_01_01_000001_create_cache_table.php:14-24` khi dùng DB cache.
- Trigger/Stored Procedure/Queue/API integration: Không sử dụng; OS process thuộc BR-085.

**Database/Filesystem**

- Read `settings` các key `auto_backup_enabled,backup_frequency,backup_time,backup_retention_days`; Update cache kỳ; create backup file và delete file có `mtime` cũ hơn threshold.
- Migration setting: `2026_06_13_000001_create_settings_table.php:11-17`.
- Transaction/Rollback/Lock: Không có DB transaction/lock. Command chỉ ghi cache sau khi create/prune hoàn tất. Idempotent: tuần tự trong cùng kỳ được cache chặn; không có distributed lock/`withoutOverlapping` cho hai tiến trình đồng thời.
- Audit Log: Không có.

**Validation/Authorization:** settings được admin validate ở BR-095; command tự match ba frequency và trả không chạy với giá trị khác. Không có actor HTTP.

**Exception:** `RuntimeException` được catch, ghi console error và trả `FAILURE`; nhánh chưa đến lịch trả `SUCCESS` không tạo file.

**Data Integrity:** Cache được đọc trước create và ghi sau create; không có lock nguyên tử giữa hai bước. **[Suy luận từ source code]** Hai tiến trình cùng kỳ đi qua lần đọc cache trước lần ghi là execution path không bị source ngăn; BR chỉ mô tả điều kiện cache hiện hành, không tuyên bố chống chạy đồng thời.

**Kết luận:** **Đúng**.

### BR-087 — Session và validation chatbot

**Business Rule:** Message tối đa 1.000, session tối đa 100; thiếu session thì sinh `guest-` + MD5(IP + user-agent); conversation `firstOrCreate` theo session và gắn Sanctum user khi tạo mới.

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php:13-69`, class `ChatBotController`, method `handleChat()`.
- Routes: `POST /api/chatbot` với `throttle:20,1`, `routes/api.php:57`; `POST /api/travel-assistant` public không throttle riêng, dòng 154.
- Service/Action/Use Case/Domain Service/Repository: Không sử dụng.
- Models: `ChatConversation`, `ChatMessage`; migrations `2026_07_15_193903_create_chat_conversations_table.php`, `2026_07_15_193904_create_chat_messages_table.php`.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache: Không sử dụng.
- Middleware: throttle chỉ route `/chatbot`; hai route không yêu cầu auth. API integration Gemini thuộc BR-088.

**Database**

- Read/Insert `chat_conversations(session_id,user_id)` qua `firstOrCreate`; `session_id` unique ở migration dòng 13. Insert hai `chat_messages` thuộc full flow.
- Transaction/Rollback/Lock: Không có. Idempotent: conversation lookup theo session có DB unique; mỗi request vẫn insert thêm messages.
- Audit Log: Không có.

**Validation:** `message required|string|max:1000`; `session_id nullable|string|max:100`. **Authorization:** public; nếu Sanctum credential hiện diện, `auth('sanctum')->id()` được dùng trong create defaults.

**Exception:** validation `422`; không có catch DB ở `handleChat()`.

**Data Integrity:** Unique session chống hai row cùng session ở DB, nhưng không có transaction bao toàn bộ conversation + messages. Rule không tuyên bố atomicity.

**Kết luận:** **Đúng**.

### BR-088 — Context, filter và Gemini

**Business Rule:** Gửi tối đa 10 history và 10 tour published; filter chỉ nhận diện các pattern đã nêu; Gemini model/timeout/temperature cố định.

**Source Code**

- File/Class/Methods: `backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php:33-46`, `backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php:71-129`, `backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php:132-212`; class `ChatBotController`; methods `handleChat()`, `extractFilters()`, `buildTourQuery()`, `formatToursForPrompt()`, `buildSystemPrompt()`, `callGemini()`.
- Routes: hai route BR-087.
- Service/Action/Use Case/Domain Service/Repository: Không sử dụng.
- Models: `ChatConversation`, `ChatMessage`, `Tour`, quan hệ `Category`, `Destination`; migration tour `2026_06_10_220020_create_tours_table.php` và chat migrations.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache: Không sử dụng.
- Middleware: throttle chỉ `/chatbot`. API integration: Google Generative Language endpoint trong `callGemini()`.

**Database/API**

- Read 10 message gần nhất rồi reverse; query `tours.status=published`, áp dụng discount/terrain/days/nights và `limit(10)`.
- HTTP POST model `gemini-2.5-flash`; `Http::timeout(15)`; `generationConfig.temperature=0.2` tại dòng 176-199.
- Insert chat messages như BR-087/089. Transaction/Rollback/Lock: Không có. Idempotent: Không có. Audit Log: Không có.

**Validation/Authorization:** theo BR-087; public. Filter nhận đúng chuỗi giảm giá/khuyến mãi, biển/núi, dị ứng/phấn hoa và regex ngày/đêm tại dòng 71-97.

**Exception:** lỗi external API chuyển fallback theo BR-089. **Data Integrity:** không có ghi tour; bằng chứng lost update/dirty write trên dữ liệu catalog: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

**Kết luận:** **Đúng**.

### BR-089 — Fallback, logging và lưu hội thoại

**Business Rule:** Gemini lỗi/không có text trả fallback; HTTP error log warning, exception log error; câu hỏi và câu trả lời vẫn được lưu, `is_fallback` suy từ nội dung.

**Source Code**

- File/Class/Methods: `backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php:15`, `backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php:48-68`, `backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php:176-212`; class `ChatBotController`; methods `handleChat()`, `callGemini()`.
- Routes/models/migrations: như BR-087/088.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache: Không sử dụng.
- Middleware: như BR-087. API integration: Gemini. Logging: `Log::warning()` dòng 206, `Log::error()` dòng 208; cấu hình channel ở `backend_laravel/config/logging.php`.

**Database**

- Insert user message trước call Gemini; insert assistant message sau call với `role=assistant,content,is_fallback`; migration quy định role enum và boolean fallback.
- Transaction/Rollback/Lock: Không có. Idempotent: Không có. Audit Log: không có audit nghiệp vụ; application log chỉ ghi lỗi Gemini.

**Validation/Authorization:** theo BR-087; public.

**Exception:** `callGemini()` bắt `Throwable`; HTTP non-success không ném ra client; thiếu text và lỗi đều trả hằng `FALLBACK_MESSAGE`. `handleChat()` không catch lỗi DB.

**Data Integrity:** User message được insert trước external call và assistant insert không cùng transaction. Khi lỗi DB ngoài nhánh Gemini xảy ra sau insert đầu, hội thoại chỉ còn user message; BR-089 chỉ tuyên bố hành vi khi Gemini lỗi/không text, và nhánh đó được catch để tiếp tục insert assistant.

**Kết luận:** **Đúng**.

### BR-090 — Công thức báo cáo quản trị

**Business Rule:** Doanh thu chỉ cộng payment success của booking không cancelled theo năm `paid_at`; chart booking/customer theo `created_at`; top destination loại cancelled và limit 5.

**Source Code**

- File/Class/Methods: `backend_laravel/app/Http/Controllers/Api/Admin/ReportController.php:10-163`, class `ReportController`, methods `getOverviewStatistics()`, `getChartStatistics()`.
- Routes: `GET /api/admin/reports/overview`, `GET /api/admin/reports/charts`, `routes/api.php:197-198`; Sanctum + admin.
- Service/Action/Use Case/Domain Service/Repository: Không sử dụng. Model chuyên biệt: Không sử dụng; controller dùng DB Query Builder.
- Tables/models nguồn: `payments`, `bookings`, `users`, `roles`, `tours`, `destinations`; migrations tạo bảng tương ứng.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database**

- Chỉ Read aggregate. Doanh thu ở dòng 21-28 và 83-96; booking chart dòng 70-81; customer chart dòng 99-113; top destination dòng 134-149.
- Không Insert/Update/Delete; Transaction/Rollback/Lock/Audit Log: Không sử dụng. Idempotent: Có đối với cùng snapshot dữ liệu.

**Validation:** `year` chỉ cast integer/default current year; không có min/max. **Authorization:** Admin; guest/role khác `401/403`.

**Exception:** Không có exception nghiệp vụ/try-catch riêng. **Data Integrity:** endpoint read-only.

**Kết luận:** **Đúng**.

### BR-091 — Quản lý tài khoản user

**Business Rule:** Admin list/search/create/show/update/lock/unlock; user tạo mới active; lock/unlock đổi inactive/active; không có route delete user.

**Source Code**

- File/Class/Methods: `backend_laravel/app/Http/Controllers/Api/Admin/CustomerManagerController.php:19-506`, class `CustomerManagerController`; public methods `index()`, `search()`, `store()`, `show()`, `update()`, `lock()`, `unlock()` và helper `syncRoleRelations()`.
- Routes: `GET|POST /api/admin/customers`, `GET /search`, `GET|PUT /{id}`, `PATCH /{id}/lock|unlock`, `routes/api.php:216-231`; route list không có DELETE customer/user.
- Service/Action/Use Case/Domain Service/Repository: Không sử dụng.
- Models: `User`, `Role`, `Guide`, `SupportStaff`, `Booking`; migrations `0001_01_01_000000_create_users_table.php`, `2026_06_10_215900_create_roles_table.php`, `2026_06_10_215910_add_vivugo_columns_to_users_table.php`, guide/support migrations.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.
- Middleware: Sanctum + admin.

**Database**

- Insert user fields `full_name,email,password,phone,role_id,status=active,avatar_url`; Update user fields/status; helper Update/restore/soft-delete profile Guide/SupportStaff đã tồn tại theo role mới.
- Delete user: Không có. Lock/unlock chỉ Update `users.status`.
- Transaction: store và update dùng `DB::transaction()`; lock/unlock không. Rollback: tự động cho store/update DB. Lock: Không có. Idempotent: lock active→inactive; gọi lại khi inactive trả `422`; unlock tương tự.
- Audit Log: Không có.

**Validation:** store name/email unique/password min6/phone max10/role exists/avatar image max5120; update `sometimes`, phone max15, status `active|inactive`, password min6, avatar max2048.

**Authorization:** Admin; guest `401`, non-admin `403`. **Exception:** missing user `404`; already locked/unlocked `422`; validation `422`.

**Data Integrity:** avatar store xảy ra trước transaction ở create; không có cleanup khi transaction lỗi. Rule không tuyên bố file rollback nên không lập BUG từ hành vi này.

**Kết luận:** **Đúng**.

### BR-092 — CRUD hồ sơ Guide và SupportStaff

**Business Rule:** Admin có CRUD, trash, restore, force delete và avatar cho Guide/SupportStaff; hai model soft delete; hard delete qua route riêng.

**Source Code**

- Guide: `backend_laravel/app/Http/Controllers/Api/Admin/GuideController.php:14-829`, class `GuideController`; `index/search/filter/statistics/availableUsers/store/show/update/destroy/trashed/restore/forceDelete/uploadAvatar/deleteAvatar`.
- Support: `backend_laravel/app/Http/Controllers/Api/Admin/SupportStaffController.php:14-480`, class `SupportStaffController`; `index/statistics/availableUsers/store/show/update/destroy/trashed/restore/forceDestroy/uploadAvatar/deleteAvatar`.
- Routes: `/api/admin/guides*`, `routes/api.php:234-247`; `/api/admin/support-staff*`, dòng 278-299; Sanctum + admin.
- Service/Action/Use Case/Domain Service/Repository: Không sử dụng.
- Models: `Guide` dùng `SoftDeletes` tại `app/Models/Guide.php:11-23`; `SupportStaff` tại `app/Models/SupportStaff.php:10-35`; `User`, `Destination`, `GuideLanguage`, `GuideExperience`.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database/Filesystem**

- Guide Insert/Update; pivot `guide_destinations` sync; insert/delete `guide_languages`, `guide_experiences`; soft delete/restore/hard delete `guides`; avatar Update `users.avatar_url` và file public.
- SupportStaff Insert/Update; soft delete/restore/hard delete `support_staff`; avatar Update `users.avatar_url` và file public.
- Migrations: `2026_06_14_145318_create_guides_table.php`, `2026_07_07_055358_create_guide_destinations_table.php`, `2026_06_24_042946_drop_and_recreate_guide_languages_table.php`, `2026_06_24_042950_drop_and_recreate_guide_experiences_table.php`, `2026_06_22_032814_create_support_staff_table.php`, `2026_07_01_000001_add_user_id_to_support_staff_table.php`, `2026_07_04_000001_add_specialization_and_experience_years_to_support_staff_table.php`.
- Transaction: Guide store/update/forceDelete có; SupportStaff CRUD không. Rollback: tự động ở Guide transaction. Lock: Không có. Idempotent: restore/delete lần hai đi theo not-found hoặc hành vi method tương ứng; không có idempotency key.
- Audit Log: Không có.

**Validation:** Guide: user tồn tại/unique active, experience 0-40, status allowlist, destination ít nhất 1/distinct, language/level/certificate/year; avatar image max2048. Support: user exists và role support, specialization allowlist, experience 0-40, status/rating; avatar image max2048.

**Authorization:** Admin. **Exception:** validation `422`; not found `404`; Guide catch transaction và trả `500`/`422` theo method; Support dùng validator/findOrFail.

**Data Integrity:** Hai avatar upload method xóa file cũ trước store/update URL; khi bước sau ném lỗi, DB còn URL file đã xóa. Đây là thứ tự source, nhưng BR chỉ khẳng định có quản lý avatar nên không tự tạo BUG business-model từ atomicity không được yêu cầu.

**Kết luận:** **Đúng**.

### BR-093 — Category, Destination và ServiceCategory

**Business Rule:** Ba module có API admin create/read/update/delete và model soft delete; Category/Destination có trash/restore; ServiceCategory không có restore/force route.

**Source Code**

- Category: `backend_laravel/app/Http/Controllers/Api/Admin/CategoryController.php:12-227`, class `CategoryController`, CRUD/list/search/trash/restore methods; model `Category.php:9-36` dùng `SoftDeletes`.
- Destination: `backend_laravel/app/Http/Controllers/Api/Admin/DestinationController.php:9-207`, class `DestinationController`, resource CRUD + search/trash/restore/force; model `backend_laravel/app/Models/Destination.php:10-57` dùng `SoftDeletes`.
- ServiceCategory: `backend_laravel/app/Http/Controllers/Api/Admin/ServiceCategoryController.php:15-114`; `backend_laravel/app/Services/ServiceCategoryService.php:9-95`; Form Requests `backend_laravel/app/Http/Requests/IndexServiceCategoryRequest.php`, `backend_laravel/app/Http/Requests/StoreServiceCategoryRequest.php`, `backend_laravel/app/Http/Requests/UpdateServiceCategoryRequest.php`; model `backend_laravel/app/Models/ServiceCategory.php:11-65` dùng `SoftDeletes` và callback sinh slug.
- Routes: `/api/admin/categories*` dòng 319-325; `/api/admin/destinations*` dòng 303-316; API resource `/api/admin/service-categories*` dòng 191-194. Không có service-category restore/force route trong route list.
- Service: chỉ ServiceCategory dùng `ServiceCategoryService`. Action, Use Case, Domain Service, Repository: Không sử dụng.
- Observer class/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng; ServiceCategory dùng Eloquent model callbacks, không phải Observer class.
- Middleware: Sanctum + admin.

**Database/Filesystem**

- CRUD bảng `categories`, `destinations`, `service_categories`; soft delete cập nhật `deleted_at`; Category/Destination restore; Destination còn force delete. Category thumbnail đọc/ghi file public.
- Migrations: `2026_06_10_220000_create_categories_table.php`, `2026_07_03_112000_add_thumbnail_fields_to_categories_table.php`, `2026_06_10_220010_create_destinations_table.php`, `2026_07_03_031102_create_service_categories_table.php`.
- Transaction/Rollback/Lock: Không có trong các CRUD này. Idempotent: Không có idempotency key; retry delete/restore thường not-found. Audit Log: Không có.

**Validation:** Category đầy đủ name/description/image/status; Destination store yêu cầu name/slug/province/country nhưng update dùng `$request->all()` không validation; ServiceCategory FormRequests validate search/status/page/per-page và name unique/description/status.

**Authorization:** Admin; non-admin `403`, guest `401`. **Exception:** validation `422`, not found `404`; DB exception trong force delete không được catch.

**Data Integrity:** Category thay ảnh xóa file cũ trước store/save; Destination update không có validation. Tài liệu SRS ghi cho validation này: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**, nên đây không phải mệnh đề trái BR-093.

**Kết luận:** **Đúng**.

### BR-094 — Language, LanguageLevel và Certificate

**Business Rule:** Admin CRUD ba loại dữ liệu; language/certificate name có DB unique; không có DB unique cặp language + level.

**Source Code**

- Files/classes/methods: `backend_laravel/app/Http/Controllers/Api/Admin/LanguageController.php:11-210`, class `LanguageController`, CRUD language và `levels/storeLevel/updateLevel/destroyLevel`; `backend_laravel/app/Http/Controllers/Api/Admin/CertificateController.php:9-112`, class `CertificateController`, CRUD certificate.
- Routes: `/api/admin/languages*`, `/api/admin/certificates*`, `routes/api.php:258-274`; Sanctum + admin.
- Service/Action/Use Case/Domain Service/Repository: Không sử dụng.
- Models: `Language`, `LanguageLevel`, `Certificate`, `GuideLanguage`, `GuideExperience`.
- Migrations: `2026_06_24_042942_create_languages_table.php:11-15`; `2026_06_24_042945_create_language_levels_table.php:11-15`; `2026_06_24_042945_create_certificates_table.php:11-15`.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database**

- Insert/Update/Delete `languages`, `language_levels`, `certificates`; delete language cascade levels; certificate delete bị chặn ở controller nếu relation guide tồn tại.
- Unique DB: `languages.name`, `certificates.name`; bảng `language_levels` chỉ có FK và `level_name`, không unique composite.
- Transaction: Language `store()` dùng `DB::beginTransaction/commit/rollBack`; các method khác không. Lock: Không có. Idempotent: Không có key; duplicate name được validation/unique DB chặn.
- Audit Log: Không có.

**Validation:** language name required unique max100; nested levels string max20; individual store/update level custom kiểm tra trùng trong cùng language; certificate name required unique max150, issuer nullable max150.

**Authorization:** Admin. **Exception:** validation `422`, not found `404`, certificate in use `422`, create language exception rollback và trả `500`.

**Data Integrity:** Custom check level không có DB unique/lock, đúng với mệnh đề BR về schema. Không lập BUG vì rule chủ động ghi rõ thiếu unique DB.

**Kết luận:** **Đúng**.

### BR-095 — Allowlist settings và CRUD widget

**Business Rule:** Admin setting chỉ đọc/ghi `ALLOWED_KEYS` và validate theo nhóm; public chỉ `PUBLIC_KEYS`; widget admin CRUD/toggle và validate type/position/page/status/date; public widget dùng scope visible.

**Source Code**

- Settings: `backend_laravel/app/Models/Setting.php:7-84`, class `Setting`, constants/methods; `backend_laravel/app/Http/Controllers/Api/Admin/SettingController.php:10-130`, class `SettingController`, methods `index()`, `update()`, `settingsData()`, `groupForKey()`; `backend_laravel/app/Http/Controllers/Api/PublicSettingController.php:9-28`, class `PublicSettingController`, method `show()`.
- Widgets: `backend_laravel/app/Http/Controllers/Api/Admin/WidgetController.php:11-162`, class `WidgetController`, CRUD/toggle/rules/payload; `backend_laravel/app/Http/Controllers/Api/PublicWidgetController.php:10-38`, class `PublicWidgetController`, method `index()`; `backend_laravel/app/Models/Banner.php:8-61`, class `Banner`, constants và `scopeVisible()`.
- Routes: `GET|PUT /api/admin/settings`, `GET|POST /api/admin/widgets`, widget item/toggle trong `routes/api.php:352-361`; public `GET /api/settings/public`, `GET /api/widgets`, dòng 178-179.
- Service/Action/Use Case/Domain Service/Repository: Không sử dụng. Models: `Setting`, `Banner`.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.
- Middleware: admin routes Sanctum + admin; public routes không auth.

**Database**

- Settings Read/Insert/Update `settings(key,value,group)` qua `updateOrCreate`; không delete. Widget CRUD/Update status/Delete vật lý `banners`.
- Migrations: `2026_06_13_000001_create_settings_table.php`; `2026_06_10_220190_create_banners_table.php`; `2026_06_13_000002_add_widget_columns_to_banners_table.php`; `2026_07_22_000000_make_banner_image_url_nullable.php`.
- Transaction/Rollback/Lock: Không có. Settings update nhiều key tuần tự không transaction. Idempotent: `updateOrCreate` theo unique key là ổn định với cùng payload; widget create không idempotent; toggle cố ý đổi trạng thái mỗi lần.
- Audit Log: Không có.

**Validation:** settings rules ở controller dòng 56-86; chỉ `$request->only(Setting::ALLOWED_KEYS)`. Widget title/type, conditional image/html, position/page allowlists, sort min0, date và end ≥ start, active/inactive tại dòng 113-131.

**Authorization:** Admin cho quản trị; public đọc allowlist/visible; guest/non-admin bị `401/403` ở admin routes.

**Exception:** settings/widget validation `422`; widget not found `404`; không có catch DB riêng.

**Data Integrity:** Migration hậu sửa `2026_07_22_000000_make_banner_image_url_nullable.php:10-26` đổi `banners.image_url` thành nullable, khớp validation `required_if:type,image` và payload HTML đặt null. `down()` chuyển mọi null thành chuỗi rỗng trước khi khôi phục NOT NULL, nên rollback không làm mất row HTML. `BusinessModelAuditBugFixTest.php:138-177` xác minh cả create HTML không ảnh và rollback giữ nội dung.

**Kết luận:** **Đúng**. Settings/public visibility đúng; schema hậu sửa đồng nhất với CRUD cho cả widget image và HTML.

### BR-096 — Quản lý booking của admin

**Business Rule:** Create luôn `pending/unpaid` và payment COD `pending`; update cấm `payment_status`, cho đổi booking status và tính lại giá; booking `cancelled` là trạng thái cuối; lần hủy đầu hoàn slot; hard delete chỉ booking cancelled.

**Source Code**

- File/Class/Methods: `backend_laravel/app/Http/Controllers/Api/Admin/BookingController.php:19-466`, class `BookingController`; `store()`, `update()`, `softDelete()`, `destroy()`, `resolveDeparture()`, `buildParticipantPricing()`, `releaseBookedSlots()`.
- Routes: `/api/admin/bookings*`, `routes/api.php:376-383`; Sanctum + admin.
- Service: `backend_laravel/app/Services/TourPricingService.php`, `resolveAdultPrice()`, `calculateParticipantPrice()`. Action, Use Case, Domain Service, Repository: Không sử dụng.
- Models: `Booking`, `Payment`, `Tour`, `TourDeparture`, `BookingContact`, `BookingParticipant`; migrations `2026_06_10_220060_create_bookings_table.php`, `2026_06_10_220090_create_payments_table.php`, `2026_06_10_220070_create_booking_contacts_table.php`, `2026_06_10_220080_create_booking_participants_table.php`, `2026_07_03_120100_add_pricing_snapshot_to_booking_participants_table.php`, `2026_06_10_220040_create_tour_departures_table.php`.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.
- Middleware: Sanctum + admin.

**Database**

- Store Insert `bookings` với `status=pending,payment_status=unpaid`, optional contact/participants và `payments(payment_method=cod,status=pending,paid_at=null)` trong transaction.
- Update booking/contact; delete/reinsert participant; tính lại `total_amount`; cấm payload payment status.
- Cancel Update `bookings.status,cancelled_at` và Update `tour_departures.booked_slots`; destroy gọi `Booking::delete()`. Model không dùng SoftDeletes nên đây là hard delete.
- Transaction: store/update/softDelete có. Rollback: tự động. Lock: `update()` và `softDelete()` đều re-query rồi khóa booking bằng `lockForUpdate()` trước state guard; `releaseBookedSlots()` khóa departure trước khi trừ slot.
- Idempotent: cancel tuần tự hoặc đồng thời chỉ release ở transaction đầu; booking đã cancelled không thể chuyển lại trạng thái khác; destroy sau lần đầu không còn resource; create không idempotent.
- Audit Log/History: controller chỉ eager-load `statusHistories()` ở show, không ghi lịch sử trong các method BR-096.

**Validation:** store IDs/pricing/contact/participants; update status allowlist, `payment_status=prohibited`, price/contact/participants; destroy kiểm tra status cancelled. **Authorization:** Admin.

**Exception:** validation/price rule `422`; update booking đã cancelled sang trạng thái khác ném `ValidationException` và trả `422` tại field `status`; model thiếu `404`; destroy non-cancelled `422`; không catch riêng transaction.

**Data Integrity:**

- `update()` khóa lại row booking trong transaction trước khi đọc trạng thái; nếu trạng thái hiện tại là `cancelled` và request yêu cầu trạng thái khác, source ném validation exception trước update.
- Cả `update()` và dedicated cancel chỉ đặt cờ release khi row đã khóa chưa ở trạng thái `cancelled`; sau đó `releaseBookedSlots()` khóa row departure và trừ đúng `number_of_people` một lần.
- `BusinessModelAuditBugFixTest.php:179-200` xác minh booking đã hủy không thể mở lại và lần cancel sau không trừ thêm slot. `BusinessModelConcurrencyMysqlTest.php:432-454` đã chạy thực hai thao tác hủy đồng thời trên MySQL, xác minh cả hai response `200`, booking `cancelled` và `booked_slots` chỉ giảm từ 8 xuống 6.

**Kết luận:** **Đúng**. Các mệnh đề create/payment/prohibited/hard-delete giữ nguyên; terminal guard và row lock bảo đảm chỉ lần hủy đầu hoàn slot.

## Danh sách BUG

### BUG-SA-002 — Widget HTML hợp lệ theo validation nhưng trái cột image_url NOT NULL

- **Trạng thái hậu sửa:** **Resolved**.
- **Business Rule liên quan:** BR-095.
- **Chẩn đoán baseline:** `type=html` cho phép bỏ `image_url` và payload đặt null, trong khi migration gốc bắt buộc `banners.image_url`.
- **File/Hàm:** `backend_laravel/app/Http/Controllers/Api/Admin/WidgetController.php:31-41,113-152`, `store()`, `update()`, `rules()`, `payload()`; `backend_laravel/database/migrations/2026_06_10_220190_create_banners_table.php:14-27`, migration `up()`; `2026_06_13_000002_add_widget_columns_to_banners_table.php:9-17` không đổi nullable.
- **Bằng chứng baseline:** rule `image_url` chỉ `required_if:type,image`; nhánh HTML gán null; schema gốc tạo cột string không nullable.
- **Post-fix:** `2026_07_22_000000_make_banner_image_url_nullable.php` đổi cột thành nullable; `down()` chuyển null thành chuỗi rỗng trước khi khôi phục NOT NULL. `BusinessModelAuditBugFixTest.php:138-177` xác minh create HTML và rollback bảo toàn row/nội dung.
- **Mức độ ảnh hưởng:** **High** — một loại widget được Business Model công bố không thể create/update với payload hợp lệ trên schema migration.
- **Điều kiện tái hiện lịch sử:** admin gọi endpoint trên schema baseline với `title`, `type=html`, `html_content` hợp lệ và không gửi `image_url`.

### BUG-SA-003 — Booking hoàn slot nhiều lần qua chuyển trạng thái admin

- **Trạng thái hậu sửa:** **Resolved**.
- **Business Rule liên quan:** BR-096.
- **Chẩn đoán baseline:** Source từng cho phép khôi phục booking cancelled sang trạng thái khác; lần cancel sau tiếp tục trừ slot. **[Suy luận từ source code]** Nhánh PUT-cancel cũng chưa khóa booking trước kiểm tra và có race khi hai request cùng chạy.
- **File/Hàm:** `backend_laravel/app/Http/Controllers/Api/Admin/BookingController.php:209-308`, `update()`; `softDelete()` dòng 311-333; `releaseBookedSlots()` dòng 450-465. Chẩn đoán baseline được đối chiếu với phiên bản trước khi bổ sung block khóa/recheck dòng 263-301.
- **Bằng chứng baseline:** không có terminal guard; khi status trước request không phải cancelled thì `$shouldReleaseSlots=true`; việc mở lại rồi hủy tiếp hoặc hai request cùng đọc trạng thái cũ có thể trừ thêm slot.
- **Post-fix:** `update()` và `softDelete()` hiện khóa row booking trước state guard; booking cancelled bị chặn chuyển trạng thái; departure tiếp tục được khóa khi release. `BusinessModelAuditBugFixTest.php:179-200` xác minh terminal guard và không release lần hai; `BusinessModelConcurrencyMysqlTest.php:432-454` xác minh hủy đồng thời trên MySQL chỉ giảm slot một lần.
- **Mức độ ảnh hưởng:** **High** — sai số sức chứa lịch khởi hành, ảnh hưởng flow booking cốt lõi.
- **Điều kiện tái hiện lịch sử:** trên phiên bản baseline, cancel booking confirmed, PUT về confirmed rồi cancel lần nữa; hoặc cho hai request hủy cùng đọc trạng thái cũ trước update.
