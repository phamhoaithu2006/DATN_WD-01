# Audit Business Model — Hỗ trợ và thông báo

## Phạm vi và baseline

- Business Rule: `BR-074`–`BR-084` tại `docs/reverse-engineering/03-business-rules-brd.md:338-348`.
- Tài liệu đối chiếu bổ sung: `docs/reverse-engineering/04-srs.md` (`FR-008`, `FR-010`), `docs/reverse-engineering/05-use-cases.md` (`UC-009`, `UC-018`, `UC-037`, `UC-052`, `UC-053`) và các đặc tả API/DB liên quan trong cùng thư mục.
- Phạm vi source: route, middleware, controller, service, model, migration và test đang tồn tại. Không đánh giá code style, naming, performance, architecture hay design pattern.
- Quy ước: `Đúng` khi toàn bộ mệnh đề của rule được source chứng minh; `Sai` khi source thực thi trái rule; `Thiếu` khi chỉ có bằng chứng cho một phần bắt buộc.

## Bảng tổng hợp

| Business Rule | Đã triển khai | File chính | Hàm | Đúng / Sai / Thiếu | Mức độ ảnh hưởng |
| --- | --- | --- | --- | --- | --- |
| BR-074 | Có | `CustomerSupportRequestController.php` | `store()` | Đúng | High |
| BR-075 | Có | `CustomerSupportRequestController.php` | `store()`, `generateTicketCode()` | Đúng | High |
| BR-076 | Có | `CustomerSupportRequestController.php` | `store()` | Đúng | High |
| BR-077 | Có | `CustomerSupportRequestController.php` | `notifySupportStaff()`, `getSupportUserIds()` | Đúng | Medium |
| BR-078 | Có | `SupportRequestController.php` | `updateStatus()` | Đúng | High |
| BR-079 | Có | `SupportRequestController.php` | `badgeCount()` | Đúng | Low |
| BR-080 | Có | `NotificationCustomerController.php` | `getMyNotifications()`, `getNotificationDetail()`, `markAsRead()`, `visibleNotificationsQuery()` | Đúng | High |
| BR-081 | Có | `NotificationController.php` | `saveDraft()`, `showDraft()`, `updateDraft()`, `destroy()` | Đúng | Medium |
| BR-082 | Có một phần | `NotificationController.php` | `sendNotification()` | Sai | High |
| BR-083 | Có | `NotificationController.php` | `revoke()` | Đúng | High |
| BR-084 | Có một phần | `SupportNotificationController.php` | `sendNotification()` | Sai | High |

Kết quả: **9 Đúng, 2 Sai, 0 Thiếu**.

## Phân tích chi tiết

### BR-074 — Validation yêu cầu hỗ trợ và tệp đính kèm

**Business Rule:** Customer gửi hỗ trợ phải có tên, email, category thuộc `technical|payment|account|feedback|general`, subject, description tối đa 10.000; điện thoại nullable; tối đa 5 tệp JPG/JPEG/PNG/WebP/PDF/DOC/DOCX, mỗi tệp tối đa 5 MB.

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerSupportRequestController.php:17-197`, class `CustomerSupportRequestController`, method `store()`; validation nằm tại dòng 33-83.
- Route: `POST /api/customer/support-requests`, `backend_laravel/routes/api.php:119`, middleware `auth:sanctum`, `role:customer` từ group dòng 95.
- Service: Không sử dụng Service. Action, Use Case, Domain Service, Repository: Không sử dụng.
- Model: `SupportRequest`, `SupportRequestAttachment`. Observer, Listener, Event, Policy, Job, Command, Scheduler: Không sử dụng.
- Middleware: Sanctum và `App\Http\Middleware\CheckRole::handle()` tại `backend_laravel/app/Http/Middleware/CheckRole.php:11-37`.
- Notification: chưa phát sinh ở riêng bước validation; notification DB thuộc BR-077. Trigger, Stored Procedure, Queue, Cache, API integration: Không sử dụng.

**Database**

- Khi validation qua và flow hoàn tất: Insert vào `support_requests`; tệp tạo record `support_request_attachments`. Các cột chi tiết được truy vết tại BR-075/BR-076.
- Delete/Soft Delete/Restore/Audit Log: Không sử dụng trong rule này.
- Migration: `backend_laravel/database/migrations/2026_07_16_220919_create_support_requests_table.php:11-59`; `2026_07_16_220920_create_support_request_attachments_table.php:11-24`.
- Transaction: Có, `DB::transaction(..., 3)` tại controller dòng 90-173. Rollback: tự động khi callback ném exception. Lock: Không có.
- Idempotent: Không có; hai request hợp lệ độc lập tạo hai ticket khác nhau.

**Validation:** `full_name required|string|max:255`; `email required|email|max:255`; `phone nullable|string|max:20`; category allowlist; `subject required|string|max:255`; `description required|string|max:10000`; `attachments nullable|array|max:5`; từng tệp `file|mimes:...|max:5120`.

**Authorization:** Customer được phép; guest bị Sanctum trả `401`; admin, guide và support staff bị `CheckRole` trả `403`.

**Exception:** Validation sai trả `422`; lỗi trong transaction bị catch để dọn file rồi ném lại tại dòng 186-195.

**Data Integrity:** DB rollback và cơ chế dọn file được xử lý ở BR-076. Bằng chứng về lost update, dirty write, deadlock hoặc mất dữ liệu riêng ở bước validation: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

**Kết luận:** **Đúng**. Từng giới hạn trong BR-074 khớp trực tiếp validation source.

### BR-075 — Mã ticket, trạng thái mặc định và transaction

**Business Rule:** Mã ticket theo `SUP-YYYYMMDD-XXXXXX`, kiểm tra tồn tại; ticket mới `pending`, chưa assign/start/resolve, priority `medium` nếu cột tồn tại; request, file và notification nằm trong transaction tối đa 3 lần.

**Source Code**

- File/Class/Methods: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerSupportRequestController.php:89-173`, `backend_laravel/app/Http/Controllers/Api/Customer/CustomerSupportRequestController.php:203-217`, class `CustomerSupportRequestController`, methods `store()`, `generateTicketCode()`.
- Route: `POST /api/customer/support-requests`.
- Service/Action/Use Case/Domain Service/Repository: Không sử dụng.
- Models: `SupportRequest`, `SupportRequestAttachment`, `Notification`; migrations support nêu ở BR-074 và notification `backend_laravel/database/migrations/2026_06_10_220130_create_notifications_table.php`, `2026_06_24_161627_modify_notifications_table.php`, `2026_06_24_165838_add_draft_id_to_notifications_table.php`.
- Observer/Listener/Event/Policy/Job/Command/Scheduler: Không sử dụng. Middleware: Sanctum + `role:customer`.
- Notification: in-app rows được tạo qua `notifySupportStaff()` trong cùng callback. Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database**

- Insert `support_requests`: `ticket_code,user_id,full_name,email,phone,category,subject,description,status,assigned_to,started_at,resolved_at`, thêm `priority` nếu `Schema::hasColumn()`; dòng 108-135.
- Insert attachment và notification nằm trong cùng callback; không Update/Delete.
- Unique: `support_requests.ticket_code` tại migration dòng 15.
- Transaction: Có, `DB::transaction(..., 3)`. Rollback: tự động khi exception. Lock: Không có.
- Idempotent: Không có. Mỗi lần gọi sinh mã ngẫu nhiên mới; DB unique bảo vệ trùng mã nhưng không khử trùng request nghiệp vụ.

**Validation/Authorization:** kế thừa đầy đủ BR-074; chỉ customer đã xác thực.

**Exception:** vòng `do/while` chỉ kết thúc khi query chưa thấy mã; vi phạm unique do cạnh tranh sẽ ném exception và toàn transaction rollback. Không có catch chuyên biệt cho duplicate key.

**Audit/Notification/Queue:** Không có audit log; notification DB là dữ liệu nghiệp vụ; không dùng Queue.

**Data Integrity:** unique index là bằng chứng chống trùng `ticket_code`; không có lock khi kiểm tra rồi insert. Cơ chế idempotency cho double-submit: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

**Kết luận:** **Đúng**. Source triển khai đúng từng mệnh đề; rule không tuyên bố API idempotent.

### BR-076 — Rollback file thủ công

**Business Rule:** Nếu transaction lỗi sau khi tệp đã lưu, catch xóa từng tệp trên disk `public` ngoài rollback DB.

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerSupportRequestController.php:87-195`, class `CustomerSupportRequestController`, method `store()`; ghi path dòng 142-159, catch xóa dòng 186-195.
- Route/Middleware: `POST /api/customer/support-requests`; Sanctum + customer.
- Service/Action/Use Case/Domain Service/Repository: Không sử dụng. Models: `SupportRequestAttachment`, `SupportRequest`.
- Migration: `backend_laravel/database/migrations/2026_07_16_220919_create_support_requests_table.php`; `backend_laravel/database/migrations/2026_07_16_220920_create_support_request_attachments_table.php`.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng cho cơ chế rollback file.

**Database**

- Insert DB nằm trong transaction; khi Throwable thoát callback, Laravel rollback `support_requests`, `support_request_attachments` và notification đã insert.
- Filesystem: từng `$storedPaths` bị `Storage::disk('public')->delete($path)`.
- Transaction/Rollback: Có cả rollback DB tự động và cleanup file thủ công. Lock: Không có. Idempotent: thao tác cleanup gọi delete theo path; không có API retry token.
- Audit Log: Không có.

**Validation/Authorization:** theo BR-074. **Exception:** catch `Throwable`, dọn file rồi `throw $exception`.

**Data Integrity:** Thứ tự path được thêm sau `store()` thành công và trước insert attachment, nên lỗi insert attachment vẫn để catch biết file cần xóa. Bằng chứng kiểm tra kết quả `Storage::delete`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; vì vậy audit chỉ kết luận có lời gọi cleanup.

**Kết luận:** **Đúng**.

### BR-077 — Thông báo nhân viên hỗ trợ khi tạo ticket

**Business Rule:** Tìm user support từ profile active hoặc role support; tạo notification unread cho từng người và trả số người đã thông báo.

**Source Code**

- File/Class/Methods: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerSupportRequestController.php:222-370`, class `CustomerSupportRequestController`, methods `notifySupportStaff()`, `getSupportUserIds()`; được gọi từ `store()` dòng 167.
- Route: phát sinh trong `POST /api/customer/support-requests`.
- Service/Action/Use Case/Domain Service/Repository: Không sử dụng.
- Models: `Notification`, `User`; bảng `support_staff` được đọc qua Query Builder. Observer/Listener/Event/Policy/Job/Command/Scheduler: Không sử dụng.
- Migration: `backend_laravel/database/migrations/2026_07_16_220919_create_support_requests_table.php`; `backend_laravel/database/migrations/2026_06_10_220130_create_notifications_table.php`; `backend_laravel/database/migrations/2026_07_01_000001_add_user_id_to_support_staff_table.php`.
- Middleware: request gốc dùng Sanctum + customer.
- Notification: in-app database notification; không có Email/SMS/Push/Webhook. Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database**

- Read `support_staff.user_id,status`, fallback `users.role` nếu cột tồn tại, hoặc join `users.role_id = roles.id` khi chưa có ID; dòng 291-363.
- Insert `notifications(user_id,title,message,status,draft_id?,type?)`; `status=unread`, `type=system`; dòng 248-266.
- Transaction: Có do chạy trong transaction của `store()`. Rollback: insert notification rollback cùng ticket. Lock: Không có.
- Idempotent: Không có khóa unique hay idempotency key cho notification ticket.
- Audit Log: Không có.

**Validation:** Không có payload notification riêng; recipient được source truy vấn. **Authorization:** chỉ được kích hoạt từ customer create; người nhận không gọi endpoint này.

**Exception:** nếu không có support user, trả `0` và request vẫn thành công; lỗi insert được ném ra làm rollback transaction.

**Data Integrity:** Source lọc `support_staff.status=active` khi cột tồn tại và khử trùng ID bằng `unique()`. Không có unique constraint ngăn hai notification cùng ticket/user nếu customer double-submit hai ticket khác nhau.

**Kết luận:** **Đúng**. "Hoặc role support" được triển khai theo chuỗi fallback khi nguồn trước không trả ID.

### BR-078 — Cập nhật trạng thái ticket support

**Business Rule:** Chỉ chấp nhận `pending|in_progress|resolved`; mỗi trạng thái cập nhật assignee/timestamps đúng mô tả; không kiểm tra thứ tự transition.

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Support/SupportRequestController.php:123-178`, class `SupportRequestController`, method `updateStatus()`.
- Route: `PATCH /api/support/requests/{supportRequest}/status`, `routes/api.php:87-91`, route binding numeric.
- Service/Action/Use Case/Domain Service/Repository: Không sử dụng. Model: `SupportRequest`.
- Migration: `backend_laravel/database/migrations/2026_07_16_220919_create_support_requests_table.php`.
- Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.
- Middleware: Sanctum + `role:support staff`.

**Database**

- Update `support_requests.status,assigned_to,started_at,resolved_at` tại dòng 136-166.
- `pending`: ba metadata là null; `in_progress`: current user, giữ/tạo `started_at`, clear `resolved_at`; `resolved`: giữ/tạo assignee/start, `resolved_at=now()`.
- Transaction/Rollback/Lock: Không có. Idempotent: `pending` lặp lại ổn định; `in_progress` giữ start; `resolved` lặp lại thay đổi `resolved_at`, nên không idempotent theo giá trị timestamp.
- Audit Log/History: Không có bảng lịch sử được ghi.

**Validation:** `status required|in:pending,in_progress,resolved`. **Authorization:** support staff được phép; role khác `403`, guest `401`; không có ownership/assignee guard bổ sung.

**Exception:** validation `422`, route-model binding thiếu `404`; không có try/catch riêng.

**Data Integrity:** **[Suy luận từ source code]** Update đơn bản ghi không dùng lock; hai staff cập nhật đồng thời theo last-write-wins. BR đã nói không có transition guard nên không lập BUG chỉ từ rủi ro này.

**Kết luận:** **Đúng**.

### BR-079 — Badge ticket đang mở

**Business Rule:** Badge là tổng ticket `pending` và `in_progress`, chỉ support staff truy cập.

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Support/SupportRequestController.php:106-118`, class `SupportRequestController`, method `badgeCount()`.
- Route: `GET /api/support/requests/badge-count`, `routes/api.php:80`; Sanctum + `role:support staff`.
- Model: `SupportRequest`. Service, Action, Use Case, Domain Service, Repository, Observer, Listener, Event, Policy, Job, Command, Scheduler, Notification, Trigger, Stored Procedure, Queue, Cache, API integration: Không sử dụng.
- Migration: `backend_laravel/database/migrations/2026_07_16_220919_create_support_requests_table.php`.

**Database:** chỉ Read `COUNT(*)` từ `support_requests WHERE status IN (...)`; không Insert/Update/Delete; không transaction, rollback, lock hay audit.

**Validation:** Không có input. **Idempotent:** Có đối với cùng snapshot DB vì chỉ đọc. **Exception:** auth/role do middleware; không có exception nghiệp vụ riêng.

**Data Integrity:** Không có thao tác ghi; bằng chứng về lost update/dirty write/data loss trong rule: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

**Kết luận:** **Đúng**.

### BR-080 — Ownership và trạng thái đọc notification dùng chung

**Business Rule:** Chỉ đọc notification có `user_id` là user hiện tại; detail/mark-read ghi `read/read_at`; actor không phải customer bị loại `data.kind=guide_review_request`.

**Source Code**

- File/Class/Methods: `backend_laravel/app/Http/Controllers/Api/Customer/NotificationCustomerController.php:12-122`, class `NotificationCustomerController`; methods `getMyNotifications()`, `getNotificationDetail()`, `markAsRead()`, `getUnreadCount()`, `visibleNotificationsQuery()`.
- Service: `backend_laravel/app/Services/GuideReviewNotificationService.php:15-163`, `syncForUser()` chỉ chạy cho customer khi list; tạo/hoàn tất reminder trong transaction và khóa user.
- Route: `GET/PATCH /api/notifications/customers*`, `routes/api.php:125-137`; middleware chỉ `auth:sanctum`, không role customer.
- Models: `Notification`, `User`, và `Booking`/`TourGuideAssignment` trong side effect đồng bộ reminder.
- Migration: `backend_laravel/database/migrations/2026_06_10_220130_create_notifications_table.php`; `backend_laravel/database/migrations/2026_06_24_161627_modify_notifications_table.php`.
- Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler: Không sử dụng trong các method này.
- Notification: in-app database rows. Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database**

- Read `notifications` luôn có `where user_id = $user->id`; actor non-customer thêm điều kiện JSON loại `guide_review_request`.
- Update `notifications.status='read',read_at=now()` ở detail/mark; với customer, thao tác list còn Insert reminder và Update reminder đã hoàn tất qua service.
- Transaction: detail/mark không có; `GuideReviewNotificationService::syncForUser()` có transaction. Rollback: chỉ side effect service tự động rollback. Lock: service khóa row user; controller đọc/mark không lock.
- Idempotent: detail không đổi lại timestamp khi đã read; `markAsRead()` luôn ghi `now()` nên timestamp thay đổi khi lặp. Service chống duplicate reminder bằng user lock + existence query.
- Audit Log: Không có audit riêng; `read_at` là metadata nghiệp vụ.

**Validation:** ID bị `whereNumber` ở route. **Authorization:** mọi user Sanctum được gọi, ownership bằng query; notification khác user hoặc bị filter trả `404`.

**Exception:** explicit `404`; không có try/catch riêng.

**Data Integrity:** Ownership được áp dụng trước `whereKey`. Không có update notification theo ID trần. Bằng chứng về race gây đọc chéo user: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

**Kết luận:** **Đúng**.

### BR-081 — Vòng đời draft notification

**Business Rule:** Draft yêu cầu title/message/target type hợp lệ; target IDs nullable; chỉ draft status `draft` được xem/sửa theo method chuyên biệt; xóa thường dùng soft delete.

**Source Code**

- File/Class/Methods: `backend_laravel/app/Http/Controllers/Api/Admin/NotificationController.php:15-168`, class `NotificationController`; `saveDraft()`, `listDrafts()`, `showDraft()`, `updateDraft()`, `destroy()`, `listTrashedDrafts()`, `restoreDraft()`, `forceDeleteDraft()`.
- Route: `/api/admin/notifications/draft*`, `routes/api.php:389-407`; Sanctum + admin.
- Model: `backend_laravel/app/Models/NotificationDraft.php:8-13`, `SoftDeletes`, cast `target_ids=array`.
- Migrations: `2026_06_24_152026_create_notification_drafts_table.php:11-25`; `2026_06_24_155228_add_deleted_at_to_notification_drafts_table.php:14-16`.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database**

- Insert/Update `notification_drafts(title,message,target_type,target_ids,status)`; soft delete cập nhật `deleted_at`; restore đặt `deleted_at=null`; force delete xóa row.
- Transaction/Rollback/Lock: Không có. Idempotent: update cùng dữ liệu ổn định; delete/restore lần hai trả `404`; create không có idempotency key.
- Audit Log/History: Không có.

**Validation:** title required string max255; message required string; target type `all|role|specific`; target IDs nullable array. Source không validate từng ID ở save/update; rule không tuyên bố có validation đó.

**Authorization:** Admin; guest `401`, role khác `403`. **Exception:** missing/wrong state trả `404`; validation `422`; `findOrFail()` dùng framework 404.

**Data Integrity:** Không có transaction nhưng từng method chủ yếu ghi một row. **[Suy luận từ source code]** `saveDraft()` dùng `updateOrCreate(['id'=>$request->id,'status'=>'draft'], ...)`; không có lock cho concurrent update.

**Kết luận:** **Đúng**.

### BR-082 — Gửi draft tới recipient

**Business Rule:** Recipient theo all/role ID/user ID; bulk insert unread và đổi draft sang `sent` trong transaction; không có recipient trả `404`.

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Admin/NotificationController.php:171-219`, class `NotificationController`, method `sendNotification()`.
- Route: `POST /api/admin/notifications/send/{id}`, `routes/api.php:409`; Sanctum + admin.
- Models: `NotificationDraft`, `Notification`, `User`; migrations notification/draft nêu ở BR-080/081.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler: Không sử dụng.
- Notification: in-app bulk insert. Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database**

- Read draft `status=draft`; recipient query: all users, `users.role_id IN target_ids`, hoặc `users.id IN target_ids`.
- Insert `notifications(draft_id,user_id,title,message,type=system,status=unread,created_at,updated_at)`; Update `notification_drafts.status=sent`.
- Transaction: Có, `DB::transaction()` dòng 175-218. Rollback: tự động khi insert/update ném exception. Lock: Không có.
- Idempotent: gọi tuần tự sau lần thành công trả `404` vì draft đã sent. **[Suy luận từ source code]** Gọi đồng thời không được bảo vệ: không có row lock, optimistic guard hoặc unique `(draft_id,user_id)`.
- Audit Log: Không có; draft/status và notification là dữ liệu nghiệp vụ.

**Validation:** Không validate request body ở send; dữ liệu đã lưu theo BR-081. **Authorization:** Admin. **Exception:** draft thiếu/đã gửi `404`; recipient rỗng `404`; lỗi DB không có catch riêng.

**Data Integrity:** Transaction đảm bảo bulk insert và status cùng commit/rollback trong từng request. **[Suy luận từ source code]** Hai transaction đồng thời đều đọc được cùng draft `status=draft` tại dòng 177 trước khi một transaction cập nhật dòng 213; mỗi transaction đều chạy bulk insert dòng 210. Câu update chỉ theo khóa model, không kèm điều kiện trạng thái cũ. Migration notification không có unique `(draft_id,user_id)`. Vì vậy cùng một campaign nhận hai bộ notification và cả hai request trả `200`. `FR-010` quy định draft “đã gửi” đi vào nhánh `404`; state flow tại `06-process-and-state-diagrams.md:834-840` cũng yêu cầu bản ghi còn `draft` trước khi bulk insert.

**Kết luận:** **Sai**. Luồng tuần tự đúng BR-082, nhưng source không bảo đảm điều kiện chỉ gửi draft đang ở trạng thái `draft` tại thời điểm chuyển trạng thái khi hai request chạy đồng thời.

### BR-083 — Thu hồi campaign

**Business Rule:** Chỉ draft `sent`; xóa notification theo `draft_id`, rồi đổi draft về `draft`; hai thao tác không có transaction.

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Admin/NotificationController.php:250-274`, class `NotificationController`, method `revoke()`.
- Route: `DELETE /api/admin/notifications/revoke/{draft_id}`, `routes/api.php:413`; Sanctum + admin.
- Models: `NotificationDraft`, `Notification`; migration `2026_06_24_165838_add_draft_id_to_notifications_table.php:14-16`.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database**

- Read draft với `id` và `status=sent`; Delete notification `where draft_id`; Update draft `status=draft`.
- Transaction: Không có. Rollback: Không có. Lock: Không có. Idempotent: gọi tuần tự sau thành công trả `404`; **[Suy luận từ source code]** hai request đồng thời đều được phép vượt qua query `status=sent` trước khi một request đổi trạng thái.
- Audit Log/History: Không có.

**Validation:** Không có FormRequest/body; `draft_id` không có `whereNumber`. **Authorization:** Admin. **Exception:** không có draft sent trả `404`; DB exception không được catch.

**Data Integrity:** Source thực hiện delete trước update. Khi update draft ném exception sau khi delete commit, notification đã mất nhưng draft vẫn `sent`. Với lịch xen kẽ trong đó hai revoke cùng đọc `sent` trước lần update đầu, request xóa sau trả thành công với `deletedCount=0`. Đây là hệ quả trực tiếp của việc không có transaction/lock mà BR-083 đã mô tả; không lập BUG riêng vì Business Rule không tuyên bố rollback hoặc exactly-once cho revoke.

**Kết luận:** **Đúng**.

### BR-084 — Support gửi thông báo tới admin

**Business Rule:** Support staff được gửi title/message tới toàn bộ user role admin; controller bulk insert trong transaction với metadata người gửi.

**Source Code**

- File/Class/Method: `backend_laravel/app/Http/Controllers/Api/Support/SupportNotificationController.php:113-158`, class `SupportNotificationController`, method `sendNotification()`.
- Route: `POST /api/notifications/support/send`, `routes/api.php:146`; Sanctum + `role:support staff`.
- Models: `Notification`, `User`, `Role` relation. Migration: `backend_laravel/database/migrations/2026_06_10_220130_create_notifications_table.php:14-23`; `2026_06_24_161627_modify_notifications_table.php:14-24`.
- Service/Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Policy/Job/Command/Scheduler: Không sử dụng.
- Notification: controller bulk insert in-app notification; không Email/SMS/Push/Webhook. Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng.

**Database**

- Read `users` có relation role name `admin`; Insert `notifications(user_id,title,message,type,data,status,created_at,updated_at)`.
- Payload đặt `type='support_message'`, `data={source,sender_role,sender_user_id}`, `status=unread` tại dòng 135-148.
- Transaction: Có, `DB::transaction()` dòng 133-152. Rollback: tự động nếu insert lỗi. Lock: Không có. Idempotent: Không có; mỗi request thành công sẽ tạo thêm notification.
- Audit Log: Không có audit riêng; metadata người gửi nằm trong `notifications.data`.

**Validation:** `title required|string|max:255`; `message required|string`. **Authorization:** chỉ support staff; guest `401`, role khác `403`.

**Exception:** không có admin trả `404`; validation `422`; lỗi insert không có catch riêng.

**Data Integrity:** Migration định nghĩa enum `notifications.type` chỉ gồm `booking,payment,promotion,system,support` tại `2026_06_10_220130_create_notifications_table.php:19`. Không có migration nào bổ sung `support_message`. Controller insert giá trị ngoài contract DB; trên database thực thi ràng buộc enum, transaction rollback và API không hoàn thành mệnh đề gửi.

**Kết luận:** **Sai**. Có route, validation, recipient query, transaction và metadata, nhưng giá trị `type` trái schema migration làm flow gửi không được bảo đảm hoạt động trên schema được tài liệu xác định.

## Danh sách BUG

### BUG-SA-001 — Support notification dùng giá trị type ngoài enum database

- **Business Rule liên quan:** BR-084.
- **Mô tả:** Payload bulk insert đặt `notifications.type='support_message'`, trong khi migration chỉ cho phép `booking|payment|promotion|system|support`.
- **File/Hàm:** `backend_laravel/app/Http/Controllers/Api/Support/SupportNotificationController.php:113-152`, `SupportNotificationController::sendNotification()`; `backend_laravel/database/migrations/2026_06_10_220130_create_notifications_table.php:14-23`, migration `up()`.
- **Bằng chứng:** controller dòng 139 ghi `support_message`; migration dòng 19 không chứa giá trị này; toàn bộ migration đã truy vết không có thao tác thay enum notification để bổ sung giá trị.
- **Mức độ ảnh hưởng:** **High** — flow cốt lõi gửi thông báo support → admin bị transaction rollback trên driver áp dụng enum.
- **Điều kiện tái hiện:** dùng schema được tạo từ migration trên một DB thực thi enum; có ít nhất một admin; đăng nhập support staff; gọi `POST /api/notifications/support/send` với title/message hợp lệ; câu insert nhận giá trị ngoài enum.

### BUG-SA-004 — Gửi đồng thời một draft tạo notification trùng

- **Business Rule liên quan:** BR-082; `FR-010`; state flow chiến dịch notification.
- **Mô tả:** **[Suy luận từ source code]** Hai request gửi cùng một draft đều vượt qua điều kiện `status=draft`, cùng bulk insert notification và cùng cập nhật `sent`. Trạng thái `sent` không ngăn request thứ hai đã đọc draft trước đó.
- **File/Hàm:** `backend_laravel/app/Http/Controllers/Api/Admin/NotificationController.php:171-218`, `NotificationController::sendNotification()`; migrations `backend_laravel/database/migrations/2026_06_24_165838_add_draft_id_to_notifications_table.php:14-16` và `2026_06_10_220130_create_notifications_table.php:12-23`.
- **Bằng chứng:** query dòng 177 không `lockForUpdate()`; insert dòng 210 chạy trước update trạng thái dòng 213; update không có optimistic condition; schema không có unique `(draft_id,user_id)`. `FR-010` tại `docs/reverse-engineering/04-srs.md:181-184` và flow tại `06-process-and-state-diagrams.md:834-840` đưa draft đã gửi vào nhánh `404` thay vì bulk insert lần nữa.
- **Mức độ ảnh hưởng:** **High** — người nhận nhận trùng campaign và dữ liệu notification bị nhân đôi trong core flow gửi thông báo.
- **Điều kiện tái hiện:** tạo một draft `target_type=specific` có một recipient; dùng hai kết nối DB gửi đồng thời `POST /api/admin/notifications/send/{id}` sao cho cả hai đọc draft trước câu update; quan sát cả hai response `200` và hai row có cùng `draft_id,user_id`.
