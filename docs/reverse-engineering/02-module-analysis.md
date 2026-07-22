# Module Analysis

## 1. Cách đọc tài liệu

- “Backend”: hành vi từ Laravel route/controller/service/request/model/migration.
- “Frontend”: hành vi quan sát từ React router/page/component/API service.
- **[Suy luận từ source code]**: kết luận được ghép từ nhiều hành vi nhưng không có tuyên bố nghiệp vụ trực tiếp.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**: không có đủ source để xác nhận.
- Các mã `401`, `403`, `404`, `409`, `422`, `503` chỉ được ghi khi controller, middleware hoặc test có nhánh trả về tương ứng.

## 1.1. Snapshot hậu sửa Business Model — 2026-07-22

Snapshot này chỉ phản ánh 15 BUG đã được đối chiếu hậu sửa trong `docs/business-model-audit/11-post-fix-verification.md`. Các mục `UV-*` ngoài phạm vi không được thay đổi kết luận trong tài liệu này. Toàn bộ API route trong bảng được khai báo tại `backend_laravel/routes/api.php`.

| BUG | Hành vi hậu sửa đã truy vết | File, class, method và route | Model và migration | Test hậu sửa | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| BUG-AB-001 | `contact_email` là tùy chọn; khi không gửi, booking lưu `NULL`; rollback đổi `NULL` thành chuỗi rỗng trước khi khôi phục `NOT NULL`. | `backend_laravel/app/Http/Requests/Customer/StoreBookingRequest.php`, class `StoreBookingRequest`, method `rules`; `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php`, class `CustomerBookingController`, method `store`; route `POST /api/customer/bookings`. | Models `Booking`, `BookingContact`; migration `backend_laravel/database/migrations/2026_07_22_010000_make_booking_contact_email_nullable.php`, methods `up`, `down`. | `backend_laravel/tests/Feature/AuthBookingBusinessModelRegressionTest.php`: “đặt tour cho phép bỏ contact email và lưu null”, “rollback contact email nullable giữ lại bản ghi bằng chuỗi rỗng”. | Resolved |
| BUG-AB-002 | Giới hạn request được đồng bộ với độ dài cột: đăng ký `full_name/email/phone` là `150/150/20`; customer profile `full_name/phone` là `150/20`; booking contact là `150/150/20/255`, participant là `150/20/30`. | `backend_laravel/app/Http/Controllers/Api/AuthController.php`, `AuthController::register`, route `POST /api/auth/register`; `backend_laravel/app/Http/Controllers/Api/Customer/CustomerController.php`, `CustomerController::updateProfile`, route `PUT /api/profile/update`; `backend_laravel/app/Http/Requests/Customer/StoreBookingRequest.php`, `StoreBookingRequest::rules`, route `POST /api/customer/bookings`. | Models `User`, `BookingContact`, `BookingParticipant`; migrations `2026_06_10_215910_add_vivugo_columns_to_users_table.php`, `2026_06_10_220070_create_booking_contacts_table.php`, `2026_06_10_220080_create_booking_participants_table.php`. | `backend_laravel/tests/Feature/AuthBookingBusinessModelRegressionTest.php`: các test biên và biên +1 cho đăng ký, hồ sơ và booking. | Resolved |
| BUG-AB-003 | Giá từng hành khách được tính từ `birth_date`; `bookings.total_amount` và `payments.amount` cùng lấy từ tổng `unit_price` đã định giá của participant trong transaction tạo booking. | `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php`, class `CustomerBookingController`, method `store`; `backend_laravel/app/Services/TourPricingService.php`, class `TourPricingService`, method `calculateParticipantPrice`; route `POST /api/customer/bookings`. | Models `Booking`, `BookingParticipant`, `Payment`, `TourAgePricingRule`; migrations `2026_06_10_220060_create_bookings_table.php`, `2026_06_10_220080_create_booking_participants_table.php`, `2026_07_03_120000_create_tour_age_pricing_rules_table.php`, `2026_07_03_120100_add_pricing_snapshot_to_booking_participants_table.php`, `2026_06_10_220090_create_payments_table.php`. | `backend_laravel/tests/Feature/AuthBookingBusinessModelRegressionTest.php`: “tổng tiền booking và payment được tính từ ngày sinh hành khách”. | Resolved |
| BUG-AB-004 | Chuyển trạng thái payment chỉ cho `pending→success/failed`, `failed→success`, `success→refunded`; cạnh khác trả `422`. Payment được khóa và payment/booking được cập nhật trong cùng transaction. | `backend_laravel/app/Http/Controllers/Api/Admin/PaymentController.php`, class `PaymentController`, methods `confirm`, `fail`, `refund`, `updateStatus`; routes `PATCH /api/admin/payments/{id}/confirm`, `PATCH /api/admin/payments/{id}/fail`, `PATCH /api/admin/payments/{id}/refund`. | Models `Payment`, `Booking`; migrations `2026_06_10_220090_create_payments_table.php`, `2026_06_10_220060_create_bookings_table.php`; không có migration hậu sửa riêng. | `backend_laravel/tests/Feature/AuthBookingBusinessModelRegressionTest.php`: ma trận hợp lệ/không hợp lệ; `backend_laravel/tests/Feature/PaymentBookingSafetyTest.php`: các chuỗi trạng thái hợp lệ. | Resolved |
| BUG-RG-001 | Tạo đơn nghỉ chạy trong transaction, khóa row guide rồi tái kiểm tra đơn `pending/approved` giao nhau bằng locking read; trùng khoảng ngày trả `422`. | `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php`, class `GuideLeaveRequestController`, method `store`; route `POST /api/guide/leave-requests`. | Models `Guide`, `GuideLeaveRequest`, `GuideLeaveRequestAttachment`; migration `2026_07_13_000000_create_guide_leave_requests_tables.php`. | `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php`: “đơn nghỉ giao nhau chỉ tạo một bản ghi active”; `backend_laravel/tests/Feature/BusinessModelConcurrencyMysqlTest.php`: hai request đồng thời nhận `201 + 422`. | Resolved |
| BUG-RG-002 | Guide cancel và admin decision đều khóa lại cùng row leave và đọc lại trạng thái trong transaction: cancel chỉ ghi khi còn `pending`; admin từ chối row đã `cancelled` hoặc đã hết kỳ nghỉ. | `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php`, `GuideLeaveRequestController::cancel`, route `PATCH /api/guide/leave-requests/{leaveRequest}/cancel`; `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideLeaveRequestController.php`, `AdminGuideLeaveRequestController::{approve,reject,updateDecision,updateStatus}`, routes `POST /api/admin/guide-leave-requests/{leaveRequest}/approve`, `POST /api/admin/guide-leave-requests/{leaveRequest}/reject`, `PATCH /api/admin/guide-leave-requests/{leaveRequest}/decision`. | Model `GuideLeaveRequest`; migration `2026_07_13_000000_create_guide_leave_requests_tables.php`. | `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php`: test tái đọc stale model; `backend_laravel/tests/Feature/BusinessModelConcurrencyMysqlTest.php`: cancel đối đầu approve nhận `200 + 422`. | Resolved |
| BUG-RG-003 | Tạo replacement request khóa departure và assignment, tái kiểm tra request pending trong transaction; evidence đã lưu được xóa nếu transaction không tạo request hoặc phát sinh exception. | `backend_laravel/app/Http/Controllers/Api/Guide/GuideTourController.php`, class `GuideTourController`, method `requestReplacement`; route `POST /api/guide/tours/{tourDeparture}/replacement-requests`. | Models `TourDeparture`, `Guide`; bảng `tour_guide_assignments` và `guide_replacement_requests` được query trực tiếp; migrations `2026_06_28_092905_create_tour_guide_assignments_table.php`, `2026_07_12_000000_create_guide_replacement_requests_table.php`. | `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php`: chỉ một pending; `backend_laravel/tests/Feature/BusinessModelConcurrencyMysqlTest.php`: hai request đồng thời nhận `201 + 409`. | Resolved |
| BUG-RG-004 | Approve/reject cùng khóa departure trước rồi khóa replacement request, chỉ xử lý state `pending`; assignment, request và notification được ghi trong một transaction, stale action trả `409`. | `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideReplacementRequestController.php`, class `AdminGuideReplacementRequestController`, methods `approve`, `reject`; routes `POST /api/admin/guide-replacement-requests/{id}/approve`, `POST /api/admin/guide-replacement-requests/{id}/reject`. | Models `TourDeparture`, `Guide`; bảng `tour_guide_assignments`, `guide_replacement_requests`, `notifications`; migrations `2026_06_28_092905_create_tour_guide_assignments_table.php`, `2026_07_12_000000_create_guide_replacement_requests_table.php`. | `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php`: request đã duyệt không bị reject ghi đè; `backend_laravel/tests/Feature/BusinessModelConcurrencyMysqlTest.php`: approve đối đầu reject nhận `200 + 409`. | Resolved |
| BUG-SA-001 | Support gửi cho toàn bộ admin với notification `type=support`, `status=unread` và metadata nguồn gửi trong transaction. | `backend_laravel/app/Http/Controllers/Api/Support/SupportNotificationController.php`, class `SupportNotificationController`, method `sendNotification`; route `POST /api/notifications/support/send`. | Models `Notification`, `User`; migrations `2026_06_10_220130_create_notifications_table.php`, `2026_06_24_161627_modify_notifications_table.php`; không có migration hậu sửa riêng. | `backend_laravel/tests/Feature/BusinessModelAuditBugFixTest.php`: “nhân viên hỗ trợ gửi được thông báo hợp lệ tới toàn bộ admin”. | Resolved |
| BUG-SA-002 | Contract widget giữ `image_url` bắt buộc cho type `image` và cho phép `NULL` với type `html`; rollback backfill `NULL` thành chuỗi rỗng trước khi khôi phục `NOT NULL`. | `backend_laravel/app/Http/Controllers/Api/Admin/WidgetController.php`, class `WidgetController`, methods `store`, `update`, `rules`, `payload`; routes `POST /api/admin/widgets`, `PUT /api/admin/widgets/{id}`. | Model `Banner`; migration `backend_laravel/database/migrations/2026_07_22_000000_make_banner_image_url_nullable.php`, methods `up`, `down`. | `backend_laravel/tests/Feature/BusinessModelAuditBugFixTest.php`: tạo HTML widget không ảnh và rollback giữ row. | Resolved |
| BUG-SA-003 | Admin khóa booking khi update/hủy; `cancelled` là terminal; chỉ transition hủy đầu tiên hoàn `booked_slots`, gọi hủy lặp không hoàn chỗ lần nữa. | `backend_laravel/app/Http/Controllers/Api/Admin/BookingController.php`, class `BookingController`, methods `update`, `softDelete`, `releaseBookedSlots`; routes `PUT /api/admin/bookings/{id}`, `PATCH /api/admin/bookings/{id}/cancel`. | Models `Booking`, `TourDeparture`; migrations `2026_06_10_220060_create_bookings_table.php`, `2026_06_10_220040_create_tour_departures_table.php`. | `backend_laravel/tests/Feature/BusinessModelAuditBugFixTest.php`: booking đã hủy không mở lại/hoàn lần hai; `backend_laravel/tests/Feature/BusinessModelConcurrencyMysqlTest.php`: hủy đồng thời chỉ hoàn một lần. | Resolved |
| BUG-SA-004 | Gửi campaign khóa row draft và tái kiểm tra `status=draft` trước bulk insert; lần gửi sau khi draft đã `sent` trả `404`. | `backend_laravel/app/Http/Controllers/Api/Admin/NotificationController.php`, class `NotificationController`, method `sendNotification`; route `POST /api/admin/notifications/send/{id}`. | Models `NotificationDraft`, `Notification`, `User`; migrations `2026_06_24_152026_create_notification_drafts_table.php`, `2026_06_10_220130_create_notifications_table.php`, `2026_06_24_165838_add_draft_id_to_notifications_table.php`; không có migration hậu sửa riêng. | `backend_laravel/tests/Feature/BusinessModelAuditBugFixTest.php`: gửi lặp chỉ một notification/recipient; `backend_laravel/tests/Feature/BusinessModelConcurrencyMysqlTest.php`: hai request nhận `200 + 404`. | Resolved |
| BUG-XD-001 | Cả sáu API candidates/auto assign/assign/cancel/direct candidates/direct assign chặn departure có ngày khởi hành `<= hôm nay` bằng `422`; các write flow tái kiểm tra guard sau khi khóa departure. | `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php`, `TourDepartureGuideAssignmentController::{candidates,autoAssign,assign,cancel,directCandidates,directAssign}`; `backend_laravel/app/Services/GuideAssignmentService.php`, `GuideAssignmentService::{autoAssign,assignSpecific}`; `backend_laravel/app/Services/TourDepartureMutationGuard.php`, `TourDepartureMutationGuard::assertCanMutate`; routes `GET /api/admin/tour-departures/{departure}/guide-candidates`, `POST /api/admin/tour-departures/{departure}/auto-assign-guide`, `POST /api/admin/tour-departures/{departure}/assign-guide`, `PATCH /api/admin/tour-departures/{departure}/guide-assignments/{assignment}/cancel`, `GET /api/admin/tour-departures/{departure}/direct-guide-candidates`, `POST /api/admin/tour-departures/{departure}/direct-assign-guide`. | Models `TourDeparture`, `TourGuideAssignment`, `Guide`; migrations `2026_06_10_220040_create_tour_departures_table.php`, `2026_06_28_092905_create_tour_guide_assignments_table.php`; không có migration hậu sửa riêng. | `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php`: sáu API trả `422` với departure bắt đầu hôm nay; future cancel vẫn thành công. | Resolved |
| BUG-XD-002 | Guide tự cập nhật/đọc lại `certificate_type` tối đa 100 ký tự; 101 ký tự trả `422`; field có trong mass assignment. | `backend_laravel/app/Http/Controllers/Api/Guide/GuideProfileController.php`, class `GuideProfileController`, methods `show`, `update`; routes `GET /api/guide/profile` và `PUT /api/guide/profile`; `backend_laravel/app/Models/Guide.php`, class `Guide`, thuộc tính `fillable`. | Model `Guide`; migration `backend_laravel/database/migrations/2026_07_22_000000_restore_certificate_type_to_guides_table.php`, methods `up`, `down`, khôi phục `VARCHAR(100) NULL`. | `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php`: round-trip 100 ký tự và từ chối 101 ký tự. | Resolved |
| BUG-XD-003 | Admin profile nhận một trong hai nguồn avatar: `avatar_url` tối đa 500 hoặc file JPG/JPEG/PNG/WebP tối đa 5.120 KB; gửi đồng thời hai nguồn trả `422`; file được lưu ở disk `public`, thư mục `avatars`. | `backend_laravel/app/Http/Controllers/Api/Admin/AdminProfileController.php`, class `AdminProfileController`, method `update`; route `PUT /api/admin/profile`. | Model `User`; migrations `0001_01_01_000000_create_users_table.php`, `2026_06_10_215910_add_vivugo_columns_to_users_table.php`; không có migration hậu sửa riêng. | `backend_laravel/tests/Feature/BusinessModelAuditBugFixTest.php`: upload avatar, mutual exclusion và giới hạn dung lượng. | Resolved |

## 2. Authentication, RBAC và hồ sơ

### Chức năng

- Đăng ký tài khoản customer, đăng nhập bằng email hoặc số điện thoại, đăng xuất và lấy user hiện tại.
- Customer, guide, support staff và admin có API hồ sơ/đổi mật khẩu riêng.
- Backend có API quên mật khẩu và đặt lại mật khẩu bằng OTP.
- React bảo vệ khu vực admin/guide/support bằng token và role lưu ở browser; backend bảo vệ bằng Sanctum và middleware role.

### Actor và authorization

- Guest: đăng ký, đăng nhập, quên/đặt lại mật khẩu.
- Người đã xác thực: logout và `/auth/me`.
- Customer: route nhóm `auth:sanctum`, `role:customer`.
- Guide: route nhóm `auth:sanctum`, `role:tour guide`.
- Support: route nhóm `auth:sanctum`, `role:support staff`.
- Admin: route prefix `/admin`, middleware `auth:sanctum`, `role:admin`.

### Input và validation

| Luồng | Required | Optional/rule |
| --- | --- | --- |
| Register | `full_name`, `email`, `phone`, `password`, `password_confirmation` | `full_name` tối đa 150; email hợp lệ, tối đa 150 và unique; phone tối đa 20 và unique ở validation; password dùng `Setting::password_min_length`, mặc định 8, và confirmed. Chỉ email có unique ở migration `users`; phone không có unique DB |
| Login | `identifier`, `password` | `remember` boolean; identifier có thể nhận fallback từ field `email` |
| Customer profile | `full_name` | `full_name` tối đa 150; `phone` nullable tối đa 20; avatar image JPG/JPEG/PNG/WebP, tối đa 5.120 KB |
| Admin profile | Không có field bắt buộc vì các field dùng `sometimes` | `full_name` tối đa 150; email tối đa 150 và unique bỏ qua chính user; phone nullable tối đa 20; `avatar_url` nullable tối đa 500 hoặc file `avatar` JPG/JPEG/PNG/WebP tối đa 5.120 KB; gửi đồng thời hai nguồn avatar trả `422` |
| Customer password | `current_password`, `new_password`, confirmation | Độ dài theo setting; mật khẩu cũ phải đúng |
| Support profile | Các field gửi lên dùng `sometimes`: `full_name`, `email`, `status` | `phone` nullable; status `active/inactive`; email unique |
| Support password | `old_password`, `new_password`, confirmation | New password tối thiểu 6, phải khác password cũ |
| Guide profile | Các field gửi lên dùng `sometimes` | `full_name`, email unique, phone, avatar, status theo validation trong controller |
| Forgot password | `identifier` | Tìm theo email hoặc phone |
| Reset password | `identifier`, `otp`, `password`, confirmation | Password theo setting |

### Output

- Register: HTTP 201, user với role và Sanctum token.
- Login: user với role và token; token hết hạn theo `session_timeout_minutes`, hoặc 30 ngày khi remember được bật và setting cho phép.
- Profile: JSON dữ liệu user/profile.
- React lưu token/session vào `localStorage` hoặc `sessionStorage`; Axios thêm Bearer token.

### Business flow và exception

1. Register lấy role có tên `customer`, tạo user `active`, hash password và tạo token.
2. Login chuẩn hóa email/phone, kiểm tra hash và chỉ cho user có status `active`.
3. Login sai trả `401`; tài khoản không active trả `403`.
4. Middleware authentication cho API trả `401` với thông điệp yêu cầu đăng nhập.
5. React gặp `401` sẽ xóa session và chuyển login; gặp `403` ở trang `/admin` cũng chuyển login.
6. Customer đổi password sai password cũ trả `400`; support trả `422`.
7. Backend forgot-password lưu OTP vào user và response hiện trả cả `otp_in_db`; React `ForgotPasswordPage` lại hiển thị tính năng đang chuẩn bị và không gọi API.
8. Admin cập nhật profile bằng URL hoặc file avatar; file được lưu tại disk `public` trong thư mục `avatars`, URL public được ghi vào `users.avatar_url`; request có cả `avatar` và `avatar_url` trả `422`.

### Database

- `users`, `roles`, `personal_access_tokens`, `password_reset_tokens`, `sessions`, `settings`.
- `users.role_id -> roles.id`.
- User dùng soft delete; password bị ẩn khỏi JSON.

### Business rules

- Tài khoản tự đăng ký luôn nhận role `customer`. (Nguồn: BR-001 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Chỉ status `active` đăng nhập được. (Nguồn: BR-002 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Thời hạn token mặc định lấy từ setting; remember login chỉ có hiệu lực nếu `allow_remember_login` bật. (Nguồn: BR-003 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Backend authorization là middleware role; frontend guard chỉ là điều hướng giao diện. (Nguồn backend: BR-004 tại `docs/reverse-engineering/03-business-rules-brd.md`; nguồn frontend: file `frontend_react/src/components/admin/ProtectedAdminRoute.jsx`, component `ProtectedAdminRoute`, và `frontend_react/src/routes/AppRoutes.jsx`, helpers `protect`, `adminPage`, `guidePage`, `supportPage`; route UI tương ứng; model/migration: không áp dụng cho điều hướng frontend.)

### Source Code Reference

- Route: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/user`, `POST /api/forgot-password`, `POST /api/reset-password`, `GET|PUT /api/admin/profile`, `PUT /api/admin/profile/password`; file `backend_laravel/routes/api.php`. Route `/auth/me` dùng closure tại route; route `/user` gọi `AuthController::me`.
- File/class/method: `backend_laravel/app/Http/Controllers/Api/AuthController.php`; `AuthController::{register,login,logout,me}`; `me` được route `/api/user` sử dụng.
- File/class/method: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerController.php`; `CustomerController::{updateProfile,changePassword,forgotPassword,resetPassword}`.
- File/class/method: `backend_laravel/app/Http/Controllers/Api/Admin/AdminProfileController.php`; `AdminProfileController::{show,update,changePassword}`.
- File/class/method: `backend_laravel/app/Http/Controllers/Api/Guide/GuideProfileController.php`; `GuideProfileController::{show,update,changePassword}`.
- File/class/method: `backend_laravel/app/Http/Controllers/Api/Support/SupportProfileController.php`; `SupportProfileController::{show,update,changePassword}`.
- Frontend: `frontend_react/src/pages/auth/AuthPage.jsx`, `ForgotPasswordPage.jsx`, `frontend_react/src/components/admin/ProtectedAdminRoute.jsx`, `frontend_react/src/services/apiClient.js`, `authStorage.js`.
- Models: `User`, `Role`, `Setting`.
- Migrations: `0001_01_01_000000_create_users_table.php`, `2026_06_10_215900_create_roles_table.php`, `2026_06_10_215910_add_vivugo_columns_to_users_table.php`, `2026_06_10_055225_create_personal_access_tokens_table.php`, `2026_06_13_144107_add_otp_to_users_table.php`.
- Tests hậu sửa: `backend_laravel/tests/Feature/AuthBookingBusinessModelRegressionTest.php` kiểm biên validation đăng ký/customer profile; `backend_laravel/tests/Feature/BusinessModelAuditBugFixTest.php` kiểm upload avatar admin, loại trừ đồng thời `avatar`/`avatar_url` và dung lượng tối đa.

## 3. Public catalog, tìm kiếm tour và trang chủ

### Chức năng

- Trả trang chủ gồm thống kê, tour nổi bật, categories, destinations và ba đánh giá tour mới nhất có nhận xét.
- Danh sách/tìm kiếm/lọc/sắp xếp tour, xem chi tiết theo slug.
- Trả settings và widgets công khai.

### Actor

- Guest và mọi actor; các route không có middleware auth.

### Input và validation

API tour nhận các query tùy chọn:

- `keyword` string tối đa 255.
- `category_id`, `destination_id`, `duration_days` integer tối thiểu 1.
- `departure_date` hoặc legacy `start_date` là date.
- `guests` hoặc legacy `min_slots` integer tối thiểu 1.
- `min_price`, `max_price` numeric không âm.
- `per_page` từ 1 đến 50, mặc định 12.
- `sort`: `latest`, `price_asc`, `price_desc`, `departure_soon`, `rating_desc`, `duration_asc`, `duration_desc`.
- Public widgets: `position`, `page` nullable string.

### Output

- `TourResource` cho list/detail, kèm category, destination, ảnh, itinerary, rule giá tuổi và lịch mở.
- `/home` trả `statistics`, `featured_tours`, `categories`, `destinations`, `reviews`.
- `/catalog/categories` chỉ trả category `active`; `/catalog/destinations` chỉ trả destination `active`.
- `/settings/public` chỉ trả khóa trong `Setting::PUBLIC_KEYS`.
- `/widgets` chỉ trả widget đang trong thời gian hiển thị và status active.

### Business flow và nhánh

1. Query customer chỉ chọn tour `published`.
2. Lịch hiển thị cho customer phải `open` và ngày đi từ hôm nay trở đi.
3. Khi lọc ngày/số khách/giá, tất cả điều kiện phải cùng khớp trên một `tour_departure`.
4. Giá hiển thị ưu tiên `tour_departures.discount_price`, rồi `base_price`/legacy `price`, cuối cùng giá tour.
5. Home chỉ xem tour có ít nhất một lịch mở, chưa qua và còn chỗ.
6. Featured tours sắp theo rating, review count, booking count và ngày đi gần.
7. Home review chỉ lấy `TourReview::visible()`, tour published, comment không rỗng; tên khách được viết tắt.

### Database

- `tours`, `categories`, `destinations`, `tour_destinations`, `tour_departures`, `tour_images`, `tour_itineraries`, `tour_itinerary_images`, `tour_age_pricing_rules`, `tour_reviews`, `settings`, `banners`.

### Business rules và UI gap

- React `TourDetailPage` gọi API chi tiết nhưng danh sách review vẫn là placeholder “Danh sách nhận xét chi tiết chưa được kết nối với API đánh giá.” (Nguồn: file `frontend_react/src/pages/customer/TourDetailPage.jsx`; component `TourDetailPage`; route UI `/tours/:slug`; API review hiện có `GET /api/tours/{slug}/reviews`; controller `Api\TourReviewController::index`; model `TourReview`; migration `2026_07_21_000000_create_tour_reviews_table.php`.)
- React `HomePage` nhận được `reviews` từ backend `/home`, nhưng section review đang bị comment. (Nguồn: files `frontend_react/src/pages/customer/HomePage.jsx`, `frontend_react/src/services/customerApi.js`; component `HomePage`; route UI `/`; route API `GET /api/home`; controller `PublicCatalogController::home`; model `TourReview`; migration `2026_07_21_000000_create_tour_reviews_table.php`.)
- React `DestinationsPage` dùng `demoDestinations` thay vì catalog API cho nội dung trang. (Nguồn: file `frontend_react/src/pages/customer/DestinationsPage.jsx`; component `DestinationsPage`; route UI `/destinations`; API catalog hiện có `GET /api/catalog/destinations`; controller `PublicCatalogController::destinations`; model `Destination`; migration `2026_06_10_220010_create_destinations_table.php`.)
- Select sort trong `ToursPage` không có `onChange`; backend vẫn hỗ trợ sort. (Nguồn: file `frontend_react/src/pages/customer/ToursPage.jsx`; component `ToursPage`; route UI `/tours/*`; routes API `GET /api/tours`, `/api/tours/search`, `/api/tours/filter`; controller `Customer\TourController::{index_gdkh,search_gdkh,filter_gdkh}`; model `Tour`; migration `2026_06_10_220020_create_tours_table.php`.)

### Source Code Reference

- Routes: `GET /api/home`, `/api/catalog/categories`, `/api/catalog/destinations`, `/api/tours`, `/api/tours/search`, `/api/tours/filter`, `/api/tours/{slug}`, `/api/settings/public`, `/api/widgets`.
- Controllers: `PublicCatalogController::{home,categories,destinations}`, `Customer\TourController::{index_gdkh,search_gdkh,filter_gdkh,show_gdkh}`, `PublicSettingController::show`, `PublicWidgetController::index`.
- Files: `backend_laravel/app/Http/Controllers/Api/PublicCatalogController.php`, `Customer/TourController.php`, `PublicSettingController.php`, `PublicWidgetController.php`.
- Frontend: `frontend_react/src/pages/customer/HomePage.jsx`, `ToursPage.jsx`, `TourDetailPage.jsx`, `DestinationsPage.jsx`; service `frontend_react/src/services/customerApi.js`.
- Models: `Tour`, `Category`, `Destination`, `TourDeparture`, `TourReview`, `Setting`, `Banner`.
- Migrations: `2026_06_10_220000_create_categories_table.php`, `2026_06_10_220010_create_destinations_table.php`, `2026_06_10_220020_create_tours_table.php`, `2026_06_10_220030_create_tour_images_table.php`, `2026_06_10_220040_create_tour_departures_table.php`, `2026_06_27_000001_create_tour_itineraries_table.php`, `2026_06_27_000002_create_tour_itinerary_images_table.php`, `2026_07_03_120000_create_tour_age_pricing_rules_table.php`, `2026_07_21_000000_create_tour_reviews_table.php`.

## 4. Wishlist

### Chức năng, actor, input và output

- Customer xem wishlist phân trang 10, thêm tour và bỏ tour.
- Thêm yêu cầu `tour_id` bắt buộc và phải tồn tại trong `tours`.
- Output dùng `TourResource` hoặc message thành công.
- Authorization: `auth:sanctum`, `role:customer`.

### Flow, exception và database

1. `store` dùng `syncWithoutDetaching`, nên gửi lại cùng tour không tạo pivot trùng.
2. `destroy` detach quan hệ user-tour.
3. React có optimistic/localStorage favorites; lỗi API không chứng minh database đã thay đổi.
4. Database: `wishlists` liên kết `users` và `tours`; model `User::wishlists()` là belongs-to-many.

### Business rule

- Một cặp user-tour chỉ có một wishlist theo unique của migration. (Nguồn: file `backend_laravel/database/migrations/2026_06_10_220110_create_wishlists_table.php`; class migration ẩn danh; method `up`; route `POST /api/tours/wishlist`; controller `WishlistController::store`; models `User`, `Tour`, `Wishlist`; migration chính file trên.)

### Source Code Reference

- Routes: `GET|POST /api/tours/wishlist`, `DELETE /api/tours/wishlist/{tour_id}`.
- Controller: `backend_laravel/app/Http/Controllers/Api/Customer/WishlistController.php`; methods `index`, `store`, `destroy`.
- Frontend: `CustomerPage.jsx`, `ProfileDashboard.jsx`, `customerApi.js`.
- Models: `User`, `Wishlist`, `Tour`.
- Migration: `backend_laravel/database/migrations/2026_06_10_220110_create_wishlists_table.php`.

## 5. Booking, liên hệ, hành khách và pricing

### Chức năng

- Customer xem trước giá, tạo booking, tiếp tục thanh toán và hủy booking chờ thanh toán.
- Customer dashboard trả lịch sử booking, bao gồm khả năng/đánh giá tour hiện tại.
- Admin tìm kiếm, lọc, thống kê, xem, tạo, cập nhật, hủy và xóa booking đã hủy.

### Actor và authorization

- Customer: middleware Sanctum + `role:customer`; controller còn kiểm tra `booking.user_id` khi tiếp tục/hủy.
- Admin: middleware Sanctum + `role:admin`.

### Input và validation customer

| Nhóm | Required | Optional/rule |
| --- | --- | --- |
| Preview | `tour_departure_id`, `quantity_summary` | 1–20 nhóm; `rule_id` nullable/existing; quantity 0–20 |
| Booking | `tour_departure_id`, `number_of_people`, `contact`, `participants` | Người 1–20; note tối đa 2.000; quantity summary tùy chọn |
| Contact | `contact_name`, `contact_phone` | Tên tối đa 150; email nullable, đúng định dạng, tối đa 150; phone tối đa 20; address tối đa 255; special request tối đa 2.000 |
| Participant | `full_name`, `birth_date`, `gender` | Tên tối đa 150; phone nullable tối đa 20; identity nullable tối đa 30; participant type nullable trong `adult/child/infant`; gender `male/female/other`; birth date không sau hôm nay |

Validation chéo:

- Số participant phải bằng `number_of_people`.
- Tổng quantity summary, nếu có, phải bằng `number_of_people`.
- Selected rule phải là rule active của đúng tour.

Frontend `TourDetailPage` còn áp dụng rule chặt hơn cho tên, phone, email, tuổi 0–120, identity 6–20 và số người; đây là client validation, không thay thế backend validation.

### Input admin

- List: search tối đa 100; status `pending/confirmed/completed/cancelled`; payment status `unpaid/paid/failed/refunded`; date range; sort; phân trang 5–100.
- Create: user/tour bắt buộc; departure/promotion/staff, giá, contact và participant tùy trường hợp.
- Update: status trong bốn trạng thái; `payment_status` bị `prohibited`; có thể cập nhật contact/participant và tính lại tổng tiền.

### Output

- Preview trả adult price, slot còn lại, subtotal/total, pricing groups.
- Create trả booking, contact, participants, payment, `checkout_url`, `payment_id`, `expires_at`; HTTP 201.
- History trả tour/departure/payment và các field `can_review_tour`, `tour_review` từ `CustomerDashboardController::bookings`.
- Admin list trả items và meta phân trang; statistics trả counts và revenue.

### Business flow và exception

1. Preview và create chỉ chấp nhận tour `published`, departure `open`, ngày đi chưa qua.
2. Create yêu cầu VNPAY đã cấu hình; chưa cấu hình trả validation error.
3. Transaction khóa departure và tour bằng `lockForUpdate` để tránh overbooking.
4. Giá người lớn ưu tiên giá lịch; rule tuổi có kiểu `free`, `fixed`, `percentage`.
5. Khi tạo booking, `birth_date` của từng participant được truyền vào `TourPricingService::calculateParticipantPrice`; `bookings.total_amount` là tổng `unit_price` của các participant sau định giá trừ discount, và `payments.amount` nhận đúng cùng giá trị này. Giá không lấy từ nhóm tuổi client tự chọn trong `quantity_summary`.
6. Hệ thống tạo `Booking`, `BookingContact`, các `BookingParticipant`, một `Payment` VNPAY pending và `BookingStatusHistory`.
7. Link VNPAY có hạn 15 phút; booked slots tăng trong cùng transaction.
8. Continue payment chỉ áp dụng booking `pending`, payment status `unpaid`, payment VNPAY `pending` và chưa hết hạn.
9. Customer cancel chỉ áp dụng cùng trạng thái trên; lifecycle service đánh failed payment, cancelled booking và hoàn booked slots.
10. Admin `update` và `softDelete` khóa booking trong transaction. Booking đã `cancelled` không thể chuyển lại trạng thái khác; chỉ lần đầu chuyển sang `cancelled` hoàn số chỗ, còn thao tác hủy lặp không hoàn thêm.
11. Admin xóa vĩnh viễn chỉ khi booking status là `cancelled`.

Exception có bằng chứng:

- Booking không thuộc customer: `404`.
- Tour/lịch không mở, quá ngày, không đủ chỗ, giá không hợp lệ: `422`.
- Link thanh toán hết hạn: payment/booking bị chuyển thất bại/hủy và trả `422` khi tiếp tục.
- Admin destroy booking chưa hủy: `422`.

### Database

- `bookings` N-1 `users`, `tours`, `tour_departures`; status và payment status có index.
- `booking_contacts.booking_id` unique: một contact/booking.
- `booking_contacts.contact_email` là `VARCHAR(150) NULL` sau migration `2026_07_22_010000_make_booking_contact_email_nullable.php`; `down()` backfill `NULL` thành `''` trước khi đổi lại `NOT NULL`.
- `booking_participants` N-1 booking; pricing snapshot được bổ sung bởi migration `2026_07_03_120100_add_pricing_snapshot_to_booking_participants_table.php`.
- `payments.booking_id` unique: một payment/booking.
- `booking_status_histories` lưu old/new status, người thay đổi và note.

### Business rules

- Booking code là unique; customer dùng `BK-` + ULID. (Nguồn: file `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php`; class `CustomerBookingController`; method `store`; route `POST /api/customer/bookings`; model `Booking`; migration `2026_06_10_220060_create_bookings_table.php`.)
- Không overbook: kiểm tra slot dưới row lock. (Nguồn: BR-025 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Hủy/chấm dứt payment pending phải hoàn số chỗ, không giảm dưới 0. (Nguồn: BR-028 và BR-032 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Payment status không được sửa qua admin booking update; dùng payment endpoints. (Nguồn: BR-096 và BR-034 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- `birth_date` participant là dữ liệu định giá khi tạo booking; tổng booking và amount payment cùng lấy từ tổng snapshot giá participant. (Nguồn: file `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php`; class `CustomerBookingController`; method `store`; route `POST /api/customer/bookings`; models `Booking`, `BookingParticipant`, `Payment`; migrations booking/participant/payment nêu dưới đây; test `AuthBookingBusinessModelRegressionTest.php`.)
- Booking admin đã `cancelled` là terminal và chỉ lần chuyển hủy đầu tiên hoàn slot. (Nguồn: file `backend_laravel/app/Http/Controllers/Api/Admin/BookingController.php`; class `BookingController`; methods `update`, `softDelete`, `releaseBookedSlots`; routes `PUT /api/admin/bookings/{id}`, `PATCH /api/admin/bookings/{id}/cancel`; models `Booking`, `TourDeparture`; migrations booking/departure; tests `BusinessModelAuditBugFixTest.php`, `BusinessModelConcurrencyMysqlTest.php`.)

### Source Code Reference

- Routes: `POST /api/customer/bookings/preview`, `POST /api/customer/bookings`, `POST /api/customer/bookings/{booking}/continue-payment`, `PATCH /api/customer/bookings/{booking}/cancel`, `GET /api/profile/bookings`, CRUD `/api/admin/bookings`.
- Controllers: `CustomerBookingController::{preview,store,continuePayment,cancel}`, `CustomerDashboardController::bookings`, admin `BookingController::{index,statistics,show,store,update,softDelete,destroy}`.
- Requests/services: `StoreBookingRequest`, `TourPricingService`, `VnpayPaymentLifecycleService`.
- Frontend: `TourDetailPage.jsx`, `ProfileDashboard.jsx`, `customerApi.js`, `BookingManagementPage.jsx`, `bookingApi.js`.
- Models: `Booking`, `BookingContact`, `BookingParticipant`, `BookingStatusHistory`, `TourDeparture`, `Payment`.
- Migrations: `2026_06_10_220060_create_bookings_table.php`, `2026_06_10_220070_create_booking_contacts_table.php`, `2026_07_22_010000_make_booking_contact_email_nullable.php`, `2026_06_10_220080_create_booking_participants_table.php`, `2026_07_03_120100_add_pricing_snapshot_to_booking_participants_table.php`, `2026_06_10_220090_create_payments_table.php`, `2026_06_10_220200_create_booking_status_histories_table.php`, `2026_07_04_005529_add_unique_booking_code_to_bookings_table.php`.
- Tests hậu sửa: `backend_laravel/tests/Feature/AuthBookingBusinessModelRegressionTest.php` kiểm giới hạn chuỗi, contact email nullable/rollback và total theo DOB; `backend_laravel/tests/Feature/BusinessModelAuditBugFixTest.php` cùng `BusinessModelConcurrencyMysqlTest.php` kiểm trạng thái hủy terminal và hoàn slot đúng một lần.

## 6. Thanh toán VNPAY và quản trị payment

### Chức năng và actor

- Customer lấy trạng thái payment thuộc booking của mình.
- Public callback xử lý VNPAY return/IPN.
- Admin xem payment và chuyển trạng thái success/failed/refunded.
- Scheduler hết hạn payment pending.

### Input/validation và output

- Customer status: route-model payment; controller kiểm tra method `vnpay` và booking owner.
- Return/IPN: query VNPAY, chữ ký và số tiền được kiểm tra.
- Admin confirm: `transaction_code` tối đa 100, `gateway_response` nullable array.
- Admin transition: chỉ `pending→success`, `pending→failed`, `failed→success`, `success→refunded`; mọi transition khác, kể cả giữ nguyên trạng thái, trả validation `422`.
- Output status gồm payment status, amount, transaction code, expires_at, booking/payment status, cancel reason, tour và ngày đi.

### Flow và exception

1. `VnpayService::createPaymentUrl` ký tham số bằng HMAC SHA-512.
2. Return/IPN xác minh chữ ký, merchant code, transaction reference và amount.
3. `processVnpayResponse` khóa payment trong transaction, chỉ xử lý payment pending.
4. Thành công: payment `success`, booking payment status `paid`.
5. Hết hạn hoặc customer hủy trên gateway: lifecycle chuyển payment `failed`, booking `cancelled`, payment status `failed`, hoàn slots và ghi history.
6. Callback lặp lại không xử lý lại payment đã hết pending.
7. VNPAY chưa cấu hình: return `503`; signature sai hoặc amount sai: `422`; không tìm thấy: `404`.
8. Admin confirm/fail/refund đi qua `PaymentController::updateStatus`: transaction khóa payment bằng `lockForUpdate`, kiểm transition rồi cập nhật `payments.status` và `bookings.payment_status`; transition không hợp lệ ném `ValidationException` trước khi ghi.

### Database và business rules

- Payment methods migration cho phép `vnpay`, `momo`, `cod`; status `pending`, `success`, `failed`, `refunded`. (Nguồn: file `backend_laravel/database/migrations/2026_06_10_220090_create_payments_table.php`; class migration ẩn danh; method `up`; route không áp dụng; model `Payment`; migration chính file trên.)
- Một payment/booking qua unique `booking_id`. (Nguồn: file `backend_laravel/database/migrations/2026_06_10_220090_create_payments_table.php`; class migration ẩn danh; method `up`; route không áp dụng; models `Payment`, `Booking`; migration chính file trên.)
- Admin payment update đồng bộ `bookings.payment_status` trong transaction. (Nguồn: BR-034 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Ma trận chuyển trạng thái payment admin là `pending→success/failed`, `failed→success`, `success→refunded`; payment row được khóa trước khi kiểm và cập nhật. (Nguồn: file `backend_laravel/app/Http/Controllers/Api/Admin/PaymentController.php`; class `PaymentController`; methods `confirm`, `fail`, `refund`, `updateStatus`; routes `PATCH /api/admin/payments/{id}/confirm`, `/fail`, `/refund`; models `Payment`, `Booking`; migrations payment/booking; tests `AuthBookingBusinessModelRegressionTest.php`, `PaymentBookingSafetyTest.php`.)
- Scheduler `vnpay:expire-pending-payments` chạy mỗi phút. (Nguồn: BR-033 tại `docs/reverse-engineering/03-business-rules-brd.md`.)

### Source Code Reference

- Routes: `GET /api/customer/payments/vnpay/{payment}`, `GET /api/vnpay/return-status`, `GET /api/webhooks/vnpay`, admin `/api/admin/payments*`.
- Controllers: `Customer/VnpayPaymentController::{status,returnStatus,ipn}`, `Admin/PaymentController::{index,show,confirm,fail,refund,updateStatus}`.
- Services: `VnpayService::{createPaymentUrl,verifyResponse}`, `VnpayPaymentLifecycleService::failPendingPayment`.
- Command/scheduler: `ExpirePendingVnpayPayments`, `backend_laravel/routes/console.php`.
- Frontend: `VnpayPaymentResultPage.jsx`, `customerApi.js`, `paymentApi.js`, `BookingManagementPage.jsx`.
- Model/migrations: `Payment`; `2026_06_10_220090_create_payments_table.php`, `2026_07_15_000000_add_vnpay_expiry_to_payments_table.php`.
- Tests hậu sửa: `backend_laravel/tests/Feature/AuthBookingBusinessModelRegressionTest.php` kiểm toàn bộ ma trận transition; `backend_laravel/tests/Feature/PaymentBookingSafetyTest.php` kiểm các chuỗi transition hợp lệ và đồng bộ booking.

## 7. Đánh giá tour

### Trạng thái tích hợp

**Backend đã triển khai; React chưa tích hợp UI/API service cho luồng tour review.**

Bằng chứng backend:

- Public list: `GET /api/tours/{slug}/reviews`.
- Customer create/update: `POST /api/customer/tour-reviews`, `PUT /api/customer/tour-reviews/{tourReview}`.
- Admin list/detail/moderate: `GET /api/admin/tour-reviews`, `GET /api/admin/tour-reviews/{tourReview}`, `PATCH /api/admin/tour-reviews/{tourReview}/status`.

Bằng chứng frontend chưa tích hợp:

- `AppRoutes.jsx` không có `/admin/reviews`.
- `AdminSidebar.jsx` không có mục “Đánh Giá”.
- `customerApi.js` không có hàm tour-review.
- `TourDetailPage.jsx` hiển thị placeholder danh sách review.
- `HomePage.jsx` comment section review dù backend `/home` đã trả `reviews`.

### Chức năng

- Public xem summary và review visible của một tour published, có filter sao, sort và pagination.
- Customer tạo một review cho booking của mình đã hoàn tất; sửa review do mình sở hữu.
- Admin tìm kiếm/lọc/xem chi tiết và đổi status `visible`, `hidden`, `spam`.

### Actor và authorization

- Public list: không yêu cầu auth.
- Create/update: Sanctum + `role:customer`, throttle 10 request/phút.
- Admin APIs: Sanctum + `role:admin`.
- Test xác nhận customer/guide/support truy cập admin review nhận `403`.

### Input và validation

| API | Required | Optional/rule |
| --- | --- | --- |
| Public list | Không | rating 1–5; sort `newest/oldest/highest/lowest`; per_page 5–50, mặc định 10 |
| Customer create | `booking_id`, `rating` | booking tồn tại; rating integer 1–5; comment nullable string tối đa 2.000 |
| Customer update | `rating` | comment nullable tối đa 2.000 |
| Admin list | Không | search tối đa 100; status; rating; tour_id; from/to date; per_page 5–100 |
| Admin status | `status` | Một trong `visible`, `hidden`, `spam` |

### Output

- Public: `summary.average_rating`, `review_count`, phân bố 1–5 và paginator review.
- Public resource chỉ trả reviewer name đã viết tắt, tour, rating, comment và ngày; không trả email/booking.
- Customer resource trả review, status, tour, departure, booking code và timestamps.
- Admin resource trả reviewer đầy đủ/email, tour, booking, departure, moderator và thời điểm kiểm duyệt.

### Business flow và exception

Create:

1. Transaction tìm booking cùng `user_id` và khóa booking.
2. Khóa tour, load departure, kiểm tra `BookingReviewEligibilityService`.
3. Nếu booking đã có review, trả `409`.
4. Tạo review status mặc định `visible` và tính lại rating tour trong cùng transaction.

Update:

1. Transaction chỉ tìm review cùng `user_id`; người khác nhận `404`.
2. Chỉ sửa rating/comment, không sửa status.
3. Review đang hidden/spam giữ nguyên status; refresh rating chỉ dùng visible review.

Moderation:

1. Admin khóa review, cập nhật status, `moderated_by`, `moderated_at`.
2. Refresh `tours.average_rating` và `review_count` trong cùng transaction.

Eligibility dùng chung:

- Booking cancelled: không được review.
- Booking completed: được review.
- Hoặc departure completed: được review.
- Hoặc booking confirmed và return date đã trước hôm nay: được review.

### Database

- Bảng `tour_reviews`: `user_id`, `tour_id`, nullable unique `booking_id`, nullable `tour_departure_id`, rating, comment, status, moderator/time, timestamps.
- FK user/tour cascade; booking/departure null-on-delete; moderator null-on-delete.
- Index được khai báo tường minh: `tour_id + status + created_at`, `status + rating + created_at`. `moderated_by` là FK nhưng migration không khai báo index tường minh riêng cho cột này.
- Migration chuyển record cũ `reviews.guide_id IS NULL` sang `tour_reviews`; rollback phục hồi về `reviews` và tính lại rating.

### Business rules

- Một booking tối đa một tour review do unique `booking_id` và conflict check. (Nguồn: BR-037 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Chỉ review visible được công khai và tính vào điểm tour. (Nguồn: BR-041 và BR-042 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Guide review trong `reviews` không được `TourReviewService` dùng để tính điểm tour. (Nguồn: BR-052 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Admin không có route sửa nội dung hoặc xóa tour review. (Nguồn: BR-044 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Customer không có route xóa review. (Nguồn: file `backend_laravel/routes/api.php`; route customer chỉ có `POST /api/customer/tour-reviews` và `PUT /api/customer/tour-reviews/{tourReview}`; controller `Customer\TourReviewController::{store,update}`; model `TourReview`; migration `2026_07_21_000000_create_tour_reviews_table.php`.)

### Source Code Reference

- Route: các route tour review tại `backend_laravel/routes/api.php`.
- Controllers: public `backend_laravel/app/Http/Controllers/Api/TourReviewController.php::index`; customer `Customer/TourReviewController::{store,update}`; admin `Admin/TourReviewController::{index,show,updateStatus}`.
- Requests: `StoreTourReviewRequest`, `UpdateTourReviewRequest`, `UpdateTourReviewStatusRequest`.
- Services: `TourReviewService::{isBookingReviewable,refreshTourRating,summaryForTour}`, `BookingReviewEligibilityService::isReviewable`.
- Resources: `PublicTourReviewResource`, `CustomerTourReviewResource`, `AdminTourReviewResource`.
- Models: `TourReview`, `Booking`, `Tour`, `TourDeparture`, `User`.
- Migration: `backend_laravel/database/migrations/2026_07_21_000000_create_tour_reviews_table.php`.
- Tests: `backend_laravel/tests/Feature/TourReviewApiTest.php`.
- Frontend gaps: `AppRoutes.jsx`, `AdminSidebar.jsx`, `TourDetailPage.jsx`, `HomePage.jsx`, `customerApi.js`.

## 8. Đánh giá hướng dẫn viên

### Chức năng và actor

- Customer xem booking có thể đánh giá HDV, tạo hoặc cập nhật đánh giá HDV bằng cùng endpoint POST.
- Customer xem review và lịch sử tour của một guide.
- Guide xem review và lịch sử tour của mình.
- Customer routes yêu cầu customer; guide routes yêu cầu tour guide.

### Input/validation

- `booking_id`, `guide_id`, `rating` bắt buộc; tồn tại trong DB; rating integer 1–5.
- `comment` nullable, tối đa 2.000.
- `per_page` được controller giới hạn 1–50; filter rating/keyword/date có trong query xử lý.

### Output

- Reviewable booking kèm tour, departure, các guide đã phân công, `reviewed` và review hiện tại.
- Review list kèm summary guide rating và paginator.
- Guide history kèm tour/departure và summary review theo departure.

### Flow, nhánh và exception

1. Booking phải thuộc customer, không cancelled và thỏa eligibility dùng chung với tour review.
2. Guide phải có assignment không cancelled trên departure của booking.
3. `firstOrNew` theo `booking_id + guide_id`: chưa có thì create status visible; có rồi thì update rating/comment, giữ status hiện tại.
4. Transaction lưu review, refresh điểm guide và đánh dấu notification reminder hoàn thành.
5. Guide không thuộc assignment hoặc booking chưa hoàn tất trả validation `422`; booking không thuộc customer trả `404`.

### Database và business rules

- Guide reviews lưu trong `reviews`, có `guide_id`, `booking_id`, `tour_departure_id`, rating/comment/status. (Nguồn: files `backend_laravel/database/migrations/2026_06_10_220100_create_reviews_table.php`, `backend_laravel/database/migrations/2026_07_11_112416_add_guide_context_to_reviews_table.php`; classes migration ẩn danh; methods `up`; route `POST /api/customer/guide-reviews`; model `Review`; migrations hai file trên.)
- Unique `booking_id + guide_id` được thêm trong migration guide-context. (Nguồn: BR-048 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Chỉ review visible được tính vào `guides.average_rating`/`review_count`. (Nguồn: BR-049 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Review HDV không đi qua `TourReviewService`, nên không cập nhật điểm tour. (Nguồn: BR-052 tại `docs/reverse-engineering/03-business-rules-brd.md`.)

### UI mismatch

- `CustomerNotificationBell` truyền đúng `target/onSubmitted` cho `GuideReviewModal`.
- `ProfileDashboard` truyền `booking`, `guide`, `onSaved`, trong khi modal nhận `target`, `onClose`, `onSubmitted`; nhánh này có thể không render vì `target` thiếu.
- React dùng cùng POST cho create/update, phù hợp backend `firstOrNew`.

### Source Code Reference

- Routes: `GET /api/customer/guide-reviewable-bookings`, `POST /api/customer/guide-reviews`, `GET /api/customer/guides/{guide}/reviews`, `/tour-history`, `GET /api/guide/reviews`, `/guide/tour-history`.
- Controllers: `Customer/GuideReviewController::{reviewableBookings,store,guideReviews,guideTourHistory}`; `Guide/GuideReviewController::{reviews,tourHistory}`.
- Request/service: `StoreGuideReviewRequest`, `GuideReviewService`, `BookingReviewEligibilityService`, `GuideReviewNotificationService`.
- Frontend: `GuideReviewModal.jsx`, `CustomerNotificationBell.jsx`, `ProfileDashboard.jsx`, `customerReviewApi.js`, `GuideReviewsPage.jsx`.
- Models/migrations: `Review`, `Guide`, `TourGuideAssignment`; `2026_06_10_220100_create_reviews_table.php`, `2026_07_11_112416_add_guide_context_to_reviews_table.php`.

## 9. Yêu cầu hỗ trợ khách hàng

### Chức năng và actor

- Customer gửi ticket hỗ trợ kèm tối đa năm file.
- Support staff xem danh sách, tìm kiếm/lọc, xem chi tiết, đếm badge và đổi trạng thái.
- Customer route yêu cầu `role:customer`; support routes yêu cầu `role:support staff`.

### Input và validation

Customer create:

- Bắt buộc: `full_name` tối đa 255, `email` hợp lệ tối đa 255, `category`, `subject` tối đa 255, `description` tối đa 10.000.
- Tùy chọn: `phone` tối đa 20; `attachments` array tối đa 5.
- Category: `technical`, `payment`, `account`, `feedback`, `general`.
- File: JPG/JPEG/PNG/WebP/PDF/DOC/DOCX; mỗi file tối đa 5.120 KB.
- Không nhận `priority` từ customer; controller tự dùng `medium` nếu cột tồn tại.

Support list:

- `search` tối đa 255; status `pending/in_progress/resolved`; category như trên; priority `low/medium/high`.
- Update status bắt buộc một trong ba status.

### Output

- Create trả HTTP 201, ticket cùng attachments và `notified_staff_count`.
- List trả paginator và count theo ba trạng thái.
- Detail trả customer, assigned support user và attachments.
- Badge bằng tổng pending + in_progress.

### Flow, exception và rollback

1. Controller sinh `SUP-YYYYMMDD-XXXXXX` duy nhất.
2. Transaction tạo request status `pending`, lưu metadata attachment và tạo notification cho support staff active.
3. Nếu transaction lỗi, database rollback; file đã upload được xóa thủ công trong catch.
4. Chuyển `pending`: xóa assignment và timestamps.
5. Chuyển `in_progress`: gán support hiện tại, set `started_at`, xóa `resolved_at`.
6. Chuyển `resolved`: giữ/ngầm gán support, bảo đảm started_at và set resolved_at.

### Database và business rules

- `support_requests.ticket_code` unique; FK customer/assigned support đều null-on-delete. (Nguồn: file `backend_laravel/database/migrations/2026_07_16_220919_create_support_requests_table.php`; class migration ẩn danh; method `up`; route không áp dụng; model `SupportRequest`; migration chính file trên.)
- Index status, category, priority và `(status, created_at)`. (Nguồn: file `backend_laravel/database/migrations/2026_07_16_220919_create_support_requests_table.php`; class migration ẩn danh; method `up`; route không áp dụng; model `SupportRequest`; migration chính file trên.)
- Attachment cascade khi ticket bị xóa. (Nguồn: file `backend_laravel/database/migrations/2026_07_16_220920_create_support_request_attachments_table.php`; class migration ẩn danh; method `up`; route không áp dụng; models `SupportRequest`, `SupportRequestAttachment`; migration chính file trên.)
- React service hiện append `priority` dù form không có field; backend create bỏ field này khỏi validation và tự đặt medium, nên field frontend đó không quyết định priority. (Nguồn: files `frontend_react/src/services/customerApi.js`, `backend_laravel/app/Http/Controllers/Api/Customer/CustomerSupportRequestController.php`; class `CustomerSupportRequestController`; method `store`; route `POST /api/customer/support-requests`; model `SupportRequest`; migration `2026_07_16_220919_create_support_requests_table.php`; xem thêm BR-075 tại `docs/reverse-engineering/03-business-rules-brd.md`.)

### Source Code Reference

- Routes: `POST /api/customer/support-requests`; `GET /api/support/requests`, `/badge-count`, `/{supportRequest}`; `PATCH /api/support/requests/{supportRequest}/status`.
- Controllers: `CustomerSupportRequestController::store`; `SupportRequestController::{index,show,badgeCount,updateStatus}`.
- Frontend: `CustomerSupportPage.jsx`, `SupportRequestsPage.jsx`, `supportRequestApi.js`.
- Models: `SupportRequest`, `SupportRequestAttachment`, `Notification`.
- Migrations: `2026_07_16_220919_create_support_requests_table.php`, `2026_07_16_220920_create_support_request_attachments_table.php`.

## 10. Trợ lý du lịch AI

### Chức năng, actor và input

- Public gửi message cho chatbot/travel assistant; route `/chatbot` bị throttle 20/phút, `/travel-assistant` không gắn throttle tại route.
- `message` bắt buộc, string tối đa 1.000; `session_id` tùy chọn, string tối đa 100.

### Output

- JSON `reply`, `session_id`.
- Hệ thống lưu cả user message và assistant reply; đánh dấu `is_fallback` nếu reply chứa câu fallback.

### Business flow và exception

1. Nếu client không gửi session, backend dùng hash IP + user-agent làm guest session.
2. Lấy 10 message gần nhất làm history.
3. Trích filter trực tiếp từ nội dung cho giảm giá, biển/núi, dị ứng/phấn hoa, số ngày/đêm.
4. Chỉ query tour published, tối đa 10, rồi đưa dữ liệu tour vào system prompt.
5. Gọi Gemini model `gemini-2.5-flash`, timeout 15 giây.
6. Lỗi HTTP/exception được ghi log và trả fallback message.
7. React `ChatBox` tạo session ID nhưng `customerApi.askTravelAssistant` hiện chỉ gửi `{message}`; session phía browser không được chuyển tới backend theo service đã đọc.

### Database và business rules

- `chat_conversations.session_id` unique; `user_id` nullable. (Nguồn: file `backend_laravel/database/migrations/2026_07_15_193903_create_chat_conversations_table.php`; class migration ẩn danh; method `up`; routes `POST /api/chatbot`, `POST /api/travel-assistant`; model `ChatConversation`; migration chính file trên.)
- `chat_messages` thuộc conversation, role chỉ `user/assistant`, cascade khi xóa conversation. (Nguồn: file `backend_laravel/database/migrations/2026_07_15_193904_create_chat_messages_table.php`; class migration ẩn danh; method `up`; routes `POST /api/chatbot`, `POST /api/travel-assistant`; models `ChatConversation`, `ChatMessage`; migration chính file trên.)
- Prompt cấm bịa tour/giá và yêu cầu fallback cho chủ đề ngoài dữ liệu; đây là rule trực tiếp trong `buildSystemPrompt`. (Nguồn: file `backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php`; class `ChatBotController`; method `buildSystemPrompt`; routes `POST /api/chatbot`, `POST /api/travel-assistant`; models `Tour`, `ChatConversation`, `ChatMessage`; migrations chat/tour; xem thêm BR-088 tại `docs/reverse-engineering/03-business-rules-brd.md`.)

### Source Code Reference

- Routes: `POST /api/chatbot`, `POST /api/travel-assistant`.
- Controller: `backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php`; methods `handleChat`, `extractFilters`, `buildTourQuery`, `buildSystemPrompt`, `callGemini`.
- Frontend: `frontend_react/src/components/customer/ChatBox.jsx`, `frontend_react/src/services/customerApi.js`.
- Models: `ChatConversation`, `ChatMessage`, `Tour`.
- Migrations: `2026_07_15_193903_create_chat_conversations_table.php`, `2026_07_15_193904_create_chat_messages_table.php`.

## 11. Thông báo và chiến dịch thông báo

### Chức năng và actor

- Người đã đăng nhập xem notification cá nhân qua endpoint customer dùng chung; support có endpoint riêng.
- Admin tạo/sửa/xóa/khôi phục bản nháp, preview recipients, gửi, xem chiến dịch đã gửi, thu hồi và dùng notification bell.
- Support staff có thể gửi một thông báo tới tất cả admin.

### Input/validation

- Admin draft: title bắt buộc tối đa 255, message bắt buộc, target type `all/role/specific`, target IDs nullable array.
- Support send: title bắt buộc tối đa 255, message bắt buộc.
- Recipient search/preview nhận keyword, role IDs hoặc user IDs nhưng controller không có validation chi tiết cho hai method này.

### Output

- Draft/sent/trash lists và detail JSON.
- Notification lists phân trang; unread count; detail tự đánh read.
- Bell admin có unread count, list, mark one/all.

### Flow, nhánh và exception

1. Admin lưu draft bằng `updateOrCreate` với status draft.
2. Send chạy transaction, khóa draft bằng `lockForUpdate`, tái kiểm tra `status=draft`, giải target thành users, bulk insert notifications và chuyển draft sang sent.
3. Không có recipient trả `404`; draft không tồn tại/đã gửi trả `404`. Do kiểm tra trạng thái được thực hiện sau row lock, request gửi lặp không tạo thêm bộ notification từ cùng draft.
4. Revoke xóa notification theo `draft_id` và đưa campaign về draft.
5. Customer/support detail chỉ query notification cùng `user_id`; của người khác trả `404`.
6. Support gửi tới user có role admin trong transaction; mỗi row được insert với `type=support`, `status=unread` và `data` chứa `source=support_to_admin`, role cùng user ID người gửi.

### Database và business rules

- `notification_drafts`: target type/IDs, status draft/sent, soft delete. (Nguồn: files `backend_laravel/database/migrations/2026_06_24_152026_create_notification_drafts_table.php`, `backend_laravel/database/migrations/2026_06_24_155228_add_deleted_at_to_notification_drafts_table.php`; classes migration ẩn danh; methods `up`; routes `/api/admin/notifications/draft*`; model `NotificationDraft`; migrations hai file trên; xem thêm BR-081 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- `notifications`: user, draft, title/message, type/data, status/read_at. (Nguồn: files `backend_laravel/database/migrations/2026_06_10_220130_create_notifications_table.php`, `backend_laravel/database/migrations/2026_06_24_161627_modify_notifications_table.php`, `backend_laravel/database/migrations/2026_06_24_165838_add_draft_id_to_notifications_table.php`; classes migration ẩn danh; methods `up`; routes notification customer/support/admin; model `Notification`; migrations ba file trên.)
- Campaign send dùng transaction và bulk insert. (Nguồn: BR-082 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Campaign send khóa `notification_drafts` và kiểm tra lại state `draft` trong transaction trước khi insert vào `notifications`. (Nguồn: file `backend_laravel/app/Http/Controllers/Api/Admin/NotificationController.php`; class `NotificationController`; method `sendNotification`; route `POST /api/admin/notifications/send/{id}`; models `NotificationDraft`, `Notification`, `User`; migrations notification/draft nêu dưới đây; tests `BusinessModelAuditBugFixTest.php`, `BusinessModelConcurrencyMysqlTest.php`.)
- Notification do support gửi tới admin có `type=support`. (Nguồn: file `backend_laravel/app/Http/Controllers/Api/Support/SupportNotificationController.php`; class `SupportNotificationController`; method `sendNotification`; route `POST /api/notifications/support/send`; models `Notification`, `User`; migrations notification nêu dưới đây; test `BusinessModelAuditBugFixTest.php`.)
- React `CustomerNotificationBell` polling mỗi 60 giây; `SupportNotificationBell` và `AdminNotificationBell` polling mỗi 30 giây; `GuideNotificationBell` chỉ tải khi mount, không có polling. (Nguồn: files `frontend_react/src/components/customer/CustomerNotificationBell.jsx`, `frontend_react/src/components/support/SupportNotificationBell.jsx`, `frontend_react/src/components/admin/notifications/AdminNotificationBell.jsx`, `frontend_react/src/components/guide/GuideNotificationBell.jsx`; các component cùng tên; method/hook `useEffect`; route UI theo layout từng actor; model/migration không áp dụng cho timer frontend.)
- Guide notification service frontend đặt endpoint `/notifications/customers`; backend route này chỉ yêu cầu auth và controller có nhánh visible query dùng chung. Tên endpoint không chứng minh chỉ customer được gọi. (Nguồn: files `frontend_react/src/services/guideNotificationApi.js`, `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Customer/NotificationCustomerController.php`; class `NotificationCustomerController`; methods `getMyNotifications`, `visibleNotificationsQuery`; route `/api/notifications/customers`; model `Notification`; migration notifications; xem thêm BR-080 tại `docs/reverse-engineering/03-business-rules-brd.md`.)

### Source Code Reference

- Routes: `/api/notifications/customers*`, `/api/notifications/support*`, `/api/admin/notifications*`, `/api/admin/notification-bell*`.
- Controllers: `Admin/NotificationController`, `AdminNotificationBellController`, `Customer/NotificationCustomerController`, `Support/SupportNotificationController`.
- Methods: `saveDraft`, `updateDraft`, `sendNotification`, `revoke`, `getMyNotifications`, `markAsRead`, `getUnreadCount`, `markAllAsRead`.
- Frontend: `AdminNotificationsPage.jsx`, các notification bell/page và notification API services.
- Models: `Notification`, `NotificationDraft`, `User`.
- Migrations: `2026_06_10_220130_create_notifications_table.php`, `2026_06_24_152026_create_notification_drafts_table.php`, `2026_06_24_155228_add_deleted_at_to_notification_drafts_table.php`, `2026_06_24_161627_modify_notifications_table.php`, `2026_06_24_165838_add_draft_id_to_notifications_table.php`.
- Tests hậu sửa: `backend_laravel/tests/Feature/BusinessModelAuditBugFixTest.php` kiểm notification support và gửi draft lặp tuần tự; `backend_laravel/tests/Feature/BusinessModelConcurrencyMysqlTest.php` kiểm hai request gửi cùng draft chỉ một request thành công.

## 12. Dashboard và báo cáo

### Chức năng, actor và input

- Admin xem overview, charts, booking/customer/guide/support/tour statistics và recent records.
- Report endpoints nhận `year`; controller cast thành integer, mặc định năm hiện tại. Không thấy validation range của year trong `ReportController`.

### Output và business flow

- Overview: revenue năm, số booking năm, completion rate, average revenue per paid booking.
- Charts: revenue/booking/customer theo 12 tháng và top 5 destination.
- Revenue chỉ tính payment `success`, booking không cancelled, theo `payments.paid_at`.
- Completion rate lấy booking completed / tổng booking tạo trong năm.
- React xuất CSV ở client và cho chọn ba năm gần nhất; giới hạn ba năm là frontend, không phải backend rule.

### Database

- Read-only aggregation trên `payments`, `bookings`, `users`, `roles`, `tours`, `destinations`.
- Không insert/update/delete trong report controller.

### Source Code Reference

- Routes: `GET /api/admin/reports/overview`, `GET /api/admin/reports/charts` và các widget/statistics APIs được dashboard service gọi.
- Controller: `backend_laravel/app/Http/Controllers/Api/Admin/ReportController.php`; methods `getOverviewStatistics`, `getChartStatistics`.
- Frontend: `AdminDashboardPage.jsx`, `ReportStatisticsPage.jsx`, `adminDashboardApi.js`, `reportApi.js`.
- Models: controller dùng DB query trực tiếp; tables như phần Database.
- Migration riêng cho report: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

## 13. Quản lý tài khoản người dùng

### Chức năng và actor

- Admin thống kê, list/search, tạo, xem, sửa, khóa và mở khóa user.
- React dùng cùng `UserManagementPage` cho customer/admin/support staff/tour guide, truyền `roleName`; service dùng `/admin/customers` với role ID.

### Input/validation

- Create: full name bắt buộc tối đa 255; email bắt buộc/unique; password tối thiểu 6; phone nullable tối đa 10; role ID tồn tại; avatar JPG/JPEG/PNG/WebP tối đa 5.120 KB.
- Update: fields dùng sometimes; email unique bỏ qua chính user; status `active/inactive`; password tối thiểu 6; avatar tối đa 2.048 KB.
- Search hỗ trợ role, status và term theo full name/email/phone; controller không khai báo validation cho các query này.

### Output, flow và exception

1. Create/update dùng transaction để đồng bộ hồ sơ quan hệ theo role.
2. Password được hash; avatar lưu public storage.
3. Lock chuyển status `inactive`; đã inactive trả `422`.
4. Unlock chuyển `active`; đã active trả `422`.
5. Không tìm thấy user trả `404`.
6. Không có endpoint xóa user trong nhóm route admin này.

### Database và business rules

- `users` thuộc `roles`; có soft delete ở model/migration. (Nguồn: files `backend_laravel/app/Models/User.php`, `backend_laravel/database/migrations/0001_01_01_000000_create_users_table.php`, `backend_laravel/database/migrations/2026_06_10_215910_add_vivugo_columns_to_users_table.php`; class `User` và các migration ẩn danh; methods `role`, migration `up`; routes auth/admin user; models `User`, `Role`; migrations trên.)
- `users.email` có unique ở migration gốc. `users.phone` được thêm nullable nhưng không có unique/index DB; tính duy nhất của phone chỉ xuất hiện ở validation `AuthController::register()`. (Nguồn: files `backend_laravel/database/migrations/0001_01_01_000000_create_users_table.php`, `backend_laravel/database/migrations/2026_06_10_215910_add_vivugo_columns_to_users_table.php`, `backend_laravel/app/Http/Controllers/Api/AuthController.php`; class `AuthController` và các migration ẩn danh; methods `register`, migration `up`; route `POST /api/auth/register`; model `User`; migrations hai file trên.)
- Tạo account qua admin có thể chọn bất kỳ role ID tồn tại; tự đăng ký public chỉ tạo customer. (Nguồn: BR-091 và BR-001 tại `docs/reverse-engineering/03-business-rules-brd.md`.)

### Source Code Reference

- Routes: `/api/admin/customers`, `/statistics`, `/count`, `/search`, `/{id}`, `/{id}/lock`, `/{id}/unlock`, `/api/admin/roles`.
- Controller: `Admin/CustomerManagerController::{count,statistics,index,search,store,index_role,show,update,lock,unlock}`.
- Frontend: `UserManagementPage.jsx`, `UserFormModal.jsx` và user API service.
- Models: `User`, `Role`, cùng các hồ sơ `Guide`, `SupportStaff` khi sync role.
- Migrations: users/roles migrations đã liệt kê ở module Authentication.

## 14. Quản lý category tour

### Chức năng, actor và input

- Admin list category active, tìm theo name, tạo/sửa, soft delete, xem trash và restore.
- Create: name bắt buộc, tối đa 150, unique; description nullable; thumbnail image JPG/JPEG/PNG/WebP tối đa 5.120 KB; alt tối đa 255; status `active/inactive`.
- Update dùng `sometimes`, unique bỏ qua ID.
- Search yêu cầu `name` và tối đa 150.

### Output, flow và exception

- Slug tự sinh từ name, thêm hậu tố nếu trùng.
- Thay thumbnail xóa file cũ nếu URL thuộc `/storage/categories/`.
- Không tìm thấy trả `404`.
- React có list/create/edit/trash; nút cancel create/edit hiện điều hướng `/admin/tours` thay vì `/admin/categories`.
- Không có route force-delete category.

### Database và business rules

- `categories.slug` unique, status indexed, soft delete. (Nguồn: file `backend_laravel/database/migrations/2026_06_10_220000_create_categories_table.php`; class migration ẩn danh; method `up`; routes `/api/admin/categories*`; model `Category`; migration chính file trên; xem thêm BR-093 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Category có nhiều tour; FK tour dùng restrict-on-delete nên force delete không được triển khai trong module. (Nguồn: files `backend_laravel/app/Models/Category.php`, `backend_laravel/database/migrations/2026_06_10_220020_create_tours_table.php`, `backend_laravel/routes/api.php`; class `Category` và migration ẩn danh; method `Category::tours`, migration `up`; routes `/api/admin/categories*` không có force-delete; models `Category`, `Tour`; migration tours.)

### Source Code Reference

- Routes: `GET|POST /api/admin/categories`, `GET /search`, `PUT|DELETE /{id}`, `GET /categories-trashed`, `PATCH /{id}/restore`.
- Controller: `Admin/CategoryController::{index,search,store,update,destroy,trashed,restore}`.
- Frontend: `TourTypeListPage`, `TourTypeCreatePage`, `TourTypeEditPage`, `TourTypeTrashPage`; category API service.
- Model: `Category`; relation `Category::tours`.
- Migrations: `2026_06_10_220000_create_categories_table.php`, `2026_07_03_112000_add_thumbnail_fields_to_categories_table.php`.

## 15. Quản lý destination

### Chức năng, actor và input

- Admin CRUD, search/filter, soft delete, trash, restore, force delete và options cho guide.
- Create backend bắt buộc name, slug unique, province_city, country.
- Search query: keyword tối đa 255, city/country tối đa 100.
- Backend update gọi `$destination->update($request->all())` và không có validation trong method.
- React form yêu cầu name/slug/province_city/country; description, thumbnail URL và status tùy chọn.

### Output, flow và exception

- List/detail trả destination; search paginate 15.
- Search không có kết quả trả `404`.
- Delete dùng soft delete; restore chỉ tìm `onlyTrashed`; force delete xóa vật lý.

### Database và business rules

- Slug unique; status/province_city indexed; soft delete. (Nguồn: file `backend_laravel/database/migrations/2026_06_10_220010_create_destinations_table.php`; class migration ẩn danh; method `up`; routes `/api/admin/destinations*`; model `Destination`; migration chính file trên; xem thêm BR-093 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Tour FK destination restrict-on-delete; guide liên kết destination qua pivot `guide_destinations`. (Nguồn: files `backend_laravel/database/migrations/2026_06_10_220020_create_tours_table.php`, `backend_laravel/database/migrations/2026_07_07_055358_create_guide_destinations_table.php`, `backend_laravel/app/Models/Guide.php`, `backend_laravel/app/Models/Destination.php`; classes migration ẩn danh, `Guide`, `Destination`; methods migration `up`, `Guide::destinations`, `Destination::guides`; route không áp dụng; models `Tour`, `Guide`, `Destination`; migrations hai file trên.)
- Vì `DestinationController::update()` gọi `$destination->update($request->all())` mà không validate và model vừa có `$guarded = ['id']` vừa có `$fillable`, không ghi nhận thêm rule update ngoài database constraints. (Nguồn: files `backend_laravel/app/Http/Controllers/Api/Admin/DestinationController.php`, `backend_laravel/app/Models/Destination.php`; classes `DestinationController`, `Destination`; method `update`; route `PUT/PATCH /api/admin/destinations/{destination}`; model `Destination`; migration `2026_06_10_220010_create_destinations_table.php`.)

### Source Code Reference

- Routes: API resource `/api/admin/destinations`, `/search`, `/trash/list`, `/{id}/restore`, `/{id}/force-delete`, `/api/admin/guides/destination-options`.
- Controller: `Admin/DestinationController::{index,show,store,update,destroy,trashed,restore,forceDelete,search,options}`.
- Frontend: `DestinationListPage`, `DestinationCreatePage`, `DestinationEditPage`, `DestinationTrashPage`; destination API service.
- Model: `Destination`.
- Migration: `2026_06_10_220010_create_destinations_table.php`.

## 16. Quản lý tour, itinerary, ảnh và rule giá tuổi

### Chức năng và actor

- Admin list/filter/detail/create/update/soft delete/hide/unhide/xem hidden/statistics.
- Public chỉ nhận tour published qua customer catalog.

### Input/validation backend

- Required create: category ID, destination ID, title tối đa 255, duration days >=1, base price numeric, max slots integer, status.
- Status: `draft`, `published`, `hidden`, `cancelled`.
- Summary tối đa 500; description nullable.
- Thumbnail/gallery: JPG/JPEG/PNG/WebP, 5.120 KB mỗi file; alt tối đa 255.
- Itinerary item: day >=1, type thuộc `departure/transport/sightseeing/meal/free_time/return`, title tối đa 255; time `H:i`; images URL tối đa 500.
- Age rule: label, min age; optional max age; pricing type `percentage/fixed/free`; price value không âm; active boolean.
- Update dùng `sometimes` cho trường chính; nếu duration days thay đổi, backend tự đặt nights = days - 1.

Frontend `TourForm` có thêm validation về title 5–180, description cho non-draft, giới hạn ngày theo category text, itinerary/thumbnail bắt buộc cho non-draft, rule tuổi không giao nhau và gallery tối đa 10. Đây là client validation, không phải toàn bộ backend rule.

### Output

- `TourResource` kèm category, destination, thumbnail, gallery, itinerary images, departures và age pricing rules.
- List admin phân trang 10; filter search/status/price trong controller.

### Flow, transaction và exception

1. Backend sinh slug từ title nếu không gửi slug; `created_by` lấy từ user đăng nhập.
2. `available_slots` mặc định bằng max slots.
3. Create transaction tạo tour, lưu ảnh, sync itinerary và age pricing rules.
4. Update transaction cập nhật tour/ảnh và chỉ sync itinerary/rules khi request có key tương ứng.
5. Hide/unhide đổi status; delete dùng soft delete.
6. React edit tải list rồi tìm ID thay vì gọi detail ID.
7. React `TourForm` luôn gửi `discount_price = 0`; đây là payload frontend quan sát được, không phải rule backend.

### Database và business rules

- `tours` FK category/destination restrict delete, creator null-on-delete; slug unique; status và base price indexed; soft delete. (Nguồn: file `backend_laravel/database/migrations/2026_06_10_220020_create_tours_table.php`; class migration ẩn danh; method `up`; routes `/api/admin/tours*`; model `Tour`; migration chính file trên.)
- `tour_images` thuộc tour; itinerary và itinerary images cascade theo migration. (Nguồn: files `backend_laravel/database/migrations/2026_06_10_220030_create_tour_images_table.php`, `backend_laravel/database/migrations/2026_06_27_000001_create_tour_itineraries_table.php`, `backend_laravel/database/migrations/2026_06_27_000002_create_tour_itinerary_images_table.php`; classes migration ẩn danh; methods `up`; routes `/api/admin/tours*`; models `TourImage`, `TourItinerary`, `TourItineraryImage`; migrations ba file trên.)
- `tour_age_pricing_rules` thuộc tour; service pricing dùng active rules. (Nguồn: files `backend_laravel/database/migrations/2026_07_03_120000_create_tour_age_pricing_rules_table.php`, `backend_laravel/app/Services/TourPricingService.php`; class migration ẩn danh và `TourPricingService`; methods migration `up`, `resolveRuleForAge`; routes booking/tour sử dụng service; models `TourAgePricingRule`, `Tour`; migration chính file trên; xem thêm BR-024 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Backend `validateAgePricingRules` kiểm tra tính hợp lệ nội bộ trước sync. (Nguồn: BR-015 tại `docs/reverse-engineering/03-business-rules-brd.md`.)

### Source Code Reference

- Routes: `/api/admin/tours`, `/hidden-list`, `/statistics`, `/{id}`, `/{id}/hide`, `/{id}/unhide`, và public `/api/tours*`.
- Controller: `Admin/TourManagerController::{index,show,publicIndex,store,update,destroy,hide,unhide,hiddenTours,statistics}`.
- Resource/service: `TourResource`, `TourPricingService`.
- Frontend: `TourListPage`, `TourCreatePage`, `TourEditPage`, `TourHiddenPage`, admin `TourDetailPage`, `TourForm`, `frontend_react/src/services/toursApi.jsx`.
- Models: `Tour`, `TourImage`, `TourItinerary`, `TourItineraryImage`, `TourAgePricingRule`.
- Migrations: `2026_06_10_220020_create_tours_table.php`, `2026_06_10_220030_create_tour_images_table.php`, `2026_06_27_000001_create_tour_itineraries_table.php`, `2026_06_27_000002_create_tour_itinerary_images_table.php`, `2026_07_03_120000_create_tour_age_pricing_rules_table.php`.

## 17. Lịch khởi hành

### Chức năng và actor

- Admin xem lịch theo tour, tạo, sửa, xóa và xem khách đã booking.
- Customer chỉ thấy departure mở, chưa qua và được phép đặt qua catalog/booking.

### Input/validation

- Create: departure date bắt buộc, từ hôm nay; total slots integer >=1; status `open/closed/completed/cancelled`.
- Base price nullable nhưng bắt buộc khi có discount; numeric không âm.
- Discount nullable, không âm và service/controller không cho lớn hơn base price.
- Update dùng `sometimes` cho field lịch, nhưng `change_reason` bắt buộc, 3–1.000 ký tự; `confirm_booked_change` nullable boolean.
- Không được giảm total slots dưới booked slots.

### Output

- List trả departure, tour, active booking count, `has_bookings`, `available_slots`.
- Create/update trả serialized departure; update trả danh sách field thay đổi và kết quả notification.
- Booked customers API trả khách theo departure.

### Flow, nhánh và exception

1. Return date tự tính bằng departure date + `tour.duration_nights`.
2. `TourDepartureMutationGuard` chặn sửa/xóa departure và cả sáu API phân công `candidates`, `autoAssign`, `assign`, `cancel`, `directCandidates`, `directAssign` nếu ngày đi `<= hôm nay`; guard ném validation `422`.
3. Các flow ghi assignment khóa departure rồi gọi lại guard trong transaction; cancel còn khóa assignment, còn `GuideAssignmentService::{autoAssign,assignSpecific}` khóa departure trước khi kiểm/tạo assignment.
4. Nếu update không làm thay đổi field, trả message không có thay đổi.
5. Departure có active booking mà chưa `confirm_booked_change` trả `409`, code `BOOKED_DEPARTURE_CONFIRMATION_REQUIRED`.
6. Khi đã xác nhận, transaction lưu lịch và gửi thông báo tới customer/guide; đồng thời tạo admin notification.
7. Delete bị từ chối `422` nếu có bất kỳ booking liên kết; nếu không, transaction tạo notification rồi xóa.

### Database và business rules

- `tour_departures` thuộc tour, ngày đi và status indexed; status gồm bốn giá trị trên. (Nguồn: file `backend_laravel/database/migrations/2026_06_10_220040_create_tour_departures_table.php`; class migration ẩn danh; method `up`; routes `/api/admin/tours/{tourId}/departures`; model `TourDeparture`; migration chính file trên; xem thêm BR-017 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- `booked_slots` mặc định 0; `available_slots` là giá trị tính từ total - booked ở response. (Nguồn: files `backend_laravel/database/migrations/2026_06_10_220040_create_tour_departures_table.php`, `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureController.php`; class migration ẩn danh và `TourDepartureController`; methods migration `up`, controller response-building trong `index/store/update`; routes `/api/admin/tours/{tourId}/departures`; model `TourDeparture`; migration chính file trên; xem thêm BR-017 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Departure có nhiều booking, assignment, review, tour review, attendance session và stage. (Nguồn: file `backend_laravel/app/Models/TourDeparture.php`; class `TourDeparture`; method `bookings()`, `guideAssignments()`, `reviews()`, `tourReviews()`, `attendanceSessions()`, `stages()`; routes departure/booking/review/guide-operation được liệt kê tại các module tương ứng; models `Booking`, `TourGuideAssignment`, `Review`, `TourReview`, `AttendanceSession`, `TourDepartureStage`; migrations `2026_06_10_220040_create_tour_departures_table.php`, `2026_06_10_220060_create_bookings_table.php`, `2026_06_28_092905_create_tour_guide_assignments_table.php`, `2026_06_10_220100_create_reviews_table.php`, `2026_07_21_000000_create_tour_reviews_table.php`, `2026_07_02_143241_create_guide_attendance_and_stage_tables.php`.)

### Source Code Reference

- Routes: `GET|POST /api/admin/tours/{tourId}/departures`, `PUT|DELETE /api/admin/tours/departures/{id}`, `GET /api/admin/tour-departures/{tourDeparture}/booked-customers`.
- Controller: `Admin/TourDepartureController::{index,store,update,destroy}`, `AdminTourDepartureBookingController::index`.
- Controllers liên quan guard phân công: `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php`; `TourDepartureGuideAssignmentController::{candidates,autoAssign,assign,cancel,directCandidates,directAssign}`; routes tương ứng dưới `/api/admin/tour-departures/{departure}`.
- Services: `TourDepartureMutationGuard::{isLocked,assertCanMutate}`, `GuideAssignmentService::{autoAssign,assignSpecific}`, `TourDepartureChangeNotificationService`, `AdminNotificationService`.
- Frontend: `TourDepartureListPage`, `TourDepartureCreatePage`, `TourDepartureEditPage`, `tourDepartureApi.js`.
- Model: `TourDeparture`.
- Migrations: `2026_06_10_220040_create_tour_departures_table.php`, `2026_07_06_000001_add_base_and_discount_price_to_tour_departures_table.php`.
- Test hậu sửa: `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php` kiểm cả sáu API trả `422` với departure khởi hành hôm nay và cancel được assignment của departure tương lai; models `TourDeparture`, `TourGuideAssignment`, `Guide`; migration assignment `2026_06_28_092905_create_tour_guide_assignments_table.php`.

## 18. Quản lý hồ sơ hướng dẫn viên

### Chức năng và actor

- Admin list/search/filter/statistics/detail/create/update, soft delete, trash, restore, force delete, upload/delete avatar và lấy account guide chưa có hồ sơ.
- Guide xem/sửa hồ sơ và đổi password.

### Input/validation

- Create: `user_id` bắt buộc, tồn tại, unique trong guide chưa xóa; experience 0–40; status `active/inactive/locked`.
- `destination_ids` bắt buộc array tối thiểu 1, từng ID distinct và tồn tại.
- Languages nullable; mỗi item yêu cầu language tồn tại, level nullable/tồn tại.
- Experiences nullable; certificate tồn tại, issued year 1900 đến năm hiện tại.
- Update dùng `sometimes`; nếu gửi destinations vẫn phải có tối thiểu 1.
- Frontend yêu cầu ít nhất một language và một certificate; backend cho phép hai array này nullable. Đây là khác biệt validation giữa UI và API.
- Guide tự cập nhật profile: `certificate_type` dùng `sometimes|string|max:100`; response `show` trả lại field này.

### Output, flow và exception

1. Create sinh guide code `HDV` + số thứ tự, transaction tạo guide và sync destinations/languages/experiences.
2. Update transaction thay basic fields và thay toàn bộ các relation được gửi.
3. Query filter theo search, status, experience, language, destination và trạng thái nghỉ.
4. Soft delete/restore/force delete có route riêng.
5. Avatar lưu/xóa trong public storage.
6. Tài khoản không có guide profile khi gọi guide profile API nhận `404`.
7. `GuideProfileController::update` đưa `certificate_type` vào dữ liệu cập nhật guide; `Guide::$fillable` cho phép ghi field này trong transaction cập nhật profile.

### Database và business rules

- `guides.user_id` FK, `guide_code` unique, soft delete; average rating/review count lưu trên guide. (Nguồn: file `backend_laravel/database/migrations/2026_06_14_145318_create_guides_table.php`; class migration ẩn danh; method `up`; routes `/api/admin/guides*`, `/api/guide/profile`; model `Guide`; migration chính file trên; xem thêm BR-092 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- `guide_destinations` là pivot guide-destination, được ánh xạ qua `Guide::destinations()` và `Destination::guides()`. App model `GuideDestination`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** vì `backend_laravel/app/Models/GuideDestination.php` khai báo class `TourGuideAssignment`. (Nguồn: files `backend_laravel/database/migrations/2026_07_07_055358_create_guide_destinations_table.php`, `backend_laravel/app/Models/Guide.php`, `backend_laravel/app/Models/Destination.php`; classes migration ẩn danh, `Guide`, `Destination`; methods migration `up`, `Guide::destinations`, `Destination::guides`; routes `/api/admin/guides*`; models hợp lệ `Guide`, `Destination`; migration pivot trên.)
- `guide_languages` unique `(guide_id, language_id)`. (Nguồn: file `backend_laravel/database/migrations/2026_06_24_042946_drop_and_recreate_guide_languages_table.php`; class migration ẩn danh; method `up`; routes `/api/admin/guides*`; models `GuideLanguage`, `Guide`, `Language`; migration chính file trên.)
- `guide_experiences` unique `(guide_id, certificate_id)`. (Nguồn: file `backend_laravel/database/migrations/2026_06_24_042950_drop_and_recreate_guide_experiences_table.php`; class migration ẩn danh; method `up`; routes `/api/admin/guides*`; models `GuideExperience`, `Guide`, `Certificate`; migration chính file trên.)
- `guides.certificate_type` là `VARCHAR(100) NULL`; migration hậu sửa khôi phục cột đã bị migration specialization loại bỏ, và `down()` xóa cột. (Nguồn: file `backend_laravel/database/migrations/2026_07_22_000000_restore_certificate_type_to_guides_table.php`; class migration ẩn danh; methods `up`, `down`; route `GET|PUT /api/guide/profile`; controller `GuideProfileController::{show,update}`; model `Guide`, thuộc tính `fillable`; test `GuideBusinessModelRegressionTest.php`.)

### Source Code Reference

- Routes: `/api/admin/guides*`, `/api/guide/profile`, `/api/guide/change-password`.
- Controllers: `Admin/GuideController::{index,search,filter,show,store,update,destroy,trashed,restore,forceDelete,statistics,availableUsers,uploadAvatar,deleteAvatar}`; `backend_laravel/app/Http/Controllers/Api/Guide/GuideProfileController.php`, `GuideProfileController::{show,update,changePassword}`.
- Frontend: `GuideManagementPage.jsx`, `GuideTrashPage.jsx`, `GuideProfilePage.jsx`; guide/admin API services.
- Models hợp lệ: `Guide`, `GuideLanguage`, `GuideExperience`, `User`, `Destination`, `Language`, `Certificate`. Pivot `guide_destinations` dùng `Guide::destinations()`/`Destination::guides()`; App model `GuideDestination`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** vì file `backend_laravel/app/Models/GuideDestination.php` khai báo class `TourGuideAssignment`.
- Migrations: `2026_06_14_145318_create_guides_table.php`, `2026_06_27_143013_add_specialization_id_to_guides_table.php`, `2026_07_22_000000_restore_certificate_type_to_guides_table.php`, `2026_07_07_055358_create_guide_destinations_table.php`, `2026_06_24_042946_drop_and_recreate_guide_languages_table.php`, `2026_06_24_042950_drop_and_recreate_guide_experiences_table.php`.
- Test hậu sửa: `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php` kiểm `PUT`/`GET /api/guide/profile` round-trip 100 ký tự và từ chối 101 ký tự với `422`.

## 19. Phân công và yêu cầu thay hướng dẫn viên

### Chức năng và actor

- Admin xem planning, candidates, tự động phân công, phân công cụ thể/trực tiếp và hủy assignment.
- Guide gửi yêu cầu thay thế trên departure được phân công; admin duyệt hoặc từ chối.

### Input/validation

- Planning: from/to, tour ID, per page 1–100.
- Assign: guide ID bắt buộc/tồn tại.
- Direct candidates: mode `eligible/all`, keyword, from/to, destination, language IDs và pagination.
- Direct assign: guide ID và `force_area_mismatch` boolean.
- Replacement request: reason bắt buộc 10–2.000; evidence nullable JPG/JPEG/PNG/WebP/PDF, tối đa 5.120 KB.
- Admin approve/reject: admin note nullable tối đa 2.000.

### Output

- Planning trả departure, destinations, assigned guide và trạng thái khả dụng.
- Candidates trả guide phù hợp hoặc toàn bộ kèm conflict/leave/area flags.
- Assignment trả record; replacement trả request/status và notification được sinh cho liên quan.

### Flow và business rules

Departure mutation guard:

1. `candidates`, `autoAssign`, `assign`, `cancel`, `directCandidates` và `directAssign` đều gọi `TourDepartureMutationGuard::assertCanMutate`; departure có ngày khởi hành `<= hôm nay` bị từ chối `422` trước khi trả candidates hoặc thay đổi assignment.
2. `GuideAssignmentService::{autoAssign,assignSpecific}`, controller `cancel` và `directAssign` khóa departure rồi gọi lại guard trong transaction; cancel còn khóa assignment trước khi xóa.

Eligible/auto assignment:

1. Guide phải active, có user và phụ trách toàn bộ destination của tour. (Nguồn: BR-053 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
2. Không được trùng assignment active; mặc định cần một ngày nghỉ giữa hai tour từ config `tour.guide_rest_days`, default 1. (Nguồn: BR-054 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
3. Không được trùng leave pending/approved ở các nhánh có kiểm tra leave. (Nguồn: BR-059 tại `docs/reverse-engineering/03-business-rules-brd.md`; với strict/auto, source `GuideAssignmentService::eligibleGuidesQuery` tại BR-054.)
4. Auto assign ưu tiên tổng ngày tour thấp hơn, rồi số tour, lần phân công gần nhất, kinh nghiệm và ID. (Nguồn: BR-055 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
5. Assignment unique theo guide + departure. (Nguồn: file `backend_laravel/database/migrations/2026_06_28_092905_create_tour_guide_assignments_table.php`; class migration ẩn danh; method `up`; routes assignment admin; models `TourGuideAssignment`, `Guide`, `TourDeparture`; migration chính file trên.)

Direct assignment:

1. Luôn chặn xung đột lịch và đơn nghỉ. (Nguồn: BR-059 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
2. Lệch khu vực bị chặn trừ khi `force_area_mismatch = true`. (Nguồn: BR-059 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
3. React direct assignment hiện gửi `force_area_mismatch: true`, nên UI chủ động bỏ qua nhánh chặn lệch khu vực nhưng backend vẫn có rule. (Nguồn frontend: files `frontend_react/src/pages/admin/tourDepartures/GuideAssignmentPage.jsx`, `frontend_react/src/services/tourDepartureApi.js`; component `GuideAssignmentPage`; method `tourDepartureApi.directAssignGuide`; route API `POST /api/admin/tour-departures/{departure}/direct-assign-guide`; nguồn backend: BR-059 tại `docs/reverse-engineering/03-business-rules-brd.md`; models `Guide`, `TourGuideAssignment`; migrations assignments/guide destinations.)
4. Cancel assignment gọi `delete()`; model không dùng `SoftDeletes`, nên xóa vật lý record. (Nguồn: BR-061 tại `docs/reverse-engineering/03-business-rules-brd.md`.)

Replacement:

1. Guide phải có assignment không cancelled trên departure. (Nguồn: BR-072 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
2. Yêu cầu phải gửi trước ngày đi ít nhất 5 ngày; quá muộn trả `422`. (Nguồn: BR-072 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
3. Mỗi guide/departure chỉ có một request pending; trùng trả `409`. (Nguồn: BR-072 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
4. Admin chỉ xử lý request pending; đã xử lý trả `409`. (Nguồn: BR-073 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
5. Approve tự tìm guide active, không trùng lịch, ít assignment hơn; không tìm được trả `422`. (Nguồn: BR-073 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
6. Transaction hủy assignment cũ, tạo assignment mới, cập nhật request và gửi notification. (Nguồn: BR-073 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
7. `GuideTourController::requestReplacement` khóa departure và assignment, rồi tái kiểm tra request pending bằng locking read; nếu không tạo được request hoặc transaction ném exception, evidence vừa lưu được xóa khỏi disk `public`.
8. `AdminGuideReplacementRequestController::{approve,reject}` cùng khóa departure rồi khóa request, đọc lại state `pending`; approve/reject cạnh tranh chỉ một action ghi được, action stale trả `409`. Assignment, replacement request và notification nằm trong transaction của action thắng.

### Database

- `tour_guide_assignments`: guide, departure, role, status, assigned by/time, note; unique guide+departure.
- `guide_replacement_requests`: departure, current/replacement guide, requester/reviewer, reason/evidence/status/note/time.

### Source Code Reference

- Routes: `/api/admin/tour-departures/guide-planning`, candidates/assign/auto/direct/cancel; `/api/guide/tours/{tourDeparture}/replacement-requests`; `/api/admin/guide-replacement-requests*`.
- Controllers: `TourDepartureGuideAssignmentController::{planning,candidates,autoAssign,assign,cancel,directCandidates,directAssign}`, `GuideTourController::{requestReplacement,replacementRequestStatus}`, `AdminGuideReplacementRequestController::{index,approve,reject}`.
- Services: `backend_laravel/app/Services/GuideAssignmentService.php`, `GuideAssignmentService::{eligibleGuidesQuery,autoAssign,assignSpecific}`; `backend_laravel/app/Services/TourDepartureMutationGuard.php`, `TourDepartureMutationGuard::{isLocked,assertCanMutate}`.
- Frontend: `TourDepartureListPage` và assignment components/services; guide tour replacement UI/service.
- Models: `TourGuideAssignment`, `Guide`, `TourDeparture`.
- Bảng `guide_replacement_requests` được `GuideTourController` và `AdminGuideReplacementRequestController` thao tác bằng `DB::table`; App model `GuideReplacementRequest`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- Migrations: `2026_06_28_092905_create_tour_guide_assignments_table.php`, `2026_07_07_080821_add_assignment_fields_to_tour_guide_assignments_table.php`, `2026_07_12_000000_create_guide_replacement_requests_table.php`.
- Tests hậu sửa: `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php` kiểm sáu API guard, future cancel, một request pending và stale approve/reject; `backend_laravel/tests/Feature/BusinessModelConcurrencyMysqlTest.php` kiểm hai create replacement nhận `201 + 409` và approve đối đầu reject nhận `200 + 409`.

## 20. Không gian hướng dẫn viên, điểm danh và tiến độ tour

### Chức năng và actor

- Guide xem dashboard, list upcoming/ongoing/completed, detail tour và khách của tour được phân công.
- Guide tạo session điểm danh ngày đi/ngày về, check-in/check-out, ghi chú/trạng thái vắng và chuyển stage.
- Tất cả route yêu cầu `role:tour guide`; service còn xác minh guide profile và assignment không cancelled.

### Input/validation

- Customer list: keyword tối đa 100; status `checked_in/not_checked_in/absent/checked_out`; session/boundary; per page 1–100.
- Create session: boundary bắt buộc `departure/return`.
- Check-in/out: participant ID bắt buộc, tồn tại.
- Note: participant ID; note nullable tối đa 1.000; status tùy chọn `not_checked_in/absent`.

### Output

- Overview/tour detail, customer paginator/detail, attendance statistics và sessions.
- Attendance resource chứa check-in/out user/time/status/note.
- Stage list/current stage theo itinerary.

### Flow, transaction và exception

1. Chỉ guide được assignment vào departure mới được đọc/thao tác; sai assignment phát sinh authorization exception.
2. Chỉ departure đang diễn ra được điểm danh: không completed/cancelled và hôm nay nằm trong departure-return range.
3. Session departure chỉ tạo/dùng đúng ngày đi; return chỉ đúng ngày về.
4. Unique departure + boundary và `firstOrCreate` bảo đảm tối đa một session mỗi boundary.
5. Check-in khóa session/attendance; đã check-in trả validation error.
6. Check-out yêu cầu đã check-in và chưa check-out.
7. Participant phải thuộc booking của đúng departure.
8. Không được đặt status vắng/chưa check-in sau khi đã check-in.
9. Stage được tạo từ itinerary khi chưa có; advance transaction hoàn thành stage hiện tại và kích hoạt stage kế tiếp; qua stage cuối bị từ chối.

### Database và UI gap

- `attendance_sessions`: departure, boundary, status, creator; unique `(tour_departure_id,boundary)`.
- `attendances`: unique session+participant; timestamps/users cho check-in/out/note.
- `tour_departure_stages`: departure + itinerary, order/status/time; departure giữ `current_stage_id`.
- Backend có check-out và stage APIs. React `GuideAttendancePage` đã đọc không import/gọi check-out; UI cũng không thể hiện đầy đủ stage flow trong inventory frontend.
- Route React `/guide/attendance/:tourId` tồn tại nhưng page không đọc URL param và tự chọn tour ongoing đầu tiên.

### Source Code Reference

- Routes: `/api/guide/dashboard`, `/api/guide/tours*`, `/overview`, `/customers`, `/attendance/*`, `/stages*`.
- Controllers: `GuideDashboardController::show`, `GuideTourController::{index,upcoming,ongoing,completed,show}`, `GuideAttendanceController::{overview,customers,statistics,sessions,showCustomer,storeSession,checkIn,checkOut,updateNote,stages,advanceStage}`.
- Requests: `GuideTourCustomerIndexRequest`, `AttendanceSessionQueryRequest`, `StoreAttendanceSessionRequest`, `AttendanceActionRequest`, `UpdateAttendanceNoteRequest`.
- Service: `GuideTourOperationService`.
- Frontend: `GuideDashboardPage`, `GuideToursPage`, `GuideAttendancePage`, guide APIs.
- Models: `AttendanceSession`, `Attendance`, `BookingParticipant`, `TourDepartureStage`.
- Migrations: `2026_07_02_143241_create_guide_attendance_and_stage_tables.php`, `2026_07_18_000000_add_boundary_to_attendance_sessions_table.php`.

## 21. Đơn xin nghỉ hướng dẫn viên

### Chức năng và actor

- Guide list/summary/create/cancel đơn của mình.
- Admin list/filter/summary/detail/approve/reject/update decision.

### Input/validation

- Guide create: start date từ ít nhất 5 ngày sau; end >= start; reason 10–2.000; evidence array tối đa 8; mỗi file JPG/JPEG/PNG/WebP/PDF, 5.120 KB.
- Guide cancel chỉ nhận `cancel_reason` qua input nhưng controller không khai báo validation cho field này.
- Admin decision: status `approved/rejected`; admin note nullable tối đa 2.000.
- List filter guide/admin xử lý status, date/month/year/search/leave state; không thấy FormRequest validation riêng cho các query này.

### Flow, state và exception

1. Create từ guide profile, cấm khoảng ngày giao với đơn pending/approved; giao nhau trả `422`.
2. Transaction tạo request khóa row `guides` trước, sau đó tái kiểm tra leave `pending/approved` giao nhau bằng locking read; chỉ khi không giao nhau mới tạo request pending, attachments và notification admin.
3. Guide cancel khóa lại row `guide_leave_requests`, kiểm tra lại quyền sở hữu và state `pending` trong transaction; khác trạng thái trả `422`.
4. Admin approve/reject/update decision cũng khóa cùng leave row trong transaction rồi mới kiểm tra state/ngày và cập nhật; row đã được guide chuyển sang `cancelled` hoặc đã hết kỳ nghỉ bị trả `422`, không bị decision dựa trên route-model binding cũ ghi đè.
5. Admin không xử lý request cancelled.
6. Admin không đổi quyết định khi end date đã qua.
7. Approve/reject lưu admin, note, reviewed time và gửi notification cho guide/admin.
8. Trạng thái: `pending`, `approved`, `rejected`, `cancelled`; UI còn suy ra leave state `upcoming/current/expired` từ ngày.

### Database

- `guide_leave_requests` có soft delete, FK guide/user/admin, indexes guide+status, date range, status+created.
- Attachments cascade theo request.

### Source Code Reference

- Routes: `/api/guide/leave-requests*`, `/api/admin/guide-leave-requests*`.
- Controllers: `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php`, `GuideLeaveRequestController::{index,summary,store,cancel}`; `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideLeaveRequestController.php`, `AdminGuideLeaveRequestController::{index,summary,show,approve,reject,updateDecision,updateStatus}`.
- Frontend: guide leave widget/components/services và guide management leave panel/services.
- Model: `GuideLeaveRequest`, `GuideLeaveRequestAttachment`.
- Migration: `2026_07_13_000000_create_guide_leave_requests_tables.php`.
- Tests hậu sửa: `backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php` kiểm overlap, stale cancel/admin decision; `backend_laravel/tests/Feature/BusinessModelConcurrencyMysqlTest.php` kiểm create đồng thời nhận `201 + 422` và cancel đối đầu approve nhận `200 + 422`.

## 22. Quản lý nhân viên hỗ trợ và không gian support

### Chức năng và actor

- Admin list/filter/statistics/create/detail/update, soft delete, trash, restore, force delete và avatar support staff.
- Support staff xem/sửa profile, đổi password, xử lý tickets và notifications.

### Input/validation admin

- Create: user ID bắt buộc/tồn tại; specialization trong tập hằng controller; experience 0–40; role string; status trong tập hằng; performance rating 0–5.
- User được chọn phải có role `support staff` và chưa có hồ sơ hoàn chỉnh.
- Update dùng `sometimes`; user ID unique trong support staff chưa xóa.
- Avatar JPG/JPEG/PNG/WebP tối đa 2.048 KB.

### Output, flow và exception

1. Create lấy name/email từ user, không tin giá trị nhập riêng; profile cũ soft-deleted có thể được restore và hoàn thiện.
2. Status hidden set `hidden_at`; status khác xóa thời điểm này.
3. Soft-delete/restore/force-delete có route riêng.
4. Support profile update đồng bộ name/email/status sang user và `support_staff`.
5. React `/support/work-schedule` có page/menu nhưng không tìm thấy route/controller API lịch làm việc support.

### Database và business rules

- `support_staff.user_id` liên kết user; bảng có soft delete, status, specialization, experience và performance rating. (Nguồn: files `backend_laravel/database/migrations/2026_06_22_032814_create_support_staff_table.php`, `backend_laravel/database/migrations/2026_07_01_000001_add_user_id_to_support_staff_table.php`, `backend_laravel/database/migrations/2026_07_04_000001_add_specialization_and_experience_years_to_support_staff_table.php`; classes migration ẩn danh; methods `up`; routes `/api/admin/support-staff*`; models `SupportStaff`, `User`; migrations ba file trên; xem thêm BR-092 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- Status backend admin theo `SupportStaffController::STATUSES`; migration/comment thể hiện `active/inactive/hidden`. (Nguồn: files `backend_laravel/app/Http/Controllers/Api/Admin/SupportStaffController.php`, `backend_laravel/database/migrations/2026_06_22_032814_create_support_staff_table.php`; class `SupportStaffController` và migration ẩn danh; constant `STATUSES`, methods `store`, `update`, migration `up`; routes `/api/admin/support-staff*`; model `SupportStaff`; migration trên.)

### Source Code Reference

- Routes: `/api/admin/support-staff*`, `/api/support/profile`, `/api/support/change-password`, support request/notification routes.
- Controllers: `Admin/SupportStaffController`, `Support/SupportProfileController`, `SupportRequestController`, `SupportNotificationController`.
- Frontend: `SupportStaffManagementPage`, `SupportStaffTrashPage`, `SupportDashboardPage`, `SupportProfilePage`, `SupportRequestsPage`, `SupportNotificationsPage`, `SupportWorkSchedulePage`.
- Model: `SupportStaff`, `User`.
- Migrations: `2026_06_22_032814_create_support_staff_table.php`, `2026_07_01_000001_add_user_id_to_support_staff_table.php`, `2026_07_04_000001_add_specialization_and_experience_years_to_support_staff_table.php`.

## 23. Ngôn ngữ, cấp độ và chứng chỉ

### Chức năng và actor

- Admin CRUD language, CRUD level theo language, CRUD certificate.
- Dữ liệu được dùng khi tạo/cập nhật guide.

### Input/validation

- Language name bắt buộc, unique, tối đa 100; create có thể kèm array levels, mỗi level tối đa 20.
- Level name bắt buộc, tối đa 20, không trùng trong cùng language theo closure validation.
- Certificate name bắt buộc, unique, tối đa 150; `issued_by` nullable tối đa 150.

### Flow, exception và database

- Create language + levels dùng begin/commit; exception rollback và trả `500`.
- Xóa language cascade levels.
- Không được xóa certificate đang có guide sử dụng; trả `422`.
- `languages.name` unique; `language_levels.language_id` cascade.
- `certificates.name` unique; guide relation qua `guide_experiences`.

### Frontend discrepancy

- Form certificate frontend đã kiểm tra yêu cầu `issued_by`, nhưng backend cho phép nullable. Rule có hiệu lực ở API là backend nullable.

### Source Code Reference

- Routes: `/api/admin/languages*`, nested `/levels*`, `/api/admin/certificates*`.
- Controllers: `LanguageController::{index,show,store,update,destroy,levels,storeLevel,updateLevel,destroyLevel}`, `CertificateController::{index,show,store,update,destroy}`.
- Frontend: `LanguageManagementPage.jsx`, `CertificateManagementPage.jsx` và API services.
- Models: `Language`, `LanguageLevel`, `Certificate`, `GuideLanguage`, `GuideExperience`.
- Migrations: `2026_06_24_042942_create_languages_table.php`, `2026_06_24_042945_create_language_levels_table.php`, `2026_06_24_042945_create_certificates_table.php`.

## 24. Settings và widgets/banner

### Chức năng và actor

- Admin đọc/cập nhật settings theo nhóm system/security/notification/locale/payment/backup.
- Public chỉ đọc `Setting::PUBLIC_KEYS`.
- Admin CRUD/toggle widget; public lấy widget visible.

### Input/validation settings

- Chỉ key trong `Setting::ALLOWED_KEYS` được xử lý.
- Security: password min 6–32; session timeout 15–10.080; boolean 2FA/remember.
- Locale: language `vi/en`; timezone `Asia/Ho_Chi_Minh/Asia/Bangkok/UTC`; date format; currency `VND/USD`.
- Payment gateway `vnpay/momo/zalopay/cash`; VAT 0–100; invoice prefix tối đa 20.
- Backup frequency `daily/weekly/monthly`; time `H:i`; retention >=1.
- Email/URL/text fields có max/email validation như `SettingController::update`.

Widget:

- Title/type bắt buộc; type `image/html`.
- Image URL bắt buộc khi image; HTML content bắt buộc khi html.
- Position và display pages theo constants `Banner`.
- Date end >= start; status active/inactive; sort >=0.

### Output, flow và database

- Settings lưu từng key bằng `updateOrCreate`, group được suy ra từ key.
- Public không trả security/payment/backup keys ngoài `PUBLIC_KEYS`.
- Widget visible phải active, start date chưa sau hiện tại và end date chưa qua.
- `settings.key` unique, group indexed.
- `banners` được mở rộng để lưu type/position/pages/order/date/status; `image_url` là `VARCHAR(500) NULL`, cho phép widget `html` không có ảnh. Migration rollback đổi các giá trị `NULL` thành chuỗi rỗng trước khi khôi phục `NOT NULL`.

### UI status

- React có route settings theo từng nhóm và save qua settings API.
- Backend widget CRUD tồn tại; không thấy route React admin chuyên cho widgets trong `AppRoutes`.

### Source Code Reference

- Routes: `GET|PUT /api/admin/settings`, `GET /api/settings/public`, CRUD `/api/admin/widgets`, `PATCH /toggle-status`, `GET /api/widgets`.
- Controllers: `SettingController::{index,update}`, `PublicSettingController::show`, `backend_laravel/app/Http/Controllers/Api/Admin/WidgetController.php`, `WidgetController::{index,store,show,update,destroy,toggleStatus,rules,payload}`, `PublicWidgetController::index`.
- Frontend: settings pages, `SettingsDetailPage.jsx`, `frontend_react/src/services/adminSettingService.js`; `BrandLogo`, public layout.
- Models: `Setting`, `Banner`.
- Migrations: `2026_06_13_000001_create_settings_table.php`, `2026_06_10_220190_create_banners_table.php`, `2026_06_13_000002_add_widget_columns_to_banners_table.php`, `2026_07_22_000000_make_banner_image_url_nullable.php` (`up` nullable; `down` backfill rồi `NOT NULL`).
- Test hậu sửa: `backend_laravel/tests/Feature/BusinessModelAuditBugFixTest.php` kiểm `POST /api/admin/widgets` tạo HTML widget không ảnh và rollback giữ lại row; model `Banner`.

## 25. Sao lưu database

### Chức năng và actor

- Admin list, tạo, tải và xóa SQL backup.
- Command tạo backup thủ công hoặc scheduled; scheduler kiểm tra mỗi phút.

### Input, output và flow

- Filename phải khớp `vivugo-backup-YYYYMMDD-HHMMSS.sql`.
- Chỉ hỗ trợ connection MySQL/MariaDB; driver khác trả lỗi `422` khi gọi API create.
- Service chạy `mysqldump`, timeout 300 giây, truyền password qua `MYSQL_PWD`.
- Tạo xong prune file cũ theo `backup_retention_days`.
- Scheduled backup chỉ chạy khi `auto_backup_enabled`, đúng kỳ daily/weekly/monthly, qua backup_time và kỳ đó chưa chạy; cache lưu kỳ gần nhất.
- Output list gồm filename, size, created_at; download trả file SQL.

### Database/NFR

- Backup lưu ở `storage/app/backups`, không lưu record database.
- Command scheduled dùng cache để tránh chạy lặp cùng kỳ.
- `mysqldump --single-transaction` là bằng chứng về chế độ dump; không đồng nghĩa toàn ứng dụng có rollback backup.

### Source Code Reference

- Routes: `GET|POST /api/admin/backups`, `GET /{filename}/download`, `DELETE /{filename}`.
- Controller/service: `DatabaseBackupController`, `DatabaseBackupService`.
- Command/scheduler: `DatabaseBackupCommand::handle`, `backend_laravel/routes/console.php`.
- Frontend: `frontend_react/src/pages/admin/settings/BackupSettingsPage.jsx` chỉ render `SettingsDetailPage` cho section `backup`; `frontend_react/src/services/adminSettingService.js` chỉ gọi `GET|PUT /api/admin/settings`. **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về service/lời gọi React tới `/api/admin/backups*`.
- Model/migration: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; module dùng filesystem và settings.
- Tests: `DatabaseBackupApiTest.php`, `BackupSettingsTest.php`.

## 26. Loại dịch vụ

### Chức năng, actor và trạng thái UI

- Backend admin có CRUD API resource service categories.
- React có service và các component trong `components/admin/serviceCategories`, nhưng không có page/route/sidebar entry trong `AppRoutes`/`AdminSidebar`.
- Kết luận: backend đã có API; component frontend chưa được nối thành màn hình truy cập chuẩn.

### Input/validation và output

- List: search tối đa 255, status boolean, page >=1, per page 1–100.
- Create/update: name bắt buộc, unique, tối đa 255; description nullable; status boolean bắt buộc.
- Output chuẩn hóa `success`, `message`, resource và pagination.

### Flow, database và business rules

- Model tự sinh slug unique khi create và đổi name; kiểm tra cả soft-deleted rows. (Nguồn: file `backend_laravel/app/Models/ServiceCategory.php`; class `ServiceCategory`; methods `booted`, `generateUniqueSlug`; routes `/api/admin/service-categories`; model `ServiceCategory`; migration `2026_07_03_031102_create_service_categories_table.php`.)
- CRUD service không transaction; delete dùng soft delete. (Nguồn: files `backend_laravel/app/Services/ServiceCategoryService.php`, `backend_laravel/app/Models/ServiceCategory.php`; classes `ServiceCategoryService`, `ServiceCategory`; methods CRUD service/trait `SoftDeletes`; routes `/api/admin/service-categories`; model `ServiceCategory`; migration `2026_07_03_031102_create_service_categories_table.php`; xem thêm BR-093 tại `docs/reverse-engineering/03-business-rules-brd.md`.)
- `service_categories`: name/slug unique, status và created_at indexed, soft delete. (Nguồn: file `backend_laravel/database/migrations/2026_07_03_031102_create_service_categories_table.php`; class migration ẩn danh; method `up`; routes `/api/admin/service-categories`; model `ServiceCategory`; migration chính file trên.)

### Source Code Reference

- Route: API resource `/api/admin/service-categories`.
- Controller: `Admin/ServiceCategoryController::{index,store,show,update,destroy}`.
- Requests/service/resource: `IndexServiceCategoryRequest`, `StoreServiceCategoryRequest`, `UpdateServiceCategoryRequest`, `ServiceCategoryService`, `ServiceCategoryResource`.
- Frontend: `frontend_react/src/services/serviceCategoryApi.js`, `frontend_react/src/components/admin/serviceCategories/*`; không có route trong `AppRoutes.jsx`.
- Model/migration: `ServiceCategory`; `2026_07_03_031102_create_service_categories_table.php`.
- Test: `backend_laravel/tests/Feature/ServiceCategoryApiTest.php`.

## 27. Artifacts dữ liệu chưa hình thành module end-to-end có thể xác minh

Các migration/seeder sau tồn tại, nhưng không tìm thấy chuỗi đầy đủ `route -> controller/service -> UI` trong source đã đối chiếu:

| Artifact | Bằng chứng có | Phần không có bằng chứng end-to-end |
| --- | --- | --- |
| Promotions | `2026_06_10_220050_create_promotions_table.php`, `2026_06_10_220150_create_promotion_usages_table.php`, `backend_laravel/database/seeders/PromotionSeeder.php`; booking có nullable promotion_id | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về API/UI áp dụng mã promotion trong booking customer; controller còn đặt promotion null |
| Refund requests | `2026_06_10_220160_create_refund_requests_table.php` | Không thấy route/controller/UI xử lý yêu cầu hoàn tiền; admin payment chỉ đổi status refunded |
| Support tickets/messages cũ | `2026_06_10_220170_create_support_tickets_table.php`, `2026_06_10_220180_create_support_messages_table.php` | Luồng đang dùng `support_requests`; không thấy route active cho hai bảng cũ |
| Blogs | `2026_06_10_220120_create_blogs_table.php` | Không thấy route/controller/page blog |
| Partners/services | `2026_06_25_075330_create_partner_service_types_table.php`, `2026_06_25_075333_create_partners_table.php`, `2026_06_25_081004_create_partner_services_table.php`; demo seeder/test tồn tại | Không thấy route/controller/frontend module active trong `routes/api.php` đã đối chiếu |
| System logs | `2026_06_10_220140_create_system_logs_table.php`; demo seeder ghi dữ liệu | Không thấy API/UI xem audit/system log |

Không biến các artifacts trên thành yêu cầu nghiệp vụ vì chưa có bằng chứng xử lý đầy đủ.

## 28. Module coverage và gap chính

### Module đã phủ end-to-end trong tài liệu

1. Authentication/RBAC/profile.
2. Public catalog/tour search/home.
3. Wishlist.
4. Booking/pricing/contact/participants.
5. VNPAY/payment.
6. Tour review.
7. Guide review.
8. Customer support.
9. Chat AI.
10. Notification.
11. Dashboard/report.
12. User management.
13. Category.
14. Destination.
15. Tour/itinerary/image/age pricing.
16. Departure.
17. Guide profile management.
18. Assignment/replacement.
19. Guide attendance/stage.
20. Guide leave.
21. Support staff.
22. Languages/levels/certificates.
23. Settings/widgets.
24. Backup.
25. Service categories.

### Gap frontend-backend chính

- Tour review: backend đầy đủ, React chưa có customer modal/list/admin page/sidebar/API service.
- Home review: backend `/home` đã trả public tour reviews, React section bị comment.
- Forgot password: backend có OTP/reset APIs, React là placeholder.
- Guide history: backend có `/guide/tour-history` và có `GuideHistoryPage.jsx`, router lại render `GuideComingSoonPage`.
- Guide customers/messages: route React render trang trống; backend có customer-per-tour nhưng không có module messages guide tương ứng.
- Attendance: backend có check-out/stages; UI attendance chưa gọi check-out theo source frontend đã kiểm tra.
- Service categories: backend và component/service tồn tại, chưa có route/page/menu React.
- Support work schedule: React có menu/page, không thấy backend route/controller.
- Destinations customer page dùng dữ liệu demo dù catalog API tồn tại.
- Guide review modal từ `ProfileDashboard` truyền props không khớp component.
- Chat browser session ID không được gửi qua customer API service.

### Điểm chưa xác minh trong phạm vi module analysis

- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về SLA xử lý ticket, SLA thanh toán hoặc thời gian admin kiểm duyệt review.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về audit log thống nhất cho mọi thao tác; chỉ có các bảng/history/notification riêng lẻ và artifact `system_logs` chưa có API.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về quy trình kế toán sau khi admin đặt payment thành refunded.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về chính sách hoàn/hủy tour theo từng sản phẩm; customer UI có nội dung chung nhưng không có domain policy/service riêng.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về moderation đánh giá hướng dẫn viên bởi admin.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về chức năng xóa tour review hoặc admin sửa nội dung review.
