# Software Requirements Specification (SRS)

## 1. Mục đích và nguyên tắc truy vết

Tài liệu này đặc tả lại hành vi đang có của hệ thống từ source code. Đây không phải tài liệu đề xuất tính năng mới. Mọi yêu cầu bên dưới chỉ mô tả route, controller, service, model, migration, frontend hoặc test đã tìm thấy.

- **[Suy luận từ source code]**: kết luận được tổng hợp từ nhiều đoạn source nhưng không có tuyên bố nghiệp vụ trực tiếp.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**: không có đủ source để xác nhận hành vi.
- Danh mục API đầy đủ xem tại [08-api-specification.md](./08-api-specification.md).
- Thiết kế dữ liệu đầy đủ xem tại [07-database-erd.md](./07-database-erd.md).
- State machine và quy trình liên module xem tại [06-process-and-state-diagrams.md](./06-process-and-state-diagrams.md).

## 2. Phạm vi và bối cảnh hệ thống

**[Suy luận từ source code]** Hệ thống là nền tảng đặt tour du lịch gồm catalog công khai, booking/thanh toán, vận hành hướng dẫn viên, hỗ trợ khách hàng và các chức năng quản trị. Backend là Laravel 12/PHP; frontend là React; API xác thực bằng Laravel Sanctum. Bằng chứng: `backend_laravel/composer.json`, `backend_laravel/routes/api.php`, `backend_laravel/bootstrap/app.php`, `frontend_react/package.json`, `frontend_react/src/services/apiClient.js`.

### 2.1 Actor có bằng chứng

| Actor | Bằng chứng trực tiếp |
| --- | --- |
| Guest | Các route công khai trong `backend_laravel/routes/api.php` không gắn `auth:sanctum`. |
| Customer | Nhóm middleware `['auth:sanctum', 'role:customer']`. |
| Tour guide | Nhóm middleware `['auth:sanctum', 'role:tour guide']`. |
| Support staff | Nhóm middleware `['auth:sanctum', 'role:support staff']`. |
| Admin | Nhóm prefix `admin` với middleware `['auth:sanctum', 'role:admin']`. |
| VNPAY | Callback công khai `GET /api/webhooks/vnpay` và `GET /api/vnpay/return-status`. |
| Gemini API | `ChatBotController::callGemini()` gửi HTTP request tới endpoint cấu hình Gemini. |
| **[Suy luận từ source code]** Ngữ cảnh thực thi Scheduler/CLI | `backend_laravel/routes/console.php` lập lịch ba Artisan command; source không xác định một actor con người riêng cho ngữ cảnh này. |

### 2.2 External interface

| Giao diện | Dữ liệu/giao thức có bằng chứng | Source Code Reference |
| --- | --- | --- |
| REST API | HTTP/JSON; một số endpoint upload dùng `multipart/form-data`; Bearer token được frontend gắn vào Axios. | `backend_laravel/routes/api.php`; `frontend_react/src/services/apiClient.js`; các controller/request được dẫn trong từng FR. |
| VNPAY | Redirect URL, return URL và IPN qua query string; chữ ký HMAC được kiểm tra trước khi xử lý kết quả. | `backend_laravel/app/Services/VnpayService.php`; `backend_laravel/app/Http/Controllers/Api/Customer/VnpayPaymentController.php`. |
| Gemini | HTTP POST bằng Laravel HTTP client, timeout 15 giây; API key/model/base URL lấy từ config. | `backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php`; `backend_laravel/config/services.php`. |
| File storage | Avatar, ảnh, tệp hỗ trợ/evidence lưu qua Storage; backup SQL được quản lý trong storage backup. | Các controller upload được dẫn trong FR-001, FR-008, FR-013, FR-017, FR-020, FR-021; `DatabaseBackupService.php`. |
| Web UI | React Router và các service Axios gọi backend API. | `frontend_react/src/App.jsx`; `frontend_react/src/services/apiClient.js`; các page/service trong `frontend_react/src`. |

## 3. Functional Requirements

### FR-001 — Xác thực, RBAC và hồ sơ

- **Actor:** Guest; user đã xác thực; Customer; Tour guide; Support staff; Admin.
- **Trigger:** Actor gửi yêu cầu đăng ký, đăng nhập, đăng xuất, lấy thông tin hiện tại, quên/đặt lại mật khẩu, xem/cập nhật hồ sơ hoặc đổi mật khẩu.
- **Preconditions:** Đăng ký/đăng nhập/quên mật khẩu không yêu cầu token; logout và hồ sơ yêu cầu Sanctum; hồ sơ theo vai trò còn yêu cầu middleware role tương ứng; đăng nhập chỉ tiếp tục khi user có `status = active`.
- **Main Flow:** Register xác thực input, tìm role `customer`, hash mật khẩu, tạo user/token và trả `201`; login tìm user theo email hoặc phone, kiểm tra hash/trạng thái, tạo token với thời hạn từ setting; các API hồ sơ đọc hoặc cập nhật user/profile; đổi mật khẩu xác minh mật khẩu cũ rồi hash mật khẩu mới; forgot-password sinh OTP và reset-password xác minh OTP trước khi đổi mật khẩu.
- **Alternative Flow:** Login hỗ trợ `identifier` hoặc fallback từ field `email`; tùy chọn `remember` áp dụng thời hạn dài hơn khi setting cho phép; mỗi vai trò sử dụng controller hồ sơ riêng; `/api/auth/me` dùng closure còn `/api/user` gọi `AuthController::me`.
- **Exception Flow:** Login sai trả `401`; user không active trả `403`; middleware auth trả `401`; mật khẩu cũ sai trả `400` ở customer hoặc `422` ở support; lỗi validation trả `422`.
- **Database:** Read — `users`, `roles`, `settings`, token/OTP; Insert — `users`, `personal_access_tokens`; Update — hồ sơ, mật khẩu, OTP của `users`; Delete — token hiện tại khi logout.
- **Validation:** Register yêu cầu `full_name`, email/phone unique, password confirmed và đạt `Setting::password_min_length` (mặc định 8); login yêu cầu identifier/password; profile và password dùng rule cụ thể tại từng controller; avatar customer giới hạn JPG/JPEG/PNG/WebP và 5.120 KB.
- **Authorization:** `auth:sanctum` cho API cần đăng nhập; `role:customer`, `role:tour guide`, `role:support staff`, `role:admin` cho hồ sơ tương ứng.
- **API:** `POST /api/auth/register`; `POST /api/auth/login`; `POST /api/auth/logout`; `GET /api/auth/me`; `GET /api/user`; `POST /api/forgot-password`; `POST /api/reset-password`; các route `/api/profile/*`, `/api/guide/profile`, `/api/support/profile`, `/api/admin/profile` và đổi mật khẩu tương ứng.
- **Response:** JSON user/role/token khi đăng ký hoặc đăng nhập; JSON hồ sơ/message ở các thao tác khác; mã quan sát được gồm `200`, `201`, `400`, `401`, `403`, `422`.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/AuthController.php`, `backend_laravel/app/Http/Controllers/Api/Customer/CustomerController.php`, `backend_laravel/app/Http/Controllers/Api/Guide/GuideProfileController.php`, `backend_laravel/app/Http/Controllers/Api/Support/SupportProfileController.php`, `backend_laravel/app/Http/Controllers/Api/Admin/AdminProfileController.php`; Class — `AuthController`, `CustomerController`, `GuideProfileController`, `SupportProfileController`, `AdminProfileController`; Method — `register`, `login`, `logout`, `me`, `updateProfile`/`show`/`update`, `changePassword`, `forgotPassword`, `resetPassword`; Route — các route nêu tại trường API; Model — `User`, `Role`, `Setting`; Migration — `0001_01_01_000000_create_users_table.php`, `2026_06_10_055225_create_personal_access_tokens_table.php`, `2026_06_10_215900_create_roles_table.php`, `2026_06_10_215910_add_vivugo_columns_to_users_table.php`, `2026_06_13_144107_add_otp_to_users_table.php`.

### FR-002 — Catalog công khai, tìm kiếm tour và trang chủ

- **Actor:** Guest và mọi actor có thể gọi route công khai.
- **Trigger:** Client tải trang chủ, category/destination, danh sách tour, tìm kiếm/lọc/sắp xếp, chi tiết tour theo slug, public settings hoặc widgets.
- **Preconditions:** Tour trong truy vấn customer phải `published`; lịch công khai phải `open`, ngày khởi hành không ở quá khứ và, ở các truy vấn bookable, còn chỗ.
- **Main Flow:** Controller validate query; dựng truy vấn tour và các quan hệ; áp dụng keyword/category/destination/ngày/số khách/giá/sort; phân trang; home tổng hợp thống kê, tour nổi bật, category, destination và đánh giá tour công khai; endpoint settings/widgets chỉ trả dữ liệu được phép công khai.
- **Alternative Flow:** Giá hiển thị ưu tiên `discount_price`, rồi `base_price`/legacy `price`, sau đó giá tour; sort hỗ trợ latest, giá tăng/giảm, lịch gần, rating và duration; filter chấp nhận tên query hiện tại và một số tên legacy được controller ánh xạ.
- **Exception Flow:** Query không hợp lệ trả `422`; slug tour không tồn tại hoặc không thỏa điều kiện công khai trả lỗi not-found theo controller/resource binding.
- **Database:** Read — `tours`, `categories`, `destinations`, `tour_destinations`, `tour_departures`, `tour_images`, `tour_itineraries`, `tour_itinerary_images`, `tour_age_pricing_rules`, `tour_reviews`, `settings`, `banners`; Insert — không có; Update — không có; Delete — không có.
- **Validation:** `keyword` tối đa 255; các ID/duration/số khách là integer dương; ngày là date; giá là numeric không âm; `per_page` từ 1–50; `sort` thuộc danh sách controller cho phép; widget nhận `position`/`page` nullable string.
- **Authorization:** Không có middleware authentication trên các route này.
- **API:** `GET /api/home`; `GET /api/catalog/categories`; `GET /api/catalog/destinations`; `GET /api/tours`; `GET /api/tours/search`; `GET /api/tours/filter`; `GET /api/tours/{slug}`; `GET /api/settings/public`; `GET /api/widgets`.
- **Response:** JSON thống kê/home, collection phân trang hoặc `TourResource`, danh sách category/destination, public settings và widget; dữ liệu đánh giá home chỉ lấy tour review visible có comment và viết tắt tên khách.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/PublicCatalogController.php`, `backend_laravel/app/Http/Controllers/Api/Customer/TourController.php`, `backend_laravel/app/Http/Controllers/Api/PublicSettingController.php`, `backend_laravel/app/Http/Controllers/Api/PublicWidgetController.php`; Class — `PublicCatalogController`, `Customer\TourController`, `PublicSettingController`, `PublicWidgetController`; Method — `home`, `categories`, `destinations`, `index_gdkh`, `search_gdkh`, `filter_gdkh`, `show_gdkh`, `show`, `index`; Route — các route nêu tại trường API; Model — `Tour`, `Category`, `Destination`, `TourDeparture`, `TourReview`, `Setting`, `Banner`; Migration — `2026_06_10_220000_create_categories_table.php`, `2026_06_10_220010_create_destinations_table.php`, `2026_06_10_220020_create_tours_table.php`, `2026_06_10_220030_create_tour_images_table.php`, `2026_06_10_220040_create_tour_departures_table.php`, `2026_06_27_000001_create_tour_itineraries_table.php`, `2026_06_27_000002_create_tour_itinerary_images_table.php`, `2026_07_03_120000_create_tour_age_pricing_rules_table.php`, `2026_07_21_000000_create_tour_reviews_table.php`.

### FR-003 — Wishlist

- **Actor:** Customer.
- **Trigger:** Customer xem, thêm hoặc bỏ một tour khỏi wishlist.
- **Preconditions:** Có Sanctum token, role customer; tour được thêm phải tồn tại.
- **Main Flow:** `index` đọc quan hệ wishlist của user và phân trang 10; `store` validate `tour_id` rồi dùng `syncWithoutDetaching`; `destroy` detach tour khỏi user.
- **Alternative Flow:** Gửi lại cùng `tour_id` không tạo thêm pivot do `syncWithoutDetaching` và unique database.
- **Exception Flow:** `tour_id` thiếu/không tồn tại trả `422`; không xác thực/sai role bị middleware trả `401`/`403`.
- **Database:** Read — `wishlists`, `tours`; Insert — pivot `wishlists`; Update — không có thao tác update độc lập; Delete — pivot user-tour khi bỏ wishlist.
- **Validation:** `tour_id` là bắt buộc và phải `exists:tours,id`.
- **Authorization:** `auth:sanctum`, `role:customer`; mọi thao tác dùng user hiện tại từ request.
- **API:** `GET /api/tours/wishlist`; `POST /api/tours/wishlist`; `DELETE /api/tours/wishlist/{tour_id}`.
- **Response:** Danh sách `TourResource` phân trang hoặc JSON message thành công.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Customer/WishlistController.php`; Class — `WishlistController`; Method — `index`, `store`, `destroy`; Route — các route nêu tại trường API; Model — `User`, `Wishlist`, `Tour`; Migration — `backend_laravel/database/migrations/2026_06_10_220110_create_wishlists_table.php`.

### FR-004 — Booking, liên hệ, hành khách và tính giá

- **Actor:** Customer; Admin.
- **Trigger:** Customer xem trước giá, tạo booking, tiếp tục thanh toán, hủy booking hoặc xem lịch sử; admin tìm kiếm/xem/thống kê/tạo/cập nhật/hủy/xóa booking.
- **Preconditions:** Customer đã xác thực đúng role; tour/lịch khởi hành tồn tại và phù hợp; khi tạo booking, cấu hình VNPAY phải sẵn sàng; các thao tác customer trên booking yêu cầu quyền sở hữu; xóa cứng phía admin chỉ áp dụng booking đã canceled.
- **Main Flow:** Preview validate payload và gọi `TourPricingService`; store mở transaction, khóa lịch và tour, tính lại giá, kiểm tra số chỗ, tạo booking/contact/participants/payment/history, tăng `booked_slots`, rồi trả payment URL; continue-payment tạo/đồng bộ phiên thanh toán phù hợp; cancel chuyển trạng thái và giải phóng chỗ theo service; admin thực hiện các thao tác quản lý tương ứng.
- **Alternative Flow:** Lịch có thể dùng giá giảm, giá cơ bản hoặc giá tour theo logic pricing; participant áp dụng rule tuổi và lưu pricing snapshot; customer history trả thêm `can_review_tour` và `tour_review`; continue-payment dùng payment còn hiệu lực hoặc tạo luồng thanh toán theo lifecycle service.
- **Exception Flow:** Booking người khác/not-found trả `404`; payload, trạng thái, thiếu chỗ hoặc thiếu cấu hình VNPAY khi tạo booking trả `422` do `ValidationException`; vi phạm unique/concurrency được transaction/lock và nhánh lỗi controller/service xử lý. Mã `503` cho thiếu cấu hình chỉ được tìm thấy tại `VnpayPaymentController::returnStatus()` thuộc FR-005.
- **Database:** Read — `tours`, `tour_departures`, `tour_age_pricing_rules`, `bookings`, `payments`; Insert — `bookings`, `booking_contacts`, `booking_participants`, `payments`, `booking_status_histories`; Update — `tour_departures.booked_slots`, booking/payment/status history theo lifecycle; Delete — admin xóa booking canceled và dữ liệu phụ thuộc theo FK/logic controller.
- **Validation:** `CustomerBookingController` dùng `StoreBookingRequest` cho tour/departure/contact/participants; preview/store kiểm tra số người, ngày sinh/nhóm tuổi và số chỗ; admin controller có validation riêng cho tạo/cập nhật.
- **Authorization:** Customer routes dùng `auth:sanctum`, `role:customer` và ownership trong controller; admin routes dùng `auth:sanctum`, `role:admin`.
- **API:** `POST /api/customer/bookings/preview`; `POST /api/customer/bookings`; `POST /api/customer/bookings/{booking}/continue-payment`; `PATCH /api/customer/bookings/{booking}/cancel`; `GET /api/profile/bookings`; `GET|POST /api/admin/bookings`; `GET|PUT|DELETE /api/admin/bookings/{id}`; `GET /api/admin/bookings/statistics`; `PATCH /api/admin/bookings/{id}/cancel`.
- **Response:** Preview trả breakdown giá; tạo/tiếp tục trả booking/payment và URL VNPAY; cancel trả booking/message; lịch sử/admin trả collection hoặc chi tiết; mã lỗi có bằng chứng trong luồng booking gồm `404`, `409` và `422` theo từng method/controller.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php`, `backend_laravel/app/Http/Controllers/Api/Customer/CustomerDashboardController.php`, `backend_laravel/app/Http/Controllers/Api/Admin/BookingController.php`, `backend_laravel/app/Http/Requests/Customer/StoreBookingRequest.php`, `backend_laravel/app/Services/TourPricingService.php`, `backend_laravel/app/Services/VnpayPaymentLifecycleService.php`; Class — `CustomerBookingController`, `CustomerDashboardController`, `Admin\BookingController`, `StoreBookingRequest`, `TourPricingService`, `VnpayPaymentLifecycleService`; Method — `preview`, `store`, `continuePayment`, `cancel`, `bookings`, `index`, `statistics`, `show`, `update`, `softDelete`, `destroy`; Route — các route nêu tại trường API; Model — `Booking`, `BookingContact`, `BookingParticipant`, `Payment`, `BookingStatusHistory`, `Tour`, `TourDeparture`, `TourAgePricingRule`; Migration — `2026_06_10_220060_create_bookings_table.php`, `2026_06_10_220070_create_booking_contacts_table.php`, `2026_06_10_220080_create_booking_participants_table.php`, `2026_06_10_220090_create_payments_table.php`, `2026_06_10_220200_create_booking_status_histories_table.php`, `2026_07_03_120000_create_tour_age_pricing_rules_table.php`, `2026_07_03_120100_add_pricing_snapshot_to_booking_participants_table.php`, `2026_07_04_005529_add_unique_booking_code_to_bookings_table.php`.

### FR-005 — Thanh toán VNPAY và quản trị payment

- **Actor:** Customer; VNPAY; Admin; **[Suy luận từ source code]** ngữ cảnh thực thi Scheduler/CLI cho command hết hạn payment (source không định danh một actor con người riêng).
- **Trigger:** Customer lấy trạng thái payment; VNPAY/browser gọi return/IPN; admin xem hoặc chuyển trạng thái payment; scheduler hết hạn payment đang chờ.
- **Preconditions:** Payment/booking tồn tại; callback có merchant reference, amount và secure hash hợp lệ; thao tác customer yêu cầu sở hữu booking; admin yêu cầu đúng role.
- **Main Flow:** Controller xác minh chữ ký và dữ liệu callback; lifecycle service khóa payment, xử lý idempotent, cập nhật payment/booking payment status/history; mã thành công ghi nhận thanh toán; mã timeout/hủy/thất bại cập nhật trạng thái và giải phóng chỗ khi logic yêu cầu; admin confirm/fail/refund chạy transaction; command tìm payment pending hết hạn để xử lý.
- **Alternative Flow:** `return-status` phục vụ trình duyệt quay lại, `webhooks/vnpay` phục vụ IPN; callback lặp lại không áp dụng side effect lần hai; mã VNPAY `11`/`24` đi vào nhánh hết hạn/hủy được service phân biệt.
- **Exception Flow:** Thiếu cấu hình VNPAY trả `503`; chữ ký hoặc số tiền không hợp lệ trả `422`/response code tương ứng của callback; không tìm thấy payment/booking trả `404`; chuyển trạng thái không hợp lệ bị từ chối theo controller/service.
- **Database:** Read — `payments`, `bookings`, `tour_departures`, `booking_status_histories`; Insert — status history khi lifecycle ghi nhận chuyển đổi; Update — payment status/transaction fields, booking payment/status fields và `booked_slots`; Delete — không có endpoint xóa payment.
- **Validation:** Xác minh HMAC, terminal/merchant reference, amount và payment state; route admin/status dùng numeric parameter; filter admin được validate trong controller.
- **Authorization:** Status customer nằm trong nhóm `auth:sanctum`, `role:customer` và kiểm tra sở hữu; callback public có throttle; admin routes dùng `auth:sanctum`, `role:admin`; command chạy CLI/scheduler.
- **API:** `GET /api/customer/payments/vnpay/{payment}`; `GET /api/webhooks/vnpay`; `GET /api/vnpay/return-status`; `GET /api/admin/payments`; `GET /api/admin/payments/{id}`; `PATCH /api/admin/payments/{id}/confirm|fail|refund`; command `vnpay:expire-pending-payments`.
- **Response:** JSON trạng thái/payment/message cho client/admin; callback trả cấu trúc response code VNPAY theo controller; lỗi quan sát được gồm `404`, `422`, `503`.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/routes/console.php`, `backend_laravel/app/Http/Controllers/Api/Customer/VnpayPaymentController.php`, `backend_laravel/app/Http/Controllers/Api/Admin/PaymentController.php`, `backend_laravel/app/Services/VnpayService.php`, `backend_laravel/app/Services/VnpayPaymentLifecycleService.php`, `backend_laravel/app/Console/Commands/ExpirePendingVnpayPayments.php`; Class — `VnpayPaymentController`, `PaymentController`, `VnpayService`, `VnpayPaymentLifecycleService`, `ExpirePendingVnpayPayments`; Method — `status`, `returnStatus`, `ipn`, `processVnpayResponse`, `index`, `show`, `confirm`, `fail`, `refund`, command `handle`; Route — các route/command nêu tại trường API; Model — `Payment`, `Booking`, `TourDeparture`, `BookingStatusHistory`; Migration — `2026_06_10_220090_create_payments_table.php`, `2026_06_10_220060_create_bookings_table.php`, `2026_06_10_220200_create_booking_status_histories_table.php`, `2026_07_07_040324_backfill_missing_booking_payments.php`, `2026_07_15_000000_add_vnpay_expiry_to_payments_table.php`.

### FR-006 — Đánh giá tour

- **Actor:** Guest; Customer; Admin.
- **Trigger:** Guest/client lấy đánh giá công khai của tour; customer tạo hoặc sửa đánh giá; admin tìm kiếm, xem chi tiết hoặc đổi trạng thái kiểm duyệt.
- **Preconditions:** Tạo/sửa yêu cầu Sanctum và role customer; booking thuộc customer, đủ điều kiện hoàn tất và gắn với tour; mỗi booking chỉ có một tour review; sửa yêu cầu đúng chủ sở hữu; admin route yêu cầu role admin.
- **Main Flow:** Public controller tìm tour theo slug, chỉ lấy review `visible`, áp dụng filter/sort/pagination và trả summary; create mở transaction, khóa booking/tour, kiểm tra eligibility/duplicate, tạo review visible và tính lại aggregate tour; update khóa dữ liệu, kiểm tra chủ sở hữu, cập nhật rating/comment nhưng giữ status hiện tại và tính lại aggregate; admin update status ghi trạng thái/người/thời điểm kiểm duyệt và tính lại aggregate trong transaction.
- **Alternative Flow:** Public list lọc theo sao và sắp xếp theo tham số được cho phép; comment là tùy chọn; khi customer sửa review đang `hidden` hoặc `spam`, trạng thái không bị đưa về visible; admin có thể đặt `visible`, `hidden` hoặc `spam`.
- **Exception Flow:** Booking không thuộc user/không đủ điều kiện hoặc review không thuộc user bị từ chối theo controller/service; review thứ hai cho cùng booking trả `409`; validation trả `422`; resource không tồn tại trả `404`; sai role trả `403`.
- **Database:** Read — `tour_reviews`, `bookings`, `tours`, `tour_departures`, user; Insert — `tour_reviews`; Update — rating/comment/status/moderation fields của review và `tours.average_rating`, `tours.review_count`; Delete — không có endpoint xóa review.
- **Validation:** Tạo yêu cầu `booking_id` tồn tại và `rating` integer từ 1–5; `comment` nullable tối đa 2.000 ký tự; update validate rating/comment; admin status chỉ nhận `visible`, `hidden`, `spam`; public/admin filter/sort/per-page theo validation trong controller/request.
- **Authorization:** Public index không yêu cầu auth; customer routes dùng `auth:sanctum`, `role:customer`, ownership và eligibility; admin routes dùng `auth:sanctum`, `role:admin`.
- **API:** `GET /api/tours/{slug}/reviews`; `POST /api/customer/tour-reviews`; `PUT /api/customer/tour-reviews/{tourReview}`; `GET /api/admin/tour-reviews`; `GET /api/admin/tour-reviews/{tourReview}`; `PATCH /api/admin/tour-reviews/{tourReview}/status`.
- **Response:** Public trả summary gồm average/count/distribution và danh sách phân trang; customer trả review/message (`201` khi tạo); admin trả collection/chi tiết/review sau kiểm duyệt; mã có bằng chứng gồm `403`, `404`, `409`, `422`.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/TourReviewController.php`, `backend_laravel/app/Http/Controllers/Api/Customer/TourReviewController.php`, `backend_laravel/app/Http/Controllers/Api/Admin/TourReviewController.php`, `backend_laravel/app/Http/Requests/Customer/StoreTourReviewRequest.php`, `backend_laravel/app/Http/Requests/Customer/UpdateTourReviewRequest.php`, `backend_laravel/app/Http/Requests/Admin/UpdateTourReviewStatusRequest.php`, `backend_laravel/app/Services/TourReviewService.php`, `backend_laravel/app/Services/BookingReviewEligibilityService.php`; Class — ba `TourReviewController`, `StoreTourReviewRequest`, `UpdateTourReviewRequest`, `UpdateTourReviewStatusRequest`, `TourReviewService`, `BookingReviewEligibilityService`; Method — controller `index()`, `store()`, `update()`, `show()`, `updateStatus()`; `TourReviewService::isBookingReviewable()`, `refreshTourRating()`, `summaryForTour()`; các method eligibility trong `BookingReviewEligibilityService`; Route — các route nêu tại trường API; Model — `TourReview`, `Booking`, `Tour`, `TourDeparture`, `User`; Migration — `backend_laravel/database/migrations/2026_07_21_000000_create_tour_reviews_table.php`.

### FR-007 — Đánh giá hướng dẫn viên

- **Actor:** Customer; Tour guide; **[Suy luận từ source code]** ngữ cảnh thực thi Scheduler/CLI cho command gửi nhắc (source không định danh một actor con người riêng).
- **Trigger:** Customer lấy booking có thể đánh giá, gửi đánh giá guide hoặc xem đánh giá/lịch sử của guide; guide xem đánh giá và lịch sử tour của mình; scheduler gửi nhắc đánh giá.
- **Preconditions:** Customer/guide đã xác thực đúng role; booking thuộc customer và hoàn tất theo eligibility service; guide có assignment không canceled trên lịch; thao tác lưu có cặp booking-guide phù hợp.
- **Main Flow:** Customer lấy danh sách booking reviewable; `store` validate input, service xác minh booking và assignment rồi `firstOrNew` review theo booking-guide, tạo visible hoặc cập nhật review hiện tại, tính lại aggregate guide và đánh dấu notification liên quan đã đọc trong transaction; các endpoint list trả review/lịch sử; command định kỳ tìm đối tượng cần nhắc và gọi notification service.
- **Alternative Flow:** Cùng cặp booking-guide được cập nhật thay vì tạo bản ghi thứ hai; khi cập nhật, trạng thái hiện có được giữ; customer và guide có endpoint đọc khác nhau nhưng dùng cùng dữ liệu review/assignment.
- **Exception Flow:** Booking không thuộc customer, chưa đủ điều kiện hoặc guide không thuộc assignment bị từ chối theo service/controller; payload sai trả `422`; sai auth/role trả `401`/`403`; resource thiếu trả lỗi not-found theo route binding/query.
- **Database:** Read — `reviews`, `bookings`, `tour_guide_assignments`, `guides`, `tour_departures`, `notifications`; Insert — `reviews`, notification nhắc; Update — review, aggregate guide và trạng thái đọc notification; Delete — không có endpoint xóa guide review.
- **Validation:** `StoreGuideReviewRequest` yêu cầu `booking_id`, `guide_id`, `rating` từ 1–5; `comment` nullable tối đa 2.000 ký tự; các ID phải tồn tại theo rule request.
- **Authorization:** Customer routes dùng `auth:sanctum`, `role:customer` và ownership; guide routes dùng `auth:sanctum`, `role:tour guide` và guide hiện tại; command chạy scheduler.
- **API:** `GET /api/customer/guide-reviewable-bookings`; `POST /api/customer/guide-reviews`; `GET /api/customer/guides/{guide}/reviews`; `GET /api/customer/guides/{guide}/tour-history`; `GET /api/guide/reviews`; `GET /api/guide/tour-history`; command `guide-reviews:send-reminders`.
- **Response:** JSON danh sách booking reviewable, review/lịch sử phân trang và review sau khi tạo/cập nhật; lỗi validation/authorization/not-found theo controller.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/routes/console.php`, `backend_laravel/app/Http/Controllers/Api/Customer/GuideReviewController.php`, `backend_laravel/app/Http/Controllers/Api/Guide/GuideReviewController.php`, `backend_laravel/app/Http/Requests/Customer/StoreGuideReviewRequest.php`, `backend_laravel/app/Services/GuideReviewService.php`, `backend_laravel/app/Services/BookingReviewEligibilityService.php`, `backend_laravel/app/Services/GuideReviewNotificationService.php`, `backend_laravel/app/Console/Commands/SendGuideReviewReminders.php`; Class — hai `GuideReviewController`, `StoreGuideReviewRequest`, `GuideReviewService`, `BookingReviewEligibilityService`, `GuideReviewNotificationService`, `SendGuideReviewReminders`; Method — `reviewableBookings`, `store`, `guideReviews`, `guideTourHistory`, `reviews`, `tourHistory`, service methods, command `handle`; Route — các route/command nêu tại trường API; Model — `Review`, `Guide`, `Booking`, `TourGuideAssignment`, `Notification`; Migration — `2026_06_10_220100_create_reviews_table.php`, `2026_07_11_112416_add_guide_context_to_reviews_table.php`, `2026_06_28_092905_create_tour_guide_assignments_table.php`.

### FR-008 — Yêu cầu hỗ trợ khách hàng

- **Actor:** Customer; Support staff.
- **Trigger:** Customer gửi yêu cầu hỗ trợ kèm tệp; support staff xem danh sách/badge/chi tiết hoặc đổi trạng thái xử lý.
- **Preconditions:** Customer hoặc support staff có token và role đúng; tệp gửi kèm thỏa rule; support request tồn tại khi xem/cập nhật.
- **Main Flow:** Customer controller validate, mở transaction, tạo `support_requests`, lưu attachment và tạo notification; support controller filter/phân trang danh sách, trả badge pending, chi tiết và cập nhật status cùng các trường thời điểm/người xử lý tương ứng.
- **Alternative Flow:** Request có thể không có attachment; category nhận một trong các giá trị enum controller cho phép; support lọc theo status/category/keyword và các query đã được controller hỗ trợ.
- **Exception Flow:** Validation trả `422`; khi tạo lỗi sau upload, controller rollback transaction và xóa các file vừa lưu; resource thiếu trả `404`; sai role trả `403`.
- **Database:** Read — `support_requests`, `support_request_attachments`, `notifications`, users; Insert — request, attachment, notification; Update — status và metadata xử lý của request; Delete — không có endpoint xóa support request/attachment trong flow đang hoạt động.
- **Validation:** Yêu cầu tên, email, category, subject, description; description tối đa 10.000 ký tự; tối đa 5 attachment; từng tệp thuộc MIME/type cho phép và tối đa 5 MB theo controller.
- **Authorization:** Customer create dùng `auth:sanctum`, `role:customer`; support list/detail/status dùng `auth:sanctum`, `role:support staff`.
- **API:** `POST /api/customer/support-requests`; `GET /api/support/requests`; `GET /api/support/requests/badge-count`; `GET /api/support/requests/{supportRequest}`; `PATCH /api/support/requests/{supportRequest}/status`.
- **Response:** Tạo trả request/message (`201`); support trả list phân trang, badge count, chi tiết hoặc request đã cập nhật; lỗi `403`, `404`, `422` theo middleware/controller.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Customer/CustomerSupportRequestController.php`, `backend_laravel/app/Http/Controllers/Api/Support/SupportRequestController.php`; Class — `CustomerSupportRequestController`, `SupportRequestController`; Method — `store`, `index`, `show`, `badgeCount`, `updateStatus`; Route — các route nêu tại trường API; Model — `SupportRequest`, `SupportRequestAttachment`, `Notification`, `User`; Migration — `2026_07_16_220919_create_support_requests_table.php`, `2026_07_16_220920_create_support_request_attachments_table.php`, `2026_06_10_220130_create_notifications_table.php`.

### FR-009 — Chat AI/trợ lý du lịch

- **Actor:** Guest và mọi actor gọi route công khai; Gemini API.
- **Trigger:** Client POST một message tới chatbot/travel assistant.
- **Preconditions:** `message` hợp lệ; cấu hình Gemini được đọc khi controller thực hiện lời gọi ngoài.
- **Main Flow:** Controller validate message/session; tạo hoặc lấy conversation bằng `firstOrCreate`; đọc tối đa 10 message lịch sử; trích filter; truy vấn tối đa 10 tour published phù hợp; dựng system prompt; lưu message user; gọi Gemini với timeout; lưu câu trả lời assistant và trả JSON.
- **Alternative Flow:** Client có thể gọi `/chatbot` hoặc `/travel-assistant`; khi Gemini lỗi/không trả nội dung dùng câu trả lời fallback đã cài trong controller; session không gửi thì controller xử lý theo logic mặc định hiện có.
- **Exception Flow:** Validation trả `422`; lỗi HTTP/Gemini được ghi log và chuyển sang fallback thay vì chứng minh lỗi bị ném ra client; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về SLA hoặc cam kết độ chính xác nội dung AI.
- **Database:** Read — `chat_conversations`, tối đa 10 `chat_messages`, `tours` và quan hệ catalog; Insert — conversation khi chưa có, message user và assistant; Update — timestamp/quan hệ ORM có thể được cập nhật theo Eloquent nhưng không có endpoint update nội dung; Delete — không có endpoint xóa chat.
- **Validation:** `message` required string tối đa 1.000; `session_id` nullable string tối đa 100 theo controller.
- **Authorization:** Hai route không có middleware authentication; `/api/chatbot` có `throttle:20,1`; `/api/travel-assistant` không có route-level throttle được tìm thấy.
- **API:** `POST /api/chatbot`; `POST /api/travel-assistant`; external Gemini HTTP endpoint từ config.
- **Response:** HTTP `200` trả đúng hai trường JSON `reply` và `session_id`; fallback được đặt vào `reply` khi lời gọi Gemini thất bại; validation error `422`. Không có trường tour/filter trong response của `handleChat()`.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php`, `backend_laravel/config/services.php`; Class — `ChatBotController`; Method — `handleChat`, `extractFilters`, `buildTourQuery`, `buildSystemPrompt`, `callGemini`; Route — `POST /api/chatbot`, `POST /api/travel-assistant`; Model — `ChatConversation`, `ChatMessage`, `Tour`; Migration — `2026_07_15_193903_create_chat_conversations_table.php`, `2026_07_15_193904_create_chat_messages_table.php`, `2026_06_10_220020_create_tours_table.php`.

### FR-010 — Thông báo và bản nháp thông báo

- **Actor:** User đã xác thực; Customer; Support staff; Admin.
- **Trigger:** User đọc/đánh dấu đã đọc thông báo; support gửi thông báo đến admin; admin quản lý draft, xem recipient, gửi, thu hồi, xem notification bell hoặc quản lý thùng rác draft.
- **Preconditions:** Có Sanctum token; endpoint support/admin yêu cầu role tương ứng; notification cá nhân phải thuộc user hiện tại; gửi draft yêu cầu draft tồn tại và xác định được recipient.
- **Main Flow:** Customer/support đọc collection, unread count và chi tiết, rồi mark-as-read; support tạo notification cho admin; admin tạo/cập nhật draft, preview recipient, gửi bằng transaction và bulk insert notification rồi đặt draft `sent`; revoke xóa notification theo draft và đưa draft về trạng thái phù hợp; draft có soft delete/restore/force delete; bell API đọc/đánh dấu notification admin.
- **Alternative Flow:** Target draft là `all`, theo role hoặc danh sách user cụ thể; draft có thể được lưu chưa gửi; thông báo có thể đánh dấu từng bản ghi hoặc tất cả qua bell endpoint; draft đã xóa mềm có route restore/force-delete.
- **Exception Flow:** Không có recipient hoặc draft/resource thiếu trả nhánh lỗi controller (`404` đối với trường hợp được triển khai); truy cập notification không thuộc user bị từ chối/not-found; validation trả `422`; sai role trả `403`.
- **Database:** Read — `notification_drafts`, `notifications`, `users`, `roles`; Insert — draft và notification (kể cả bulk insert); Update — draft/status, `read_at`; Delete — soft/hard delete draft, xóa notification khi revoke.
- **Validation:** Draft yêu cầu title tối đa 255, message, target thuộc danh sách; role/user IDs theo target; support send validate nội dung/đối tượng theo controller; route numeric có `whereNumber` ở các API cá nhân.
- **Authorization:** Shared customer notification routes dùng `auth:sanctum` và ownership; support routes dùng `role:support staff`; toàn bộ admin notification routes nằm trong nhóm `role:admin`.
- **API:** `/api/notifications/customers*`; `/api/notifications/support*`; `/api/admin/notifications/users`; `/preview-recipients`; `/draft*`; `/send/{id}`; `/get-all-send`; `/revoke/{draft_id}`; `/api/admin/notification-bell*` với các method GET/POST/PUT/PATCH/DELETE được khai báo tại `routes/api.php`.
- **Response:** Collection/count/detail/message hoặc draft/recipient list; send trả kết quả sau khi ghi notification; mã lỗi quan sát được gồm `403`, `404`, `422`.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Customer/NotificationCustomerController.php`, `backend_laravel/app/Http/Controllers/Api/Support/SupportNotificationController.php`, `backend_laravel/app/Http/Controllers/Api/Admin/NotificationController.php`, `backend_laravel/app/Http/Controllers/Api/Admin/AdminNotificationBellController.php`, `backend_laravel/app/Services/AdminNotificationService.php`; Class — `NotificationCustomerController`, `SupportNotificationController`, `NotificationController`, `AdminNotificationBellController`, `AdminNotificationService`; Method — `getMyNotifications`, `getUnreadCount`, `getNotificationDetail`, `markAsRead`, `sendNotification`, `getUsers`, `previewRecipients`, `saveDraft`, `listDrafts`, `showDraft`, `updateDraft`, `destroy`, `listTrashedDrafts`, `restoreDraft`, `forceDeleteDraft`, `getAllSentNotifications`, `revoke`, bell methods; Route — các route nêu tại trường API; Model — `Notification`, `NotificationDraft`, `User`, `Role`; Migration — `2026_06_10_220130_create_notifications_table.php`, `2026_06_24_152026_create_notification_drafts_table.php`, `2026_06_24_155228_add_deleted_at_to_notification_drafts_table.php`, `2026_06_24_161627_modify_notifications_table.php`, `2026_06_24_165838_add_draft_id_to_notifications_table.php`.

### FR-011 — Dashboard và báo cáo quản trị

- **Actor:** Admin.
- **Trigger:** Admin tải thống kê tổng quan hoặc dữ liệu biểu đồ theo năm.
- **Preconditions:** Có Sanctum token và role admin.
- **Main Flow:** Overview controller chạy các truy vấn tổng hợp về doanh thu, booking, user, tour và destination; charts controller tổng hợp chuỗi dữ liệu theo tháng/trạng thái trong năm được yêu cầu; kết quả được đóng gói thành JSON.
- **Alternative Flow:** Nếu không gửi `year`, controller dùng năm hiện tại; các card/statistics khác trên admin có thể lấy từ endpoint statistics của từng module, không phải từ hai route report này.
- **Exception Flow:** **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về nhánh lỗi nghiệp vụ riêng hoặc cơ chế export server-side cho hai endpoint report; lỗi auth/role do middleware trả `401`/`403`.
- **Database:** Read — `payments`, `bookings`, `users`, `roles`, `tours`, `destinations` qua aggregate query; Insert — không có; Update — không có; Delete — không có.
- **Validation:** `year` được controller cast/default; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về rule min/max cho năm trong `ReportController`.
- **Authorization:** Nhóm `/api/admin` dùng `auth:sanctum`, `role:admin`.
- **API:** `GET /api/admin/reports/overview`; `GET /api/admin/reports/charts?year=...`.
- **Response:** JSON `statistics`/các tập dữ liệu biểu đồ theo cấu trúc controller; frontend có xuất CSV phía client nhưng không có API export trong hai route này.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Admin/ReportController.php`, `frontend_react/src/pages/admin/AdminDashboardPage.jsx`; Class — `ReportController`; Method — `getOverviewStatistics`, `getChartStatistics`; Route — hai route nêu tại trường API; Model — **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về model chuyên biệt cho report, controller dùng query trên các model/bảng nghiệp vụ; Migration — không có migration report riêng, dữ liệu đến từ `2026_06_10_220090_create_payments_table.php`, `2026_06_10_220060_create_bookings_table.php`, `0001_01_01_000000_create_users_table.php`, `2026_06_10_220020_create_tours_table.php`, `2026_06_10_220010_create_destinations_table.php`.

### FR-012 — Quản lý tài khoản người dùng

- **Actor:** Admin; Guest/mọi actor đối với route `GET /api/roles` đang được khai báo công khai.
- **Trigger:** Admin xem count/statistics/list/search/detail, tạo/cập nhật hoặc khóa/mở khóa user; client lấy danh sách role.
- **Preconditions:** Các route quản lý customer yêu cầu admin; user/role tồn tại; khi tạo/cập nhật role guide hoặc support, controller đồng bộ hồ sơ chuyên biệt tương ứng.
- **Main Flow:** Controller truy vấn users kèm role/profile; validate create/update; transaction tạo hoặc cập nhật user, hash mật khẩu khi có, gán role và tạo/khôi phục/cập nhật guide/support profile; lock đặt status inactive, unlock đặt active; statistics/count tổng hợp dữ liệu.
- **Alternative Flow:** Tìm kiếm theo các trường controller hỗ trợ; avatar/profile được đồng bộ tùy role; `index_role` được dùng bởi cả `/api/roles` và `/api/admin/roles`.
- **Exception Flow:** User/role không tồn tại trả `404`; trạng thái đã locked/unlocked trả `422`; validation unique/type trả `422`; lỗi transaction được rollback theo controller; sai role trả `403`.
- **Database:** Read — `users`, `roles`, `guides`, `support_staff`; Insert — user và profile role tương ứng; Update — user/status/profile/role; Delete — không có route xóa user trong controller này.
- **Validation:** Create: `full_name` required string tối đa 255; `email` required/email/unique; `password` required tối thiểu 6; `phone` nullable string tối đa 10; `role_id` required và tồn tại; `avatar` nullable, JPG/JPEG/PNG/WebP tối đa 5.120 KB. Update: `full_name`, `email`, `status`, `password`, `role_id` dùng `sometimes` theo rule controller; `phone` nullable tối đa 15; `status` chỉ `active|inactive`; avatar tối đa 2.048 KB. **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về validation field profile chuyên biệt theo role trong `CustomerManagerController::store()`/`update()`; controller chỉ đồng bộ các profile hiện có qua `syncRoleRelations()`.
- **Authorization:** Customer management nằm trong nhóm admin và còn lặp middleware `auth:sanctum`, `role:admin`; `GET /api/roles` ở ngoài nhóm auth, còn `GET /api/admin/roles` được bảo vệ.
- **API:** `GET /api/admin/customers`; `/statistics`; `/count`; `/search`; `POST /api/admin/customers`; `GET|PUT /api/admin/customers/{id}`; `PATCH /api/admin/customers/{id}/lock|unlock`; `GET /api/roles`; `GET /api/admin/roles`.
- **Response:** JSON collection/count/statistics, user detail hoặc message; tạo trả `201`; lỗi quan sát được gồm `404`, `422` và middleware `401`/`403`.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Admin/CustomerManagerController.php`; Class — `CustomerManagerController`; Method — `count`, `statistics`, `index`, `search`, `store`, `index_role`, `show`, `update`, `lock`, `unlock`, `restoreSupportStaff`, `restoreGuide`; Route — các route nêu tại trường API; Model — `User`, `Role`, `Guide`, `SupportStaff`; Migration — `0001_01_01_000000_create_users_table.php`, `2026_06_10_215900_create_roles_table.php`, `2026_06_14_145318_create_guides_table.php`, `2026_06_22_032814_create_support_staff_table.php`, `2026_07_01_000001_add_user_id_to_support_staff_table.php`.

### FR-013 — Quản lý danh mục tour

- **Actor:** Admin.
- **Trigger:** Admin xem/tìm kiếm/tạo/cập nhật/xóa mềm, xem thùng rác hoặc khôi phục category.
- **Preconditions:** Có token/role admin; category tồn tại cho update/delete/restore; file thumbnail nếu gửi phải hợp lệ.
- **Main Flow:** `index`/`search` truy vấn category; `store` validate, sinh slug và lưu thumbnail nếu có rồi tạo category; `update` validate và thay dữ liệu/file; `destroy` soft delete; `trashed` lấy bản ghi đã xóa mềm; `restore` khôi phục.
- **Alternative Flow:** Description và thumbnail là tùy chọn; update có thể giữ thumbnail cũ khi không gửi file mới; status nhận active/inactive.
- **Exception Flow:** Validation trả `422`; category không tồn tại trả `404`; lỗi lưu file/database đi theo nhánh exception của controller; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về endpoint force-delete category.
- **Database:** Read — `categories`; Insert — category; Update — category và `deleted_at` khi restore; Delete — soft delete category, không có hard delete endpoint.
- **Validation:** Name bắt buộc, tối đa 150 và unique; description nullable; thumbnail theo các MIME ảnh và tối đa 5 MB được controller quy định; status chỉ `active`/`inactive`.
- **Authorization:** Toàn bộ route nằm trong nhóm `/api/admin` với `auth:sanctum`, `role:admin`.
- **API:** `GET|POST /api/admin/categories`; `GET /api/admin/categories/search`; `PUT /api/admin/categories/{id}`; `DELETE /api/admin/categories/{id}`; `GET /api/admin/categories-trashed`; `PATCH /api/admin/categories/{id}/restore`.
- **Response:** JSON list/detail payload/message; tạo trả mã thành công của controller; validation/not-found trả `422`/`404`.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Admin/CategoryController.php`; Class — `CategoryController`; Method — `index`, `search`, `store`, `update`, `destroy`, `trashed`, `restore`; Route — các route nêu tại trường API; Model — `Category`; Migration — `2026_06_10_220000_create_categories_table.php`, `2026_07_03_112000_add_thumbnail_fields_to_categories_table.php`.

### FR-014 — Quản lý điểm đến

- **Actor:** Admin.
- **Trigger:** Admin list/search/xem/tạo/cập nhật/xóa mềm, xem thùng rác, restore hoặc force-delete destination.
- **Preconditions:** Có token/role admin; destination tồn tại cho thao tác theo ID.
- **Main Flow:** Resource routes gọi controller để đọc/tạo/cập nhật/xóa mềm; search lọc theo keyword; trashed trả bản ghi xóa mềm; restore phục hồi; forceDelete xóa vĩnh viễn bản ghi đã tìm thấy.
- **Alternative Flow:** List/search hỗ trợ query/pagination theo controller; status và các metadata vị trí được lưu theo payload hiện có.
- **Exception Flow:** Store validation lỗi trả `422`; query không tìm thấy ở nhánh search hoặc ID thiếu trả `404` theo controller; force delete có thể chịu ràng buộc quan hệ database; không có xử lý nghiệp vụ bổ sung ngoài source.
- **Database:** Read — `destinations` và quan hệ tour; Insert — destination; Update — destination/`deleted_at`; Delete — soft delete và hard delete qua endpoint riêng.
- **Validation:** Store yêu cầu `name`, slug unique, `province_city`, `country` và các rule controller; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về validation trong `DestinationController::update`, vì method dùng payload trực tiếp.
- **Authorization:** Nhóm `/api/admin` dùng `auth:sanctum`, `role:admin`.
- **API:** `GET|POST /api/admin/destinations`; `GET|PUT|PATCH|DELETE /api/admin/destinations/{destination}`; `GET /api/admin/destinations/search`; `GET /api/admin/destinations/trash/list`; `POST /api/admin/destinations/{id}/restore`; `DELETE /api/admin/destinations/{id}/force-delete`.
- **Response:** JSON collection/detail/model/message; not-found/validation theo controller.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Admin/DestinationController.php`; Class — `DestinationController`; Method — `index`, `show`, `store`, `update`, `destroy`, `trashed`, `restore`, `forceDelete`, `search`; Route — các route nêu tại trường API; Model — `Destination`, `Tour`; Migration — `backend_laravel/database/migrations/2026_06_10_220010_create_destinations_table.php`; file `.bak` `2026_06_14_144719_create_destinations_table.php.bak` không phải migration PHP đang chạy.

### FR-015 — Quản lý tour, hành trình, ảnh và giá theo tuổi

- **Actor:** Admin.
- **Trigger:** Admin xem danh sách/chi tiết/thống kê, tạo/cập nhật/xóa mềm, ẩn/hiện hoặc xem danh sách tour ẩn.
- **Preconditions:** Có token/role admin; category/destination và các reference trong payload tồn tại; tour tồn tại cho thao tác theo ID.
- **Main Flow:** Store validate payload, mở transaction, tạo tour/slug/created_by rồi đồng bộ destinations, images, itineraries, itinerary images và age pricing rules; update thực hiện validation/đồng bộ lại các cấu phần trong transaction; destroy soft delete tour; hide/unhide đổi trạng thái hiển thị; list/statistics tổng hợp dữ liệu quản trị.
- **Alternative Flow:** Ảnh, hành trình và age rules là các collection tùy chọn theo validation; `publicIndex` vẫn nằm dưới prefix/middleware admin trong route hiện tại; danh sách hidden dùng method riêng.
- **Exception Flow:** Validation và reference sai trả `422`; tour không tồn tại trả `404`; transaction lỗi được rollback theo controller; thao tác storage có nhánh xử lý tương ứng trong controller.
- **Database:** Read — `tours`, `categories`, `destinations`, `tour_destinations`, `tour_images`, `tour_itineraries`, `tour_itinerary_images`, `tour_age_pricing_rules`; Insert — tour và bản ghi con/pivot; Update — tour/status và bản ghi con; Delete — xóa/recreate bản ghi con khi đồng bộ và soft delete tour.
- **Validation:** Controller quy định name/category/duration/description/status, destinations, images, itineraries, age pricing rules, giá và các nested field; slug được sinh/đảm bảo phù hợp theo logic controller/model.
- **Authorization:** Routes nằm trong `/api/admin`; nhóm tours còn gắn `auth:sanctum`, `role:admin`.
- **API:** `GET /api/admin/tours/public`; `GET|POST /api/admin/tours`; `GET|PUT|DELETE /api/admin/tours/{id}`; `GET /api/admin/tours/hidden-list`; `GET /api/admin/tours/statistics`; `PATCH /api/admin/tours/{id}/hide`; `PATCH /api/admin/tours/{id}/unhide`.
- **Response:** JSON list/detail/statistics/tour/message; create/update trả tour cùng quan hệ theo controller; lỗi `404`/`422` và lỗi transaction.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Admin/TourManagerController.php`; Class — `TourManagerController`; Method — `index`, `show`, `publicIndex`, `store`, `update`, `destroy`, `hide`, `unhide`, `hiddenTours`, `statistics`; Route — các route nêu tại trường API; Model — `Tour`, `Category`, `Destination`, `TourImage`, `TourItinerary`, `TourItineraryImage`, `TourAgePricingRule`; Migration — `2026_06_10_220020_create_tours_table.php`, `2026_06_10_220030_create_tour_images_table.php`, `2026_06_10_220210_create_tour_destinations_table.php`, `2026_06_27_000001_create_tour_itineraries_table.php`, `2026_06_27_000002_create_tour_itinerary_images_table.php`, `2026_07_03_120000_create_tour_age_pricing_rules_table.php`.

### FR-016 — Quản lý lịch khởi hành

- **Actor:** Admin; Customer ở luồng đọc lịch bookable thông qua catalog/booking.
- **Trigger:** Admin xem lịch theo tour, tạo/sửa/xóa lịch hoặc xem khách đã đặt; customer tải catalog/preview/create booking có sử dụng lịch.
- **Preconditions:** Admin có token/role; tour/departure tồn tại; lịch chưa bị mutation guard khóa; khi sửa lịch có booking phải xác nhận thay đổi; khi xóa không được có booking liên kết.
- **Main Flow:** Index trả lịch và số booking/chỗ còn lại; store validate, tính return date theo duration tour và tạo lịch; update dùng guard, xác định field thay đổi, yêu cầu `change_reason`, mở transaction cập nhật rồi gửi notification cho customer/guide/admin; destroy kiểm tra quan hệ, transaction tạo notification và xóa; booked-customers trả người đặt theo lịch.
- **Alternative Flow:** Nếu update không làm thay đổi field, controller trả message không có thay đổi; base price nullable nhưng discount yêu cầu base price và không vượt base; lịch public chỉ xuất hiện qua quy tắc catalog/booking.
- **Exception Flow:** Departure ngày đi từ hôm nay trở về trước bị guard từ chối; giảm total slots dưới booked slots trả `422`; có active booking mà chưa `confirm_booked_change` trả `409` với code `BOOKED_DEPARTURE_CONFIRMATION_REQUIRED`; có bất kỳ booking thì delete trả `422`; not-found trả `404`.
- **Database:** Read — `tour_departures`, `tours`, `bookings`, assignments/users liên quan; Insert — departure và notifications; Update — date/slot/price/status của departure; Delete — departure khi không có booking.
- **Validation:** Create yêu cầu departure date từ hôm nay, total slots integer ≥1, status `open|closed|completed|cancelled`; base/discount numeric không âm; update dùng `sometimes`, `change_reason` 3–1.000, `confirm_booked_change` boolean; total slots không thấp hơn booked slots.
- **Authorization:** Admin routes dùng `auth:sanctum`, `role:admin`; customer không có CRUD departure và chịu auth ở booking hoặc public rule ở catalog.
- **API:** `GET|POST /api/admin/tours/{tourId}/departures`; `PUT|DELETE /api/admin/tours/departures/{id}`; `GET /api/admin/tour-departures/{tourDeparture}/booked-customers`; các public/customer route liên quan ở FR-002/FR-004.
- **Response:** List/serialized departure, `available_slots`, `has_bookings`, field thay đổi và kết quả notification; booked customers collection; lỗi `404`, `409`, `422`.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureController.php`, `backend_laravel/app/Http/Controllers/Api/Admin/AdminTourDepartureBookingController.php`, `backend_laravel/app/Services/TourDepartureMutationGuard.php`, `backend_laravel/app/Services/TourDepartureChangeNotificationService.php`, `backend_laravel/app/Services/AdminNotificationService.php`; Class — `TourDepartureController`, `AdminTourDepartureBookingController`, `TourDepartureMutationGuard`, `TourDepartureChangeNotificationService`, `AdminNotificationService`; Method — `index`, `store`, `update`, `destroy`, `isLocked`, `assertCanMutate`, `sendForUpdatedDeparture`; Route — các route nêu tại trường API; Model — `TourDeparture`, `Tour`, `Booking`, `Notification`; Migration — `2026_06_10_220040_create_tour_departures_table.php`, `2026_07_06_000001_add_base_and_discount_price_to_tour_departures_table.php`.

### FR-017 — Quản lý hồ sơ hướng dẫn viên

- **Actor:** Admin; Tour guide.
- **Trigger:** Admin list/search/filter/statistics/detail/create/update/xóa/restore guide hoặc quản lý avatar; guide xem/sửa hồ sơ và đổi mật khẩu.
- **Preconditions:** Admin/guide có token và role đúng; user dùng tạo guide tồn tại và chưa có guide profile active; guide profile tồn tại khi actor guide gọi API.
- **Main Flow:** Admin create transaction tạo guide code, guide profile và sync destinations/languages/experiences; update transaction cập nhật basic fields và thay các relation được gửi; list/filter thống kê theo status/experience/language/destination/leave; destroy soft delete, restore khôi phục, force-delete xóa cứng; avatar lưu/xóa public storage; guide controller đọc/cập nhật profile và password của chính user.
- **Alternative Flow:** Language/certificate arrays nullable ở backend; update chỉ sync relation được gửi; admin có endpoint lấy user chưa có profile; avatar có endpoint upload/delete độc lập.
- **Exception Flow:** Guide profile không tồn tại trả `404`; user/guide/reference không tồn tại hoặc validation sai trả `404`/`422`; transaction lỗi rollback; storage lỗi đi theo nhánh controller.
- **Database:** Read — `guides`, `users`, `destinations`, `guide_destinations`, `languages`, `language_levels`, `guide_languages`, `certificates`, `guide_experiences`; Insert — guide và pivot/experience; Update — guide/user và các relation; Delete — soft/hard delete guide, xóa/reinsert pivot khi sync.
- **Validation:** Create yêu cầu `user_id` unique, experience 0–40, status `active|inactive|locked`, ít nhất một destination distinct; language/level/certificate/year theo rule controller; update dùng `sometimes`; guide profile/password có validation riêng.
- **Authorization:** `/api/admin/guides*` dùng `auth:sanctum`, `role:admin`; `/api/guide/profile` và change-password dùng `auth:sanctum`, `role:tour guide`, đồng thời lấy profile theo user hiện tại.
- **API:** `/api/admin/guides`, `/search`, `/filter`, `/statistics`, `/available-users`, `/trashed`, `/{id}`, `/{id}/restore`, `/{id}/force`, `/{id}/avatar`; `GET|PUT /api/guide/profile`; `PUT /api/guide/change-password`.
- **Response:** JSON list/detail/statistics/available users/model/message; avatar URL sau upload; lỗi `404`/`422`/middleware.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Admin/GuideController.php`, `backend_laravel/app/Http/Controllers/Api/Guide/GuideProfileController.php`; Class — `GuideController`, `GuideProfileController`; Method — `index`, `search`, `filter`, `show`, `store`, `update`, `destroy`, `trashed`, `restore`, `forceDelete`, `statistics`, `availableUsers`, `uploadAvatar`, `deleteAvatar`, guide `show`/`update`/`changePassword`; Route — các route nêu tại trường API; Model — `Guide`, `GuideLanguage`, `GuideExperience`, `User`, `Destination`, `Language`, `LanguageLevel`, `Certificate`; bảng pivot `guide_destinations` được truy cập qua relation `Guide::destinations()`. File `app/Models/GuideDestination.php` không khai báo class `GuideDestination` mà khai báo nhầm `TourGuideAssignment`, vì vậy **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về App model `GuideDestination` hợp lệ; Migration — `2026_06_14_145318_create_guides_table.php`, `2026_07_07_055358_create_guide_destinations_table.php`, `2026_06_24_042946_drop_and_recreate_guide_languages_table.php`, `2026_06_24_042950_drop_and_recreate_guide_experiences_table.php`, `2026_07_01_031420_add_avatar_url_to_guides_table.php`.

### FR-018 — Phân công và thay thế hướng dẫn viên

- **Actor:** Admin; Tour guide.
- **Trigger:** Admin tải planning/candidates, tự động hoặc trực tiếp phân công, hủy assignment; guide gửi/xem trạng thái yêu cầu thay thế; admin duyệt/từ chối yêu cầu.
- **Preconditions:** Departure chưa bị mutation guard khóa; guide active/có user và không xung đột lịch/leave theo nhánh tương ứng; replacement yêu cầu guide có assignment không canceled và gửi trước ngày đi ít nhất 5 ngày; admin chỉ xử lý request pending.
- **Main Flow:** Planning/candidates dựng danh sách đủ điều kiện; auto assign service xếp hạng rồi tạo assignment; assign-specific xác minh và tạo; direct assign luôn chặn lịch/leave và xử lý lệch khu vực theo cờ force; cancel xóa assignment; guide tạo replacement request/evidence/notification; approve chạy transaction hủy assignment cũ, chọn/tạo assignment mới, cập nhật request và gửi notification; reject cập nhật request/notification.
- **Alternative Flow:** Candidate mode `eligible` hoặc `all`; direct assign cho phép `force_area_mismatch = true`; auto assign ưu tiên tổng ngày tour thấp hơn, số tour, lần phân công, kinh nghiệm rồi ID; guide có endpoint chỉ đọc trạng thái replacement hiện tại.
- **Exception Flow:** Conflict/leave/area mismatch không được force bị từ chối; replacement quá muộn trả `422`; pending request trùng trả `409`; request đã xử lý trả `409`; không tìm được guide thay thế trả `422`; resource/assignment không khớp trả `404`/authorization error.
- **Database:** Read — `tour_departures`, `tour_guide_assignments`, `guides`, destinations/languages, `guide_leave_requests`, `guide_replacement_requests`; Insert — assignment, replacement request, notifications; Update — replacement status/reviewer, assignment cũ khi approve theo controller; Delete — cancel và approve xóa/hủy assignment cũ theo logic hiện có.
- **Validation:** Planning `from/to`, tour ID, per-page 1–100; assign yêu cầu guide ID tồn tại; direct candidates validate mode/filter; direct assign validate guide và `force_area_mismatch`; replacement reason 10–2.000, evidence JPG/JPEG/PNG/WebP/PDF tối đa 5.120 KB; admin note tối đa 2.000.
- **Authorization:** Admin routes dùng `auth:sanctum`, `role:admin`; replacement phía guide dùng `auth:sanctum`, `role:tour guide` và xác minh assignment của guide hiện tại.
- **API:** `/api/admin/tour-departures/guide-planning`; `/{departure}/guide-candidates`; `/auto-assign-guide`; `/assign-guide`; `/guide-assignments/{assignment}/cancel`; `/direct-guide-candidates`; `/direct-assign-guide`; `POST|GET /api/guide/tours/{tourDeparture}/replacement-requests*`; `/api/admin/guide-replacement-requests` và `/{id}/approve|reject`.
- **Response:** Planning/candidate paginator, assignment, replacement request/status và message; mã lỗi có bằng chứng gồm `404`, `409`, `422`.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php`, `backend_laravel/app/Http/Controllers/Api/Guide/GuideTourController.php`, `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideReplacementRequestController.php`, `backend_laravel/app/Http/Requests/StoreGuideReplacementRequest.php`, `backend_laravel/app/Services/GuideAssignmentService.php`; Class — `TourDepartureGuideAssignmentController`, `GuideTourController`, `AdminGuideReplacementRequestController`, `StoreGuideReplacementRequest`, `GuideAssignmentService`; Method — `planning`, `candidates`, `autoAssign`, `assign`, `cancel`, `directCandidates`, `directAssign`, `requestReplacement`, `replacementRequestStatus`, `index`, `approve`, `reject`, `eligibleGuidesQuery`, `hasScheduleConflict`, `assignSpecific`; Route — các route nêu tại trường API; Model — `TourGuideAssignment`, `Guide`, `TourDeparture`, `GuideLeaveRequest`; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về model Eloquent riêng cho `guide_replacement_requests`, controller dùng query builder; Migration — `2026_06_28_092905_create_tour_guide_assignments_table.php`, `2026_07_07_080821_add_assignment_fields_to_tour_guide_assignments_table.php`, `2026_07_12_000000_create_guide_replacement_requests_table.php`.

### FR-019 — Không gian guide, điểm danh và tiến độ tour

- **Actor:** Tour guide.
- **Trigger:** Guide tải dashboard/tour được phân công/khách; tạo attendance session; check-in/check-out/cập nhật ghi chú; xem hoặc chuyển stage.
- **Preconditions:** Có token/role guide, có guide profile và assignment không canceled với departure; thao tác điểm danh chỉ khi tour đang diễn ra và đúng ngày boundary; participant thuộc booking của departure.
- **Main Flow:** Dashboard/tour controller trả danh sách upcoming/ongoing/completed/detail; operation service xác minh quyền assignment; tạo session theo departure/return; check-in/out khóa session/attendance rồi ghi user/time/status; update note/status theo rule; stages được khởi tạo từ itinerary khi cần, advance transaction hoàn thành stage hiện tại và kích hoạt stage kế tiếp.
- **Alternative Flow:** Session dùng `firstOrCreate` và unique departure-boundary; customer list lọc keyword/status/session/boundary; guide có thể xem overview/statistics/customer detail mà không ghi dữ liệu.
- **Exception Flow:** Sai assignment phát sinh authorization exception; tour không ongoing/không đúng ngày boundary bị validation từ chối; check-in lặp, check-out trước check-in hoặc lặp check-out bị từ chối; participant sai departure bị từ chối; qua stage cuối bị từ chối.
- **Database:** Read — `tour_guide_assignments`, `tour_departures`, `bookings`, `booking_participants`, `tour_itineraries`, sessions/attendance/stages; Insert — `attendance_sessions`, `attendances`, `tour_departure_stages`; Update — attendance check-in/out/note/status, stage và `tour_departures.current_stage_id`; Delete — không có endpoint xóa attendance/session/stage.
- **Validation:** Customer filter keyword tối đa 100, status trong tập cho phép, per-page 1–100; session yêu cầu boundary `departure|return`; action yêu cầu participant ID tồn tại; note tối đa 1.000 và status tùy chọn `not_checked_in|absent`.
- **Authorization:** Nhóm route dùng `auth:sanctum`, `role:tour guide`; `GuideTourOperationService` kiểm tra guide profile và assignment cho từng departure.
- **API:** `GET /api/guide/dashboard`; `GET /api/guide/tours`, `/upcoming`, `/ongoing`, `/completed`, `/{departureId}`; các route `/{tourDeparture}/overview`, `/customers*`, `/attendance/statistics`, `/attendance-sessions*`, `/check-in`, `/check-out`, `/notes`, `/stages`, `/stages/advance`.
- **Response:** Dashboard/tour, paginator khách, attendance statistics/session/resource, customer detail, stage list/current stage hoặc message; authorization/validation/not-found theo service/controller.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Guide/GuideDashboardController.php`, `backend_laravel/app/Http/Controllers/Api/Guide/GuideTourController.php`, `backend_laravel/app/Http/Controllers/Api/Guide/GuideAttendanceController.php`, `backend_laravel/app/Services/GuideTourOperationService.php`, các request `GuideTourCustomerIndexRequest.php`, `AttendanceSessionQueryRequest.php`, `StoreAttendanceSessionRequest.php`, `AttendanceActionRequest.php`, `UpdateAttendanceNoteRequest.php`; Class — `GuideDashboardController`, `GuideTourController`, `GuideAttendanceController`, `GuideTourOperationService` và các FormRequest nêu trên; Method — `show`, `index`, `upcoming`, `ongoing`, `completed`, `overview`, `customers`, `statistics`, `sessions`, `showCustomer`, `storeSession`, `checkIn`, `checkOut`, `updateNote`, `stages`, `advanceStage`; Route — các route nêu tại trường API; Model — `TourGuideAssignment`, `TourDeparture`, `BookingParticipant`, `AttendanceSession`, `Attendance`, `TourDepartureStage`; Migration — `2026_07_02_143241_create_guide_attendance_and_stage_tables.php`, `2026_07_18_000000_add_boundary_to_attendance_sessions_table.php`.

### FR-020 — Đơn xin nghỉ hướng dẫn viên

- **Actor:** Tour guide; Admin.
- **Trigger:** Guide list/summary/tạo/hủy đơn; admin list/summary/xem/approve/reject/cập nhật quyết định.
- **Preconditions:** Guide có profile; bảng leave tồn tại; ngày bắt đầu ít nhất 5 ngày sau; không trùng đơn pending/approved; guide chỉ hủy đơn của mình đang pending; admin không xử lý canceled hoặc đơn đã hết kỳ theo rule controller.
- **Main Flow:** Guide validate, kiểm tra overlap, transaction tạo request pending, lưu attachment và notification admin; list/summary chỉ lấy dữ liệu guide hiện tại; cancel đổi trạng thái/metadata và thông báo; admin filter/xem, validate decision, cập nhật approver/note/reviewed time/status và gửi notification.
- **Alternative Flow:** Evidence là tùy chọn; admin có thể dùng endpoint approve/reject riêng hoặc `PATCH decision`; list hỗ trợ status/date/month/year/search theo controller; UI/backend suy ra leave state từ ngày nhưng không lưu thành enum riêng.
- **Exception Flow:** Chưa migrate bảng: list trả collection rỗng kèm message, create trả `500`; thiếu guide profile trả `404`; overlap hoặc trạng thái không cho phép trả `422`; sai owner/role bị từ chối; lỗi transaction rollback.
- **Database:** Read — `guide_leave_requests`, attachments, guides/users/admin, notifications; Insert — leave request, attachment, notification; Update — status/cancel/admin/reviewed metadata; Delete — model có soft delete nhưng không tìm thấy route delete/force-delete trong flow này.
- **Validation:** Create: start date ≥ hôm nay+5 ngày, end ≥ start, reason 10–2.000, tối đa 8 evidence JPG/JPEG/PNG/WebP/PDF, mỗi file 5.120 KB; admin decision status `approved|rejected`, note tối đa 2.000; `cancel_reason` được đọc nhưng **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về validation cho field này.
- **Authorization:** Guide routes dùng `auth:sanctum`, `role:tour guide` và owner; admin routes dùng `auth:sanctum`, `role:admin`.
- **API:** `GET /api/guide/leave-requests`; `/summary`; `POST /api/guide/leave-requests`; `PATCH /api/guide/leave-requests/{leaveRequest}/cancel`; `GET /api/admin/guide-leave-requests`; `GET /{leaveRequest}`; `POST /{leaveRequest}/approve|reject`; `PATCH /{leaveRequest}/decision`.
- **Response:** Paginator/summary/detail/request/message; tạo `201`; các mã trực tiếp gồm `404`, `422`, `500`, cùng `401`/`403` từ middleware.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php`, `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideLeaveRequestController.php`; Class — `GuideLeaveRequestController`, `AdminGuideLeaveRequestController`; Method — `index`, `summary`, `store`, `cancel`, `show`, `approve`, `reject`, `updateDecision`; Route — các route nêu tại trường API; Model — `GuideLeaveRequest`, `GuideLeaveRequestAttachment`, `Guide`, `Notification`; Migration — `backend_laravel/database/migrations/2026_07_13_000000_create_guide_leave_requests_tables.php`.

### FR-021 — Quản lý nhân viên hỗ trợ và không gian support

- **Actor:** Admin; Support staff.
- **Trigger:** Admin list/statistics/lấy user khả dụng/tạo/xem/sửa/xóa/restore support staff hoặc quản lý avatar; support staff xem/sửa profile, đổi password và đi vào các API request/notification thuộc không gian support.
- **Preconditions:** Có token và role đúng; user dùng tạo profile phải tồn tại, có role `support staff` và chưa có profile hoàn chỉnh; support profile tồn tại cho update; resource theo ID tồn tại.
- **Main Flow:** Admin lấy user khả dụng; store validate và lấy name/email từ user rồi tạo hoặc restore profile soft-deleted; update đồng bộ dữ liệu; status hidden đặt `hidden_at`, trạng thái khác xóa mốc này; destroy/restore/forceDestroy quản lý vòng đời; avatar lưu/xóa; support profile controller đồng bộ name/email/status giữa user và support profile, đổi mật khẩu sau kiểm tra password cũ.
- **Alternative Flow:** Một profile cũ soft-deleted có thể được restore và hoàn thiện thay vì insert mới; các chức năng xử lý support request và notification dùng controller riêng đã mô tả tại FR-008/FR-010; admin list/trash có filter/pagination.
- **Exception Flow:** User sai role/đã có profile, input sai hoặc state không phù hợp trả nhánh `422`; resource thiếu trả `404`; storage lỗi theo controller; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về API lịch làm việc support dù frontend có page `/support/work-schedule`.
- **Database:** Read — `support_staff`, `users`, `roles`, cùng support request/notification ở module liên quan; Insert — support staff/profile; Update — profile, user, status/hidden_at/avatar; Delete — soft delete, restore và force delete qua route admin.
- **Validation:** Create yêu cầu user ID tồn tại, specialization thuộc constant, experience 0–40, role/status thuộc tập controller, performance rating 0–5; update dùng `sometimes`; user ID unique trong support staff chưa xóa; avatar JPG/JPEG/PNG/WebP tối đa 2.048 KB.
- **Authorization:** Admin endpoints dùng `auth:sanctum`, `role:admin`; profile/request/notification support dùng `auth:sanctum`, `role:support staff` và user hiện tại.
- **API:** `/api/admin/support-staff`, `/statistics`, `/available-users`, `/trashed`, `/{id}`, `/{id}/restore`, `/{id}/force-delete`, `/{id}/avatar`; `GET|PUT /api/support/profile`; `PUT /api/support/change-password`; các route support ở FR-008/FR-010.
- **Response:** JSON list/statistics/detail/profile/message/avatar URL; lỗi `404`/`422`/middleware; không có response API work-schedule vì không tìm thấy route.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Admin/SupportStaffController.php`, `backend_laravel/app/Http/Controllers/Api/Support/SupportProfileController.php`, `backend_laravel/app/Http/Controllers/Api/Support/SupportRequestController.php`, `backend_laravel/app/Http/Controllers/Api/Support/SupportNotificationController.php`, `frontend_react/src/pages/support/SupportWorkSchedulePage.jsx`; Class — `SupportStaffController`, `SupportProfileController`, `SupportRequestController`, `SupportNotificationController`; Method — `index`, `statistics`, `availableUsers`, `store`, `show`, `update`, `destroy`, `trashed`, `restore`, `forceDestroy`, `uploadAvatar`, `deleteAvatar`, profile methods; Route — các route nêu tại trường API; Model — `SupportStaff`, `User`, `Role`; Migration — `2026_06_22_032814_create_support_staff_table.php`, `2026_07_01_000001_add_user_id_to_support_staff_table.php`, `2026_07_04_000001_add_specialization_and_experience_years_to_support_staff_table.php`.

### FR-022 — Quản lý ngôn ngữ, cấp độ và chứng chỉ

- **Actor:** Admin.
- **Trigger:** Admin CRUD language, CRUD level trong language hoặc CRUD certificate; module guide đọc các dữ liệu này khi cấu hình năng lực.
- **Preconditions:** Có token/role admin; language/level/certificate tồn tại ở thao tác theo ID; certificate không đang được guide sử dụng nếu xóa.
- **Main Flow:** Language controller list/show; store validate language và levels, begin transaction, tạo language/các level rồi commit; update/destroy language; nested methods list/create/update/delete level; certificate controller list/show/create/update/delete; delete certificate kiểm tra quan hệ guide experience trước khi xóa.
- **Alternative Flow:** Language có thể tạo không kèm levels; `issued_by` của certificate nullable; xóa language để database cascade các language levels.
- **Exception Flow:** Tạo language lỗi rollback và trả `500`; duplicate/validation trả `422`; certificate đang được guide sử dụng trả `422`; resource thiếu trả `404` theo controller.
- **Database:** Read — `languages`, `language_levels`, `certificates`, `guide_languages`, `guide_experiences`; Insert — language/level/certificate; Update — ba loại dữ liệu; Delete — language/levels/certificate khi không vướng rule, levels cascade khi xóa language.
- **Validation:** Language name required unique max 100; level name max 20 và không trùng trong cùng language; certificate name required unique max 150, `issued_by` nullable max 150; ID/parent được controller xác minh.
- **Authorization:** Toàn bộ routes nằm trong `/api/admin` với `auth:sanctum`, `role:admin`.
- **API:** `GET|POST /api/admin/languages`; `GET|PUT|DELETE /api/admin/languages/{id}`; `GET|POST /api/admin/languages/{languageId}/levels`; `PUT|DELETE /api/admin/languages/{languageId}/levels/{levelId}`; `GET|POST /api/admin/certificates`; `GET|PUT|DELETE /api/admin/certificates/{id}`.
- **Response:** JSON collection/model/message; validation/in-use trả `422`; create language exception trả `500`.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Admin/LanguageController.php`, `backend_laravel/app/Http/Controllers/Api/Admin/CertificateController.php`; Class — `LanguageController`, `CertificateController`; Method — `index`, `show`, `store`, `update`, `destroy`, `levels`, `storeLevel`, `updateLevel`, `destroyLevel`; Route — các route nêu tại trường API; Model — `Language`, `LanguageLevel`, `Certificate`, `GuideLanguage`, `GuideExperience`; Migration — `2026_06_24_042942_create_languages_table.php`, `2026_06_24_042945_create_language_levels_table.php`, `2026_06_24_042945_create_certificates_table.php`, `2026_06_24_042946_drop_and_recreate_guide_languages_table.php`, `2026_06_24_042950_drop_and_recreate_guide_experiences_table.php`.

### FR-023 — Settings và widgets/banner

- **Actor:** Guest/mọi actor đối với public settings/widgets; Admin đối với quản trị.
- **Trigger:** Client đọc public settings/widgets; admin đọc/cập nhật settings hoặc CRUD/toggle widget.
- **Preconditions:** Admin endpoints yêu cầu token/role; widget tồn tại cho show/update/delete/toggle; chỉ key settings trong allowlist được xử lý.
- **Main Flow:** Setting admin index nhóm/trả các key; update validate và `updateOrCreate` từng key, suy ra group từ key; public controller chỉ trả `Setting::PUBLIC_KEYS`; widget controller validate rồi create/update/delete/toggle; public widget controller lọc active và khoảng ngày hiển thị, có thể lọc position/page.
- **Alternative Flow:** Widget type `image` dùng image URL, type `html` dùng HTML content; start/end date nullable; settings được chia system/security/notification/locale/payment/backup; public endpoint loại các key không nằm trong public allowlist.
- **Exception Flow:** Key/value/widget sai trả `422`; widget không tồn tại trả `404`; sai role trả `403`; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về trang React admin chuyên cho widget trong router hiện tại.
- **Database:** Read — `settings`, `banners`; Insert — setting mới qua updateOrCreate, widget; Update — setting/widget/status; Delete — widget; không có endpoint xóa setting.
- **Validation:** Settings: password length 6–32, session 15–10.080, boolean security, language `vi|en`, timezone allowlist, currency `VND|USD`, gateway allowlist, VAT 0–100, backup frequency/time/retention và các email/URL/max rule trong controller; widget: title/type, nội dung theo type, position/pages allowlist, end ≥ start, active/inactive, sort ≥0.
- **Authorization:** `GET /api/settings/public` và `GET /api/widgets` không auth; `/api/admin/settings` và `/api/admin/widgets*` dùng `auth:sanctum`, `role:admin`.
- **API:** `GET|PUT /api/admin/settings`; `GET /api/settings/public`; `GET|POST /api/admin/widgets`; `GET|PUT|DELETE /api/admin/widgets/{id}`; `PATCH /api/admin/widgets/{id}/toggle-status`; `GET /api/widgets`.
- **Response:** JSON settings theo group/key, public key-value, widget collection/detail/message; lỗi `404`, `422` và middleware.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Admin/SettingController.php`, `backend_laravel/app/Http/Controllers/Api/PublicSettingController.php`, `backend_laravel/app/Http/Controllers/Api/Admin/WidgetController.php`, `backend_laravel/app/Http/Controllers/Api/PublicWidgetController.php`; Class — `SettingController`, `PublicSettingController`, `WidgetController`, `PublicWidgetController`; Method — `index`, `update`, `show`, widget `index`/`store`/`show`/`update`/`destroy`/`toggleStatus`; Route — các route nêu tại trường API; Model — `Setting`, `Banner`; Migration — `2026_06_13_000001_create_settings_table.php`, `2026_06_10_220190_create_banners_table.php`, `2026_06_13_000002_add_widget_columns_to_banners_table.php`.

### FR-024 — Sao lưu database

- **Actor:** Admin; **[Suy luận từ source code]** ngữ cảnh thực thi CLI/Scheduler (source không định danh một actor con người riêng).
- **Trigger:** Admin list/tạo/download/xóa backup; command chạy thủ công hoặc scheduler gọi chế độ scheduled.
- **Preconditions:** Admin có token/role; connection là MySQL/MariaDB để tạo dump; binary `mysqldump` và cấu hình DB khả dụng; filename download/delete đúng pattern và file tồn tại; scheduled mode thỏa settings/kỳ chạy.
- **Main Flow:** Controller gọi service list/create/path/delete; service tạo thư mục, chạy `mysqldump` với timeout 300 giây và `--single-transaction`, sau đó prune file quá retention; command scheduled kiểm tra `auto_backup_enabled`, frequency, time và cache kỳ gần nhất trước khi tạo; scheduler kiểm tra command mỗi phút.
- **Alternative Flow:** Command có thể chạy không `--scheduled` để tạo ngay; frequency hỗ trợ daily/weekly/monthly; list sắp/đọc metadata file; download trả binary file thay vì JSON.
- **Exception Flow:** Driver không hỗ trợ hoặc dump lỗi được API chuyển thành lỗi (`422` được test/ghi nhận cho connection không hỗ trợ); filename sai/file thiếu trả lỗi controller/service; delete/download không vượt ra ngoài pattern cho phép.
- **Database:** Read — settings/cấu hình kết nối và cache kỳ chạy; Insert — không có record backup; Update — cache kỳ gần nhất; Delete — không có record DB; backup là file tại `storage/app/backups` và được create/read/delete trên filesystem.
- **Validation:** Filename phải khớp `vivugo-backup-YYYYMMDD-HHMMSS.sql`; retention tối thiểu theo setting; service chỉ chấp nhận MySQL/MariaDB và dùng cấu hình connection hiện tại.
- **Authorization:** Bốn API dùng `auth:sanctum`, `role:admin`; Artisan command/scheduler không đi qua HTTP middleware.
- **API:** `GET|POST /api/admin/backups`; `GET /api/admin/backups/{filename}/download`; `DELETE /api/admin/backups/{filename}`; command `db:backup --scheduled`.
- **Response:** List filename/size/created_at; create/delete trả JSON message/data; download trả file SQL; lỗi JSON theo controller; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về SLA khôi phục hoặc API restore backup.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/routes/console.php`, `backend_laravel/app/Http/Controllers/Api/Admin/DatabaseBackupController.php`, `backend_laravel/app/Services/DatabaseBackupService.php`, `backend_laravel/app/Console/Commands/DatabaseBackupCommand.php`; Class — `DatabaseBackupController`, `DatabaseBackupService`, `DatabaseBackupCommand`; Method — `index`, `store`, `download`, `destroy`, `createBackup`, `listBackups`, `downloadPath`, `deleteBackup`, `pruneOldBackups`, `isValidBackupFilename`, `handle`; Route — các route/command nêu tại trường API; Model — **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về model backup; Migration — **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về bảng backup, module dùng filesystem, `settings` và cache (`2026_06_13_000001_create_settings_table.php`, `0001_01_01_000001_create_cache_table.php`).

### FR-025 — Quản lý loại dịch vụ

- **Actor:** Admin.
- **Trigger:** Admin list/search/filter, tạo, xem, cập nhật hoặc xóa service category.
- **Preconditions:** Có token/role admin; resource tồn tại cho show/update/delete.
- **Main Flow:** FormRequest validate query/payload; controller gọi `ServiceCategoryService`; service paginate/find/create/update/delete; model tự sinh slug unique khi create hoặc đổi name; delete dùng soft delete; resource chuẩn hóa output.
- **Alternative Flow:** List lọc search/status và phân trang; description nullable; slug uniqueness kiểm tra cả bản ghi soft-deleted theo model.
- **Exception Flow:** Validation trả `422`; ID không tồn tại trả `404` theo controller; service không bọc transaction; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về restore/force-delete endpoint cho service category.
- **Database:** Read — `service_categories`; Insert — service category; Update — name/slug/description/status; Delete — soft delete, không có hard delete route.
- **Validation:** Search tối đa 255; status boolean; page ≥1, per-page 1–100; create/update yêu cầu name unique tối đa 255, description nullable, status boolean bắt buộc theo FormRequest.
- **Authorization:** API resource nằm trong nhóm `/api/admin` với `auth:sanctum`, `role:admin`.
- **API:** `GET|POST /api/admin/service-categories`; `GET|PUT|PATCH|DELETE /api/admin/service-categories/{id}`. Route resource cấu hình tường minh `->parameters(['service-categories' => 'id'])->whereNumber('id')`.
- **Response:** JSON `success`, `message`, `data`/resource và pagination; `201` khi tạo; lỗi `404`/`422`.
- **Source Code Reference:** File — `backend_laravel/routes/api.php`, `backend_laravel/app/Http/Controllers/Api/Admin/ServiceCategoryController.php`, `backend_laravel/app/Http/Requests/IndexServiceCategoryRequest.php`, `StoreServiceCategoryRequest.php`, `UpdateServiceCategoryRequest.php`, `backend_laravel/app/Services/ServiceCategoryService.php`, `backend_laravel/app/Http/Resources/ServiceCategoryResource.php`; Class — `ServiceCategoryController`, ba FormRequest, `ServiceCategoryService`, `ServiceCategoryResource`; Method — `index`, `store`, `show`, `update`, `destroy`, `paginate`, `find`, `create`, `update`, `delete`, resource `toArray`; Route — API resource nêu tại trường API; Model — `ServiceCategory`; Migration — `backend_laravel/database/migrations/2026_07_03_031102_create_service_categories_table.php`.

## 4. Non-Functional Requirements có bằng chứng

### NFR-001 — Authentication bằng Sanctum

- Hệ thống phát personal access token khi register/login và bảo vệ route bằng `auth:sanctum`; token hiện tại bị xóa khi logout.
- Thời hạn token được tính từ settings trong `AuthController`; password được hash và bị ẩn khỏi JSON ở model user.
- Source Code Reference: `backend_laravel/app/Http/Controllers/Api/AuthController.php`, class `AuthController`, methods `register`, `login`, `logout`; `backend_laravel/config/sanctum.php`; `backend_laravel/app/Models/User.php`; migration `2026_06_10_055225_create_personal_access_tokens_table.php`.

### NFR-002 — Authorization theo role và ownership

- Middleware `CheckRole::handle()` chuẩn hóa role, trả `401` khi chưa có user và `403` khi role không thuộc allowlist; alias `role` được đăng ký tại bootstrap.
- Controller/service còn kiểm tra ownership hoặc assignment trong booking, payment, review, notification và vận hành guide.
- Source Code Reference: `backend_laravel/app/Http/Middleware/CheckRole.php`; `backend_laravel/bootstrap/app.php`; `backend_laravel/routes/api.php`; representative methods `CustomerBookingController::{continuePayment,cancel}`, `Customer\TourReviewController::update`, `GuideTourOperationService` authorization methods.

### NFR-003 — Rate limiting được khai báo rõ

| Route | Limit có trong source |
| --- | --- |
| `POST /api/auth/register` | `throttle:5,1` |
| `POST /api/auth/login` | `throttle:6,1` |
| `POST /api/forgot-password` | `throttle:5,1` |
| `POST /api/chatbot` | `throttle:20,1` |
| `POST|PUT /api/customer/tour-reviews*` | `throttle:10,1` |
| `GET /api/webhooks/vnpay`, `GET /api/vnpay/return-status` | `throttle:60,1` |

Source Code Reference: `backend_laravel/routes/api.php`; test `backend_laravel/tests/Feature/ApiRateLimitTest.php`. **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về rate limit riêng cho các route khác ngoài middleware/framework mặc định không được khai báo tại route.

### NFR-004 — Transaction cho thay đổi nhiều bản ghi

- `DB::transaction()`/transaction tường minh được dùng trong booking, payment, tour review, guide review, support request, gửi notification draft, tour, departure, user/guide, assignment/replacement, attendance/stage và leave request. `NotificationController::revoke()` xóa notification rồi cập nhật draft nhưng không được bọc transaction.
- Source Code Reference đại diện: `CustomerBookingController::store`; `VnpayPaymentController::processVnpayResponse`; `Customer\TourReviewController::{store,update}`; `Admin\TourReviewController::updateStatus`; `CustomerSupportRequestController::store`; `GuideTourOperationService::{createAttendanceSession,checkIn,checkOut,advanceStage}`; `AdminGuideReplacementRequestController::approve`.

### NFR-005 — Pessimistic locking tại điểm tranh chấp

- `lockForUpdate()` được dùng trước khi giữ/hoàn slot, chuyển payment, ghi/tính lại review, tạo assignment, điểm danh và chuyển stage.
- Source Code Reference: `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php`; `Customer/VnpayPaymentController.php`; `Customer/TourReviewController.php`; `Admin/TourReviewController.php`; `backend_laravel/app/Services/VnpayPaymentLifecycleService.php`; `GuideAssignmentService.php`; `TourReviewService.php`; `GuideTourOperationService.php`.

### NFR-006 — Rollback và bù trừ file có giới hạn

- Laravel transaction tự rollback khi closure ném exception; `LanguageController::store()` dùng `beginTransaction`/`commit`/`rollBack` tường minh.
- `CustomerSupportRequestController::store()` xóa các file đã upload khi transaction tạo yêu cầu thất bại.
- Migration tour review có `down()` chuyển dữ liệu ngược trước khi drop bảng; phạm vi rollback migration được mô tả chi tiết ở tài liệu dữ liệu.
- Source Code Reference: `backend_laravel/app/Http/Controllers/Api/Admin/LanguageController.php`; `backend_laravel/app/Http/Controllers/Api/Customer/CustomerSupportRequestController.php`; `backend_laravel/database/migrations/2026_07_21_000000_create_tour_reviews_table.php`.

### NFR-007 — Logging chỉ có bằng chứng cục bộ

- Chat AI ghi `Log::warning` khi Gemini trả lỗi và `Log::error` khi phát sinh exception.
- Laravel logging channels có cấu hình tại `backend_laravel/config/logging.php`.
- Source Code Reference: `backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php`, method `callGemini`; `backend_laravel/config/logging.php`.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về logging bắt buộc/thống nhất cho mọi request hay mọi thay đổi nghiệp vụ.

### NFR-008 — Cache có bằng chứng trong scheduled backup

- `DatabaseBackupCommand` dùng `Cache::get()` và `Cache::forever()` với key `database_backup.last_scheduled_period` để không chạy lại cùng kỳ.
- Cache store được cấu hình trong `backend_laravel/config/cache.php`; migration cache là `0001_01_01_000001_create_cache_table.php`.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về cache kết quả catalog/report hoặc cache response API.

### NFR-009 — Scheduler

- `db:backup --scheduled` và `vnpay:expire-pending-payments` chạy mỗi phút; `guide-reviews:send-reminders` chạy hàng giờ và `withoutOverlapping()`.
- Source Code Reference: `backend_laravel/routes/console.php`; classes `DatabaseBackupCommand`, `ExpirePendingVnpayPayments`, `SendGuideReviewReminders`, method `handle`.

### NFR-010 — Queue chỉ có cấu hình, chưa có bằng chứng sử dụng nghiệp vụ

- Default queue connection cấu hình là `database`; có cấu hình jobs, job batches, failed jobs; script dev chạy `php artisan queue:listen --tries=1`.
- Source Code Reference: `backend_laravel/config/queue.php`; `backend_laravel/composer.json`; migration `0001_01_01_000002_create_jobs_table.php`.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về class Job/`ShouldQueue` hoặc lời gọi dispatch trong code ứng dụng đã rà soát.

### NFR-011 — File storage

- Disk local/public/S3 được khai báo; upload nghiệp vụ đang dùng disk public ở nhiều controller; backup dùng thư mục riêng trong `storage/app/backups`.
- Filename backup được allowlist bằng regex; avatar/evidence/attachment có giới hạn MIME và kích thước tại controller.
- Source Code Reference: `backend_laravel/config/filesystems.php`; `CustomerSupportRequestController::store`; `GuideLeaveRequestController::store`; `GuideController::{uploadAvatar,deleteAvatar}`; `SupportStaffController::{uploadAvatar,deleteAvatar}`; `DatabaseBackupService`.

### NFR-012 — Giới hạn truy vấn và phân trang có bằng chứng

- Public tour giới hạn `per_page` 1–50; public tour review 5–50; admin review 5–100; guide/customer review clamp 1–50; guide customer và service category tối đa 100; nhiều dashboard/home dùng `limit`/`take` tường minh.
- Chat chỉ lấy tối đa 10 lịch sử và 10 tour; Gemini timeout 15 giây; mysqldump timeout 300 giây.
- Source Code Reference: `Customer\TourController`, public/admin `TourReviewController`, hai `GuideReviewController`, `GuideTourCustomerIndexRequest`, `IndexServiceCategoryRequest`, `PublicCatalogController`, `GuideDashboardController`, `ChatBotController`, `DatabaseBackupService`.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về SLA latency, throughput, số user đồng thời hoặc benchmark.

### NFR-013 — Audit/history theo từng nghiệp vụ, không thống nhất toàn hệ thống

- Booking có `booking_status_histories`; tour review lưu moderator/moderated_at; leave request lưu admin/reviewed_at; assignment lưu assigned_by/assigned_at; notification lưu read/sent metadata theo migration/model.
- Source Code Reference: model `BookingStatusHistory`, `TourReview`, `GuideLeaveRequest`, `TourGuideAssignment`, `Notification`; migrations `2026_06_10_220200_create_booking_status_histories_table.php`, `2026_07_21_000000_create_tour_reviews_table.php`, `2026_07_13_000000_create_guide_leave_requests_tables.php`, `2026_07_07_080821_add_assignment_fields_to_tour_guide_assignments_table.php`, `2026_06_24_161627_modify_notifications_table.php`.
- `system_logs` chỉ có migration/seeder, không có API quản trị: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về audit log thống nhất cho toàn hệ thống.

## 5. Data Requirements

### 5.1 Nguồn sự thật schema

- Toàn bộ migration tạo/sửa bảng nằm tại `backend_laravel/database/migrations`.
- Inventory đã đối chiếu 63 bảng, FK, unique, index, cardinality, soft delete và ERD tại [07-database-erd.md](./07-database-erd.md).
- Model Eloquent nằm tại `backend_laravel/app/Models`; model chỉ là bằng chứng hành vi ORM, còn kiểu cột/FK/index/unique lấy migration làm nguồn chính.

### 5.2 Ràng buộc dữ liệu trọng yếu

| Ràng buộc | Bằng chứng migration |
| --- | --- |
| Một contact/booking | Unique `booking_contacts.booking_id` trong `2026_06_10_220070_create_booking_contacts_table.php`. |
| Một payment/booking | Unique `payments.booking_id` trong `2026_06_10_220090_create_payments_table.php`. |
| Một tour review/booking | Unique `tour_reviews.booking_id` trong `2026_07_21_000000_create_tour_reviews_table.php`. |
| Một wishlist user-tour | Unique cặp trong `2026_06_10_220110_create_wishlists_table.php`. |
| Một assignment guide-departure | Unique cặp trong `2026_06_28_092905_create_tour_guide_assignments_table.php`. |
| Một attendance session/departure-boundary | Unique cặp sau `2026_07_18_000000_add_boundary_to_attendance_sessions_table.php`. |
| Một attendance/session-participant | Unique cặp trong `2026_07_02_143241_create_guide_attendance_and_stage_tables.php`. |
| Slug/name quản trị | Unique theo migration của categories/destinations/tours/languages/certificates/service categories; phạm vi cụ thể xem tài liệu ERD. |

### 5.3 Backfill và rollback dữ liệu có bằng chứng

- `2026_07_07_040324_backfill_missing_booking_payments.php` bổ sung payment thiếu cho booking theo logic migration.
- `2026_07_21_000000_create_tour_reviews_table.php` backfill review cũ có `guide_id = null` sang `tour_reviews`; `down()` chuyển ngược trước khi drop.
- `2026_07_03_104500_sync_partner_service_types_to_service_categories.php` đồng bộ dữ liệu loại dịch vụ/partner theo migration.
- Không suy rộng các migration này thành quy trình import/export nghiệp vụ.

## 6. Response và Error Conventions

- API chủ yếu trả JSON bằng `response()->json()`; download backup trả `BinaryFileResponse`; VNPAY callback có response contract riêng; resource/paginator được dùng ở các module catalog/service category.
- `bootstrap/app.php` chuẩn hóa `AuthenticationException` cho `api/*` thành JSON `status=error`, message tiếng Việt, HTTP `401`.
- `CheckRole::handle()` trả `401` khi không có user và JSON `success=false`, `errors=[]`, HTTP `403` khi sai role.
- Laravel validation tại controller/FormRequest trả `422`; các controller dùng `404` cho not-found/ownership, `409` cho conflict review/booking-departure/replacement, và một số nhánh `500` có message. `503` cho thiếu cấu hình VNPAY được tìm thấy tại `VnpayPaymentController::returnStatus()`; tạo booking thiếu cấu hình dùng `ValidationException` nên trả `422`.
- Source Code Reference: `backend_laravel/bootstrap/app.php`; `backend_laravel/app/Http/Middleware/CheckRole.php`; các controller/request tại FR-001–FR-025.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về một response envelope duy nhất: source hiện dùng xen kẽ `status`, `success`, `message`, `data`, resource và paginator thô.

## 7. State Machine

State machine có bằng chứng cho booking/payment, tour/departure, tour review, guide review, assignment/replacement, attendance/stage, guide leave, support request, notification draft, user/guide/support status, category/widget và các trạng thái khác đã được truy vết tại [06-process-and-state-diagrams.md](./06-process-and-state-diagrams.md).

Phần này không lặp lại state machine để tránh biến cách diễn giải tổng hợp thành định nghĩa mới. Với mỗi chuyển trạng thái, nguồn controller/service/model/migration được ghi ngay dưới sơ đồ tương ứng trong tài liệu liên kết.

## 8. Test Traceability

Ma trận dưới đây chỉ ghi test trực tiếp tìm thấy. “Chưa có test trực tiếp” không khẳng định chức năng sai; nó chỉ phản ánh inventory tại `backend_laravel/tests`.

| FR | Test có bằng chứng | Phạm vi được test thể hiện |
| --- | --- | --- |
| FR-001 | `tests/Feature/RbacAuthorizationTest.php`; `ApiRateLimitTest.php`; `BackupSettingsTest.php` | Login theo status, auth me/role, public/admin authorization, throttle login, password-min setting. |
| FR-002 | `tests/Feature/PublicCatalogApiTest.php` | Category/destination active; home chỉ trả nội dung bookable và review visible. |
| FR-003 | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | Chưa tìm thấy Feature test trực tiếp cho wishlist. |
| FR-004 | `tests/Feature/PaymentBookingSafetyTest.php`; `TourReviewApiTest.php` | Tạo/tiếp tục/hủy booking, participant, ownership, slot, payment; booking history có trạng thái review tour. |
| FR-005 | `tests/Feature/PaymentBookingSafetyTest.php` | IPN/return, HMAC/amount, retry/expiry/idempotency, ownership và đồng bộ admin payment. |
| FR-006 | `tests/Feature/TourReviewApiTest.php` | Eligibility/ownership/create/update/public masking/moderation/aggregate/validation/migration rollback. |
| FR-007 | `tests/Feature/GuideReviewApiTest.php` | Customer create/update/list/eligibility; guide xem review/lịch sử. |
| FR-008 | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | Chưa tìm thấy Feature test trực tiếp cho active `support_requests`. |
| FR-009 | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | Chưa tìm thấy test trực tiếp cho chatbot/Gemini/fallback. |
| FR-010 | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | Chưa tìm thấy test trực tiếp cho draft/send/revoke/notification ownership. |
| FR-011 | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | Chưa tìm thấy test trực tiếp cho report overview/charts. |
| FR-012 | `tests/Feature/RbacAuthorizationTest.php` | Authentication/role cho admin customer API; không bao phủ toàn bộ CRUD/lock/profile sync. |
| FR-013 | `tests/Feature/RbacAuthorizationTest.php` | Customer bị cấm mọi category API admin; chưa có test CRUD category trực tiếp. |
| FR-014 | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | Chưa tìm thấy test trực tiếp cho destination CRUD/trash. |
| FR-015 | `tests/Feature/TourDepartureApiTest.php` | Admin tạo/cập nhật tour, itinerary/images và validation nested. |
| FR-016 | `tests/Feature/TourDepartureApiTest.php` | List/create/update/delete departure, price fallback, date/slot và booking guard. |
| FR-017 | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | Chưa tìm thấy test trực tiếp cho guide profile management. |
| FR-018 | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | Chưa tìm thấy test trực tiếp cho assignment/replacement. |
| FR-019 | `tests/Feature/GuideTourAttendanceApiTest.php` | Action theo trạng thái tour, boundary date, customer data và note giữa hai session. |
| FR-020 | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | Chưa tìm thấy test trực tiếp cho guide leave workflow. |
| FR-021 | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | Chưa tìm thấy test trực tiếp cho support staff CRUD/profile. |
| FR-022 | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | Chưa tìm thấy test trực tiếp cho language/level/certificate. |
| FR-023 | `tests/Feature/BackupSettingsTest.php` | Save/validate security, locale, backup settings và public key filtering. |
| FR-024 | `tests/Feature/DatabaseBackupApiTest.php`; `BackupSettingsTest.php` | Auth/role, list/download/delete/create, filename guard và settings. |
| FR-025 | `tests/Feature/ServiceCategoryApiTest.php` | Authorization, CRUD, slug, unique kể cả soft-delete, search/filter/pagination và không có force-delete. |

Các test seed `DemoWorkflowSeederTest.php` và `TourTestingDataSeederTest.php` xác minh dữ liệu demo/lifecycle có thể tạo lặp lại, nhưng không được dùng thay cho test API cụ thể trong bảng trên. `PartnerApiTest.php` xác nhận endpoint partner legacy không khả dụng và là bằng chứng loại khỏi functional requirements.

## 9. System Constraints có bằng chứng

- Backend khai báo PHP `^8.2` và Laravel framework `^12.0`: `backend_laravel/composer.json`.
- Frontend khai báo React `^19.2.6`, React Router `^7.17.0` và Vite `^8.0.12`: `frontend_react/package.json`.
- `frontend_react/package.json` không khai báo root `engines.node`; một số package trong lock file yêu cầu các phiên bản Node cụ thể. Vì vậy, **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về một version Node duy nhất do project tuyên bố trực tiếp.
- Tạo database backup chỉ hỗ trợ connection MySQL/MariaDB và phụ thuộc binary `mysqldump`: `DatabaseBackupService::createBackup()`.
- Payment checkout phụ thuộc cấu hình VNPAY; Chat AI phụ thuộc cấu hình/kết nối Gemini: `VnpayService`, `CustomerBookingController`, `ChatBotController`, `backend_laravel/config/services.php`.
- Frontend và backend là hai package/thư mục riêng, giao tiếp bằng HTTP API: `frontend_react/src/services/apiClient.js`, `backend_laravel/routes/api.php`.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về SLA, mục tiêu availability, RTO/RPO, browser support matrix, throughput, production topology, monitoring hoặc quy trình incident response.

## 10. Explicit Exclusions và artifacts chưa đủ functional evidence

Các mục sau có migration/seeder hoặc dữ liệu nhưng không có đủ chuỗi hành vi route-controller/service đang hoạt động để tạo FR độc lập.

| Artifact | Bằng chứng có | Kết luận phạm vi |
| --- | --- | --- |
| Promotions | `2026_06_10_220050_create_promotions_table.php`, `2026_06_10_220150_create_promotion_usages_table.php`, `PromotionSeeder.php`; booking có `promotion_id` nullable. | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về API/UI customer áp dụng promotion; customer booking hiện gán promotion null. |
| Refund requests | `2026_06_10_220160_create_refund_requests_table.php`. | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về workflow request/approve; admin payment chỉ có thao tác đặt trạng thái refunded. |
| Support tickets/messages legacy | `2026_06_10_220170_create_support_tickets_table.php`, `2026_06_10_220180_create_support_messages_table.php`. | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về route active; flow hỗ trợ hiện dùng `support_requests`. |
| Blogs | `2026_06_10_220120_create_blogs_table.php`. | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về route/controller/page blog. |
| Partners/services legacy | Các migration `partner_service_types`, `partners`, `partner_services`; demo seeder; `PartnerApiTest.php`. | Test xác nhận endpoint legacy không khả dụng; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về module active. |
| System logs | `2026_06_10_220140_create_system_logs_table.php`; demo seeder ghi sample. | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về API/UI xem hoặc audit pipeline ghi thống nhất. |

Ngoài phạm vi tái dựng:

- Dữ liệu production, `.env`, secret, credential thật và cấu hình hạ tầng ngoài repository.
- Hợp đồng/SLA/chính sách của VNPAY, Gemini hoặc nhà cung cấp ngoài source.
- Quy trình thủ công của nhân viên, kế toán, hoàn tiền, kiểm duyệt hoặc vận hành không được code hóa.
- Tính năng chỉ xuất hiện dưới dạng UI placeholder/menu nhưng không có backend flow tương ứng, ví dụ lịch làm việc support.
- Tính năng backend chưa được nối frontend không bị coi là không tồn tại; tài liệu chỉ ghi rõ integration gap tại FR liên quan.

## 11. Điểm cần xác minh trước khi dùng SRS làm baseline triển khai

- Forgot/reset password backend tồn tại nhưng frontend forgot-password là placeholder theo inventory frontend.
- Tour review backend đầy đủ nhưng chưa tìm thấy customer modal/API service/admin page/sidebar React tương ứng.
- Guide history backend có endpoint/page source nhưng router hiện render trang coming-soon theo inventory frontend.
- Attendance backend có check-out/stage API, nhưng frontend attendance chưa gọi đầy đủ các flow này.
- Service category có backend API và component/service frontend, nhưng chưa có route/page/menu React chuẩn.
- Route `GET /api/roles` đang nằm ngoài middleware auth trong `backend_laravel/routes/api.php`; cần xác nhận đây là chủ ý hay cấu hình route chưa hoàn thiện.
- `DestinationController::update()` không có validation trực tiếp được tìm thấy.
- Guide leave `cancel_reason` được đọc nhưng không có rule validation được tìm thấy.
- Queue được cấu hình nhưng không có Job/dispatch nghiệp vụ được tìm thấy.
- Không có response envelope thống nhất; client phải xử lý nhiều dạng response hiện hành.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về quy trình kế toán sau refund, policy hoàn/hủy theo sản phẩm, moderation guide review, xóa tour review, admin sửa nội dung review, API restore backup hoặc audit log toàn hệ thống.
