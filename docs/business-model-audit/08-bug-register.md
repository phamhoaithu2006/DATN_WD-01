# Bug Register — Business Model Audit

## Phạm vi

- Register này hợp nhất BUG đã được chứng minh trong bảy module audit `01`–`07`.
- Chỉ ghi nhận sai lệch Business Model/source code đã có bằng chứng trong các module; không bổ sung nhận định code style, performance, architecture, design pattern hoặc đề xuất refactor.
- `BUG-AB-002` xuất hiện trong cả module 01 và module 02 được hợp nhất thành **một BUG duy nhất**, đồng thời giữ đủ bằng chứng auth/profile và booking.
- Tổng số BUG duy nhất trong phạm vi hiện tại: **15**.
- Module 03 (`docs/business-model-audit/modules/03-reviews.md`) không có BUG ID đã được chứng minh trong mục `Danh sách BUG`.

## Bảng tổng hợp

| ID | Tiêu đề | Business Rule/Requirement | Mức độ | Module nguồn |
| --- | --- | --- | --- | --- |
| BUG-AB-001 | API cho phép bỏ `contact_email` nhưng schema bắt buộc giá trị | BR-021; FR-004; UC-013; API #33 | High | `docs/business-model-audit/modules/02-booking-payment.md` |
| BUG-AB-002 | Giới hạn độ dài API lớn hơn giới hạn cột dữ liệu | BR-001; BR-005; BR-021; FR-001; FR-004; UC-013; API #2, #30, #33 | Medium | `docs/business-model-audit/modules/01-auth-catalog.md`; `docs/business-model-audit/modules/02-booking-payment.md` |
| BUG-AB-003 | Tổng tiền booking không được đối chiếu với giá tính theo ngày sinh hành khách | BR-024; BR-025; FR-004; UC-013 | Critical | `docs/business-model-audit/modules/02-booking-payment.md` |
| BUG-AB-004 | FR-005 yêu cầu từ chối payment transition không hợp lệ nhưng source không kiểm transition | BR-034; FR-005; UC-028 | High | `docs/business-model-audit/modules/02-booking-payment.md` |
| BUG-RG-001 | Hai request đồng thời tạo được hai đơn nghỉ giao nhau | BR-069 | High | `docs/business-model-audit/modules/04-guide-operations.md` |
| BUG-RG-002 | Cancel và admin decision ghi đè state không còn hợp lệ khi đồng thời | BR-070; BR-071 | High | `docs/business-model-audit/modules/04-guide-operations.md` |
| BUG-RG-003 | Hai request đồng thời tạo nhiều replacement pending cho cùng guide/departure | BR-072 | High | `docs/business-model-audit/modules/04-guide-operations.md` |
| BUG-RG-004 | Approve/reject replacement đồng thời làm request và assignment không nhất quán | BR-073 | High | `docs/business-model-audit/modules/04-guide-operations.md` |
| BUG-SA-001 | Support notification dùng giá trị type ngoài enum database | BR-084 | High | `docs/business-model-audit/modules/05-support-notifications.md` |
| BUG-SA-002 | Widget HTML hợp lệ theo validation nhưng trái cột `image_url` NOT NULL | BR-095 | High | `docs/business-model-audit/modules/06-admin-platform.md` |
| BUG-SA-003 | Booking hoàn slot nhiều lần qua chuyển trạng thái admin | BR-096 | High | `docs/business-model-audit/modules/06-admin-platform.md` |
| BUG-SA-004 | Gửi đồng thời một draft tạo notification trùng | BR-082; FR-010 | High | `docs/business-model-audit/modules/05-support-notifications.md` |
| BUG-XD-001 | Assignment không áp dụng mutation guard đã được FR/UC/API tuyên bố | FR-018; UC-030; API #211; đối chiếu BR-018 | High | `docs/business-model-audit/modules/07-cross-document-requirements.md` |
| BUG-XD-002 | Guide cập nhật `certificate_type` hợp lệ nhưng dữ liệu bị bỏ qua | SR-006; FR-017; UC-043; API #66 | Medium | `docs/business-model-audit/modules/07-cross-document-requirements.md` |
| BUG-XD-003 | UC-019 yêu cầu upload avatar admin nhưng API chỉ nhận URL chuỗi | SR-005; UC-019; đối chiếu API #184 | Medium | `docs/business-model-audit/modules/07-cross-document-requirements.md` |

## Chi tiết BUG

### BUG-AB-001 — API cho phép bỏ `contact_email` nhưng schema bắt buộc giá trị

- **Business Rule/Requirement liên quan:** BR-021; FR-004; UC-013; API Specification #33.
- **Mô tả:** Form Request cho phép `contact.contact_email` là `nullable`, controller truyền `null` khi trường không có, trong khi migration tạo `booking_contacts.contact_email` không nullable.
- **File/Class/Method:**
  - `backend_laravel/app/Http/Requests/Customer/StoreBookingRequest.php` — class `StoreBookingRequest`, method `rules()`.
  - `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php` — class `CustomerBookingController`, method `store()`.
  - `backend_laravel/database/migrations/2026_06_10_220070_create_booking_contacts_table.php` — migration anonymous class, method `up()`.
- **Route:** `POST /api/customer/bookings`.
- **Bằng chứng:** `rules()` dùng `nullable|email|max:255`; `store()` lấy `$data['contact']['contact_email'] ?? null`; migration dùng `string('contact_email', 150)` mà không gọi `nullable()`. Write nằm trong `DB::transaction()`, nên lỗi DB làm rollback closure tạo booking.
- **Mức độ ảnh hưởng:** **High**.
- **Điều kiện tái hiện:** VNPAY đã cấu hình; customer, tour và departure hợp lệ; gửi payload booking hợp lệ nhưng bỏ `contact.contact_email`; validation cho payload đi tiếp tới thao tác ghi cột không nhận null.

### BUG-AB-002 — Giới hạn độ dài API lớn hơn giới hạn cột dữ liệu

- **Business Rule/Requirement liên quan:** BR-001; BR-005; BR-021; FR-001; FR-004; UC-013; API Specification #2, #30 và #33.
- **Mô tả:** Validation auth/profile và booking chấp nhận một số chuỗi dài hơn giới hạn vật lý của cột tương ứng. Đây là BUG hợp nhất từ module 01 và module 02.
- **File/Class/Method:**
  - `backend_laravel/app/Http/Controllers/Api/AuthController.php` — class `AuthController`, method `register()`.
  - `backend_laravel/app/Http/Controllers/Api/Customer/CustomerController.php` — class `CustomerController`, method `updateProfile()`.
  - `backend_laravel/app/Http/Requests/Customer/StoreBookingRequest.php` — class `StoreBookingRequest`, method `rules()`.
  - `backend_laravel/database/migrations/2026_06_10_215910_add_vivugo_columns_to_users_table.php` — migration anonymous class, method `up()`.
  - `backend_laravel/database/migrations/2026_06_10_220070_create_booking_contacts_table.php` — migration anonymous class, method `up()`.
  - `backend_laravel/database/migrations/2026_06_10_220080_create_booking_participants_table.php` — migration anonymous class, method `up()`.
- **Route:** `POST /api/auth/register`; `PUT /api/profile/update`; `POST /api/customer/bookings`.
- **Bằng chứng auth/profile:** `register()` cho `full_name max:255` và không có `max` tường minh cho `email`/`phone`; `updateProfile()` cho `full_name max:255`; migration users giới hạn `full_name VARCHAR(150)`, `email VARCHAR(150)` trên driver không phải SQLite và `phone VARCHAR(20)`.
- **Bằng chứng booking:** `StoreBookingRequest::rules()` cho `contact_name` 255 so với cột 150; `contact_email` 255 so với 150; `contact_phone` 30 so với 20; `address` 500 so với 255; participant `full_name` 255 so với 150; participant `phone` 30 so với 20; `identity_number` 50 so với 30.
- **Giới hạn bằng chứng:** Kết quả runtime cụ thể là DB reject hay truncate phụ thuộc driver/chế độ DB; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** để khẳng định một kết quả duy nhất. Sai lệch giữa validation và migration được chứng minh trực tiếp.
- **Mức độ ảnh hưởng:** **Medium**.
- **Điều kiện tái hiện:** Gọi từng endpoint với một field có độ dài từ giới hạn cột + 1 đến giới hạn validation, giữ các field còn lại hợp lệ; quan sát payload vượt qua validation độ dài trước bước ghi vào cột ngắn hơn.

### BUG-AB-003 — Tổng tiền booking không được đối chiếu với giá tính theo ngày sinh hành khách

- **Business Rule/Requirement liên quan:** BR-024; BR-025; FR-004; UC-013, gồm các mệnh đề tính giá theo tuổi và tính lại giá khi store.
- **Mô tả:** Controller tính pricing snapshot của từng participant từ ngày sinh, nhưng lấy `bookings.total_amount` và `payments.amount` từ subtotal của `quantity_summary`. Source không so rule/quantity client chọn với rule suy ra từ ngày sinh và không đối chiếu tổng snapshot participant với subtotal.
- **File/Class/Method:**
  - `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php` — class `CustomerBookingController`, methods `store()` và `buildQuantityPricing()`.
  - `backend_laravel/app/Services/TourPricingService.php` — class `TourPricingService`, methods `calculateParticipantPrice()` và `resolveRuleForAge()`.
- **Route:** `POST /api/customer/bookings`.
- **Bằng chứng:** `store()` tạo `$pricedParticipants` từ DOB; sau đó gán `$totalAmount` từ `$pricingSummary['subtotal']`. Insert `booking_participants.unit_price/pricing_*` dùng `$pricedParticipants`, còn `bookings.total_amount` và `payments.amount` dùng `$totalAmount`. Các giá trị này được commit trong cùng transaction mà không có phép đối chiếu giữa hai tổng.
- **Database bị ghi:** `booking_participants.unit_price`, các cột `pricing_*`, `bookings.total_amount` và `payments.amount`.
- **Mức độ ảnh hưởng:** **Critical**.
- **Điều kiện tái hiện:** Tạo tour có rule `free` cho trẻ nhỏ và giá adult lớn hơn 0; gửi participant có DOB người lớn nhưng `quantity_summary` chọn rule free với quantity 1; source tính snapshot participant theo DOB người lớn nhưng subtotal booking/payment theo rule free.

### BUG-AB-004 — FR-005 yêu cầu từ chối payment transition không hợp lệ nhưng source không kiểm transition

- **Business Rule/Requirement liên quan:** BR-034 ghi hiện trạng không kiểm transition; FR-005 Exception Flow ghi “chuyển trạng thái không hợp lệ bị từ chối”; UC-028 xác nhận source không có nhánh từ chối transition.
- **Mô tả:** Ba endpoint admin ghi trạng thái đích mà không dùng trạng thái hiện tại làm điều kiện cho phép/từ chối. Source không triển khai mệnh đề từ chối của FR-005.
- **File/Class/Method:** `backend_laravel/app/Http/Controllers/Api/Admin/PaymentController.php` — class `PaymentController`, methods `confirm()`, `fail()`, `refund()` và `updateStatus()`.
- **Route:** `PATCH /api/admin/payments/{id}/confirm`; `PATCH /api/admin/payments/{id}/fail`; `PATCH /api/admin/payments/{id}/refund`.
- **Bằng chứng:** `updateStatus()` lock payment, tạo `paymentData` với status đích rồi update; không có điều kiện trên `$payment->status`. `backend_laravel/tests/Feature/PaymentBookingSafetyTest.php`, test `admin payment actions synchronize booking payment status`, thực hiện pending → success → failed → refunded và assert mọi response thành công.
- **Giới hạn bằng chứng:** Tài liệu không xác định ma trận transition hợp lệ; register không tự tạo ma trận đó.
- **Mức độ ảnh hưởng:** **High**.
- **Điều kiện tái hiện:** Admin confirm payment pending, sau đó gọi fail và refund trên cùng payment; source chấp nhận chuỗi action theo test hiện hữu.

### BUG-RG-001 — Hai request đồng thời tạo được hai đơn nghỉ giao nhau

- **Business Rule liên quan:** BR-069.
- **Mô tả:** **[Suy luận từ source code]** Hai POST đồng thời cho cùng guide và khoảng ngày giao nhau có execution path cùng vượt overlap check rồi cùng insert pending.
- **File/Class/Method:**
  - `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php` — class `GuideLeaveRequestController`, method `store()`, vị trí được audit: dòng 183–227.
  - `backend_laravel/database/migrations/2026_07_13_000000_create_guide_leave_requests_tables.php` — migration anonymous class, method `up()`, vị trí được audit: dòng 37–39.
- **Route:** `POST /api/guide/leave-requests`.
- **Bằng chứng:** Overlap `exists()` ở dòng 186–191 chạy trước `DB::transaction()` ở dòng 199; không có `lockForUpdate()`. Migration chỉ tạo index, không có unique/exclusion constraint cho invariant khoảng nghỉ.
- **Database bị ghi:** **[Suy luận từ source code]** Hai row logic trùng/giao nhau trong `guide_leave_requests`; mỗi request tiếp tục insert attachment và notification khi dữ liệu liên quan hợp lệ.
- **Mức độ ảnh hưởng:** **High**.
- **Điều kiện tái hiện:** Guide hợp lệ chưa có leave; phát hai POST đồng thời với các khoảng giao nhau sao cho cả hai thực hiện overlap SELECT trước khi transaction kia commit.

### BUG-RG-002 — Cancel và admin decision ghi đè state không còn hợp lệ khi đồng thời

- **Business Rule liên quan:** BR-070; BR-071.
- **Mô tả:** **[Suy luận từ source code]** Guide cancel và admin approve/reject đồng thời có execution path cùng đọc state cũ rồi ghi state mới, cho phép cancel request đã approved hoặc admin xử lý request đã cancelled.
- **File/Class/Method:**
  - `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php` — class `GuideLeaveRequestController`, method `cancel()`, vị trí được audit: dòng 251–267.
  - `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideLeaveRequestController.php` — class `AdminGuideLeaveRequestController`, method `updateStatus()`, vị trí được audit: dòng 192–224.
- **Route:** `PATCH /api/guide/leave-requests/{leaveRequest}/cancel`; `POST /api/admin/guide-leave-requests/{leaveRequest}/approve`; `POST /api/admin/guide-leave-requests/{leaveRequest}/reject`; `PATCH /api/admin/guide-leave-requests/{leaveRequest}/decision`.
- **Bằng chứng:** Cả hai state guard nằm ngoài mutation và không dùng `lockForUpdate()`; admin flow không có transaction; update không có điều kiện `WHERE status = ...`.
- **Database bị ghi:** **[Suy luận từ source code]** Cạnh tranh update `guide_leave_requests.status`, reviewer/cancel fields; execution path ghi hai notification mang kết quả mâu thuẫn.
- **Mức độ ảnh hưởng:** **High**.
- **Điều kiện tái hiện:** Leave request đang pending và chưa quá hạn; guide cancel đồng thời admin approve/reject, với lịch xen kẽ để cả hai đọc state trước update của bên còn lại.

### BUG-RG-003 — Hai request đồng thời tạo nhiều replacement pending cho cùng guide/departure

- **Business Rule liên quan:** BR-072.
- **Mô tả:** **[Suy luận từ source code]** Duplicate check là check-then-insert không lock; hai request đồng thời có execution path cùng vượt duplicate check. Database không có unique constraint cho một pending replacement trên cùng guide/departure.
- **File/Class/Method:**
  - `backend_laravel/app/Http/Controllers/Api/Guide/GuideTourController.php` — class `GuideTourController`, method `requestReplacement()`, vị trí được audit: dòng 566–607.
  - `backend_laravel/database/migrations/2026_07_12_000000_create_guide_replacement_requests_table.php` — migration anonymous class, method `up()`, vị trí được audit: dòng 45–46.
- **Route:** `POST /api/guide/tours/{tourDeparture}/replacement-requests`.
- **Bằng chứng:** `exists()` ở dòng 566–570 chạy ngoài transaction bắt đầu ở dòng 587; migration chỉ tạo indexes, không có unique constraint cho invariant này.
- **Database bị ghi:** **[Suy luận từ source code]** Nhiều row pending logic trùng trong `guide_replacement_requests` và notification admin trùng.
- **Mức độ ảnh hưởng:** **High**.
- **Điều kiện tái hiện:** Guide có assignment, departure còn ít nhất 5 ngày và chưa có replacement pending; gửi hai POST đồng thời sao cho cả hai duplicate check hoàn tất trước insert của request còn lại.

### BUG-RG-004 — Approve/reject replacement đồng thời làm request và assignment không nhất quán

- **Business Rule liên quan:** BR-073.
- **Mô tả:** **[Suy luận từ source code]** Approve và reject đều đọc pending trước transaction và không lock request. Một execution path cho phép approve tạo assignment thay thế rồi reject ghi request thành rejected.
- **File/Class/Method:** `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideReplacementRequestController.php` — class `AdminGuideReplacementRequestController`, methods `approve()` dòng 57–129 và `reject()` dòng 145–178.
- **Route:** `POST /api/admin/guide-replacement-requests/{id}/approve`; `POST /api/admin/guide-replacement-requests/{id}/reject`.
- **Bằng chứng:** Pending check ở dòng 67 và 155; transaction chỉ bắt đầu ở dòng 89 và 165; không có `lockForUpdate()`; update request theo ID không kèm điều kiện status ở dòng 116–125 và 166–174.
- **Database bị ghi:** **[Suy luận từ source code]** Update assignment hiện tại, insert replacement assignment, update `guide_replacement_requests`, insert notifications; execution path kết thúc với request state không phản ánh assignment đã tạo.
- **Mức độ ảnh hưởng:** **High**.
- **Điều kiện tái hiện:** Một replacement request đang pending và có candidate; gửi approve/reject đồng thời để cả hai đọc pending trước khi một transaction commit.

### BUG-SA-001 — Support notification dùng giá trị type ngoài enum database

- **Business Rule liên quan:** BR-084.
- **Mô tả:** Payload bulk insert dùng `notifications.type = support_message`, trong khi migration chỉ cho phép `booking`, `payment`, `promotion`, `system`, `support`.
- **File/Class/Method:**
  - `backend_laravel/app/Http/Controllers/Api/Support/SupportNotificationController.php` — class `SupportNotificationController`, method `sendNotification()`, vị trí được audit: dòng 113–152.
  - `backend_laravel/database/migrations/2026_06_10_220130_create_notifications_table.php` — migration anonymous class, method `up()`, vị trí được audit: dòng 14–23.
- **Route:** `POST /api/notifications/support/send`.
- **Bằng chứng:** Controller dòng 139 ghi `support_message`; enum migration dòng 19 không chứa giá trị này; các migration đã truy vết không có thao tác bổ sung `support_message`. `sendNotification()` dùng `DB::transaction()`, nên insert lỗi rollback toàn batch.
- **Mức độ ảnh hưởng:** **High**.
- **Điều kiện tái hiện:** Dùng schema tạo từ migration trên DB thực thi enum; có ít nhất một admin; đăng nhập support staff; gửi title/message hợp lệ tới endpoint; insert nhận giá trị ngoài enum.

### BUG-SA-002 — Widget HTML hợp lệ theo validation nhưng trái cột `image_url` NOT NULL

- **Business Rule liên quan:** BR-095.
- **Mô tả:** Với `type=html`, validation cho phép không gửi `image_url` và payload gán null, trong khi migration gốc bắt buộc `banners.image_url`.
- **File/Class/Method:**
  - `backend_laravel/app/Http/Controllers/Api/Admin/WidgetController.php` — class `WidgetController`, methods `store()`, `update()`, `rules()` và `payload()`, vị trí được audit: dòng 31–41 và 113–152.
  - `backend_laravel/database/migrations/2026_06_10_220190_create_banners_table.php` — migration anonymous class, method `up()`, vị trí được audit: dòng 14–27.
  - `backend_laravel/database/migrations/2026_06_13_000002_add_widget_columns_to_banners_table.php` — migration anonymous class, method `up()`, vị trí được audit: dòng 9–17.
- **Route:** `POST /api/admin/widgets`; `PUT /api/admin/widgets/{id}`.
- **Bằng chứng:** Rule `image_url` chỉ `required_if:type,image`; nhánh HTML trong payload gán null; migration tạo cột string không nullable và migration bổ sung widget columns không đổi nullable của cột.
- **Mức độ ảnh hưởng:** **High**.
- **Điều kiện tái hiện:** Admin gửi create widget với `title`, `type=html`, `html_content` hợp lệ và không gửi `image_url` trên DB thực thi NOT NULL.

### BUG-SA-003 — Booking hoàn slot nhiều lần qua chuyển trạng thái admin

- **Business Rule liên quan:** BR-096.
- **Mô tả:** Source chỉ so trạng thái hiện tại, không lưu dấu slot đã hoàn. Admin update cho phép chuyển booking cancelled trở lại state khác; lần cancel sau tiếp tục trừ slot. **[Suy luận từ source code]** Nhánh PUT-cancel đồng thời có execution path trừ slot nhiều lần vì `update()` không lock booking trước khi tính điều kiện release.
- **File/Class/Method:** `backend_laravel/app/Http/Controllers/Api/Admin/BookingController.php` — class `BookingController`, methods `update()` dòng 209–285, `softDelete()` dòng 295–311 và `releaseBookedSlots()` dòng 434–449.
- **Route:** `PUT /api/admin/bookings/{id}`; `PATCH /api/admin/bookings/{id}/cancel`.
- **Bằng chứng:** Validation ở `update()` cho phép các status được khai báo tại dòng 217; dòng 263–272 tính `$shouldReleaseSlots` chỉ từ state hiện tại. Không có field/guard lịch sử `slots_released`. `releaseBookedSlots()` dùng `max(0, booked_slots - slotsToRelease)`, ngăn số âm nhưng không ngăn lần release tuần tự sau reactivation tiếp tục giảm slot. **[Suy luận từ source code]** Hai PUT concurrent có execution path cùng load state cũ vì `update()` không `lockForUpdate()` booking trước phép kiểm tra.
- **Database bị ghi:** Nhánh tuần tự update `bookings.status` và giảm `tour_departures.booked_slots` lần nữa sau reactivation. **[Suy luận từ source code]** Nhánh concurrent có execution path để hai request cùng giảm `tour_departures.booked_slots` từ cùng một booking.
- **Mức độ ảnh hưởng:** **High**.
- **Điều kiện tái hiện:** Booking confirmed có 2 participant; cancel để release; PUT booking về confirmed; cancel lần nữa và quan sát `booked_slots` bị trừ thêm. Nhánh concurrency: gửi đồng thời hai PUT `status=cancelled` sao cho cả hai load state cũ trước update.

### BUG-SA-004 — Gửi đồng thời một draft tạo notification trùng

- **Business Rule/Requirement liên quan:** BR-082; FR-010; state flow campaign notification.
- **Mô tả:** **[Suy luận từ source code]** Hai request gửi cùng draft có execution path đều vượt điều kiện `status=draft`, cùng bulk insert notification và cùng cập nhật draft thành `sent`.
- **File/Class/Method:**
  - `backend_laravel/app/Http/Controllers/Api/Admin/NotificationController.php` — class `NotificationController`, method `sendNotification()`, vị trí được audit: dòng 171–218.
  - `backend_laravel/database/migrations/2026_06_24_165838_add_draft_id_to_notifications_table.php` — migration anonymous class, method `up()`, vị trí được audit: dòng 14–16.
  - `backend_laravel/database/migrations/2026_06_10_220130_create_notifications_table.php` — migration anonymous class, method `up()`, vị trí được audit: dòng 12–23.
  - `docs/reverse-engineering/04-srs.md` — FR-010, vị trí được audit: dòng 181–184.
  - `docs/reverse-engineering/06-process-and-state-diagrams.md` — notification state flow, vị trí được audit: dòng 834–840.
- **Route:** `POST /api/admin/notifications/send/{id}`.
- **Bằng chứng:** Query draft ở controller dòng 177 không dùng `lockForUpdate()`; bulk insert ở dòng 210 chạy trước update status ở dòng 213; update không có optimistic condition; schema không có unique `(draft_id, user_id)`. FR-010 và state flow đưa draft đã sent vào nhánh 404 thay vì gửi lại.
- **Database bị ghi:** **[Suy luận từ source code]** Nhiều row `notifications` có cùng `draft_id` và `user_id`; draft cùng được update thành `sent` bởi hai request.
- **Mức độ ảnh hưởng:** **High**.
- **Điều kiện tái hiện:** Tạo draft `target_type=specific` với một recipient; dùng hai kết nối gửi đồng thời endpoint sao cho cả hai đọc draft trước câu update; quan sát hai response thành công và hai row cùng `draft_id,user_id`.

### BUG-XD-001 — Assignment không áp dụng mutation guard đã được FR/UC/API tuyên bố

- **Business Rule/Requirement liên quan:** FR-018 Preconditions; UC-030 Preconditions/Exception; API Specification #211; đối chiếu BR-018.
- **Mô tả:** Tài liệu yêu cầu departure không bị `TourDepartureMutationGuard` khóa trước khi phân công và API #211 khai báo nhánh `422` khi bị khóa. Source assignment không gọi guard trong các flow candidate, auto assign, strict assign, direct assign hoặc cancel assignment.
- **File/Class/Method:**
  - `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php` — class `TourDepartureGuideAssignmentController`, methods `candidates()`, `autoAssign()`, `assign()`, `directCandidates()`, `directAssign()` và `cancel()`.
  - `backend_laravel/app/Services/GuideAssignmentService.php` — class `GuideAssignmentService`, methods `eligibleGuidesQuery()`, `autoAssign()` và `assignSpecific()`.
  - `backend_laravel/app/Services/TourDepartureMutationGuard.php` — class `TourDepartureMutationGuard`.
  - `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureController.php` — class `TourDepartureController`, methods `update()` và `destroy()`, là các vị trí có gọi guard được dùng để đối chiếu.
- **Route:** `GET /api/admin/tour-departures/{departure}/guide-candidates`; `POST /api/admin/tour-departures/{departure}/auto-assign-guide`; `POST /api/admin/tour-departures/{departure}/assign-guide`; `PATCH /api/admin/tour-departures/{departure}/guide-assignments/{assignment}/cancel`; `GET /api/admin/tour-departures/{departure}/direct-guide-candidates`; `POST /api/admin/tour-departures/{departure}/direct-assign-guide`.
- **Bằng chứng:** Không có import, injection hoặc lời gọi `TourDepartureMutationGuard` trong controller/service assignment nêu trên. Guard chỉ được gọi từ `TourDepartureController::update()` và `TourDepartureController::destroy()`. BR-018 và BP-04 cũng ghi rõ giới hạn này.
- **Mức độ ảnh hưởng:** **High**.
- **Điều kiện tái hiện:** Tạo departure có `departure_date <= hôm nay`, admin hợp lệ và guide đủ điều kiện; gọi auto assign hoặc strict assign. Request không đi qua guard điều kiện ngày mà FR/UC/API đã khai báo.

### BUG-XD-002 — Guide cập nhật `certificate_type` hợp lệ nhưng dữ liệu bị bỏ qua

- **Business Rule/Requirement liên quan:** SR-006; FR-017; UC-043; API Specification #66.
- **Mô tả:** Controller validate và đưa `certificate_type` vào payload update, nhưng model `Guide` không cho mass assign field này.
- **File/Class/Method:**
  - `backend_laravel/app/Http/Controllers/Api/Guide/GuideProfileController.php` — class `GuideProfileController`, method `update()`.
  - `backend_laravel/app/Models/Guide.php` — class `Guide`, property `$fillable`.
  - `backend_laravel/app/Providers/AppServiceProvider.php` — class `AppServiceProvider`, method `boot()`.
- **Route:** `PUT /api/guide/profile`.
- **Bằng chứng:** `GuideProfileController::update()` tạo `$guideUpdateData['certificate_type']` rồi gọi `$guide->update($guideUpdateData)`; `Guide::$fillable` không có `certificate_type`; `AppServiceProvider::boot()` không bật chế độ ném exception khi thuộc tính mass-assignment bị silently discard.
- **Database bị ảnh hưởng:** Request update hợp lệ không thay đổi giá trị `guides.certificate_type` theo execution path mass assignment được source cấu hình.
- **Mức độ ảnh hưởng:** **Medium**.
- **Điều kiện tái hiện:** Đăng nhập role `tour guide` có guide profile; gửi `PUT /api/guide/profile` với `certificate_type` mới hợp lệ; response thành công nhưng đọc lại profile/DB vẫn giữ giá trị cũ.

### BUG-XD-003 — UC-019 yêu cầu upload avatar admin nhưng API chỉ nhận URL chuỗi

- **Business Rule/Requirement liên quan:** SR-005; UC-019; đối chiếu API Specification #184.
- **Mô tả:** UC-019 yêu cầu validation avatar theo type/size và ghi file public storage; source admin profile chỉ nhận chuỗi `avatar_url`, không nhận file và không thực hiện thao tác storage.
- **File/Class/Method:**
  - `backend_laravel/app/Http/Controllers/Api/Admin/AdminProfileController.php` — class `AdminProfileController`, method `update()`.
  - `backend_laravel/routes/api.php` — route admin profile.
  - `backend_laravel/app/Models/User.php` — class `User`.
- **Route:** `PUT /api/admin/profile`.
- **Bằng chứng:** Validation chỉ có `avatar_url => nullable|string|max:500`; controller không có rule `image|mimes|max`, không gọi `hasFile()`, `store()` hoặc `Storage`.
- **Database/storage bị ảnh hưởng:** Field file `avatar` không được đưa vào update; source không tạo file mới trong public storage.
- **Mức độ ảnh hưởng:** **Medium**.
- **Điều kiện tái hiện:** Admin gửi multipart field `avatar` là file hợp lệ theo UC-019 tới `PUT /api/admin/profile`; field không được validation/update và source không có thao tác lưu file.

## Kiểm kê mức độ ảnh hưởng

| Mức độ | Số BUG | ID |
| --- | ---: | --- |
| Critical | 1 | BUG-AB-003 |
| High | 11 | BUG-AB-001, BUG-AB-004, BUG-RG-001, BUG-RG-002, BUG-RG-003, BUG-RG-004, BUG-SA-001, BUG-SA-002, BUG-SA-003, BUG-SA-004, BUG-XD-001 |
| Medium | 3 | BUG-AB-002, BUG-XD-002, BUG-XD-003 |
| Low | 0 | Không có |
| **Tổng** | **15** | **15 ID duy nhất** |

## Phần supplemental đã nhập

- Nguồn audit: `docs/business-model-audit/modules/07-cross-document-requirements.md`.
- Nguồn test case: `docs/business-model-audit/test-cases/07-supplemental-test-cases.md`.
- BUG-XD-001, BUG-XD-002 và BUG-XD-003 đã được nhập vào register 15 BUG hiện tại.
