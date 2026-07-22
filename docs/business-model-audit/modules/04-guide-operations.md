# Audit Business Model — Phân công và vận hành hướng dẫn viên

## Phạm vi và nguyên tắc

- Business Rule: `BR-054` đến `BR-073` trong `docs/reverse-engineering/03-business-rules-brd.md`.
- Đối chiếu thêm các module/SRS/use case/sơ đồ/ERD/API/matrix/điểm chưa xác minh trong `docs/reverse-engineering`.
- Chỉ xác minh business model với source. Không review style, naming, performance, architecture, pattern hoặc đề xuất sửa.
- `Đúng`: toàn bộ mệnh đề có bằng chứng; `Sai`: có execution path trái mệnh đề; `Thiếu`: source chỉ chứng minh một phần.
- Trạng thái hậu sửa: **20/20 Business Rule Đúng**. Bốn chẩn đoán `BUG-RG-001`–`BUG-RG-004` được giữ lại ở cuối tài liệu như lịch sử và đã có trạng thái `Resolved` theo source/test hiện tại.

## Bảng tổng hợp

| Business Rule | Đã triển khai | File chính | Hàm chính | Đúng / Sai / Thiếu | Mức độ ảnh hưởng |
| --- | --- | --- | --- | --- | --- |
| BR-054 | Có | `backend_laravel/app/Services/GuideAssignmentService.php` | `eligibleGuidesQuery()`, `hasScheduleConflict()`, `restDays()` | Đúng | — |
| BR-055 | Có | `backend_laravel/app/Services/GuideAssignmentService.php` | `applyFairWorkloadOrder()` | Đúng | — |
| BR-056 | Có | `backend_laravel/app/Services/GuideAssignmentService.php` | `autoAssign()` | Đúng | — |
| BR-057 | Có | `backend_laravel/app/Services/GuideAssignmentService.php` | `assignSpecific()` | Đúng | — |
| BR-058 | Có | `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php` | `directCandidates()` | Đúng | — |
| BR-059 | Có | `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php` | `directAssign()` | Đúng | — |
| BR-060 | Có | `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php` | `directAssign()` và notification helpers | Đúng | — |
| BR-061 | Có | `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php` | `cancel()` | Đúng | — |
| BR-062 | Có | `backend_laravel/app/Services/GuideTourOperationService.php` | `guideForUser()`, `assignedDepartureForUser()` | Đúng | — |
| BR-063 | Có | `backend_laravel/app/Services/GuideTourOperationService.php` | `participantBaseQuery()`, `scopeBookingToDeparture()` | Đúng | — |
| BR-064 | Có | `backend_laravel/app/Services/GuideTourOperationService.php`; `backend_laravel/app/Http/Requests/StoreAttendanceSessionRequest.php` | `createAttendanceSession()` và assertions | Đúng | — |
| BR-065 | Có | `backend_laravel/app/Services/GuideTourOperationService.php` | `checkIn()`, `checkOut()` | Đúng | — |
| BR-066 | Có | `backend_laravel/app/Services/GuideTourOperationService.php`; `backend_laravel/app/Http/Requests/UpdateAttendanceNoteRequest.php` | `updateAttendanceNote()` | Đúng | — |
| BR-067 | Có | `backend_laravel/app/Services/GuideTourOperationService.php` | `ensureStagesForDeparture()`, `advanceStage()` | Đúng | — |
| BR-068 | Có | `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php` | `store()` | Đúng | — |
| BR-069 | Có; overlap check được serialize trong transaction | `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php` | `store()` | Đúng | — |
| BR-070 | Có; row lock và tái kiểm tra state/owner | `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php` | `cancel()` | Đúng | — |
| BR-071 | Có; decision và notification cùng transaction | `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideLeaveRequestController.php` | `updateStatus()` | Đúng | — |
| BR-072 | Có; departure/assignment/pending được lock và tái kiểm tra | `backend_laravel/app/Http/Controllers/Api/Guide/GuideTourController.php` | `requestReplacement()` | Đúng | — |
| BR-073 | Có; approve/reject lock cùng departure/request và tái kiểm tra pending | `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideReplacementRequestController.php` | `approve()`, `reject()` | Đúng | — |

## Đối chiếu hậu sửa BUG-XD-001 và BUG-XD-002

### BUG-XD-001 — Assignment mutation guard — Resolved

- Sáu endpoint assignment đều gọi `TourDepartureMutationGuard::assertCanMutate()`: `candidates()` dòng 80–95, `autoAssign()` dòng 97–116, `assign()` dòng 118–143, `cancel()` dòng 145–207, `directCandidates()` dòng 420–426 và `directAssign()` dòng 751–756 trong `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php`.
- Các write flow tái kiểm tra sau khi lock: `GuideAssignmentService::autoAssign()` dòng 378–435 và `assignSpecific()` dòng 441–499; `TourDepartureGuideAssignmentController::cancel()` dòng 165–202; `directAssign()` dòng 852–869. Departure có `departure_date <= today` bị trả `422` field `departure` qua guard.
- Route: `backend_laravel/routes/api.php:425-453`; middleware: `auth:sanctum`, `role:admin`; Policy/Gate không sử dụng.
- Test: `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php:150-216` xác minh cả sáu endpoint bị chặn ở boundary hôm nay và cancel vẫn thành công với departure tương lai.

### BUG-XD-002 — `certificate_type` được lưu và trả qua API — Resolved

- Migration: `backend_laravel/database/migrations/2026_07_22_000000_restore_certificate_type_to_guides_table.php:9-22` thêm `guides.certificate_type` dạng nullable `VARCHAR(100)`; `down()` drop column.
- Model: `backend_laravel/app/Models/Guide.php:15-24` có `certificate_type` trong `$fillable`.
- API: `GuideProfileController::show()` trả field tại `backend_laravel/app/Http/Controllers/Api/Guide/GuideProfileController.php:40-53`; `update()` validate `sometimes|string|max:100` và đưa field vào payload update tại dòng 93–137. Route `GET|PUT /api/guide/profile` dùng `auth:sanctum`, `role:tour guide`.
- Test: `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php:116-148` xác minh schema, ghi/đọc 100 ký tự và từ chối 101 ký tự.

### Bằng chứng automation hậu sửa

- `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php` có 8 test cho schema/API `certificate_type`, mutation guard sáu endpoint, stale-state leave, overlap leave, replacement pending và processed-state replacement.
- `backend_laravel/tests/Feature/BusinessModelConcurrencyMysqlTest.php` đã chạy toàn file trên MySQL: **6 test pass, 15 assertions**. Bốn case Guide tại dòng 241–430 đều pass, tương ứng `BUG-RG-001`–`BUG-RG-004`; hai case còn lại thuộc module khác.

## Phân tích chi tiết

### BR-054 — Loại guide trùng lịch có cộng ngày nghỉ

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Services/GuideAssignmentService.php:16` — `restDays()` dòng 26–29, `eligibleGuidesQuery()` dòng 104–203, `hasScheduleConflict()` dòng 336–373, `dateRange()` dòng 506–518.
- Routes: candidate/auto/strict assignment trong `backend_laravel/routes/api.php:425-439`.
- Controller: `TourDepartureGuideAssignmentController::{candidates,autoAssign,assign}`.
- Service: `GuideAssignmentService`; Model: `Guide`, `TourGuideAssignment`, `TourDeparture`.
- Migration: `backend_laravel/database/migrations/2026_06_28_092905_create_tour_guide_assignments_table.php`; `backend_laravel/database/migrations/2026_07_07_080821_add_assignment_fields_to_tour_guide_assignments_table.php`; `backend_laravel/database/migrations/2026_06_10_220040_create_tour_departures_table.php`.
- Middleware: `auth:sanctum`, `role:admin`; Policy/Gate không sử dụng.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không sử dụng trong phép kiểm lịch.

#### Database

- Read: assignment khác departure hiện tại có status `assigned|confirmed`; departure range `departure_date` đến `COALESCE(return_date, departure_date)`.
- Khoảng chặn: start trừ và end cộng `config('tour.guide_rest_days', 1)`; file `backend_laravel/config/tour.php`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**, nên lời gọi dùng default 1 nếu không có runtime config override.
- Insert/Update/Delete: Không có trong query/check.
- Transaction/Lock: candidate GET không; auto/strict gọi trong transaction và lock theo BR-056/057. Rollback không áp dụng cho query.
- Idempotent: phép kiểm chỉ đọc. Audit Log: Không dùng.

#### Validation, Authorization, Exception và Data Integrity

- Ngày về null được thay bằng ngày đi; status ngoài assigned/confirmed không chặn.
- Admin-only route; departure not found 404.
- Không có leave-request check trong strict service này; rule BR-054 chỉ tuyên bố assignment conflict/rest-day nên source vẫn khớp.
- Không mutation. **[Suy luận từ source code]** Race được tái kiểm bởi `hasScheduleConflict()` trước create trong auto/strict nhưng guide lịch cạnh tranh vẫn dựa trên locks của flow tương ứng.

#### Kết luận

**Đúng.** Status conflict, khoảng ngày và default rest day đều khớp mệnh đề.

### BR-055 — Thứ tự công bằng của auto assignment

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Services/GuideAssignmentService.php` — `applyFairWorkloadOrder()` dòng 214–331.
- Call site: `eligibleGuidesQuery()` dòng 202; cuối cùng `autoAssign()` lấy `first()`.
- Route: `POST /api/admin/tour-departures/{departure}/auto-assign-guide`.
- Service/Model: `GuideAssignmentService`; `Guide`, `TourGuideAssignment`, `TourDeparture`.
- Migration: `backend_laravel/database/migrations/2026_06_28_092905_create_tour_guide_assignments_table.php`; `backend_laravel/database/migrations/2026_07_07_080821_add_assignment_fields_to_tour_guide_assignments_table.php`.
- Middleware: admin auth/role. Policy/Gate không dùng.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không dùng trong ordering.

#### Database

- Read/subquery: tổng số ngày và số assignment `assigned|confirmed` giao với năm của departure đang phân công, bỏ departure hiện tại; lần `MAX(assigned_at)`.
- Order: `workload_days ASC`, `workload_count ASC`, null last-assigned trước rồi thời gian ASC, `experience_years DESC` nếu column tồn tại, `guides.id ASC`.
- Insert/Update/Delete: Không có trong method order.
- Transaction/Lock: chạy trong transaction auto assign; selected guide query được `lockForUpdate()` ở caller. Rollback không áp dụng riêng.
- Idempotent: read/order only. Audit Log: Không dùng.

#### Validation, Authorization, Exception và Data Integrity

- Năm lấy từ departure start, `startOfYear/endOfYear`; các SQL subquery chỉ xét active assignment status nêu trên.
- Chỉ candidate đã qua BR-053/054 mới được sắp xếp.
- Không mutation; không phát hiện mệnh đề sai.

#### Kết luận

**Đúng.** Toàn bộ chuỗi tiêu chí và chiều sort trùng với rule.

### BR-056 — Auto assign khóa departure và không tạo thêm lead hiện hữu

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Services/GuideAssignmentService.php` — `autoAssign()` dòng 378–435.
- Controller/Route: `TourDepartureGuideAssignmentController::autoAssign()` dòng 97–116; `POST /api/admin/tour-departures/{departure}/auto-assign-guide`.
- Service/Model: `GuideAssignmentService`; `TourDeparture`, `Guide`, `TourGuideAssignment`.
- Migration: `backend_laravel/database/migrations/2026_06_28_092905_create_tour_guide_assignments_table.php`; `backend_laravel/database/migrations/2026_07_07_080821_add_assignment_fields_to_tour_guide_assignments_table.php`.
- Middleware: admin auth/role; Policy/Gate không dùng.
- Notification: controller gọi `notifyGuideAssigned()` và `notifyAdminGuideAutoAssigned()` sau service. Event/Listener/Observer/Job/Queue/API integration: Không dùng; notification ghi đồng bộ.
- Action/Use Case/Domain Service riêng/Repository/Command/Scheduler/Trigger/Stored Procedure/Cache: Không dùng.

#### Database

- Lock/read: departure `lockForUpdate`; tái kiểm tra `TourDepartureMutationGuard`; tìm lead `assigned|confirmed`; nếu chưa có thì candidate guide `lockForUpdate` và tái kiểm schedule.
- Insert: assignment `tour_departure_id`, `guide_id`, `role=lead`, `status=assigned`, `assigned_by`, `assigned_at`.
- Unique: `(guide_id,tour_departure_id)` tại `2026_06_28_092905_create_tour_guide_assignments_table.php:24`; DB không có unique “một lead/departure”.
- Transaction: `DB::transaction(..., 3)`; tự retry deadlock tối đa theo tham số attempts. Rollback tự động khi exception thoát.
- Idempotent: service trả existing lead và không insert thêm. Controller vẫn gọi notification sau khi service trả existing, nên idempotency không bao gồm notification; rule chỉ tuyên bố assignment record.
- Audit: `assigned_by/assigned_at`; không audit-log history.

#### Validation, Authorization, Exception và Data Integrity

- Departure có ngày khởi hành `<= today` bị controller chặn 422 và được service tái kiểm tra sau row lock; không candidate hoặc schedule conflict ném ValidationException/422; departure thiếu 404.
- Departure row lock serialize auto/strict service calls dùng cùng departure.
- Notification helpers catch/report Throwable nên notification lỗi không rollback assignment vì được gọi sau service transaction.

#### Kết luận

**Đúng.** Lock, current lead return, validation và create fields khớp rule.

### BR-057 — Strict assign chỉ thêm một lead đủ điều kiện

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Services/GuideAssignmentService.php` — `assignSpecific()` dòng 441–499; `eligibleGuidesQuery()`/`hasScheduleConflict()`.
- Controller/Route: `TourDepartureGuideAssignmentController::assign()` dòng 118–143; `POST /api/admin/tour-departures/{departure}/assign-guide`.
- Service/Model: `GuideAssignmentService`; `TourDeparture`, `Guide`, `TourGuideAssignment`.
- Migration: `backend_laravel/database/migrations/2026_06_28_092905_create_tour_guide_assignments_table.php`; `backend_laravel/database/migrations/2026_07_07_080821_add_assignment_fields_to_tour_guide_assignments_table.php`.
- Middleware: admin auth/role. Policy/Gate không dùng.
- Notification: guide và admin notification được controller gọi sau service. Event/Listener/Observer/Job/Queue/API integration: Không dùng.
- Action/Use Case/Domain Service riêng/Repository/Command/Scheduler/Trigger/Stored Procedure/Cache: Không dùng.

#### Database

- Read/lock: reload+lock departure; tái kiểm tra mutation guard; kiểm tồn tại lead `assigned|confirmed`; query đúng guide từ strict eligible set và lock guide.
- Insert: role lead, status assigned, actor/time như BR-056.
- Transaction: `DB::transaction(...,3)`; rollback khi exception; lock departure/guide.
- Idempotent: không; khi đã có lead, kể cả cùng guide, trả validation thay vì success.
- Audit: `assigned_by/assigned_at`; không history table.

#### Validation, Authorization, Exception và Data Integrity

- Departure `<= today` trả 422 field `departure` ở controller và được tái kiểm tra trong transaction; body `guide_id|required|integer|exists:guides,id` tại controller.
- Existing lead: ValidationException field departure; guide không đủ tất cả khu vực/trống lịch: ValidationException field guide_id.
- Một lead trong strict flow được bảo vệ bằng departure lock + existence check.

#### Kết luận

**Đúng.** Strict flow sử dụng chính strict candidate query và tạo đúng role/status.

### BR-058 — Direct candidates dùng giao khu vực và cờ availability riêng

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php:18` — `directCandidates()` dòng 420–749.
- Route: `GET /api/admin/tour-departures/{departure}/direct-guide-candidates`.
- Service: Không sử dụng `GuideAssignmentService` trong method này; logic nằm trực tiếp controller.
- Model/query: `Guide`, `TourGuideAssignment`; leave và language dùng query builder; destinations qua relation.
- Migration: `backend_laravel/database/migrations/2026_06_28_092905_create_tour_guide_assignments_table.php`; `backend_laravel/database/migrations/2026_07_13_000000_create_guide_leave_requests_tables.php`; `backend_laravel/database/migrations/2026_07_07_055358_create_guide_destinations_table.php`.
- Middleware: admin auth/role; Policy/Gate không dùng.
- Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không dùng.

#### Database

- Read: active guides chưa có active assignment trên chính departure; destinations, languages; assignment overlap; leave `pending|approved`; assigned tours.
- `is_area_match`: tập destination guide intersect tập destination tour không rỗng.
- `is_available`: không có assignment overlap và không có leave conflict. `is_eligible`: hai cờ cùng true.
- Insert/Update/Delete/Transaction/Rollback/Lock/Audit Log: Không dùng; list read-only. Trước query, controller gọi mutation guard và trả 422 cho departure `<= today`.
- Idempotent: GET read-only.

#### Validation, Authorization, Exception và Data Integrity

- `mode` eligible/all; keyword max255; from/to dates; destination exists; language IDs array/exists; per-page 1–100.
- Direct range không cộng rest day; đúng vì rule mô tả logic khác strict.
- Guide phải active nếu column tồn tại; điều này là filter bổ sung, không trái mệnh đề cờ.
- Không mutation.

#### Kết luận

**Đúng.** Ba cờ được tính chính xác như rule; direct không dùng điều kiện “tất cả destination” của strict.

### BR-059 — Direct assign chặn lịch/nghỉ và cho force lệch khu vực

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php` — `directAssign()` dòng 751–958.
- Route: `POST /api/admin/tour-departures/{departure}/direct-assign-guide`.
- Service: Không sử dụng `GuideAssignmentService`; logic controller. Model: `Guide`, `TourGuideAssignment`, `TourDeparture`; leave query builder.
- Migration: `backend_laravel/database/migrations/2026_06_28_092905_create_tour_guide_assignments_table.php`; `backend_laravel/database/migrations/2026_07_13_000000_create_guide_leave_requests_tables.php`.
- Middleware: admin auth/role; Policy/Gate không dùng.
- Notification: các helper direct/admin được gọi ở phần mutation BR-060. Event/Listener/Observer/Job/Queue/API integration: Không dùng.
- Action/Use Case/Domain Service/Repository/Command/Scheduler/Trigger/Stored Procedure/Cache: Không dùng.

#### Database

- Read: guide; active assignment khác departure giao `[departure_date, return_date]`; leave `pending|approved` giao range; destination tour/guide.
- Insert/Update/Delete: chỉ xảy ra sau các guard, mô tả BR-060.
- Transaction: guard conflict/leave/area nằm trước transaction. Rollback: không áp dụng cho các guard read-only; mutation/rollback phía sau được mô tả tại BR-060. Mutation guard được gọi trước validation và tái kiểm tra sau khi lock departure trong transaction.
- Idempotent: cùng current guide không tạo record mới ở BR-060; guard lỗi được thực thi trước nhánh đó.
- Audit: assignment actor/time khi create; không audit-log.

#### Validation, Authorization, Exception và Data Integrity

- Body: `guide_id|required|integer|exists:guides,id`; `force_area_mismatch|nullable|boolean`.
- Schedule conflict trả 422 + `GUIDE_SCHEDULE_CONFLICT`; leave conflict 422 + `GUIDE_LEAVE_CONFLICT`; area mismatch không force trả 409 + `AREA_MISMATCH_CONFIRM_REQUIRED`.
- Force chỉ bỏ area guard, không bỏ schedule/leave guard. Departure `<= today` trả 422 field `departure`.
- **[Suy luận từ source code]** Race: các precheck schedule/leave/area nằm ngoài transaction và không lock guide/conflict rows nên execution path cho phép dữ liệu conflict đổi trước insert; rule không nêu concurrency, ghi nhận rủi ro nhưng kết luận mệnh đề tuần tự đúng. Mutation guard ngày departure vẫn được tái kiểm tra sau departure lock như đã nêu.

#### Kết luận

**Đúng.** Các guard, status leave và cờ force có source trực tiếp.

### BR-060 — Direct assign giữ nguyên cùng guide hoặc thay lead trong transaction

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php` — `directAssign()` dòng 751–958; notification helpers sau method này.
- Route: `POST /api/admin/tour-departures/{departure}/direct-assign-guide`.
- Service: notification admin qua `App\Services\AdminNotificationService`; assignment logic không tách service.
- Model: `TourGuideAssignment`, `Guide`, `TourDeparture`, `Notification`.
- Migration: `backend_laravel/database/migrations/2026_06_28_092905_create_tour_guide_assignments_table.php`; `backend_laravel/database/migrations/2026_06_10_220130_create_notifications_table.php`.
- Middleware: admin auth/role; Policy/Gate không dùng.
- Notification: DB notification đồng bộ cho guide cũ/mới và admin. Event/Listener/Observer/Job/Queue/API integration: Không dùng.
- Action/Use Case/Domain Service riêng/Repository/Command/Scheduler/Trigger/Stored Procedure/Cache: Không dùng.

#### Database

- Read: lead current status `assigned|confirmed` trên departure.
- Cùng guide: trả existing assignment, không insert/delete và không gọi helper notification trong closure.
- Guide khác: insert notification (helper catch lỗi), hard delete lead cũ, insert assignment mới role lead/status assigned/actor/time, insert notification guide/admin.
- Transaction: assignment replacement và lời gọi helper nằm trong `DB::transaction(..., 3)` dòng 852–945. Rollback DB mutation nếu exception thoát; các guide/admin helper catch/report `Throwable`, nên lỗi đã bị catch không rollback transaction.
- Lock: departure được reload bằng `lockForUpdate()` trước khi đọc lead và mutation guard được tái kiểm tra. Unique chỉ `(guide_id,departure_id)`, không unique lead per departure; departure lock serialize direct mutation trên cùng departure.
- Idempotent: cùng guide giữ assignment; response vẫn 201. Không có idempotency key.
- Audit: new assignment has actor/time; hard-deleted old assignment không có history row; notifications là thông báo, không phải audit log.

#### Validation, Authorization, Exception và Data Integrity

- Guard/authorization theo BR-059.
- **[Suy luận từ source code]** Các direct mutation cùng departure được serialize bằng departure row lock; request chạy sau đọc lại lead sau khi request trước commit.
- Notification bị thiếu trong nhánh helper bắt lỗi nhưng assignment vẫn commit; rule chứng minh lời gọi gửi, không cam kết delivery.

#### Kết luận

**Đúng.** Source triển khai đúng hai nhánh được rule mô tả; các giới hạn atomic notification/concurrency được ghi riêng.

### BR-061 — Hủy assignment là hard delete sau khi xác minh departure

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php` — `cancel()` dòng 145–207, các helper notification trong cùng controller.
- Route: `PATCH /api/admin/tour-departures/{departure}/guide-assignments/{assignment}/cancel`.
- Model: `backend_laravel/app/Models/TourGuideAssignment.php:8`; không dùng trait `SoftDeletes`.
- Service: `AdminNotificationService` cho admin notification; không service assignment trong cancel.
- Middleware: admin auth/role; Policy/Gate không dùng.
- Notification đồng bộ; Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Job/Command/Scheduler/Trigger/Stored Procedure/Queue/Cache/API integration: Không dùng.

#### Database

- Ownership consistency: so `assignment.tour_departure_id` với path departure, không khớp abort 404.
- Insert: notification guide/admin; Delete: hard delete `tour_guide_assignments` row; Update không có.
- Migration `2026_06_28_092905_create_tour_guide_assignments_table.php` không có `deleted_at`.
- Transaction: notification calls + delete trong transaction. Rollback khi exception thoát; helper notification catch/report nên lỗi notification đã catch không rollback delete.
- Lock: departure và assignment được `lockForUpdate()`; relation assignment/departure và mutation guard được tái kiểm tra sau lock. Idempotent: lần thứ hai route-model binding không còn row và trả 404.
- Audit: notification lưu dấu khi insert thành công; không có assignment history/audit log.

#### Validation, Authorization, Exception và Data Integrity

- Không body validation. Chỉ admin; departure/assignment missing hoặc mismatch 404; departure `<= today` trả 422 field `departure`.
- Hard delete xóa bằng chứng assignment gốc ngoài notification; đây đúng rule, không lập BUG.
- **[Suy luận từ source code]** Concurrent cancel/replace trên cùng departure được serialize bằng departure row lock; assignment được tái đọc sau lock trước delete.

#### Kết luận

**Đúng.** Consistency check, notification call và hard delete đều khớp.

### BR-062 — Chỉ guide có profile và assignment được vận hành departure

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Services/GuideTourOperationService.php:21` — `guideForUser()` dòng 481–499, `assignedDepartureForUser()` dòng 462–476.
- Controller/Routes: `GuideAttendanceController` cho `/api/guide/tours/{tourDeparture}/overview|customers|attendance*|stages*` tại `backend_laravel/routes/api.php:508-520`.
- Service: `GuideTourOperationService`. Model: `User`, `Guide`, `TourDeparture`, `TourGuideAssignment` canonical.
- Middleware: `auth:sanctum`, `role:tour guide`; service còn chấp nhận role normalized `tour guide|guide`. Do route chỉ cho `tour guide`, role `guide` chỉ đi qua nếu service được gọi từ context khác.
- Policy/Gate: Không dùng; authorization nằm trong middleware/service.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không dùng.

#### Database

- Read: user role relation; `guides.user_id`; assignment cùng guide/departure với `status != cancelled`.
- Insert/Update/Delete: Không có trong authorization helpers.
- Transaction/Rollback/Lock: helpers read-only không transaction, rollback hoặc lock; operation callers có transaction tùy action.
- Idempotent: checks read-only. Audit Log: Không dùng.

#### Validation, Authorization, Exception và Data Integrity

- Role sai, không guide profile hoặc không assignment đều ném `AuthorizationException('Forbidden.')`.
- Assignment status `completed` vẫn khác cancelled và được phép đọc/đi vào service; write operation còn bị ongoing guard theo BR-064.
- `canceled` (một chữ l) không bị service loại vì chỉ so `cancelled`; enum migration dùng `cancelled`, nên không có giá trị `canceled` hợp lệ theo migration.
- Không mutation từ helper.

#### Kết luận

**Đúng.** Cả role/profile/assignment/departure/status và exception đều được source chứng minh.

### BR-063 — Danh sách participant chỉ từ booking confirmed và paid

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Services/GuideTourOperationService.php` — `participantBaseQuery()` dòng 537–542, `scopeBookingToDeparture()` dòng 544–550.
- Call sites: `getCustomers()`, `getAttendanceStatistics()`, `assertParticipantBelongsToDeparture()`; controller `GuideAttendanceController::{customers,statistics,showCustomer,checkIn,checkOut,updateNote}`.
- Routes: customer/attendance endpoints dưới `/api/guide/tours/{tourDeparture}`.
- Service/Model: `GuideTourOperationService`; `BookingParticipant`, `Booking`, `TourDeparture`.
- Migration: `backend_laravel/database/migrations/2026_06_10_220060_create_bookings_table.php`; `backend_laravel/database/migrations/2026_06_10_220080_create_booking_participants_table.php`; `backend_laravel/database/migrations/2026_06_28_092905_create_tour_guide_assignments_table.php`.
- Middleware/auth theo BR-062; Policy/Gate không dùng.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không dùng.

#### Database

- Read: booking participant chỉ khi booking có đúng `tour_departure_id`, `status='confirmed'`, `payment_status='paid'`.
- Insert/Update/Delete: Không có trong base query; attendance action mutation ở BR-065/066.
- Transaction/Rollback/Lock: query không; caller write transactions có lock.
- Idempotent: query chỉ đọc. Audit Log: Không dùng.

#### Validation, Authorization, Exception và Data Integrity

- Participant ID action còn `exists:booking_participants,id`, sau đó service scope theo query này; participant ngoài tập trả ValidationException field participant_id.
- Guide phải qua BR-062.
- Không mutation; không có data-loss risk trong query.

#### Kết luận

**Đúng.** Ba điều kiện departure/confirmed/paid có source trực tiếp.

### BR-064 — Chỉ tạo session điểm danh đúng boundary/ngày của tour đang diễn ra

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Services/GuideTourOperationService.php` — `createAttendanceSession()` dòng 176–197, `assertBoundaryMatchesToday()` dòng 641–656, `assertDepartureCanTakeAttendance()` dòng 684–693, `isDepartureOngoing()` dòng 695–706.
- Request: `backend_laravel/app/Http/Requests/StoreAttendanceSessionRequest.php:9` — `rules()` dòng 24–28.
- Controller/Route: `GuideAttendanceController::storeSession()` dòng 105–114; `POST /api/guide/tours/{tourDeparture}/attendance-sessions`.
- Service/Model: `GuideTourOperationService`; `AttendanceSession`, `TourDeparture`.
- Migration: `backend_laravel/database/migrations/2026_07_02_143241_create_guide_attendance_and_stage_tables.php`; `backend_laravel/database/migrations/2026_07_18_000000_add_boundary_to_attendance_sessions_table.php`.
- Middleware: guide auth/role + assignment check BR-062. Policy/Gate không dùng.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không dùng.

#### Database

- Insert: first-or-create `attendance_sessions` theo `tour_departure_id+boundary`, values `name`, `created_by`, default status active.
- Unique: `(tour_departure_id,boundary)` tại `2026_07_18_000000_add_boundary_to_attendance_sessions_table.php:15`; boundary enum nullable cho legacy nhưng API required.
- Transaction: `DB::transaction()`; lock departure row. Rollback khi exception thoát.
- Idempotent: `firstOrCreate` + departure lock + unique bảo đảm gọi lại cùng boundary không tạo dòng thứ hai; controller vẫn trả 201 cho existing row.
- Audit: created_by/timestamps; không audit-log.

#### Validation, Authorization, Exception và Data Integrity

- Boundary required `departure|return`.
- Ongoing: status không `completed|cancelled|canceled` và hôm nay trong inclusive departure-return range.
- Departure boundary chỉ ngày đi; return boundary chỉ ngày về (hoặc ngày đi nếu return null). Sai trả ValidationException 422.
- Guide/assignment theo BR-062. Lock và unique ngăn duplicate session.

#### Kết luận

**Đúng.** Ongoing guard, boundary/date, transaction, lock, firstOrCreate và unique đều khớp.

### BR-065 — Check-in/check-out có thứ tự, transaction và row lock

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Services/GuideTourOperationService.php` — `checkIn()` dòng 202–243, `checkOut()` dòng 248–287; consistency assertions dòng 608–678.
- Request/Controller: `AttendanceActionRequest::rules()` tại `backend_laravel/app/Http/Requests/AttendanceActionRequest.php:23-27`; `GuideAttendanceController::{checkIn,checkOut}` dòng 116–152.
- Routes: `POST /api/guide/tours/{tourDeparture}/attendance-sessions/{attendanceSession}/check-in` và `POST /api/guide/tours/{tourDeparture}/attendance-sessions/{attendanceSession}/check-out`.
- Service/Model: `GuideTourOperationService`; `Attendance`, `AttendanceSession`, `BookingParticipant`, `User`.
- Migration: `backend_laravel/database/migrations/2026_07_02_143241_create_guide_attendance_and_stage_tables.php`; `backend_laravel/database/migrations/2026_07_18_000000_add_boundary_to_attendance_sessions_table.php`.
- Middleware/Policy: guide auth/role + service assignment; Policy/Gate không dùng.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không dùng.

#### Database

- Check-in insert/update: `checked_in_at`, `checked_in_by`, `status='checked_in'` trên unique attendance session+participant.
- Check-out update: `checked_out_at`, `checked_out_by`, `status='checked_out'`.
- Unique: `attendances_session_participant_unique` tại `2026_07_02_143241_create_guide_attendance_and_stage_tables.php:39`.
- Transaction: cả hai dùng `DB::transaction()`. Check-in lock session rồi attendance; check-out lock attendance. Rollback khi exception thoát.
- Idempotent: repeat không trả success; check-in/out lặp bị 422 và không nhân bản dữ liệu.
- Audit: actor/time riêng cho check-in/out; không audit-log history.

#### Validation, Authorization, Exception và Data Integrity

- Participant required/integer/exists và phải thuộc confirmed+paid booking đúng departure.
- Session phải thuộc departure, active, có boundary và đúng ngày; departure ongoing; guide được assignment.
- Check-in đã có `checked_in_at`: ValidationException; checkout thiếu check-in hoặc đã checkout: ValidationException.
- Row locks + unique ngăn double submit tạo duplicate. Không có notification/queue.

#### Kết luận

**Đúng.** Thứ tự state, actor/time, transaction và locks có bằng chứng.

### BR-066 — Cập nhật note/status attendance và khóa status sau check-in

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Services/GuideTourOperationService.php` — `updateAttendanceNote()` dòng 294–344.
- Request: `backend_laravel/app/Http/Requests/UpdateAttendanceNoteRequest.php:9` — `rules()` dòng 24–30.
- Controller/Route: `GuideAttendanceController::updateNote()` dòng 154–171; `PATCH .../attendance-sessions/{attendanceSession}/notes`.
- Service/Model: `GuideTourOperationService`; `Attendance`, `AttendanceSession`, `BookingParticipant`, `User`.
- Migration: `backend_laravel/database/migrations/2026_07_02_143241_create_guide_attendance_and_stage_tables.php`; `backend_laravel/database/migrations/2026_07_18_000000_add_boundary_to_attendance_sessions_table.php`.
- Middleware/Policy: guide auth/role + assignment; Policy/Gate không dùng.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không dùng.

#### Database

- Insert nếu chưa có attendance: session+participant, default status not_checked_in; sau đó ghi `note_updated_by` và optional note/status.
- Update: `note` nếu key có; `status` nếu key có và non-null; luôn `note_updated_by`, timestamps.
- Transaction: có; lock session và attendance. Rollback khi exception thoát.
- Unique attendance session+participant bảo vệ duplicate. Idempotent: cùng payload giữ state nhưng cập nhật timestamps/actor.
- Audit: note actor hiện tại; không lưu lịch sử note cũ.

#### Validation, Authorization, Exception và Data Integrity

- `participant_id` required/integer/exists; note nullable string max1000; status optional nullable `not_checked_in|absent`.
- Nếu attendance đã có `checked_in_at` và request có non-null status, ném ValidationException; note vẫn được sửa khi request không gửi status.
- Các guard departure/session/participant/guide giống BR-064/065.
- Transaction/locks hạn chế lost update; không notification/queue.

#### Kết luận

**Đúng.** Status vocabulary, post-check-in guard và `note_updated_by` khớp.

### BR-067 — Khởi tạo và chuyển stage theo itinerary

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Services/GuideTourOperationService.php` — `ensureStagesForDeparture()` dòng 708–734, `createStagesFromItinerary()` dòng 736–761, `findDisplayCurrentStage()` dòng 763–786, `advanceStage()` dòng 386–457.
- Controller/Routes: `GuideAttendanceController::stages()` dòng 173–188; `advanceStage()` dòng 190–202; GET/POST `/api/guide/tours/{tourDeparture}/stages[/advance]`.
- Service/Model: `GuideTourOperationService`; `TourItinerary`, `TourDepartureStage`, `TourDeparture`.
- Middleware/Policy: guide auth/role + assignment; advance còn ongoing guard. Policy/Gate không dùng.
- Action/Use Case/Domain Service riêng/Repository/Observer/Listener/Event/Job/Command/Scheduler/Notification/Trigger/Stored Procedure/Queue/Cache/API integration: Không dùng.

#### Database

- Insert: nếu departure chưa có stage, copy itinerary theo day/sort/id; stage đầu in_progress+started_at, sau pending.
- Update advance: current `status=completed/completed_at`; next `status=in_progress/started_at`; `tour_departures.current_stage_id=next.id`.
- Unique `(tour_departure_id,tour_itinerary_id)`; FK current_stage tại migration `2026_07_02_143241_create_guide_attendance_and_stage_tables.php`.
- Transaction: ensure và advance mỗi method có transaction. Ensure lock departure; advance lock current và next stage. Rollback khi exception thoát.
- Idempotent: ensure không tạo lại; advance không idempotent, mỗi lần hợp lệ chuyển thêm một stage.
- Audit: started/completed timestamps; không actor/history/audit-log.

#### Validation, Authorization, Exception và Data Integrity

- Advance yêu cầu departure ongoing và current stage tồn tại; stage cuối/không current ném ValidationException.
- Guide/assignment theo BR-062. Không Form Request body vì không có input khác path.
- Lock stage serialize row mutation. **[Suy luận từ source code]** Hai request tuần tự/concurrent thực hiện hai lần advance khi request thứ hai cuối cùng đọc current kế tiếp. Rule mô tả mỗi call, không quy định idempotency nên không lập BUG.

#### Kết luận

**Đúng.** Copy order/status và ba update trong transaction khớp.

### BR-068 — Validation đơn nghỉ và evidence

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php:16` — `store()` dòng 148–234, validation dòng 164–181.
- Route: `POST /api/guide/leave-requests` (`backend_laravel/routes/api.php:534`).
- Service/Form Request: Không sử dụng; validation trực tiếp controller.
- Model: `Guide`, `GuideLeaveRequest`, `GuideLeaveRequestAttachment`.
- Middleware: `auth:sanctum`, `role:tour guide`; profile được controller resolve. Policy/Gate không dùng.
- Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Job/Command/Scheduler/Trigger/Stored Procedure/Queue/Cache/API integration: Không dùng. Notification đồng bộ ở BR-069.

#### Database

- Validation trước mutation; insert request/attachments ở BR-069.
- Migration: `backend_laravel/database/migrations/2026_07_13_000000_create_guide_leave_requests_tables.php`.
- Transaction/Rollback/Lock/Idempotency/Audit: Không áp dụng riêng layer validation.

#### Validation, Authorization, Exception và Data Integrity

- `start_date`: required/date/after-or-equal runtime `now()+5 days`; `end_date`: required/date/after-or-equal start.
- Reason required string min10 max2000.
- Evidence nullable array max8; từng file `jpg|jpeg|png|webp|pdf`, max5120 KB.
- Không có guide profile trả 404; table thiếu trả 500; invalid input 422.
- Chỉ guide role qua middleware.

#### Kết luận

**Đúng.** Toàn bộ biên ngày/text/file khớp rule.

### BR-069 — Không được có leave overlap; tạo request/attachment/notification trong transaction

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php` — `store()` dòng 148–244, trong đó transaction/lock/recheck tại dòng 186–231; các helper notification trong cùng controller.
- Route: `POST /api/guide/leave-requests`.
- Service: Không sử dụng; controller thao tác Eloquent trực tiếp.
- Model: `GuideLeaveRequest`, `GuideLeaveRequestAttachment`, `Notification`, `Guide`, `User`.
- Middleware: guide auth/role; Policy/Gate không dùng.
- Notification: synchronous DB notification đến admin. Observer/Listener/Event/Job/Queue/API integration: Không dùng.
- Action/Use Case/Domain Service/Repository/Command/Scheduler/Trigger/Stored Procedure/Cache: Không dùng.

#### Database

- Check overlap: cùng guide, status `pending|approved`, inclusive `start_date <= newEnd AND end_date >= newStart`.
- Insert: `guide_leave_requests` pending; attachment rows; notifications admin.
- File storage: public disk `guide-leave-requests`; file được ghi trong closure nhưng filesystem không tham gia DB rollback.
- Transaction: lock/check và insert request/attachment/notification cùng trong `DB::transaction(..., 3)` dòng 186–231. Rollback DB khi exception thoát.
- Lock: guide row là stable serialization row được `lockForUpdate()` tại dòng 187–190; overlap `pending|approved` được tái query bằng `lockForUpdate()` tại dòng 192–198 trước insert. Migration vẫn chỉ có indexes và không có exclusion constraint theo range; invariant được bảo vệ bằng application transaction/row lock.
- Idempotent: không có idempotency key; request đến sau khi giành guide lock sẽ đọc row đã commit và trả 422 nếu overlap.
- Audit: timestamps/request user; không audit-log.

#### Validation, Authorization, Exception và Data Integrity

- Validation/authorization theo BR-068.
- Overlap trả 422 trước insert; guide lock serialize các request của cùng guide.
- Test tuần tự: `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php:218-244`. Test concurrency MySQL: `backend_laravel/tests/Feature/BusinessModelConcurrencyMysqlTest.php:241-275` xác minh status `[201, 422]` và chỉ một leave active.
- **[Suy luận từ source code]** Files đã store không được xóa nếu DB transaction rollback; execution path để lại orphan file, không làm mất record nghiệp vụ.

#### Kết luận

**Đúng.** Overlap invariant được tái kiểm tra trong transaction sau guide row lock; `BUG-RG-001` đã `Resolved`.

### BR-070 — Guide chỉ hủy đơn của mình khi còn pending

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php` — `cancel()` dòng 246–302; notification helpers trong cùng controller.
- Route: `PATCH /api/guide/leave-requests/{leaveRequest}/cancel`.
- Service: Không sử dụng. Model: `Guide`, `GuideLeaveRequest`, `Notification`.
- Migration: `backend_laravel/database/migrations/2026_07_13_000000_create_guide_leave_requests_tables.php`; `backend_laravel/database/migrations/2026_06_10_220130_create_notifications_table.php`.
- Middleware: `auth:sanctum`, `role:tour guide`; ownership bằng guide profile + `leaveRequest.guide_id`; Policy/Gate không dùng.
- Notification: synchronous DB notification admin. Action/Use Case/Domain Service/Repository/Observer/Listener/Event/Job/Command/Scheduler/Trigger/Stored Procedure/Queue/Cache/API integration: Không dùng.

#### Database

- Read: guide profile/owner; trong transaction reload request row, owner và `guide_leave_requests.status`.
- Update: `status='cancelled'`, unvalidated `cancel_reason` từ input, `cancelled_at`, timestamps.
- Insert: admin notifications. Delete: Không có; model có SoftDeletes nhưng endpoint chỉ update status.
- Transaction: row lock, owner/state recheck, update và notifications trong `DB::transaction(..., 3)` dòng 261–287. Rollback DB khi exception thoát.
- Lock: request row được `lockForUpdate()` tại dòng 262–265; owner tái kiểm tra dòng 267–270; chỉ status `pending` mới được update tại dòng 272–280.
- Idempotent: lần tuần tự tiếp theo trả 422 vì không pending; không idempotency key.
- Audit: cancel reason/time; không audit-log history.

#### Validation, Authorization, Exception và Data Integrity

- Owner mismatch/no guide profile abort 404; status không pending trả 422.
- `cancel_reason` validation: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; rule không yêu cầu constraint.
- Test stale-model: `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php:246-281`; test cancel/decision thật sự đồng thời trên MySQL: `backend_laravel/tests/Feature/BusinessModelConcurrencyMysqlTest.php:277-321`, kết quả một action 200 và action còn lại 422.

#### Kết luận

**Đúng.** Ownership và state `pending` được tái kiểm tra trên row đã lock; `BUG-RG-002` đã `Resolved`.

### BR-071 — Admin chỉ quyết định approved/rejected, chặn cancelled/quá hạn và cho đổi quyết định

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideLeaveRequestController.php:15` — `approve()` dòng 168–171, `reject()` 173–176, `updateDecision()` 178–185, `updateStatus()` 187–256; notification helpers trong cùng controller.
- Routes: POST approve/reject và PATCH decision tại `backend_laravel/routes/api.php:487-489`.
- Service/Form Request: Không sử dụng; controller validation trực tiếp.
- Model: `GuideLeaveRequest`, `Guide`, `Notification`, `User`.
- Migration: `backend_laravel/database/migrations/2026_07_13_000000_create_guide_leave_requests_tables.php`; `backend_laravel/database/migrations/2026_06_10_220130_create_notifications_table.php`.
- Middleware: `auth:sanctum`, `role:admin`; Policy/Gate không dùng.
- Notification: synchronous DB notification guide và mọi admin. Observer/Listener/Event/Job/Queue/API integration: Không dùng.
- Action/Use Case/Domain Service/Repository/Command/Scheduler/Trigger/Stored Procedure/Cache: Không dùng.

#### Database

- Read: current status/end date; guide/admin relations.
- Update: status approved/rejected; admin_note; admin_id; reviewed_at; timestamps.
- Insert: guide/admin notifications. Delete: Không có.
- Transaction: lock, state/date recheck, update và các notification insert nằm trong `DB::transaction(..., 3)` dòng 196–238; exception thoát closure rollback toàn bộ DB mutation.
- Lock: request row được `lockForUpdate()` tại dòng 197–200; cancelled/end-date guard được đánh giá trên model đã reload sau lock.
- Idempotent: source cho phép quyết định lại approved/rejected nếu chưa cancelled/quá hạn; mỗi lần cập nhật reviewer/time/note và tạo notification mới.
- Audit: actor/time/note/current status trên request; không lưu lịch sử các quyết định cũ ngoài notification text/data.

#### Validation, Authorization, Exception và Data Integrity

- Decision PATCH: status required `approved|rejected`; admin_note nullable string max2000 ở common update.
- Cancelled trả 422; `end_date < today` trả 422; approved/rejected hiện hữu không bị chặn nên được đổi quyết định.
- Chỉ admin route. Missing model 404.
- Test redecision: `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php:283-296`; stale-model và cancel/decision concurrency được bao phủ tại dòng 246–281 của file này và `BusinessModelConcurrencyMysqlTest.php:277-321`.

#### Kết luận

**Đúng.** Vocabulary, guards, redecision, transaction và row lock bảo đảm admin không xử lý state cancelled đã thắng lock; `BUG-RG-002` đã `Resolved`.

### BR-072 — Guide tạo một pending replacement request hợp lệ

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Guide/GuideTourController.php:15` — `requestReplacement()` dòng 533–692, notification helper sau method này.
- Request: `backend_laravel/app/Http/Requests/StoreGuideReplacementRequest.php:8` — `rules()` dòng 18–23.
- Route: `POST /api/guide/tours/{tourDeparture}/replacement-requests`.
- Service/Model: Không service hoặc Eloquent model riêng cho request; `Guide`, `TourDeparture`, `Notification`; assignment/request dùng `DB::table`. `App\Models\GuideReplacementRequest`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- Middleware: guide auth/role; controller xác minh guide profile + assignment; Policy/Gate không dùng.
- Notification: synchronous bulk insert admin. Observer/Listener/Event/Job/Queue/API integration: Không dùng.
- Action/Use Case/Domain Service/Repository/Command/Scheduler/Trigger/Stored Procedure/Cache: Không dùng.

#### Database

- Read: assignment cùng departure/guide với `status != cancelled`; departure date; pending request cùng `(departure,current_guide)`.
- Insert: `guide_replacement_requests` gồm departure/current guide/requester/reason/evidence/status pending/timestamps; notifications admin.
- File: evidence store trên public disk trước DB transaction; file được xóa khi transaction ném exception hoặc khi recheck trả outcome không tạo request tại dòng 650–660.
- Transaction: departure/assignment/date/pending recheck, request insert và notification insert trong `DB::transaction(..., 3)` dòng 587–649. Rollback DB khi exception thoát.
- Lock: departure row dùng làm stable serialization row tại dòng 594–597; assignment và pending request được `lockForUpdate()` và tái kiểm tra tại dòng 599–625.
- Constraint: migration `2026_07_12_000000_create_guide_replacement_requests_table.php` có indexes `(departure,status)` và `(current_guide,status)`, không unique conditional/key ngăn hai pending.
- Idempotent: không có idempotency key; request thứ hai cùng guide/departure trả 409 sau early check hoặc sau khi giành departure lock và tái kiểm tra pending.
- Audit: requested_by/timestamps; không audit-log.

#### Validation, Authorization, Exception và Data Integrity

- Reason required string 10–2000; evidence nullable one file JPG/JPEG/PNG/WebP/PDF max5120 KB.
- Phải gửi khi `departure_date >= today+5 days`; quá muộn 422. Không assignment 403; không guide profile 404; pending hiện hữu 409.
- Test tuần tự: `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php:298-330`; test concurrency MySQL: `backend_laravel/tests/Feature/BusinessModelConcurrencyMysqlTest.php:323-356`, status `[201, 409]` và đúng một pending row.

#### Kết luận

**Đúng.** Invariant một pending được tái kiểm tra sau departure row lock trong cùng transaction; `BUG-RG-003` đã `Resolved`.

### BR-073 — Admin chỉ xử lý replacement pending và thay assignment trong transaction

#### Source Code

- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideReplacementRequestController.php:14` — `approve()` dòng 51–160, `reject()` 162–228, `findReplacementGuide()` 230–266, notification helpers sau các method này.
- Routes: `POST /api/admin/guide-replacement-requests/{id}/approve|reject`.
- Service/Repository: Không sử dụng; query builder/controller. Model: `Guide`, `TourDeparture`, `Notification`; request/assignment query builder. Eloquent request model không tồn tại.
- Migration: `backend_laravel/database/migrations/2026_07_12_000000_create_guide_replacement_requests_table.php`; `backend_laravel/database/migrations/2026_06_28_092905_create_tour_guide_assignments_table.php`.
- Middleware: admin auth/role; Policy/Gate không dùng.
- Notification: sync notification old/new guide và admins. Observer/Listener/Event/Job/Queue/API integration: Không dùng.
- Action/Use Case/Domain Service/Command/Scheduler/Trigger/Stored Procedure/Cache: Không dùng.

#### Database

- Candidate: guide khác current; active nếu column tồn tại; không có overlapping assignment status `assigned`; ưu tiên COUNT assigned ASC rồi guide ID ASC. Leave/destination/rest-day/confirmed assignment không nằm trong query, đúng vocabulary cụ thể của rule.
- Approve update: assignment current guide chỉ khi status assigned -> cancelled; insert new lead assigned; request -> approved, replacement/reviewer/time/note; notifications.
- Reject update: request -> rejected, reviewer/time/note; notifications.
- Transaction: approve/reject bao gồm departure/request lock, pending recheck, assignment/request mutation và notifications trong `DB::transaction(..., 3)`; rollback DB khi exception thoát.
- Lock: cả hai action lock departure trước, sau đó lock replacement request và tái kiểm tra `status='pending'` (`approve()` dòng 57–83; `reject()` dòng 168–194). Candidate guide của approve dùng `lockForUpdate()` dòng 252–265. Các update request còn có conditional `WHERE status='pending'` dòng 114–117 và 196–199.
- Idempotent: không có idempotency key; action đến sau lock và thấy non-pending trả 409 mà không mutation/notification.
- Audit: reviewer/time/note; không decision history/audit-log.

#### Validation, Authorization, Exception và Data Integrity

- admin_note nullable string max2000; request missing 404; non-pending 409; không candidate 422.
- Test tuần tự: `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php:332-383`; test approve/reject thật sự đồng thời trên MySQL: `backend_laravel/tests/Feature/BusinessModelConcurrencyMysqlTest.php:358-430`, status `[200, 409]` và assignment khớp state approved/rejected cuối.

#### Kết luận

**Đúng.** Pending guard được tái kiểm tra sau row lock, update có điều kiện state và mutation/notification cùng transaction; `BUG-RG-004` đã `Resolved`.

## Danh sách BUG

Phần “Mô tả/Bằng chứng/Điều kiện tái hiện” bên dưới là **chẩn đoán lịch sử trước khi sửa**; số dòng trong phần này thuộc snapshot source tại thời điểm audit. Mỗi BUG có thêm bằng chứng source/test hậu sửa và không còn được tính là BUG đang mở.

### BUG-RG-001 — Hai request đồng thời tạo được hai đơn nghỉ giao nhau — Resolved

- Business Rule: BR-069.
- Mô tả: **[Suy luận từ source code]** Hai POST đồng thời cho cùng guide/range cùng vượt overlap check và cùng insert pending theo execution path check-then-insert.
- File/Class/Hàm: `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php`; `GuideLeaveRequestController::store()` dòng 183–227.
- Bằng chứng: `exists()` overlap ở dòng 186–191 chạy trước `DB::transaction()` dòng 199; không `lockForUpdate`; migration `backend_laravel/database/migrations/2026_07_13_000000_create_guide_leave_requests_tables.php:37-39` chỉ có index, không unique/exclusion constraint.
- Database: hai insert vào `guide_leave_requests`; mỗi request tiếp tục insert attachment/notification khi dữ liệu liên quan tồn tại.
- Mức độ ảnh hưởng: **High** — invariant đơn nghỉ cốt lõi bị phá, dữ liệu availability chứa hai leave giao nhau.
- Điều kiện tái hiện: Guide hợp lệ chưa có leave; phát hai POST cùng lúc với các khoảng giao nhau và dữ liệu hợp lệ; cả hai thực hiện overlap SELECT trước khi transaction kia commit.
- **Post-fix — Resolved:** `GuideLeaveRequestController::store()` hiện lock guide row, tái query overlap và insert trong cùng transaction (`backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php:186-231`). `BusinessModelConcurrencyMysqlTest.php:241-275` chạy hai process và assert `[201, 422]`, một active row.

### BUG-RG-002 — Cancel và admin decision ghi đè state không còn hợp lệ khi đồng thời — Resolved

- Business Rule: BR-070, BR-071.
- Mô tả: **[Suy luận từ source code]** Guide cancel và admin approve/reject đồng thời cùng kiểm tra state cũ rồi ghi state mới theo execution path cạnh tranh; kết quả cho phép cancel request đã approved hoặc admin xử lý request đã cancelled.
- Files/Hàm: `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php::cancel()` dòng 251–267; `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideLeaveRequestController.php::updateStatus()` dòng 192–224.
- Bằng chứng: cả hai state guard ở ngoài mutation và không `lockForUpdate`; admin flow không transaction; update không có conditional `WHERE status=...`.
- Database: cạnh tranh update `guide_leave_requests.status`, reviewer/cancel fields; notifications ghi hai kết quả mâu thuẫn khi cả hai insert thành công.
- Mức độ ảnh hưởng: **High** — state machine cốt lõi bị phá.
- Điều kiện tái hiện: Request pending, chưa quá hạn; guide gửi cancel đồng thời admin approve/reject sao cho cả hai đọc pending/cancelled guard trước update của bên kia.
- **Post-fix — Resolved:** guide cancel và admin decision đều lock/reload request row, tái kiểm tra state và ghi notification trong transaction (`GuideLeaveRequestController.php:261-287`; `AdminGuideLeaveRequestController.php:196-238`). `BusinessModelConcurrencyMysqlTest.php:277-321` assert chỉ một transition thắng (`[200, 422]`).

### BUG-RG-003 — Hai request đồng thời tạo nhiều replacement pending cho cùng guide/departure — Resolved

- Business Rule: BR-072.
- Mô tả: **[Suy luận từ source code]** Duplicate check là check-then-insert không lock và DB không unique; hai request đồng thời tạo hai pending theo execution path cạnh tranh.
- File/Hàm: `backend_laravel/app/Http/Controllers/Api/Guide/GuideTourController.php::requestReplacement()` dòng 566–607.
- Bằng chứng: `exists()` dòng 566–570 ở ngoài transaction dòng 587; migration `backend_laravel/database/migrations/2026_07_12_000000_create_guide_replacement_requests_table.php:45-46` chỉ tạo indexes.
- Database: duplicate logical rows trong `guide_replacement_requests`; duplicate notification admin.
- Mức độ ảnh hưởng: **High** — flow replacement cốt lõi có nhiều yêu cầu active mâu thuẫn.
- Điều kiện tái hiện: Guide được assignment, departure còn ít nhất 5 ngày, chưa có pending; gửi hai POST đồng thời cùng departure.
- **Post-fix — Resolved:** `GuideTourController::requestReplacement()` lock departure/assignment, tái kiểm tra pending rồi insert trong cùng transaction (`backend_laravel/app/Http/Controllers/Api/Guide/GuideTourController.php:587-649`). `BusinessModelConcurrencyMysqlTest.php:323-356` assert `[201, 409]` và một pending row.

### BUG-RG-004 — Approve/reject replacement đồng thời làm request và assignment không nhất quán — Resolved

- Business Rule: BR-073.
- Mô tả: **[Suy luận từ source code]** Hai action đều đọc pending trước transaction, không lock request. Approve tạo assignment thay thế rồi reject ghi request rejected theo execution path cạnh tranh.
- File/Hàm: `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideReplacementRequestController.php::approve()` dòng 57–129; `reject()` dòng 145–178.
- Bằng chứng: pending check ở dòng 67/155; transaction chỉ bắt đầu dòng 89/165; không `lockForUpdate`; update request theo ID mà không điều kiện status ở dòng 116–125/166–174.
- Database: update `tour_guide_assignments`, insert assignment mới, update `guide_replacement_requests`, insert notifications.
- Mức độ ảnh hưởng: **High** — trạng thái request không phản ánh assignment thực tế.
- Điều kiện tái hiện: Một request pending có candidate; gửi approve và reject đồng thời để cả hai đọc pending trước khi một transaction commit.
- **Post-fix — Resolved:** approve/reject cùng lock departure rồi request, tái kiểm tra pending, update có `WHERE status='pending'` và giữ mutation/notification trong transaction (`AdminGuideReplacementRequestController.php:57-133`, `168-211`). `BusinessModelConcurrencyMysqlTest.php:358-430` assert `[200, 409]` và assignment khớp state cuối.
