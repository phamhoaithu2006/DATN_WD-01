# Use Case Specification

## 1. Quy ước

- Tài liệu chỉ mô tả chức năng có route/controller hoặc luồng frontend gọi được trong source.
- **[Suy luận từ source code]** dùng khi mục đích được tổng hợp từ nhiều hành vi thay vì một tuyên bố nghiệp vụ trực tiếp.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** dùng cho thành phần bắt buộc nhưng không có bằng chứng.
- `R` và `W` trong mục Database lần lượt là đọc và ghi. “Status action” là cập nhật trạng thái, không phải xóa.
- URL API có prefix `/api` do `backend_laravel/bootstrap/app.php` nạp `backend_laravel/routes/api.php`.
- Frontend guard chỉ điều hướng giao diện; authorization có hiệu lực được ghi theo middleware/controller backend.

## 2. Public và Authentication

### UC-001 — Đăng ký tài khoản customer

- **Mục tiêu có evidence:** Tạo tài khoản đang hoạt động với role `customer` và phát Sanctum token.
- **Actor:** Guest.
- **Trigger:** Guest gửi biểu mẫu đăng ký.
- **Preconditions:** Email và số điện thoại chưa tồn tại; role tên `customer` tồn tại.
- **Postconditions:** Một user được tạo, mật khẩu được hash, role customer được gán và token được trả về.
- **Input:** `full_name`, `email`, `phone`, `password`, `password_confirmation`.
- **Main flow:** (1) Validate request; (2) đọc role customer và setting độ dài mật khẩu; (3) tạo user status active; (4) tạo token; (5) trả user kèm role và token, HTTP `201`.
- **Alternative flow:** Độ dài tối thiểu dùng `Setting::password_min_length`, mặc định 8 khi setting không có.
- **Exception flow:** Dữ liệu không hợp lệ hoặc email/phone trùng trả validation `422`.
- **Validation:** Full name bắt buộc; email hợp lệ/unique; phone unique; password confirmed và đạt độ dài theo setting.
- **Authorization:** Public; route có throttle `5/phút`, không có `auth:sanctum`.
- **Database:** R `roles`, `settings`, `users`; W `users`, `personal_access_tokens`.
- **API/Response:** `POST /api/auth/register` → `201`, `{message,user,token}`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/AuthController.php`; class `AuthController`; method `register`; route `backend_laravel/routes/api.php`; models `User`, `Role`, `Setting`; migrations `0001_01_01_000000_create_users_table.php`, `2026_06_10_215900_create_roles_table.php`, `2026_06_10_215910_add_vivugo_columns_to_users_table.php`, `2026_06_10_055225_create_personal_access_tokens_table.php`; frontend `frontend_react/src/pages/auth/AuthPage.jsx`, auth API service.

### UC-002 — Đăng nhập, đọc phiên và đăng xuất

- **Mục tiêu có evidence:** Xác thực bằng email hoặc số điện thoại, đọc user hiện tại và thu hồi token hiện dùng khi đăng xuất.
- **Actor:** Guest khi login; user đã xác thực khi đọc phiên/logout.
- **Trigger:** Gửi thông tin đăng nhập, tải lại phiên hoặc chọn đăng xuất.
- **Preconditions:** Login cần user tồn tại, mật khẩu đúng và status `active`; đọc phiên/logout cần Bearer token hợp lệ.
- **Postconditions:** Login tạo token; logout xóa current access token; đọc phiên không sửa dữ liệu.
- **Input:** Login: `identifier`, `password`, `remember`; endpoint phiên/logout không có body nghiệp vụ.
- **Main flow:** (1) Chuẩn hóa identifier; (2) tìm theo email/phone; (3) kiểm tra password/status; (4) tạo token với expiry; (5) frontend lưu token/session; (6) `/auth/me` hoặc `/user` trả user; (7) logout xóa token hiện tại.
- **Alternative flow:** Login nhận fallback field `email`; remember có hiệu lực 30 ngày khi `allow_remember_login` bật, nếu không dùng `session_timeout_minutes`.
- **Exception flow:** Sai credential `401`; user không active `403`; token thiếu/sai `401`.
- **Validation:** Identifier/password bắt buộc; remember boolean.
- **Authorization:** Login public, throttle `6/phút`; `/auth/me`, `/user`, logout dùng `auth:sanctum`; `/user` còn nằm trong nhóm `role:customer`.
- **Database:** R `users`, `roles`, `settings`, `personal_access_tokens`; W token khi login/logout.
- **API/Response:** `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/user`, `POST /api/auth/logout`; trả user/token hoặc message.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/AuthController.php`; class `AuthController`; methods `login`, `me`, `logout`; routes `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/user`, `POST /api/auth/logout`; models `User`, `Setting`; migrations `0001_01_01_000000_create_users_table.php`, `2026_06_10_055225_create_personal_access_tokens_table.php`, `2026_06_13_000001_create_settings_table.php`; frontend `AuthPage.jsx`, `frontend_react/src/services/authStorage.js`, `apiClient.js`, `ProtectedAdminRoute.jsx`.

### UC-003 — Yêu cầu OTP và đặt lại mật khẩu

- **Mục tiêu có evidence:** Ghi OTP cho user được tìm bằng email/phone rồi đổi mật khẩu khi OTP khớp.
- **Actor:** Guest.
- **Trigger:** Gửi identifier tới forgot-password, sau đó gửi OTP và mật khẩu mới.
- **Preconditions:** User khớp identifier tồn tại; bước reset cần OTP đang lưu khớp.
- **Postconditions:** Bước đầu cập nhật OTP; bước reset hash mật khẩu mới và xóa OTP.
- **Input:** Forgot: `identifier`; reset: `identifier`, `otp`, `password`, `password_confirmation`.
- **Main flow:** (1) Tìm user; (2) sinh và lưu OTP; (3) trả response có `otp_in_db`; (4) validate OTP; (5) cập nhật password và clear OTP.
- **Alternative flow:** Identifier có thể là email hoặc số điện thoại.
- **Exception flow:** Không tìm thấy user hoặc OTP không hợp lệ trả lỗi theo controller; validation sai trả `422`.
- **Validation:** Identifier bắt buộc; OTP bắt buộc; password confirmed và theo setting độ dài.
- **Authorization:** Public; forgot-password throttle `5/phút`, reset-password không có throttle riêng tại route.
- **Database:** R/W `users`; R `settings`.
- **API/Response:** `POST /api/forgot-password`, `POST /api/reset-password`; response message, forgot hiện trả `otp_in_db`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Customer/CustomerController.php`; class `CustomerController`; methods `forgotPassword`, `resetPassword`; routes trong `backend_laravel/routes/api.php`; models `User`, `Setting`; migration `2026_06_13_144107_add_otp_to_users_table.php`; frontend `frontend_react/src/pages/auth/ForgotPasswordPage.jsx` là placeholder và không gọi API.

### UC-004 — Xem trang chủ, tìm kiếm và xem tour công khai

- **Mục tiêu có evidence:** Trả catalog tour published, lịch còn mở và dữ liệu trang chủ để guest/user tra cứu tour.
- **Actor:** Guest và mọi role.
- **Trigger:** Mở trang chủ, danh sách, search/filter hoặc chi tiết tour theo slug.
- **Preconditions:** Không yêu cầu đăng nhập.
- **Postconditions:** Không ghi database; trả dữ liệu catalog phù hợp filter.
- **Input:** `keyword`, category/destination, duration, departure date, guests/min slots, khoảng giá, sort và `per_page`.
- **Main flow:** (1) Chỉ query tour published; (2) lọc cùng một departure mở/chưa qua; (3) tính giá ưu tiên giá giảm/giá lịch/giá tour; (4) paginate; (5) detail load category, destination, ảnh, itinerary, age pricing và departures.
- **Alternative flow:** Hỗ trợ alias legacy `start_date`, `min_slots`; sort theo mới nhất, giá, ngày đi, rating hoặc duration.
- **Exception flow:** Filter sai trả `422`; slug không tồn tại/không published trả `404` theo route-model/controller query.
- **Validation:** Keyword tối đa 255; ID/duration/guests integer; giá không âm; per page 1–50; sort trong tập controller.
- **Authorization:** Public, không middleware auth.
- **Database:** R `tours`, `categories`, `destinations`, `tour_destinations`, `tour_departures`, `tour_images`, `tour_itineraries`, `tour_itinerary_images`, `tour_age_pricing_rules`, `bookings`, `tour_reviews`.
- **API/Response:** `GET /api/home`, `/api/catalog/categories`, `/api/catalog/destinations`, `/api/tours`, `/api/tours/search`, `/api/tours/filter`, `/api/tours/{slug}`; trả resource/pagination/home sections.
- **Source Code Reference:** Files `backend_laravel/app/Http/Controllers/Api/PublicCatalogController.php`, `backend_laravel/app/Http/Controllers/Api/Customer/TourController.php`; classes `PublicCatalogController`, `TourController`; methods `home`, `categories`, `destinations`, `index_gdkh`, `search_gdkh`, `filter_gdkh`, `show_gdkh`; models `Tour`, `TourDeparture`, `Category`, `Destination`; migrations `2026_06_10_220020_create_tours_table.php`, `2026_06_10_220040_create_tour_departures_table.php`; frontend `HomePage.jsx`, `ToursPage.jsx`, `TourDetailPage.jsx`, `customerApi.js`.

### UC-005 — Xem đánh giá tour công khai

- **Mục tiêu có evidence:** Trả summary, phân bố sao và review `visible` của tour published mà không lộ email/booking.
- **Actor:** Guest và mọi role.
- **Trigger:** Gọi danh sách review theo slug tour.
- **Preconditions:** Tour theo slug tồn tại và status published.
- **Postconditions:** Chỉ đọc dữ liệu.
- **Input:** `rating` 1–5, `sort` và `per_page` 5–50.
- **Main flow:** (1) Resolve tour published; (2) tính summary từ review visible; (3) lọc/sort; (4) paginate; (5) resource viết tắt tên reviewer.
- **Alternative flow:** Sort `newest`, `oldest`, `highest`, `lowest`; không filter rating thì lấy mọi mức sao.
- **Exception flow:** Tour không published/không tồn tại trả `404`; query sai trả `422`.
- **Validation:** Rating integer 1–5; sort theo enum; per page 5–50.
- **Authorization:** Public; route được khai báo trước route bắt `{slug}`.
- **Database:** R `tours`, `tour_reviews`, `users`; W không có.
- **API/Response:** `GET /api/tours/{slug}/reviews` → `{summary,data,meta/links}` theo paginator/resource.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/TourReviewController.php`; class `TourReviewController`; method `index`; service `TourReviewService::summaryForTour`; resource `PublicTourReviewResource`; models `TourReview`, `Tour`, `User`; migration `2026_07_21_000000_create_tour_reviews_table.php`; frontend `TourDetailPage.jsx` hiện chỉ có placeholder và chưa gọi API.

### UC-006 — Đọc settings và widget công khai

- **Mục tiêu có evidence:** Công bố tập setting được phép và widget đang trong kỳ hiển thị.
- **Actor:** Guest và mọi role.
- **Trigger:** Layout/brand/banner tải cấu hình công khai.
- **Preconditions:** Không yêu cầu đăng nhập.
- **Postconditions:** Chỉ đọc database.
- **Input:** Widget nhận `position`, `page` tùy chọn; settings không có input nghiệp vụ.
- **Main flow:** (1) Settings lọc theo `Setting::PUBLIC_KEYS`; (2) widget lọc active; (3) loại widget chưa bắt đầu hoặc đã hết hạn; (4) sort và trả resource.
- **Alternative flow:** Không truyền position/page thì không áp dụng hai filter đó.
- **Exception flow:** **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về exception nghiệp vụ riêng ngoài lỗi HTTP/framework.
- **Validation:** Position/page nullable string theo controller; visibility theo status/date của model/query.
- **Authorization:** Public.
- **Database:** R `settings`, `banners`; W không có.
- **API/Response:** `GET /api/settings/public`, `GET /api/widgets`; trả object settings hoặc danh sách widget visible.
- **Source Code Reference:** Files `backend_laravel/app/Http/Controllers/Api/PublicSettingController.php`, `backend_laravel/app/Http/Controllers/Api/PublicWidgetController.php`; classes `PublicSettingController`, `PublicWidgetController`; methods `show`, `index`; routes `GET /api/settings/public`, `GET /api/widgets`; models `Setting`, `Banner`; migrations `2026_06_13_000001_create_settings_table.php`, `2026_06_10_220190_create_banners_table.php`, `2026_06_13_000002_add_widget_columns_to_banners_table.php`; frontend `BrandLogo.jsx`, public layout/components.

### UC-007 — Hỏi trợ lý du lịch AI

- **Mục tiêu có evidence:** Lưu hội thoại, truy xuất tour published phù hợp và dùng Gemini tạo câu trả lời.
- **Actor:** Guest hoặc user; `user_id` có thể nullable.
- **Trigger:** Gửi một message tới chatbot/travel-assistant.
- **Preconditions:** Message hợp lệ; gọi Gemini cần cấu hình API tương ứng để nhận response ngoài fallback.
- **Postconditions:** Conversation và user/assistant messages được lưu; trả reply và session ID.
- **Input:** `message` bắt buộc tối đa 1.000; `session_id` tùy chọn tối đa 100.
- **Main flow:** (1) Xác định session; (2) lưu message user; (3) lấy 10 message gần nhất; (4) trích filter; (5) query tối đa 10 tour published; (6) gọi `gemini-2.5-flash`; (7) lưu reply và trả JSON.
- **Alternative flow:** Không có session thì hash IP + user-agent; lỗi Gemini trả fallback và đánh `is_fallback`.
- **Exception flow:** Validation sai `422`; lỗi HTTP/exception Gemini được log và chuyển thành fallback thay vì làm mất response.
- **Validation:** Message/session theo giới hạn trên.
- **Authorization:** Public; `/chatbot` throttle `20/phút`, `/travel-assistant` không có throttle riêng tại route.
- **Database:** R `tours`, lịch/điểm đến liên quan, `chat_messages`; W `chat_conversations`, `chat_messages`.
- **API/Response:** `POST /api/chatbot`, `POST /api/travel-assistant` → `{reply,session_id}`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php`; class `ChatBotController`; methods `handleChat`, `extractFilters`, `buildTourQuery`, `buildSystemPrompt`, `callGemini`; models `ChatConversation`, `ChatMessage`, `Tour`; migrations `2026_07_15_193903_create_chat_conversations_table.php`, `2026_07_15_193904_create_chat_messages_table.php`; frontend `ChatBox.jsx`, `customerApi.askTravelAssistant` hiện không gửi session ID mà component tạo.

### UC-008 — Tiếp nhận kết quả và IPN VNPAY

- **Mục tiêu có evidence:** Xác minh callback VNPAY và đồng bộ payment/booking theo kết quả gateway.
- **Actor:** VNPAY/gateway và trình duyệt quay lại từ VNPAY.
- **Trigger:** Gateway gọi IPN hoặc browser gọi return-status với query VNPAY.
- **Preconditions:** Payment VNPAY tồn tại; cấu hình merchant/hash khả dụng; query có signature/ref/amount.
- **Postconditions:** Payment pending có thể thành success/failed; booking/payment status và slot/history được đồng bộ trong transaction.
- **Input:** Các query `vnp_*` do gateway gửi.
- **Main flow:** (1) Verify HMAC SHA-512; (2) resolve payment theo reference; (3) kiểm tra merchant/amount; (4) khóa payment; (5) success cập nhật payment/booking; (6) trả status/IPN response.
- **Alternative flow:** Hết hạn hoặc customer hủy ở gateway dùng lifecycle fail, cancel booking và hoàn slot; callback lặp không xử lý lại payment không còn pending.
- **Exception flow:** Chưa cấu hình `503`; signature/amount sai `422`; không tìm thấy `404`.
- **Validation:** Chữ ký, merchant, transaction reference và amount được kiểm tra trong service/controller.
- **Authorization:** Public callback; throttle `60/phút` cho mỗi route.
- **Database:** R/W `payments`, `bookings`, `tour_departures`, `booking_status_histories`.
- **API/Response:** `GET /api/webhooks/vnpay`, `GET /api/vnpay/return-status`; IPN trả mã/message VNPAY, return trả trạng thái payment/booking.
- **Source Code Reference:** Files `backend_laravel/app/Http/Controllers/Api/Customer/VnpayPaymentController.php`, `backend_laravel/app/Services/VnpayService.php`, `backend_laravel/app/Services/VnpayPaymentLifecycleService.php`; class/methods `VnpayPaymentController::{ipn,returnStatus}`, `VnpayService::verifyResponse`, `VnpayPaymentLifecycleService::failPendingPayment`; routes `GET /api/webhooks/vnpay`, `GET /api/vnpay/return-status`; models `Payment`, `Booking`, `TourDeparture`, `BookingStatusHistory`; migrations `2026_06_10_220090_create_payments_table.php`, `2026_07_15_000000_add_vnpay_expiry_to_payments_table.php`, `2026_06_10_220200_create_booking_status_histories_table.php`; frontend `VnpayPaymentResultPage.jsx`.

### UC-009 — Đọc và đánh dấu thông báo dùng chung

- **Mục tiêu có evidence:** Cho bất kỳ user đã xác thực đọc notification thuộc chính mình và đánh dấu đã đọc.
- **Actor:** Customer, tour guide, support staff và admin có token hợp lệ.
- **Trigger:** Mở notification feed/detail hoặc bấm đánh dấu đã đọc.
- **Preconditions:** Đã xác thực; notification phải có `user_id` bằng user hiện tại.
- **Postconditions:** Read không đổi dữ liệu; detail/mark read cập nhật trạng thái/read_at của notification sở hữu.
- **Input:** Notification ID cho detail/mark; query phân trang của list.
- **Main flow:** (1) Query theo current user; (2) paginate/list hoặc đếm unread; (3) detail tự đánh read; (4) PATCH đánh read record được chọn.
- **Alternative flow:** Guide React dùng chính endpoint mang tên `/notifications/customers`; tên route không giới hạn role.
- **Exception flow:** Notification của người khác/không tồn tại trả `404`; token sai `401`.
- **Validation:** ID bị ràng buộc numeric ở route; ownership bằng query `user_id`.
- **Authorization:** Chỉ `auth:sanctum`, **không có middleware role customer**; không được gán riêng cho customer trong permission matrix.
- **Database:** R/W `notifications`; R `users`.
- **API/Response:** `GET /api/notifications/customers`, `/unread-count`, `/{id}`; `PATCH /api/notifications/customers/{id}/read`; trả list/count/detail/message.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Customer/NotificationCustomerController.php`; class `NotificationCustomerController`; methods `getMyNotifications`, `getUnreadCount`, `getNotificationDetail`, `markAsRead`; model `Notification`; migrations `2026_06_10_220130_create_notifications_table.php`, `2026_06_24_161627_modify_notifications_table.php`; frontend notification bells/pages, guide notification service.

## 3. Customer

### UC-010 — Xem và cập nhật hồ sơ customer

- **Mục tiêu có evidence:** Customer xem summary, sửa thông tin cá nhân/avatar và đổi mật khẩu.
- **Actor:** Customer.
- **Trigger:** Mở dashboard/profile, lưu profile hoặc đổi mật khẩu.
- **Preconditions:** Token hợp lệ và role `customer`; đổi password cần mật khẩu hiện tại đúng.
- **Postconditions:** Profile/user hoặc password được cập nhật; avatar mới được lưu, file cũ thuộc thư mục quản lý có thể bị thay.
- **Input:** Profile: `full_name`, phone tùy chọn, avatar; password: `current_password`, `new_password`, confirmation.
- **Main flow:** (1) Lấy user hiện tại; (2) validate; (3) lưu profile/avatar hoặc hash password mới; (4) trả user/message.
- **Alternative flow:** Không gửi avatar thì giữ ảnh hiện tại; summary chỉ đọc số liệu customer.
- **Exception flow:** Mật khẩu cũ sai trả `400`; validation sai `422`; token/role sai `401/403`.
- **Validation:** Full name bắt buộc; phone nullable tối đa 10; avatar JPG/JPEG/PNG/WebP tối đa 5.120 KB; password theo setting và confirmed.
- **Authorization:** `auth:sanctum`, `role:customer`; dữ liệu lấy từ current user.
- **Database:** R/W `users`; R `settings`, booking/wishlist cho summary; file W public storage.
- **API/Response:** `GET /api/profile/summary`, `PUT /api/profile/update`, `PUT /api/profile/change-password`; trả summary/user/message.
- **Source Code Reference:** Files `backend_laravel/app/Http/Controllers/Api/Customer/CustomerController.php`, `backend_laravel/app/Http/Controllers/Api/Customer/CustomerDashboardController.php`; classes `CustomerController`, `CustomerDashboardController`; methods `updateProfile`, `changePassword`, `summary`; routes `GET /api/profile/summary`, `PUT /api/profile/update`, `PUT /api/profile/change-password`; model `User`; migrations `0001_01_01_000000_create_users_table.php`, `2026_06_10_215910_add_vivugo_columns_to_users_table.php`, `2026_06_13_000001_create_settings_table.php`; frontend `CustomerPage.jsx`, `ProfileDashboard.jsx`, customer API service.

### UC-011 — Xem lịch sử booking và khả năng đánh giá tour

- **Mục tiêu có evidence:** Customer xem các booking của mình kèm payment, departure, `can_review_tour` và review tour hiện có.
- **Actor:** Customer.
- **Trigger:** Mở mục booking trong profile.
- **Preconditions:** Token hợp lệ, role customer.
- **Postconditions:** Chỉ đọc dữ liệu.
- **Input:** Query phân trang/filter nếu component gửi; không có body.
- **Main flow:** (1) Query booking theo current user; (2) load tour/departure/payment; (3) dùng eligibility service; (4) gắn `tour_review`; (5) trả danh sách.
- **Alternative flow:** Booking chưa đủ điều kiện có `can_review_tour=false`; booking đã review trả object review hiện tại.
- **Exception flow:** Token/role sai `401/403`; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về exception nghiệp vụ riêng cho list này.
- **Validation:** Ownership bằng `user_id`; eligibility theo trạng thái booking/departure/return date.
- **Authorization:** `auth:sanctum`, `role:customer`.
- **Database:** R `bookings`, `tours`, `tour_departures`, `payments`, `tour_reviews`; W không có.
- **API/Response:** `GET /api/profile/bookings` → booking history có `can_review_tour`, `tour_review`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Customer/CustomerDashboardController.php`; class `CustomerDashboardController`; method `bookings`; route `GET /api/profile/bookings`; service `BookingReviewEligibilityService::isReviewable`; models `Booking`, `TourReview`, `Payment`; migrations `2026_06_10_220060_create_bookings_table.php`, `2026_06_10_220090_create_payments_table.php`, `2026_07_21_000000_create_tour_reviews_table.php`; frontend `ProfileDashboard.jsx`, `customerApi.js`.

### UC-012 — Quản lý wishlist

- **Mục tiêu có evidence:** Customer xem, thêm và bỏ tour khỏi danh sách yêu thích.
- **Actor:** Customer.
- **Trigger:** Mở favorites hoặc bấm nút yêu thích/bỏ yêu thích.
- **Preconditions:** Token hợp lệ, role customer; tour ID tồn tại để thêm.
- **Postconditions:** Pivot user-tour được thêm tối đa một lần hoặc bị detach.
- **Input:** Add: `tour_id`; delete: `{tour_id}` trên path.
- **Main flow:** (1) Validate tour; (2) `syncWithoutDetaching` khi thêm; (3) paginate 10 khi list; (4) `detach` khi xóa.
- **Alternative flow:** Thêm lại cùng tour không tạo bản ghi trùng; frontend có optimistic/localStorage nhưng database chỉ đổi khi API thành công.
- **Exception flow:** Tour không tồn tại/validation sai `422`; token/role sai `401/403`.
- **Validation:** `tour_id` required và exists.
- **Authorization:** `auth:sanctum`, `role:customer`; quan hệ thao tác từ current user.
- **Database:** R `wishlists`, `tours`; W pivot `wishlists`.
- **API/Response:** `GET|POST /api/tours/wishlist`, `DELETE /api/tours/wishlist/{tour_id}`; trả TourResource/list hoặc message.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Customer/WishlistController.php`; class `WishlistController`; methods `index`, `store`, `destroy`; models `User`, `Wishlist`, `Tour`; migration `2026_06_10_220110_create_wishlists_table.php`; frontend `CustomerPage.jsx`, `ProfileDashboard.jsx`, `customerApi.js`.

### UC-013 — Xem trước giá và tạo booking VNPAY

- **Mục tiêu có evidence:** Tính giá theo tuổi/số lượng, giữ chỗ và tạo booking/payment pending kèm URL VNPAY.
- **Actor:** Customer.
- **Trigger:** Customer xác nhận thông tin đặt tour.
- **Preconditions:** Tour published; departure open, chưa qua, đủ chỗ; VNPAY đã cấu hình.
- **Postconditions:** Transaction tạo booking, contact, participants, payment, history và tăng `booked_slots`; trả checkout URL hết hạn sau 15 phút.
- **Input:** Departure, số người, contact, participants, note và quantity summary/rule IDs.
- **Main flow:** (1) Preview validate/tính nhóm giá; (2) store khóa departure/tour; (3) kiểm tra slot và giá; (4) tạo toàn bộ record; (5) tăng booked slots; (6) ký URL VNPAY; (7) commit và trả `201`.
- **Alternative flow:** Rule giá tuổi `free`, `fixed`, `percentage`; giá người lớn ưu tiên discount/base/legacy departure rồi tour.
- **Exception flow:** VNPAY thiếu cấu hình, tour/lịch không hợp lệ, không đủ chỗ hoặc pricing sai trả `422`; exception transaction rollback.
- **Validation:** Người 1–20; số participant và tổng quantity phải bằng số người; contact name/phone bắt buộc; email hợp lệ; birth date không sau hôm nay; selected rule thuộc đúng tour và active.
- **Authorization:** `auth:sanctum`, `role:customer`; rate limit riêng **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** tại hai route booking.
- **Database:** R/W `tours`, `tour_departures`; W `bookings`, `booking_contacts`, `booking_participants`, `payments`, `booking_status_histories`; transaction và row lock.
- **API/Response:** `POST /api/customer/bookings/preview` → pricing; `POST /api/customer/bookings` → `201`, booking/payment/`checkout_url`/expiry.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php`; class `CustomerBookingController`; methods `preview`, `store`; routes `POST /api/customer/bookings/preview`, `POST /api/customer/bookings`; request `StoreBookingRequest`; services `TourPricingService`, `VnpayService`; models `Booking`, `BookingContact`, `BookingParticipant`, `Payment`, `TourDeparture`; migrations `2026_06_10_220040_create_tour_departures_table.php`, `2026_06_10_220060_create_bookings_table.php`, `2026_06_10_220070_create_booking_contacts_table.php`, `2026_06_10_220080_create_booking_participants_table.php`, `2026_06_10_220090_create_payments_table.php`, `2026_06_10_220200_create_booking_status_histories_table.php`; frontend `TourDetailPage.jsx`, `customerApi.js`.

### UC-014 — Tiếp tục thanh toán hoặc hủy booking chờ thanh toán

- **Mục tiêu có evidence:** Cho customer sở hữu tái tạo URL thanh toán còn hợp lệ hoặc hủy booking/payment pending và hoàn slot.
- **Actor:** Customer.
- **Trigger:** Bấm “Tiếp tục thanh toán” hoặc “Hủy”.
- **Preconditions:** Booking thuộc current user, status pending; payment unpaid/VNPAY pending; continue cần chưa hết hạn.
- **Postconditions:** Continue trả URL mới/hiện có; cancel chuyển payment failed, booking cancelled, hoàn slot và ghi history.
- **Input:** Booking ID trên path; cancel không có input nghiệp vụ bắt buộc được ghi nhận.
- **Main flow:** (1) Resolve booking theo owner; (2) kiểm tra trạng thái; (3a) continue tạo URL; hoặc (3b) lifecycle khóa record, fail payment, cancel booking, giảm booked slots và ghi history.
- **Alternative flow:** Nếu payment hết hạn khi continue, lifecycle hủy trước rồi trả lỗi.
- **Exception flow:** Không sở hữu `404`; trạng thái không phù hợp/hết hạn `422`; token/role sai `401/403`.
- **Validation:** Ownership, booking/payment status, method VNPAY và expiry.
- **Authorization:** `auth:sanctum`, `role:customer` cộng ownership controller.
- **Database:** R/W `bookings`, `payments`, `tour_departures`, `booking_status_histories`; transaction/row lock ở lifecycle.
- **API/Response:** `POST /api/customer/bookings/{booking}/continue-payment`; `PATCH /api/customer/bookings/{booking}/cancel`; trả checkout/status hoặc message.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php`; class `CustomerBookingController`; methods `continuePayment`, `cancel`; routes `POST /api/customer/bookings/{booking}/continue-payment`, `PATCH /api/customer/bookings/{booking}/cancel`; service `VnpayPaymentLifecycleService::failPendingPayment`; models `Booking`, `Payment`, `TourDeparture`, `BookingStatusHistory`; migrations `2026_06_10_220040_create_tour_departures_table.php`, `2026_06_10_220060_create_bookings_table.php`, `2026_06_10_220090_create_payments_table.php`, `2026_06_10_220200_create_booking_status_histories_table.php`, `2026_07_15_000000_add_vnpay_expiry_to_payments_table.php`; frontend `ProfileDashboard.jsx`, `customerApi.js`.

### UC-015 — Xem trạng thái payment VNPAY của booking sở hữu

- **Mục tiêu có evidence:** Customer theo dõi payment và trạng thái booking sau thanh toán.
- **Actor:** Customer.
- **Trigger:** Trang kết quả thanh toán hoặc profile hỏi trạng thái payment.
- **Preconditions:** Payment method VNPAY và booking thuộc current user.
- **Postconditions:** Chỉ đọc dữ liệu.
- **Input:** Payment ID trên path.
- **Main flow:** (1) Resolve payment; (2) load booking/tour/departure; (3) kiểm tra owner/method; (4) trả status, amount, code, expiry và booking state.
- **Alternative flow:** Response có cancel reason khi booking đã bị hủy.
- **Exception flow:** Không sở hữu hoặc payment không phù hợp bị từ chối theo controller; token/role sai `401/403`.
- **Validation:** Route ID numeric; method phải `vnpay`; ownership qua booking.user_id.
- **Authorization:** `auth:sanctum`, `role:customer` và ownership.
- **Database:** R `payments`, `bookings`, `tours`, `tour_departures`; W không có.
- **API/Response:** `GET /api/customer/payments/vnpay/{payment}` → payment/booking status JSON.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Customer/VnpayPaymentController.php`; class `VnpayPaymentController`; method `status`; route `GET /api/customer/payments/vnpay/{payment}`; models `Payment`, `Booking`; migrations `2026_06_10_220060_create_bookings_table.php`, `2026_06_10_220090_create_payments_table.php`, `2026_07_15_000000_add_vnpay_expiry_to_payments_table.php`; frontend `VnpayPaymentResultPage.jsx`, `customerApi.js`.

### UC-016 — Tạo hoặc sửa đánh giá tour

- **Mục tiêu có evidence:** Customer tạo duy nhất một review cho booking đủ điều kiện và sửa rating/comment của review sở hữu.
- **Actor:** Customer.
- **Trigger:** Gửi form đánh giá mới hoặc sửa review hiện có.
- **Preconditions:** Booking thuộc customer, không cancelled và đã hoàn tất theo eligibility; create chưa có tour review cho booking.
- **Postconditions:** Review được tạo/cập nhật; rating/review count của tour được refresh trong cùng transaction.
- **Input:** Create: `booking_id`, rating, comment; update: rating, comment.
- **Main flow:** (1) Khóa booking/tour hoặc review; (2) kiểm tra ownership/eligibility/duplicate; (3) create status visible hoặc update nội dung; (4) refresh điểm chỉ từ review visible; (5) commit và trả resource.
- **Alternative flow:** Booking completed, departure completed, hoặc confirmed với return date trước hôm nay đều đủ điều kiện; update review hidden/spam giữ nguyên status.
- **Exception flow:** Duplicate `409`; booking không hợp lệ `422`; review người khác `404`; token/role sai `401/403`.
- **Validation:** Rating integer 1–5; comment nullable tối đa 2.000; booking exists.
- **Authorization:** `auth:sanctum`, `role:customer`, ownership; throttle `10/phút` trên create/update.
- **Database:** R/W `tour_reviews`, `tours`; R `bookings`, `tour_departures`; transaction và row lock.
- **API/Response:** `POST /api/customer/tour-reviews` (`201` khi create), `PUT /api/customer/tour-reviews/{tourReview}`; trả `CustomerTourReviewResource`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Customer/TourReviewController.php`; class `TourReviewController`; methods `store`, `update`; requests `StoreTourReviewRequest`, `UpdateTourReviewRequest`; services `TourReviewService`, `BookingReviewEligibilityService`; models `TourReview`, `Booking`, `Tour`; migration `2026_07_21_000000_create_tour_reviews_table.php`; tests `TourReviewApiTest.php`; React **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về service/modal customer tour review.

### UC-017 — Đánh giá hướng dẫn viên và xem hồ sơ review

- **Mục tiêu có evidence:** Customer tạo/cập nhật review HDV được phân công và xem review/lịch sử tour của guide.
- **Actor:** Customer.
- **Trigger:** Mở booking đủ điều kiện, gửi đánh giá hoặc xem profile guide.
- **Preconditions:** Booking thuộc customer và đủ điều kiện; guide có assignment không cancelled trên departure.
- **Postconditions:** Review guide được insert/update, điểm guide được refresh và reminder notification có thể được đánh hoàn thành.
- **Input:** `booking_id`, `guide_id`, rating; comment nullable; list nhận filter/pagination.
- **Main flow:** (1) Lấy reviewable bookings; (2) validate booking/assignment; (3) `firstOrNew` theo booking+guide; (4) lưu rating/comment; (5) refresh guide rating; (6) trả review.
- **Alternative flow:** POST lần sau cập nhật record cũ và giữ status hiện tại; customer có thể chỉ đọc reviews/tour history.
- **Exception flow:** Booking không sở hữu `404`; chưa hoàn tất/guide không được phân công `422`.
- **Validation:** IDs required/exists; rating integer 1–5; comment nullable tối đa 2.000; per page controller giới hạn 1–50.
- **Authorization:** `auth:sanctum`, `role:customer`, ownership và assignment.
- **Database:** R/W `reviews`, `guides`; R `bookings`, `tour_departures`, `tour_guide_assignments`, `notifications`.
- **API/Response:** `GET /api/customer/guide-reviewable-bookings`; `POST /api/customer/guide-reviews`; `GET /api/customer/guides/{guide}/reviews`, `/tour-history`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Customer/GuideReviewController.php`; class `GuideReviewController`; methods `reviewableBookings`, `store`, `guideReviews`, `guideTourHistory`; request `StoreGuideReviewRequest`; services `GuideReviewService`, `BookingReviewEligibilityService`, `GuideReviewNotificationService`; models `Review`, `Guide`, `TourGuideAssignment`; migrations `2026_06_10_220100_create_reviews_table.php`, `2026_07_11_112416_add_guide_context_to_reviews_table.php`; frontend `GuideReviewModal.jsx`, `CustomerNotificationBell.jsx`, `ProfileDashboard.jsx`, `customerReviewApi.js`.

### UC-018 — Gửi yêu cầu hỗ trợ

- **Mục tiêu có evidence:** Customer tạo ticket hỗ trợ kèm tối đa năm file và thông báo cho support staff active.
- **Actor:** Customer.
- **Trigger:** Gửi form hỗ trợ.
- **Preconditions:** Token hợp lệ, role customer; dữ liệu/file đạt validation.
- **Postconditions:** Ticket pending, attachment metadata và notifications support được tạo; file được lưu.
- **Input:** Full name, email, category, subject, description; phone và attachments tùy chọn.
- **Main flow:** (1) Validate; (2) sinh ticket code; (3) transaction tạo request/attachments/notifications; (4) commit; (5) trả `201` và số nhân viên được báo.
- **Alternative flow:** Customer không quyết định priority; controller bỏ priority input và dùng `medium` nếu cột tồn tại.
- **Exception flow:** Validation `422`; lỗi transaction rollback DB và catch xóa các file đã upload.
- **Validation:** Category trong `technical/payment/account/feedback/general`; subject 255; description 10.000; tối đa 5 file JPG/JPEG/PNG/WebP/PDF/DOC/DOCX, 5.120 KB/file.
- **Authorization:** `auth:sanctum`, `role:customer`.
- **Database:** W `support_requests`, `support_request_attachments`, `notifications`; R support users/roles; transaction, file storage rollback thủ công.
- **API/Response:** `POST /api/customer/support-requests` → `201`, ticket/attachments/`notified_staff_count`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Customer/CustomerSupportRequestController.php`; class `CustomerSupportRequestController`; method `store`; models `SupportRequest`, `SupportRequestAttachment`, `Notification`, `User`; migrations `2026_07_16_220919_create_support_requests_table.php`, `2026_07_16_220920_create_support_request_attachments_table.php`; frontend `CustomerSupportPage.jsx`, `supportRequestApi.js`.

## 4. Admin

### UC-019 — Quản lý hồ sơ admin

- **Mục tiêu có evidence:** Admin xem/sửa hồ sơ và đổi mật khẩu của chính mình.
- **Actor:** Admin.
- **Trigger:** Mở profile, lưu thông tin hoặc đổi mật khẩu.
- **Preconditions:** Token hợp lệ, role admin; đổi password cần mật khẩu hiện tại đúng.
- **Postconditions:** User hiện tại được cập nhật hoặc password được hash lại.
- **Input:** Các trường profile theo controller; password hiện tại, password mới và confirmation.
- **Main flow:** (1) Lấy current user; (2) validate; (3) update profile/avatar hoặc password; (4) trả user/message.
- **Alternative flow:** Chỉ gửi các field cần đổi theo validation `sometimes`.
- **Exception flow:** Password hiện tại sai hoặc validation sai trả lỗi theo controller; auth/role sai `401/403`.
- **Validation:** Email unique bỏ qua current user; avatar/type/size và password theo rule trong `AdminProfileController`.
- **Authorization:** `auth:sanctum`, `role:admin`; scope current user.
- **Database:** R/W `users`; file W public storage khi có avatar.
- **API/Response:** `GET|PUT /api/admin/profile`, `PUT /api/admin/profile/password`; trả profile/message.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/AdminProfileController.php`; class `AdminProfileController`; methods `show`, `update`, `changePassword`; routes `GET|PUT /api/admin/profile`, `PUT /api/admin/profile/password`; model `User`; migrations `0001_01_01_000000_create_users_table.php`, `2026_06_10_215910_add_vivugo_columns_to_users_table.php`; frontend admin header/profile integration **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về một route React profile admin riêng trong `AppRoutes.jsx`.

### UC-020 — Xem dashboard và báo cáo quản trị

- **Mục tiêu có evidence:** Tổng hợp doanh thu, booking, customer, guide, support và tour theo dashboard/năm.
- **Actor:** Admin.
- **Trigger:** Mở dashboard hoặc trang Báo cáo & Thống kê.
- **Preconditions:** Token hợp lệ, role admin.
- **Postconditions:** Chỉ đọc/aggregate dữ liệu; React có thể xuất CSV phía client.
- **Input:** `year` tùy chọn, controller cast integer và mặc định năm hiện tại.
- **Main flow:** (1) Query payment success/booking không cancelled theo paid_at; (2) tính revenue/booking/completion/average; (3) aggregate 12 tháng; (4) lấy top destinations và widget stats.
- **Alternative flow:** Không gửi year thì dùng năm hiện tại; frontend chỉ cho chọn ba năm gần nhất nhưng backend không có rule range tương ứng.
- **Exception flow:** **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về exception nghiệp vụ riêng hoặc validation range year.
- **Validation:** Year không có FormRequest/range; authorization tại route.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R `payments`, `bookings`, `users`, `roles`, `guides`, `support_staff`, `tours`, `destinations`; W không có.
- **API/Response:** `GET /api/admin/reports/overview`, `/charts` và statistics APIs module; trả statistics/chart series.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/ReportController.php`; class `ReportController`; methods `getOverviewStatistics`, `getChartStatistics`; models/query tables nêu trên; migration riêng cho report: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; frontend `AdminDashboardPage.jsx`, `ReportStatisticsPage.jsx`, `adminDashboardApi.js`, `reportApi.js`.

### UC-021 — Quản lý tài khoản người dùng

- **Mục tiêu có evidence:** Admin list/search/statistics, tạo, xem, sửa, khóa và mở khóa user theo role.
- **Actor:** Admin.
- **Trigger:** Thao tác trên màn Người dùng.
- **Preconditions:** Token hợp lệ, role admin; create/update role ID tồn tại.
- **Postconditions:** User/profile role liên quan được tạo/cập nhật; lock/unlock đổi status; không có delete endpoint.
- **Input:** Full name, email, password, phone, role ID, status, avatar; search/role/status query.
- **Main flow:** (1) Filter/list hoặc resolve user; (2) validate; (3) transaction create/update và sync hồ sơ theo role; (4) hash password/upload avatar; (5) trả resource.
- **Alternative flow:** Lock đặt inactive; unlock đặt active; frontend dùng một page với `roleName` khác nhau.
- **Exception flow:** User không tồn tại `404`; lock user đã inactive hoặc unlock user đã active `422`; validation trùng email/phone `422`.
- **Validation:** Create email unique/password min 6/role exists; update `sometimes`, status active/inactive, email unique bỏ qua ID; avatar 5.120 KB create và 2.048 KB update theo controller.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `users`, `roles`, có thể `guides`, `support_staff`; transaction; file storage avatar.
- **API/Response:** `/api/admin/customers`, `/statistics`, `/count`, `/search`, `/{id}`, `/{id}/lock`, `/{id}/unlock`, `/api/admin/roles`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/CustomerManagerController.php`; class `CustomerManagerController`; methods `index`, `search`, `statistics`, `count`, `store`, `show`, `update`, `lock`, `unlock`, `index_role`; routes `/api/admin/customers*`, `/api/admin/roles`; models `User`, `Role`, `Guide`, `SupportStaff`; migrations `0001_01_01_000000_create_users_table.php`, `2026_06_10_215900_create_roles_table.php`, `2026_06_10_215910_add_vivugo_columns_to_users_table.php`, `2026_06_14_145318_create_guides_table.php`, `2026_06_22_032814_create_support_staff_table.php`; frontend `UserManagementPage.jsx`, `UserFormModal.jsx`, user API service.

### UC-022 — Quản lý category tour

- **Mục tiêu có evidence:** Admin list/search, tạo/sửa, soft-delete, xem trash và restore category.
- **Actor:** Admin.
- **Trigger:** Thao tác trên màn loại tour/category.
- **Preconditions:** Token/role admin; name hợp lệ và unique khi create/update.
- **Postconditions:** Category được ghi, soft-deleted hoặc restored; thumbnail storage được đồng bộ.
- **Input:** Name, description, thumbnail, alt, status; search name.
- **Main flow:** (1) Validate; (2) sinh slug unique; (3) lưu thumbnail/category; (4) update có thể xóa ảnh cũ quản lý; hoặc soft delete/restore.
- **Alternative flow:** Slug trùng được thêm hậu tố; list trash dùng onlyTrashed.
- **Exception flow:** Không tìm thấy `404`; validation/unique/file sai `422`.
- **Validation:** Name required/max150/unique; description nullable; ảnh JPG/JPEG/PNG/WebP max5.120KB; status active/inactive; search name required/max150.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `categories`; R relation `tours`; soft delete; file W/delete storage.
- **API/Response:** `GET|POST /api/admin/categories`, `GET /search`, `PUT|DELETE /{id}`, `GET /api/admin/categories-trashed`, `PATCH /{id}/restore`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/CategoryController.php`; class `CategoryController`; methods `index`, `search`, `store`, `update`, `destroy`, `trashed`, `restore`; model `Category`; migrations `2026_06_10_220000_create_categories_table.php`, `2026_07_03_112000_add_thumbnail_fields_to_categories_table.php`; frontend `TourTypeListPage`, create/edit/trash pages và category API service.

### UC-023 — Quản lý destination

- **Mục tiêu có evidence:** Admin CRUD, search/filter, soft-delete, trash, restore, force-delete và lấy options destination.
- **Actor:** Admin.
- **Trigger:** Thao tác trên màn điểm đến hoặc chọn khu vực cho guide.
- **Preconditions:** Token/role admin; create có name/slug/province_city/country hợp lệ.
- **Postconditions:** Destination được tạo/cập nhật, soft-deleted/restored hoặc xóa vật lý.
- **Input:** Create fields; update nhận payload; search keyword/city/country.
- **Main flow:** (1) List/search/options hoặc resolve; (2) create validate; (3) update `$request->all()`; (4) soft delete/restore/force delete theo endpoint.
- **Alternative flow:** Search paginate 15; trash chỉ lấy onlyTrashed.
- **Exception flow:** Search không có kết quả trả `404`; record không tồn tại `404`; DB FK có thể ngăn force-delete nhưng controller không bổ sung business rule khác.
- **Validation:** Create required/slug unique; search max lengths; update: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về validation trong method update.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `destinations`; R `tours`, `guide_destinations`; soft/force delete.
- **API/Response:** API resource `/api/admin/destinations`, `/search`, `/trash/list`, `POST /{id}/restore`, `DELETE /{id}/force-delete`, `/guides/destination-options`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/DestinationController.php`; class `DestinationController`; methods `index`, `show`, `store`, `update`, `destroy`, `trashed`, `restore`, `forceDelete`, `search`, `options`; model `Destination`; migration `2026_06_10_220010_create_destinations_table.php`; frontend destination list/create/edit/trash pages và service.

### UC-024 — Quản lý tour, itinerary, ảnh và rule giá tuổi

- **Mục tiêu có evidence:** Admin list/detail/statistics, tạo/sửa, soft-delete, hide/unhide tour cùng nội dung con.
- **Actor:** Admin.
- **Trigger:** Thao tác trên module Tour.
- **Preconditions:** Token/role admin; category/destination tồn tại; payload đạt validation.
- **Postconditions:** Tour và relation/ảnh/rules được ghi trong transaction; hide/unhide đổi status; destroy soft-delete.
- **Input:** Category/destination, title, duration, price/slots/status, mô tả, thumbnail/gallery, itinerary và age pricing rules.
- **Main flow:** (1) Validate; (2) sinh slug/created_by/default slots; (3) transaction tạo/update tour; (4) lưu/sync ảnh, itinerary và age rules; (5) trả `TourResource`.
- **Alternative flow:** Update chỉ sync itinerary/rules khi key có trong request; duration đổi thì nights = days - 1; hide/unhide là status action.
- **Exception flow:** Validation/relation/pricing rule sai `422`; record không tồn tại `404`; transaction rollback khi exception.
- **Validation:** Status `draft/published/hidden/cancelled`; IDs tồn tại; title max255; duration >=1; price numeric; file max5.120KB; itinerary type enum; age pricing type `percentage/fixed/free`.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `tours`, `tour_images`, `tour_itineraries`, `tour_itinerary_images`, `tour_age_pricing_rules`; R category/destination; transaction, soft delete, file storage.
- **API/Response:** `/api/admin/tours`, `/hidden-list`, `/statistics`, `/{id}`, `/{id}/hide`, `/{id}/unhide`; trả list/resource/statistics/message.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/TourManagerController.php`; class `TourManagerController`; methods `index`, `show`, `publicIndex`, `store`, `update`, `destroy`, `hide`, `unhide`, `hiddenTours`, `statistics`; routes `/api/admin/tours*`; service `TourPricingService`; models `Tour`, `TourImage`, `TourItinerary`, `TourItineraryImage`, `TourAgePricingRule`; migrations `2026_06_10_220020_create_tours_table.php`, `2026_06_10_220030_create_tour_images_table.php`, `2026_06_27_000001_create_tour_itineraries_table.php`, `2026_06_27_000002_create_tour_itinerary_images_table.php`, `2026_07_03_120000_create_tour_age_pricing_rules_table.php`; frontend tour list/create/edit/hidden/detail pages, `TourForm.jsx`, `frontend_react/src/services/toursApi.jsx`.

### UC-025 — Quản lý lịch khởi hành

- **Mục tiêu có evidence:** Admin xem lịch theo tour, tạo/sửa/xóa departure và thông báo khi lịch có booking bị thay đổi.
- **Actor:** Admin.
- **Trigger:** Thêm, sửa hoặc xóa một lịch khởi hành.
- **Preconditions:** Token/role admin; tour tồn tại; mutation guard không khóa ngày đã đến/qua.
- **Postconditions:** Departure được ghi/xóa; return date được tính; thay đổi đã xác nhận có thể sinh notification.
- **Input:** Departure date, slots, status, base/discount price; update thêm `change_reason`, `confirm_booked_change`.
- **Main flow:** (1) Validate/guard; (2) tính return date; (3) create hoặc so sánh field update; (4) nếu có booking yêu cầu confirm; (5) transaction save/notify; (6) delete chỉ khi không có booking.
- **Alternative flow:** Không có field thay đổi trả message tương ứng; update đã confirm gửi notification customer/guide/admin.
- **Exception flow:** Ngày bị khóa/giá sai/slot dưới booked `422`; có active booking nhưng chưa confirm `409`; delete có booking `422`.
- **Validation:** Departure từ hôm nay; slots >=1; status enum; discount không vượt base; change reason 3–1.000; confirm boolean.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `tour_departures`; R `tours`, `bookings`, assignments; W `notifications`; transaction ở update/delete, hard delete khi được phép.
- **API/Response:** `GET|POST /api/admin/tours/{tourId}/departures`, `PUT|DELETE /api/admin/tours/departures/{id}`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureController.php`; class `TourDepartureController`; methods `index`, `store`, `update`, `destroy`; services `TourDepartureMutationGuard`, `TourDepartureChangeNotificationService`, `AdminNotificationService`; model `TourDeparture`; migrations `2026_06_10_220040_create_tour_departures_table.php`, `2026_07_06_000001_add_base_and_discount_price_to_tour_departures_table.php`; frontend departure list/create/edit pages, `tourDepartureApi.js`.

### UC-026 — Xem khách đã booking theo lịch

- **Mục tiêu có evidence:** Admin xem danh sách customer/participant đã đặt một departure.
- **Actor:** Admin.
- **Trigger:** Mở danh sách khách của lịch.
- **Preconditions:** Token/role admin; departure tồn tại.
- **Postconditions:** Chỉ đọc dữ liệu.
- **Input:** Tour departure ID trên path; query tùy chọn `search`, `status`, `payment_status`, `per_page`.
- **Main flow:** (1) Resolve departure; (2) query booking/contacts/participants; (3) trả danh sách khách.
- **Alternative flow:** Không có booking trả danh sách rỗng theo controller/resource.
- **Exception flow:** Departure không tồn tại `404`; auth/role sai `401/403`.
- **Validation:** Route model binding; `search` nullable string tối đa 100; `status` nullable string tối đa 50; `payment_status` nullable string tối đa 50; `per_page` nullable integer từ 1 đến 100. Controller không giới hạn `status`/`payment_status` bằng enum.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R `tour_departures`, `bookings`, `booking_contacts`, `booking_participants`, `users`; W không có.
- **API/Response:** `GET /api/admin/tour-departures/{tourDeparture}/booked-customers` → danh sách booking/customer.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/AdminTourDepartureBookingController.php`; class `AdminTourDepartureBookingController`; method `index`; route `GET /api/admin/tour-departures/{tourDeparture}/booked-customers`; models `TourDeparture`, `Booking`, `BookingContact`, `BookingParticipant`; migrations `2026_06_10_220040_create_tour_departures_table.php`, `2026_06_10_220060_create_bookings_table.php`, `2026_06_10_220070_create_booking_contacts_table.php`, `2026_06_10_220080_create_booking_participants_table.php`; frontend departure management components/service.

### UC-027 — Quản lý booking của admin

- **Mục tiêu có evidence:** Admin list/filter/statistics, xem, tạo, cập nhật, hủy và xóa vĩnh viễn booking đã hủy.
- **Actor:** Admin.
- **Trigger:** Thao tác trên màn Booking.
- **Preconditions:** Token/role admin; create cần user/tour hợp lệ; hard delete cần status cancelled.
- **Postconditions:** Booking và contact/participants có thể được tạo/cập nhật; cancel đổi status; destroy xóa booking cancelled.
- **Input:** List filter; create/update booking, contact, participants, price/status; cancel ID.
- **Main flow:** (1) List/statistics hoặc resolve; (2) validate; (3) create/update transaction và tính tổng; (4) cancel qua status action; (5) destroy chỉ sau kiểm tra cancelled.
- **Alternative flow:** Update contact/participants và tính lại total; payment status không được đi qua booking update.
- **Exception flow:** Booking không tồn tại `404`; hard delete chưa cancelled `422`; `payment_status` gửi update bị validation prohibited.
- **Validation:** Search max100; status/payment status enums ở list; update status enum; IDs/pricing/contact/participant theo controller/request.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `bookings`, `booking_contacts`, `booking_participants`; R `booking_status_histories`, `users`, `tours`, `tour_departures`, `payments`; transaction theo method. Trong `Admin\BookingController`, `statusHistories` chỉ được eager-load ở `show()`; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về thao tác ghi bảng này trong controller admin.
- **API/Response:** CRUD `/api/admin/bookings`, `/statistics`, `PATCH /{id}/cancel`; list/detail/resource/message.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/BookingController.php`; class `BookingController`; methods `index`, `statistics`, `show`, `store`, `update`, `softDelete`, `destroy`; routes `/api/admin/bookings*`; models `Booking`, `BookingContact`, `BookingParticipant`, `BookingStatusHistory`, `Payment`; migrations `2026_06_10_220060_create_bookings_table.php`, `2026_06_10_220070_create_booking_contacts_table.php`, `2026_06_10_220080_create_booking_participants_table.php`, `2026_06_10_220090_create_payments_table.php`, `2026_06_10_220200_create_booking_status_histories_table.php`; frontend `BookingManagementPage.jsx`, `bookingApi.js`.

### UC-028 — Quản lý trạng thái payment

- **Mục tiêu có evidence:** Admin xem payment và xác nhận thành công, đánh thất bại hoặc hoàn tiền bằng status endpoint.
- **Actor:** Admin.
- **Trigger:** Chọn thao tác payment trên booking/payment detail.
- **Preconditions:** Token/role admin; payment tồn tại. Controller không kiểm tra trạng thái hiện tại trước khi đổi.
- **Postconditions:** Payment và `bookings.payment_status` được đồng bộ trong transaction.
- **Input:** Payment ID; confirm nhận transaction code max100 và gateway response nullable array.
- **Main flow:** (1) Resolve payment; (2) transaction update payment status/metadata; (3) update booking payment status; (4) trả resource/message.
- **Alternative flow:** Ba action riêng: confirm, fail, refund; không đi qua booking update.
- **Exception flow:** Payment không tồn tại trả `404`; transaction code/gateway response sai validation ở confirm trả `422`. Nhánh từ chối state transition: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- **Validation:** Confirm nhận `transaction_code` nullable string tối đa 100 và `gateway_response` nullable array; action endpoint xác định status đích. Không có validation transition từ status cũ.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `payments`, `bookings`; transaction.
- **API/Response:** `GET /api/admin/payments`, `GET /{id}`, `PATCH /{id}/confirm|fail|refund`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/PaymentController.php`; class `PaymentController`; methods `index`, `show`, `confirm`, `fail`, `refund`; routes `/api/admin/payments*`; models `Payment`, `Booking`; migrations `2026_06_10_220060_create_bookings_table.php`, `2026_06_10_220090_create_payments_table.php`; frontend payment actions trong `BookingManagementPage.jsx`, `paymentApi.js`.

### UC-029 — Quản lý hồ sơ hướng dẫn viên

- **Mục tiêu có evidence:** Admin CRUD profile guide, quan hệ khu vực/ngôn ngữ/chứng chỉ, trash/restore/force-delete và avatar.
- **Actor:** Admin.
- **Trigger:** Thao tác trên màn Hướng dẫn viên.
- **Preconditions:** Token/role admin; user có role guide và chưa có profile active tương ứng; ít nhất một destination.
- **Postconditions:** Guide và relations được tạo/cập nhật; delete có thể soft/force; avatar storage đồng bộ.
- **Input:** User ID, experience, status, destination IDs; languages/levels, experiences/certificates tùy chọn; avatar.
- **Main flow:** (1) Lấy available users/options; (2) validate; (3) transaction create/update guide và sync relation; (4) list/filter/statistics hoặc soft/restore/force; (5) upload/delete avatar.
- **Alternative flow:** Profile soft-deleted được quản lý qua trash/restore; frontend bắt language/certificate nhưng backend cho nullable.
- **Exception flow:** User/quan hệ không hợp lệ hoặc trùng `422`; record không tồn tại `404`; transaction rollback.
- **Validation:** Experience 0–40; status active/inactive/locked; destination array min1/distinct/exists; issued year 1900–năm hiện tại; file avatar theo controller.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `guides`, `guide_destinations`, `guide_languages`, `guide_experiences`; R `users`, roles, destination/language/certificate; transaction, soft/force delete, file storage.
- **API/Response:** `/api/admin/guides*`, `/trashed`, `/restore`, `/force`, `/available-users`, avatar endpoints, options endpoints.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/GuideController.php`; class `GuideController`; methods `index`, `search`, `filter`, `statistics`, `availableUsers`, `show`, `store`, `update`, `destroy`, `trashed`, `restore`, `forceDelete`, `uploadAvatar`, `deleteAvatar`; routes `/api/admin/guides*`; models hợp lệ `Guide`, `GuideLanguage`, `GuideExperience`, `Destination`. Bảng `guide_destinations` là pivot qua `Guide::destinations()`/`Destination::guides()`; App model `GuideDestination`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** vì `backend_laravel/app/Models/GuideDestination.php` khai báo class `TourGuideAssignment`; migrations `2026_06_14_145318_create_guides_table.php`, `2026_07_07_055358_create_guide_destinations_table.php`, `2026_06_24_042946_drop_and_recreate_guide_languages_table.php`, `2026_06_24_042950_drop_and_recreate_guide_experiences_table.php`; frontend `GuideManagementPage.jsx`, `GuideTrashPage.jsx`, guide admin services.

### UC-030 — Phân công hướng dẫn viên cho lịch

- **Mục tiêu có evidence:** Admin xem planning/candidates, auto-assign, assign cụ thể/trực tiếp và hủy assignment.
- **Actor:** Admin.
- **Trigger:** Chọn phân công/hủy guide trên departure.
- **Preconditions:** Departure chưa bị mutation guard khóa; guide active, có user; các constraint tùy nhánh được đáp ứng.
- **Postconditions:** Assignment được tạo hoặc xóa cứng khi cancel.
- **Input:** Departure; guide ID; query mode/filter; `force_area_mismatch` boolean.
- **Main flow:** (1) Planning/candidates; (2) kiểm tra guide phụ trách toàn bộ destination; (3) kiểm tra assignment overlap/rest days/leave; (4) auto chọn theo workload hoặc assign chosen guide; (5) lưu assignment.
- **Alternative flow:** Direct assign luôn chặn schedule/leave nhưng có thể bỏ qua area mismatch nếu force true; React hiện luôn gửi true.
- **Exception flow:** Không eligible/xung đột/nghỉ hoặc departure khóa trả validation error; record không tồn tại `404`.
- **Validation:** Guide ID exists; planning from/to/tour/per-page; direct mode/filter và boolean force theo controller/request.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R `tour_departures`, `guides`, destinations, assignments, leave requests; W `tour_guide_assignments`; unique guide+departure; cancel gọi delete.
- **API/Response:** `/api/admin/tour-departures/guide-planning`, `/{departure}/guide-candidates`, auto/assign/direct candidates/direct assign/cancel endpoints.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php`; class `TourDepartureGuideAssignmentController`; methods `planning`, `candidates`, `autoAssign`, `assign`, `directCandidates`, `directAssign`, `cancel`; service `GuideAssignmentService`; models `TourGuideAssignment`, `Guide`, `TourDeparture`, `GuideLeaveRequest`; migrations `2026_06_28_092905_create_tour_guide_assignments_table.php`, `2026_07_07_080821_add_assignment_fields_to_tour_guide_assignments_table.php`; frontend departure assignment components/services.

### UC-031 — Duyệt yêu cầu thay hướng dẫn viên

- **Mục tiêu có evidence:** Admin list yêu cầu thay guide, phê duyệt bằng guide thay thế tự chọn hoặc từ chối.
- **Actor:** Admin.
- **Trigger:** Admin mở request pending và chọn duyệt/từ chối.
- **Preconditions:** Token/role admin; request tồn tại và status pending.
- **Postconditions:** Approve hủy assignment cũ, tạo assignment mới, cập nhật request/reviewer và notifications; reject cập nhật trạng thái/note.
- **Input:** Request ID; `admin_note` nullable tối đa 2.000.
- **Main flow:** (1) List/resolve pending request; (2) approve tìm guide active không xung đột với workload thấp; (3) transaction swap assignment/update request/notify; hoặc reject update/notify.
- **Alternative flow:** List đưa tour có request lên theo filter/order trong controller.
- **Exception flow:** Request đã xử lý `409`; approve không tìm được replacement `422`; không tồn tại `404`.
- **Validation:** Admin note max2.000; state pending; candidate availability trong controller/service.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `guide_replacement_requests`, `tour_guide_assignments`, `notifications`; R guides/departures/leaves; transaction khi approve/reject theo controller.
- **API/Response:** `GET /api/admin/guide-replacement-requests`; `POST /{id}/approve`, `POST /{id}/reject`; trả request/assignment/message.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideReplacementRequestController.php`; class `AdminGuideReplacementRequestController`; methods `index`, `approve`, `reject`; models hợp lệ `TourGuideAssignment`, `Guide`, `TourDeparture`, `Notification`; bảng `guide_replacement_requests` được thao tác bằng `DB::table`, App model `GuideReplacementRequest`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; migration `2026_07_12_000000_create_guide_replacement_requests_table.php`; frontend replacement panel/components trong quản lý departure/guide.

### UC-032 — Duyệt đơn nghỉ hướng dẫn viên

- **Mục tiêu có evidence:** Admin list/summary/detail và approve, reject hoặc đổi quyết định đơn nghỉ.
- **Actor:** Admin.
- **Trigger:** Chọn xử lý một leave request.
- **Preconditions:** Token/role admin; request không cancelled; update quyết định không áp dụng khi end date đã qua.
- **Postconditions:** Status, admin note/reviewer/time được cập nhật và notification được gửi.
- **Input:** Request ID; status approved/rejected cho decision; admin note nullable max2.000; list filters.
- **Main flow:** (1) List/filter/summary/detail; (2) validate state/date; (3) set approved/rejected; (4) ghi reviewer/time/note; (5) notify guide/admin.
- **Alternative flow:** Endpoint decision cho phép đổi giữa approved/rejected khi còn hợp lệ.
- **Exception flow:** Request cancelled hoặc đã quá end date bị từ chối; không tồn tại `404`; validation sai `422`.
- **Validation:** Status enum approved/rejected; admin note max2.000; query filters xử lý trong controller nhưng không có FormRequest riêng được tìm thấy.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `guide_leave_requests`, `notifications`; R attachments/guides/users.
- **API/Response:** `GET /api/admin/guide-leave-requests`, `/{leaveRequest}`; `POST /approve|reject`; `PATCH /decision`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideLeaveRequestController.php`; class `AdminGuideLeaveRequestController`; methods `index`, `summary`, `show`, `approve`, `reject`, `updateDecision`; models `GuideLeaveRequest`, `GuideLeaveRequestAttachment`, `Notification`; migration `2026_07_13_000000_create_guide_leave_requests_tables.php`; frontend leave panel/services trong guide management.

### UC-033 — Quản lý nhân viên hỗ trợ

- **Mục tiêu có evidence:** Admin list/statistics, tạo/sửa profile support, trash/restore/force-delete và quản lý avatar.
- **Actor:** Admin.
- **Trigger:** Thao tác trên màn Nhân viên hỗ trợ.
- **Preconditions:** Token/role admin; user có role support staff và chưa có profile active tương ứng.
- **Postconditions:** Support profile được tạo/cập nhật/soft-deleted/restored/force-deleted; avatar storage đồng bộ.
- **Input:** User ID, specialization, experience, role, status, performance rating và avatar.
- **Main flow:** (1) Lấy available users; (2) validate; (3) tạo hoặc restore/hoàn thiện profile; (4) update đồng bộ field; (5) soft/restore/force hoặc avatar action.
- **Alternative flow:** Status hidden ghi `hidden_at`; status khác clear thời điểm; create lấy name/email từ user thay vì input rời.
- **Exception flow:** User sai role/đã có profile hoặc validation sai `422`; không tồn tại `404`.
- **Validation:** Specialization theo constant; experience 0–40; status theo constant; rating 0–5; avatar JPG/JPEG/PNG/WebP max2.048KB.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `support_staff`, `users`; soft/force delete; file storage.
- **API/Response:** `/api/admin/support-staff`, `/statistics`, `/available-users`, `/trashed`, `/{id}`, restore/force-delete/avatar endpoints.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/SupportStaffController.php`; class `SupportStaffController`; methods `index`, `statistics`, `availableUsers`, `store`, `show`, `update`, `destroy`, `trashed`, `restore`, `forceDestroy`, `uploadAvatar`, `deleteAvatar`; models `SupportStaff`, `User`; migrations `2026_06_22_032814_create_support_staff_table.php`, `2026_07_01_000001_add_user_id_to_support_staff_table.php`, `2026_07_04_000001_add_specialization_and_experience_years_to_support_staff_table.php`; frontend support management/trash pages và service.

### UC-034 — Quản lý ngôn ngữ và cấp độ

- **Mục tiêu có evidence:** Admin CRUD language và CRUD level thuộc language.
- **Actor:** Admin.
- **Trigger:** Thao tác trên màn Ngôn ngữ.
- **Preconditions:** Token/role admin; tên hợp lệ; level route thuộc language hợp lệ.
- **Postconditions:** Language/levels được tạo/cập nhật/xóa; xóa language cascade levels theo FK.
- **Input:** Language name, array levels tùy chọn; level name.
- **Main flow:** (1) List/detail; (2) validate; (3) create language + levels trong transaction hoặc update; (4) CRUD nested levels; (5) delete.
- **Alternative flow:** Create không gửi levels vẫn tạo language; level unique trong cùng language bằng closure validation.
- **Exception flow:** Transaction create exception rollback và trả `500`; unique/validation sai `422`; record không tồn tại `404`.
- **Validation:** Language required/unique/max100; level max20, không trùng trong language.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `languages`, `language_levels`; R `guide_languages`; transaction create; hard delete/cascade.
- **API/Response:** CRUD `/api/admin/languages`; nested `/languages/{languageId}/levels` CRUD.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/LanguageController.php`; class `LanguageController`; methods `index`, `show`, `store`, `update`, `destroy`, `levels`, `storeLevel`, `updateLevel`, `destroyLevel`; models `Language`, `LanguageLevel`; migrations `2026_06_24_042942_create_languages_table.php`, `2026_06_24_042945_create_language_levels_table.php`; frontend `LanguageManagementPage.jsx`, language API service.

### UC-035 — Quản lý chứng chỉ

- **Mục tiêu có evidence:** Admin CRUD danh mục certificate dùng cho hồ sơ guide.
- **Actor:** Admin.
- **Trigger:** Thao tác trên màn Chứng chỉ.
- **Preconditions:** Token/role admin; name hợp lệ và unique.
- **Postconditions:** Certificate được tạo/cập nhật/xóa nếu không được guide sử dụng.
- **Input:** `name`, `issued_by` nullable.
- **Main flow:** (1) List/detail; (2) validate; (3) store/update; (4) trước delete kiểm tra guide experiences; (5) xóa nếu không dùng.
- **Alternative flow:** `issued_by` backend nullable dù frontend form yêu cầu.
- **Exception flow:** Certificate đang được sử dụng trả `422`; not found `404`; unique/validation `422`.
- **Validation:** Name required/unique/max150; issued_by nullable/max150.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `certificates`; R `guide_experiences`; hard delete khi không dùng.
- **API/Response:** CRUD `/api/admin/certificates`; trả list/resource/message.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/CertificateController.php`; class `CertificateController`; methods `index`, `show`, `store`, `update`, `destroy`; models `Certificate`, `GuideExperience`; migration `2026_06_24_042945_create_certificates_table.php`; frontend `CertificateManagementPage.jsx`, certificate service.

### UC-036 — Tìm kiếm và kiểm duyệt đánh giá tour

- **Mục tiêu có evidence:** Admin list/filter, xem detail và đổi status tour review mà không sửa/xóa nội dung.
- **Actor:** Admin.
- **Trigger:** Gọi admin tour review list/detail hoặc chọn visible/hidden/spam.
- **Preconditions:** Token/role admin; review tồn tại.
- **Postconditions:** Status/moderator/time được cập nhật; điểm tour refresh trong transaction.
- **Input:** Search, status, rating, tour ID, date range, per page; status action nhận `visible/hidden/spam`.
- **Main flow:** (1) Filter/paginate hoặc load detail; (2) status action khóa review; (3) lưu moderator/time/status; (4) refresh rating chỉ từ visible; (5) commit.
- **Alternative flow:** List/detail chỉ đọc; đổi hidden/spam loại review khỏi public/điểm, visible đưa trở lại.
- **Exception flow:** Review không tồn tại `404`; role khác `403`; validation query/status `422`.
- **Validation:** Search max100; rating 1–5; status enum; per page 5–100; date filters theo request.
- **Authorization:** `auth:sanctum`, `role:admin`; test xác nhận customer/guide/support nhận `403`.
- **Database:** R/W `tour_reviews`, `tours`; R users/booking/departure; transaction và row lock.
- **API/Response:** `GET /api/admin/tour-reviews`, `GET /{tourReview}`, `PATCH /{tourReview}/status`; trả admin resource/pagination.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/TourReviewController.php`; class `TourReviewController`; methods `index`, `show`, `updateStatus`; request `UpdateTourReviewStatusRequest`; service `TourReviewService::refreshTourRating`; models `TourReview`, `Tour`, `User`; migration `2026_07_21_000000_create_tour_reviews_table.php`; test `TourReviewApiTest.php`; React **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về page `/admin/reviews`, sidebar item hoặc tour-review service.

### UC-037 — Quản lý chiến dịch thông báo

- **Mục tiêu có evidence:** Admin chọn recipients, tạo/sửa/xóa/restore draft, gửi, xem campaign đã gửi và revoke.
- **Actor:** Admin.
- **Trigger:** Thao tác trên trang Thông báo.
- **Preconditions:** Token/role admin; send cần draft hợp lệ và có recipient.
- **Postconditions:** Draft được lưu/soft-delete/restore/force-delete; send bulk insert notifications và chuyển sent; revoke xóa notifications theo draft và trả draft về trạng thái draft.
- **Input:** Title, message, target type `all/role/specific`, target IDs; search/preview recipients.
- **Main flow:** (1) Search/preview users; (2) save/update draft; (3) resolve target; (4) transaction bulk insert notifications + mark sent; (5) list sent hoặc revoke.
- **Alternative flow:** Trash/restore/force-delete draft có endpoint riêng; target role/specific thay đổi query recipients.
- **Exception flow:** Không có recipient hoặc draft không tồn tại/đã gửi trả `404`; validation sai `422`.
- **Validation:** Title required/max255; message required; target enum; IDs nullable array; recipient search không có validation chi tiết được tìm thấy.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `notification_drafts`, `notifications`, `users`, `roles`; transaction khi send/revoke; draft soft delete và force delete.
- **API/Response:** `/api/admin/notifications/users`, `/preview-recipients`, `/draft*`, `/send/{id}`, `/get-all-send`, `/revoke/{draft_id}`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/NotificationController.php`; class `NotificationController`; methods `getUsers`, `previewRecipients`, `saveDraft`, `listDrafts`, `showDraft`, `updateDraft`, `destroy`, `listTrashedDrafts`, `restoreDraft`, `forceDeleteDraft`, `sendNotification`, `getAllSentNotifications`, `revoke`; routes `/api/admin/notifications*`; models `NotificationDraft`, `Notification`, `User`; migrations `2026_06_10_220130_create_notifications_table.php`, `2026_06_24_152026_create_notification_drafts_table.php`, `2026_06_24_155228_add_deleted_at_to_notification_drafts_table.php`, `2026_06_24_161627_modify_notifications_table.php`, `2026_06_24_165838_add_draft_id_to_notifications_table.php`; frontend `AdminNotificationsPage.jsx`, notification API services.

### UC-038 — Sử dụng notification bell admin

- **Mục tiêu có evidence:** Admin list, đếm unread và đánh dấu một/tất cả notification bell đã đọc.
- **Actor:** Admin.
- **Trigger:** Mở bell hoặc chọn mark read/all.
- **Preconditions:** Token/role admin.
- **Postconditions:** Notification thuộc admin được cập nhật read status/time.
- **Input:** Notification ID cho mark one.
- **Main flow:** (1) Query notification current admin; (2) trả list/count; (3) update one/all theo user ID.
- **Alternative flow:** Mark all không cần ID.
- **Exception flow:** Notification không thuộc admin/không tồn tại trả lỗi theo controller; auth/role sai `401/403`.
- **Validation:** ID route; ownership/current user.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `notifications`.
- **API/Response:** `GET /api/admin/notification-bell`, `/unread-count`; `PATCH /read-all`, `/{id}/read`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/AdminNotificationBellController.php`; class `AdminNotificationBellController`; methods `index`, `unreadCount`, `markAllAsRead`, `markAsRead`; routes `/api/admin/notification-bell*`; model `Notification`; migrations `2026_06_10_220130_create_notifications_table.php`, `2026_06_24_161627_modify_notifications_table.php`; frontend admin notification bell component/service.

### UC-039 — Quản lý settings hệ thống

- **Mục tiêu có evidence:** Admin đọc và cập nhật các setting thuộc allow-list theo nhóm.
- **Actor:** Admin.
- **Trigger:** Mở/lưu trang settings system/security/notification/locale/payment/backup.
- **Preconditions:** Token/role admin; chỉ key trong `Setting::ALLOWED_KEYS` được xử lý.
- **Postconditions:** Mỗi key hợp lệ được `updateOrCreate` với group suy ra từ key.
- **Input:** Các key setting cho phép.
- **Main flow:** (1) Index nhóm settings; (2) lọc allow-list; (3) validate theo key; (4) updateOrCreate từng setting; (5) trả dữ liệu/message.
- **Alternative flow:** Public settings dùng UC-006 và chỉ lộ `PUBLIC_KEYS`.
- **Exception flow:** Key/value sai validation `422`; auth/role sai `401/403`.
- **Validation:** Password min 6–32; timeout 15–10.080; locale/timezone/currency/gateway enum; VAT 0–100; backup frequency/time/retention và email/URL/max theo controller.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `settings`; upsert, không có delete endpoint.
- **API/Response:** `GET|PUT /api/admin/settings`; trả settings theo group/message.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/SettingController.php`; class `SettingController`; methods `index`, `update`; routes `GET|PUT /api/admin/settings`; model `Setting`; migration `2026_06_13_000001_create_settings_table.php`; frontend settings pages, `frontend_react/src/pages/admin/settings/SettingsDetailPage.jsx`, `frontend_react/src/services/adminSettingService.js`.

### UC-040 — Quản lý widget/banner

- **Mục tiêu có evidence:** Admin CRUD widget và bật/tắt status.
- **Actor:** Admin.
- **Trigger:** Gọi widget admin API để thêm/sửa/xóa/toggle.
- **Preconditions:** Token/role admin; payload phù hợp type.
- **Postconditions:** Banner/widget được tạo/cập nhật/xóa hoặc đổi status.
- **Input:** Title, type, image URL hoặc HTML content, position/pages, date range, status, sort order.
- **Main flow:** (1) List/detail; (2) validate conditional theo type; (3) store/update; (4) toggle status hoặc delete.
- **Alternative flow:** Type image bắt image URL; type html bắt content; public visibility do UC-006.
- **Exception flow:** Validation sai `422`; record không tồn tại `404`.
- **Validation:** Type image/html; position/pages theo constants; end >= start; status active/inactive; sort >=0.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `banners`; hard delete theo controller.
- **API/Response:** CRUD `/api/admin/widgets`, `PATCH /{id}/toggle-status`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/WidgetController.php`; class `WidgetController`; methods `index`, `store`, `show`, `update`, `destroy`, `toggleStatus`; routes `/api/admin/widgets*`; model `Banner`; migrations `2026_06_10_220190_create_banners_table.php`, `2026_06_13_000002_add_widget_columns_to_banners_table.php`; frontend admin widget page/route: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** trong `AppRoutes.jsx`.

### UC-041 — Quản lý backup database

- **Mục tiêu có evidence:** Admin list, tạo, download và xóa file SQL backup; scheduler có thể tạo tự động.
- **Actor:** Admin; scheduler/command cho nhánh tự động.
- **Trigger:** Gọi backup API, chạy command hoặc đến kỳ scheduler.
- **Preconditions:** Driver MySQL/MariaDB, `mysqldump` chạy được; admin auth cho API.
- **Postconditions:** File backup được tạo/prune/download/xóa; scheduler ghi cache kỳ đã chạy.
- **Input:** Filename trên download/delete; settings auto backup/frequency/time/retention cho scheduler.
- **Main flow:** (1) List files; (2) create chạy mysqldump single-transaction timeout 300s; (3) prune theo retention; (4) trả metadata/download; hoặc delete file.
- **Alternative flow:** Scheduler kiểm tra enabled, kỳ daily/weekly/monthly, time và cache trước khi chạy.
- **Exception flow:** Driver không hỗ trợ trả `422` ở API create; filename sai regex/không tồn tại bị từ chối; process lỗi trả lỗi service/controller.
- **Validation:** Filename `vivugo-backup-YYYYMMDD-HHMMSS.sql`; settings backup theo UC-039.
- **Authorization:** API `auth:sanctum`, `role:admin`; command/scheduler không phải HTTP actor.
- **Database:** Không có model/record backup; R DB để dump; W filesystem `storage/app/backups` và cache; model/migration backup: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- **API/Response:** `GET|POST /api/admin/backups`, `GET /{filename}/download`, `DELETE /{filename}`; list metadata/file/message.
- **Source Code Reference:** Files `backend_laravel/app/Http/Controllers/Api/Admin/DatabaseBackupController.php`, `backend_laravel/app/Services/DatabaseBackupService.php`, `backend_laravel/app/Console/Commands/DatabaseBackupCommand.php`, `backend_laravel/routes/console.php`; class/methods `DatabaseBackupController::{index,store,download,destroy}`, `DatabaseBackupService`, `DatabaseBackupCommand::handle`; routes `/api/admin/backups*`; model/migration: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** vì dùng filesystem/cache. Frontend `frontend_react/src/pages/admin/settings/BackupSettingsPage.jsx` chỉ render `SettingsDetailPage` và `frontend_react/src/services/adminSettingService.js` chỉ gọi `/api/admin/settings`; lời gọi/service React tới `/api/admin/backups*`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; tests `DatabaseBackupApiTest.php`, `BackupSettingsTest.php`.

### UC-042 — Quản lý loại dịch vụ

- **Mục tiêu có evidence:** Admin CRUD service category qua backend API.
- **Actor:** Admin.
- **Trigger:** Client gọi resource service-categories.
- **Preconditions:** Token/role admin; name unique.
- **Postconditions:** Service category được tạo/cập nhật hoặc soft-deleted.
- **Input:** Name, description nullable, status boolean; list search/status/page/per-page.
- **Main flow:** (1) Validate list/store/update request; (2) service query/create/update/delete; (3) model sinh slug unique khi name đổi; (4) trả resource/pagination.
- **Alternative flow:** Slug uniqueness kiểm tra cả soft-deleted rows.
- **Exception flow:** Validation/unique sai `422`; record không tồn tại `404` theo resource binding/service.
- **Validation:** Name required/unique/max255; status required boolean; search max255; per page 1–100.
- **Authorization:** `auth:sanctum`, `role:admin`.
- **Database:** R/W `service_categories`; soft delete; không có restore/force endpoint.
- **API/Response:** API resource `/api/admin/service-categories`; response chuẩn hóa success/message/resource/pagination.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Admin/ServiceCategoryController.php`; class `ServiceCategoryController`; methods `index`, `store`, `show`, `update`, `destroy`; requests `IndexServiceCategoryRequest`, `StoreServiceCategoryRequest`, `UpdateServiceCategoryRequest`; service `ServiceCategoryService`; model `ServiceCategory`; migration `2026_07_03_031102_create_service_categories_table.php`; frontend `serviceCategoryApi.js` và `components/admin/serviceCategories/*` tồn tại nhưng **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về route/page/sidebar được nối trong React.

## 5. Tour guide

### UC-043 — Quản lý hồ sơ và mật khẩu hướng dẫn viên

- **Mục tiêu có evidence:** Guide xem/sửa hồ sơ liên kết user và đổi mật khẩu.
- **Actor:** Tour guide.
- **Trigger:** Mở profile, lưu thay đổi hoặc đổi password.
- **Preconditions:** Token hợp lệ, role `tour guide`; user có guide profile.
- **Postconditions:** User/guide hoặc password được cập nhật; avatar có thể được lưu.
- **Input:** Các field `sometimes` của profile; current/new password và confirmation.
- **Main flow:** (1) Resolve guide từ current user; (2) validate; (3) update user/guide/avatar hoặc password; (4) trả profile/message.
- **Alternative flow:** Chỉ gửi các field cần thay đổi; show chỉ đọc relation.
- **Exception flow:** Không có guide profile trả `404`; password cũ sai/validation sai trả lỗi; auth/role sai `401/403`.
- **Validation:** Full name/email/phone/avatar/status và password theo rules trong controller; email unique bỏ qua current user.
- **Authorization:** `auth:sanctum`, `role:tour guide`; scope current user/guide.
- **Database:** R/W `users`, `guides`; R languages/experiences/destinations; file storage avatar.
- **API/Response:** `GET|PUT /api/guide/profile`, `PUT /api/guide/change-password`; trả guide profile/message.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Guide/GuideProfileController.php`; class `GuideProfileController`; methods `show`, `update`, `changePassword`; routes `GET|PUT /api/guide/profile`, `PUT /api/guide/change-password`; models `Guide`, `User`; migrations `0001_01_01_000000_create_users_table.php`, `2026_06_14_145318_create_guides_table.php`; frontend `GuideProfilePage.jsx`, guide profile service.

### UC-044 — Xem dashboard hướng dẫn viên

- **Mục tiêu có evidence:** Tổng hợp thông tin vận hành của guide đang đăng nhập.
- **Actor:** Tour guide.
- **Trigger:** Mở `/guide`.
- **Preconditions:** Token/role guide. Guide profile không bắt buộc để nhận response thành công.
- **Postconditions:** Chỉ đọc dữ liệu.
- **Input:** Không có body nghiệp vụ.
- **Main flow:** (1) Resolve current guide; (2) aggregate assignment, tour, booking đã thanh toán, thu nhập và review theo controller; (3) trả dashboard payload. `notifications_count` được gán cố định `0`, không có query notification trong method.
- **Alternative flow:** Không có guide profile: controller trả HTTP `200`, `status=success`, `guide.id=null`, các summary/count bằng 0 và các tập tour/review rỗng. Có profile nhưng chưa có assignment/review: các tập tương ứng rỗng.
- **Exception flow:** Auth/role sai trả `401/403` theo middleware. Guide profile không tồn tại không phải exception trong method này.
- **Validation:** Scope current guide; input khác **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- **Authorization:** `auth:sanctum`, `role:tour guide`.
- **Database:** R `guides`, `tour_guide_assignments`, `tour_departures`, `tours`, `bookings`, `reviews`; W không có. Đọc bảng `notifications` trong `GuideDashboardController::show()`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- **API/Response:** `GET /api/guide/dashboard` → HTTP `200` dashboard JSON; nhánh không có profile vẫn trả payload rỗng có cấu trúc, không trả `data:null`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Guide/GuideDashboardController.php`; class `GuideDashboardController`; method `show`; route `GET /api/guide/dashboard`; models `Guide`, `TourGuideAssignment`, `TourDeparture`, `Review`; migrations `2026_06_14_145318_create_guides_table.php`, `2026_06_10_220040_create_tour_departures_table.php`, `2026_06_10_220100_create_reviews_table.php`, `2026_06_28_092905_create_tour_guide_assignments_table.php`; frontend `GuideDashboardPage.jsx`, guide dashboard service.

### UC-045 — Xem tour được phân công và khách của tour

- **Mục tiêu có evidence:** Guide list tour upcoming/ongoing/completed, xem detail/overview và customer thuộc departure được phân công.
- **Actor:** Tour guide.
- **Trigger:** Mở “Tour của tôi”, overview hoặc danh sách khách.
- **Preconditions:** Token/role guide; guide có assignment không cancelled cho departure được truy cập.
- **Postconditions:** Chỉ đọc dữ liệu.
- **Input:** Departure ID; customer list có keyword max100, attendance status/session/boundary và per page 1–100.
- **Main flow:** (1) Resolve current guide; (2) query assignment theo nhóm thời gian; (3) verify assignment cho detail; (4) load tour/departure/itinerary/booking/participants/attendance; (5) trả resource/pagination.
- **Alternative flow:** Các endpoint upcoming, ongoing, completed lọc tập khác nhau; customer detail theo participant.
- **Exception flow:** Không được phân công phát sinh authorization error; participant không thuộc departure/not found bị từ chối.
- **Validation:** Keyword/status/session/boundary/per-page theo `GuideTourCustomerIndexRequest` và query request.
- **Authorization:** `auth:sanctum`, `role:tour guide`, cộng assignment ownership trong `GuideTourOperationService`/controller.
- **Database:** R `guides`, `tour_guide_assignments`, `tour_departures`, `tours`, itinerary, `bookings`, `booking_contacts`, `booking_participants`, attendance; W không có.
- **API/Response:** `GET /api/guide/tours`, `/upcoming`, `/ongoing`, `/completed`, `/{departureId}`, `/{tourDeparture}/overview`, `/customers`, `/customers/{bookingParticipant}`.
- **Source Code Reference:** Files `backend_laravel/app/Http/Controllers/Api/Guide/GuideTourController.php`, `backend_laravel/app/Http/Controllers/Api/Guide/GuideAttendanceController.php`; classes `GuideTourController`, `GuideAttendanceController`; methods `index`, `upcoming`, `ongoing`, `completed`, `show`, `overview`, `customers`, `showCustomer`; routes `/api/guide/tours*`; service `GuideTourOperationService`; models `TourGuideAssignment`, `TourDeparture`, `Booking`, `BookingParticipant`; migrations `2026_06_10_220040_create_tour_departures_table.php`, `2026_06_10_220060_create_bookings_table.php`, `2026_06_10_220080_create_booking_participants_table.php`, `2026_06_28_092905_create_tour_guide_assignments_table.php`; frontend `GuideToursPage.jsx`, `GuideAttendancePage.jsx`, guide APIs.

### UC-046 — Quản lý phiên điểm danh và attendance

- **Mục tiêu có evidence:** Guide tạo session departure/return, check-in/check-out và ghi chú/trạng thái participant.
- **Actor:** Tour guide.
- **Trigger:** Thao tác trên màn Điểm danh của tour đang diễn ra.
- **Preconditions:** Guide được phân công; departure đang trong khoảng đi-về và không completed/cancelled; boundary đúng ngày.
- **Postconditions:** Session/attendance được tạo hoặc cập nhật user/time/status/note.
- **Input:** Boundary; participant ID; note nullable max1.000; status `not_checked_in/absent` tùy chọn.
- **Main flow:** (1) Verify guide/departure; (2) create/find unique session boundary; (3) validate participant thuộc booking departure; (4) lock session/attendance; (5) check-in/out hoặc update note/status; (6) trả resource/statistics.
- **Alternative flow:** Departure boundary chỉ dùng ngày đi, return boundary chỉ dùng ngày về; list sessions/statistics chỉ đọc.
- **Exception flow:** Check-in lặp; checkout trước check-in/đã checkout; note absent sau check-in; sai ngày/tour/assignment đều bị validation/authorization từ chối.
- **Validation:** Boundary enum; participant exists; note max1.000; status enum; route-model consistency.
- **Authorization:** `auth:sanctum`, `role:tour guide`, assignment scope.
- **Database:** R/W `attendance_sessions`, `attendances`; R `booking_participants`, `bookings`, departures/assignments; unique departure+boundary và session+participant; row lock.
- **API/Response:** `GET /statistics`, `/attendance-sessions`; `POST /attendance-sessions`, `/check-in`, `/check-out`; `PATCH /notes` dưới `/api/guide/tours/{tourDeparture}`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Guide/GuideAttendanceController.php`; class `GuideAttendanceController`; methods `statistics`, `sessions`, `storeSession`, `checkIn`, `checkOut`, `updateNote`; requests `StoreAttendanceSessionRequest`, `AttendanceActionRequest`, `UpdateAttendanceNoteRequest`; service `GuideTourOperationService`; models `AttendanceSession`, `Attendance`, `BookingParticipant`; migrations `2026_07_02_143241_create_guide_attendance_and_stage_tables.php`, `2026_07_18_000000_add_boundary_to_attendance_sessions_table.php`; frontend `GuideAttendancePage.jsx` không tìm thấy lời gọi check-out trong inventory đã đọc.

### UC-047 — Theo dõi và chuyển tiến độ tour

- **Mục tiêu có evidence:** Guide xem các stage sinh từ itinerary và chuyển sang stage kế tiếp.
- **Actor:** Tour guide.
- **Trigger:** Mở stages hoặc bấm advance.
- **Preconditions:** Guide được phân công; departure đủ điều kiện vận hành.
- **Postconditions:** Stage hiện tại completed, stage sau active và `tour_departures.current_stage_id` cập nhật trong transaction.
- **Input:** Departure ID trên path; advance không có field nghiệp vụ khác được ghi nhận.
- **Main flow:** (1) Verify guide; (2) tạo stages từ itinerary nếu chưa có; (3) trả stages/current; (4) advance khóa/cập nhật current và next; (5) commit.
- **Alternative flow:** Lần đọc đầu có thể khởi tạo stage từ itinerary.
- **Exception flow:** Không được advance qua stage cuối; assignment/departure sai bị từ chối.
- **Validation:** Thứ tự/stage theo itinerary; authorization trong service/controller.
- **Authorization:** `auth:sanctum`, `role:tour guide`, assignment scope.
- **Database:** R/W `tour_departure_stages`, `tour_departures`; R `tour_itineraries`, assignments; transaction.
- **API/Response:** `GET /api/guide/tours/{tourDeparture}/stages`, `POST /stages/advance`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Guide/GuideAttendanceController.php`; class `GuideAttendanceController`; methods `stages`, `advanceStage`; routes `GET /api/guide/tours/{tourDeparture}/stages`, `POST /api/guide/tours/{tourDeparture}/stages/advance`; service `GuideTourOperationService`; models `TourDepartureStage`, `TourDeparture`, `TourItinerary`; migrations `2026_06_27_000001_create_tour_itineraries_table.php`, `2026_07_02_143241_create_guide_attendance_and_stage_tables.php`; frontend đầy đủ stage flow: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** trong page attendance đã đối chiếu.

### UC-048 — Gửi yêu cầu thay hướng dẫn viên

- **Mục tiêu có evidence:** Guide được phân công gửi một yêu cầu pending thay guide cho departure và xem trạng thái request.
- **Actor:** Tour guide.
- **Trigger:** Gửi lý do/evidence hoặc mở trạng thái replacement.
- **Preconditions:** Guide có assignment không cancelled; còn ít nhất 5 ngày trước departure; chưa có pending request cùng guide/departure.
- **Postconditions:** Replacement request pending/evidence được lưu và notification gửi admin; status endpoint chỉ đọc.
- **Input:** Reason 10–2.000; evidence nullable JPG/JPEG/PNG/WebP/PDF max5.120KB.
- **Main flow:** (1) Verify assignment/date/duplicate; (2) store evidence; (3) tạo pending request; (4) notify admin; (5) trả request/status.
- **Alternative flow:** Status endpoint trả request hiện tại mà không tạo mới.
- **Exception flow:** Gửi muộn `422`; pending trùng `409`; không có assignment/không sở hữu bị từ chối.
- **Validation:** Reason/file theo trên; departure route model.
- **Authorization:** `auth:sanctum`, `role:tour guide`, assignment ownership.
- **Database:** R assignments/departure/request; W `guide_replacement_requests`, `notifications`; file storage.
- **API/Response:** `POST /api/guide/tours/{tourDeparture}/replacement-requests`, `GET /replacement-requests/status`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Guide/GuideTourController.php`; class `GuideTourController`; methods `requestReplacement`, `replacementRequestStatus`; models hợp lệ `TourGuideAssignment`, `Guide`, `TourDeparture`, `Notification`; bảng `guide_replacement_requests` được thao tác bằng `DB::table`, App model `GuideReplacementRequest`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; migration `2026_07_12_000000_create_guide_replacement_requests_table.php`; frontend guide replacement components/service.

### UC-049 — Quản lý đơn xin nghỉ của hướng dẫn viên

- **Mục tiêu có evidence:** Guide list/summary, tạo và hủy đơn nghỉ của mình.
- **Actor:** Tour guide.
- **Trigger:** Mở leave widget, gửi đơn hoặc chọn hủy.
- **Preconditions:** Token/role guide. Tạo đơn yêu cầu guide profile tồn tại, ngày bắt đầu ít nhất 5 ngày tới và không giao với leave pending/approved; list/summary vẫn trả thành công nếu chưa có profile.
- **Postconditions:** Request pending/attachments/notification được tạo, hoặc request pending chuyển cancelled.
- **Input:** Start/end date, reason 10–2.000, tối đa 8 evidence; cancel reason được đọc nhưng không thấy validation riêng.
- **Main flow:** (1) List/summary theo guide; (2) validate dates/overlap; (3) transaction tạo request+attachments+notification; hoặc (4) verify owner/pending rồi cancel.
- **Alternative flow:** Không có guide profile: list trả HTTP `200` với paginator rỗng và summary 0; summary trả HTTP `200` với các count bằng 0. UI suy ra leave state upcoming/current/expired từ ngày; đây không phải status DB.
- **Exception flow:** Tạo khi không có guide profile trả `404`; khoảng nghỉ giao đơn `pending/approved` trả `422`; cancel của guide khác hoặc khi không có profile trả `404`; cancel đơn không còn `pending` trả `422`.
- **Validation:** Start >= 5 ngày, end >= start; evidence JPG/JPEG/PNG/WebP/PDF, max8, 5.120KB/file. List có profile clamp `per_page` 1–50; nhánh thiếu profile/bảng trả paginator rỗng nhưng dùng trực tiếp `request->integer('per_page', 10)`. Cancel reason: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về rule validation.
- **Authorization:** `auth:sanctum`, `role:tour guide`, ownership.
- **Database:** R/W `guide_leave_requests`, attachments; W notifications; transaction create; model có soft delete nhưng không có delete API.
- **API/Response:** `GET /api/guide/leave-requests`, `/summary` trả HTTP `200` kể cả khi thiếu profile; `POST /api/guide/leave-requests` trả `201` hoặc `404` khi thiếu profile; `PATCH /{leaveRequest}/cancel` trả `404` nếu owner/profile không khớp.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php`; class `GuideLeaveRequestController`; methods `index`, `summary`, `store`, `cancel`; models `GuideLeaveRequest`, `GuideLeaveRequestAttachment`; migration `2026_07_13_000000_create_guide_leave_requests_tables.php`; frontend guide leave widget/components/services.

### UC-050 — Xem đánh giá và lịch sử tour của hướng dẫn viên

- **Mục tiêu có evidence:** Guide xem review visible/summary và lịch sử tour của chính mình.
- **Actor:** Tour guide.
- **Trigger:** Mở trang Đánh giá hoặc gọi tour-history.
- **Preconditions:** Token/role guide. Guide profile không bắt buộc để nhận response thành công rỗng.
- **Postconditions:** Chỉ đọc dữ liệu.
- **Input:** Reviews nhận `rating`, `per_page`; tour history nhận `keyword`, `from_date`, `to_date`, `per_page`.
- **Main flow:** (1) Resolve current guide; (2) query reviews/summary hoặc completed tour assignments; (3) paginate; (4) trả resource.
- **Alternative flow:** Reviews và history là hai endpoint; history có summary review theo departure. Không có guide profile: cả hai trả HTTP `200`, `status=success`, `data=[]`.
- **Exception flow:** Auth/role sai trả `401/403`. Guide profile không tồn tại không phải exception của hai method này.
- **Validation:** `per_page` được clamp 1–50. `rating`, `keyword`, `from_date`, `to_date` được dùng trực tiếp trong query; validation tường minh bằng `$request->validate()` hoặc Form Request cho các filter này: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- **Authorization:** `auth:sanctum`, `role:tour guide`, scope current guide.
- **Database:** R `guides`, `reviews`, `tour_guide_assignments`, `tour_departures`, `tours`; W không có.
- **API/Response:** `GET /api/guide/reviews`, `GET /api/guide/tour-history`; nhánh không có profile trả HTTP `200` với `data=[]`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Guide/GuideReviewController.php`; class `GuideReviewController`; methods `reviews`, `tourHistory`; routes `GET /api/guide/reviews`, `GET /api/guide/tour-history`; models `Guide`, `Review`, `TourGuideAssignment`; migrations `2026_06_14_145318_create_guides_table.php`, `2026_06_10_220100_create_reviews_table.php`, `2026_07_11_112416_add_guide_context_to_reviews_table.php`, `2026_06_28_092905_create_tour_guide_assignments_table.php`; frontend `GuideReviewsPage.jsx`; route React `/guide/history` lại render `GuideComingSoonPage`, dù backend history tồn tại.

## 6. Support staff

### UC-051 — Quản lý hồ sơ support staff

- **Mục tiêu có evidence:** Support xem/sửa hồ sơ và đổi mật khẩu của chính mình.
- **Actor:** Support staff.
- **Trigger:** Mở/lưu profile hoặc đổi password.
- **Preconditions:** Token hợp lệ, role support staff; profile liên kết user tồn tại.
- **Postconditions:** User/support profile hoặc password được cập nhật.
- **Input:** Full name/email/phone/status theo `sometimes`; old/new password và confirmation.
- **Main flow:** (1) Resolve profile từ user; (2) validate; (3) đồng bộ name/email/status sang user và support_staff; hoặc hash password; (4) trả response.
- **Alternative flow:** Chỉ cập nhật field được gửi.
- **Exception flow:** Old password sai `422`; validation/email unique sai `422`; auth/role sai `401/403`.
- **Validation:** Status active/inactive; phone nullable; email unique; new password min6, confirmed và khác old password.
- **Authorization:** `auth:sanctum`, `role:support staff`, scope current user/profile.
- **Database:** R/W `users`, `support_staff`.
- **API/Response:** `GET|PUT /api/support/profile`, `PUT /api/support/change-password`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Support/SupportProfileController.php`; class `SupportProfileController`; methods `show`, `update`, `changePassword`; routes `GET|PUT /api/support/profile`, `PUT /api/support/change-password`; models `SupportStaff`, `User`; migrations `0001_01_01_000000_create_users_table.php`, `2026_06_22_032814_create_support_staff_table.php`, `2026_07_01_000001_add_user_id_to_support_staff_table.php`; frontend `SupportProfilePage.jsx`, support profile service.

### UC-052 — Tiếp nhận và xử lý yêu cầu hỗ trợ

- **Mục tiêu có evidence:** Support staff list/filter, xem detail/badge và chuyển ticket pending/in_progress/resolved.
- **Actor:** Support staff.
- **Trigger:** Mở dashboard/queue, xem ticket hoặc đổi trạng thái.
- **Preconditions:** Token hợp lệ, role support staff; ticket tồn tại.
- **Postconditions:** Status, assigned support, started_at/resolved_at được cập nhật theo trạng thái.
- **Input:** Search, status, category, priority; update nhận status enum.
- **Main flow:** (1) List/filter/count hoặc detail; (2) validate status; (3) pending clear assignment/times; in_progress gán current support/set started; resolved bảo đảm assignment/started và set resolved; (4) trả ticket.
- **Alternative flow:** Badge = pending + in_progress; detail load customer, assigned support và attachments.
- **Exception flow:** Ticket không tồn tại `404`; validation `422`; auth/role sai `401/403`.
- **Validation:** Search max255; category/priority/status enum; update status required `pending/in_progress/resolved`.
- **Authorization:** `auth:sanctum`, `role:support staff`; controller không giới hạn list chỉ ticket đã assign.
- **Database:** R/W `support_requests`; R attachments/users; update assignment/timestamps.
- **API/Response:** `GET /api/support/requests`, `/badge-count`, `/{supportRequest}`; `PATCH /{supportRequest}/status`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Support/SupportRequestController.php`; class `SupportRequestController`; methods `index`, `show`, `badgeCount`, `updateStatus`; routes `/api/support/requests*`; models `SupportRequest`, `SupportRequestAttachment`, `SupportStaff`; migrations `2026_07_16_220919_create_support_requests_table.php`, `2026_07_16_220920_create_support_request_attachments_table.php`, `2026_06_22_032814_create_support_staff_table.php`; frontend `SupportDashboardPage.jsx`, `SupportRequestsPage.jsx`, `supportRequestApi.js`.

### UC-053 — Quản lý notification support và gửi thông báo tới admin

- **Mục tiêu có evidence:** Support đọc/đánh dấu notification của mình và gửi một notification tới tất cả user role admin.
- **Actor:** Support staff.
- **Trigger:** Mở trang Thông báo, mark read hoặc gửi thông báo.
- **Preconditions:** Token hợp lệ, role support staff.
- **Postconditions:** Notification sở hữu có thể thành read; send transaction tạo notifications cho admins.
- **Input:** Notification ID; send nhận title max255 và message.
- **Main flow:** (1) Query list/count/detail theo user; (2) detail/patch mark read; hoặc (3) resolve admin users; (4) transaction insert notification; (5) trả message.
- **Alternative flow:** Support cũng có thể gọi feed dùng chung UC-009 vì endpoint đó chỉ yêu cầu auth; UI support dùng endpoint support riêng.
- **Exception flow:** Notification của người khác `404`; validation send `422`; auth/role sai `401/403`.
- **Validation:** Title required/max255; message required; ownership notification theo user ID.
- **Authorization:** `/notifications/support*` dùng `auth:sanctum`, `role:support staff`.
- **Database:** R/W `notifications`; R `users`, `roles`; transaction khi gửi admin.
- **API/Response:** `GET /api/notifications/support`, `/unread-count`, `/{id}`; `PATCH /{id}/read`; `POST /send`.
- **Source Code Reference:** File `backend_laravel/app/Http/Controllers/Api/Support/SupportNotificationController.php`; class `SupportNotificationController`; methods `getMyNotifications`, `getUnreadCount`, `getNotificationDetail`, `markAsRead`, `sendNotification`; routes `/api/notifications/support*`; models `Notification`, `User`, `Role`; migrations `2026_06_10_220130_create_notifications_table.php`, `2026_06_24_161627_modify_notifications_table.php`; frontend `SupportNotificationsPage.jsx`, support notification service.

## 7. Chức năng không khả dụng end-to-end hoặc chỉ là placeholder/data artifact

Không tạo Use Case độc lập cho các mục sau vì thiếu một luồng khả dụng có thể xác minh:

| Mục | Bằng chứng hiện có | Kết luận |
| --- | --- | --- |
| Admin/customer UI đánh giá tour | Backend đã có UC-005, UC-016, UC-036; `TourDetailPage.jsx` là placeholder, home review bị comment, không có `/admin/reviews`/sidebar/service | API khả dụng; UI React chưa tích hợp |
| Forgot password UI | Backend có UC-003; `ForgotPasswordPage.jsx` chỉ báo đang chuẩn bị | API khả dụng; UI là placeholder |
| Guide history UI | Backend có UC-050 và `GuideHistoryPage.jsx`; router `/guide/history` render `GuideComingSoonPage` | API khả dụng; route UI chưa nối page thật |
| Guide customers/messages | `/guide/customers` và `/guide/messages` render component trống; customer theo tour đã có trong UC-045 | Customer API khả dụng qua tour; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về module messages guide |
| Support work schedule | React có `SupportWorkSchedulePage.jsx` và menu | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về route/controller API lịch làm việc support |
| Service category UI | Backend có UC-042, React có service/components rời | Không có route/page/sidebar React được nối |
| Admin widget UI | Backend có UC-040 | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về route React quản trị widget |
| Promotions/usages | Migration, seeder, nullable promotion ID | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về API/UI áp dụng promotion customer; không tạo UC |
| Refund requests | Migration `2026_06_10_220160_create_refund_requests_table.php` | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về route/controller/UI xử lý request; payment refund chỉ là status action UC-028 |
| Legacy support tickets/messages, blogs, partners/services, system logs | Có migrations/seed data rời | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về chuỗi route-controller-UI khả dụng; không tạo UC |

## 8. Chỉ mục Use Case theo module

| Module trong Module Analysis | Use Case |
| --- | --- |
| Authentication/RBAC/profile | UC-001, UC-002, UC-003, UC-010, UC-019, UC-043, UC-051 |
| Public catalog/home | UC-004, UC-006 |
| Wishlist | UC-012 |
| Booking/pricing/contact/participants | UC-011, UC-013, UC-014, UC-027 |
| VNPAY/payment | UC-008, UC-015, UC-028 |
| Tour review | UC-005, UC-016, UC-036 |
| Guide review | UC-017, UC-050 |
| Customer support | UC-018, UC-052 |
| Chat AI | UC-007 |
| Notification | UC-009, UC-037, UC-038, UC-053 |
| Dashboard/report | UC-020, UC-044 |
| User management | UC-021 |
| Category | UC-022 |
| Destination | UC-023 |
| Tour/itinerary/image/age pricing | UC-024 |
| Departure | UC-025, UC-026 |
| Guide profile management | UC-029, UC-043 |
| Assignment/replacement | UC-030, UC-031, UC-048 |
| Attendance/stage | UC-045, UC-046, UC-047 |
| Guide leave | UC-032, UC-049 |
| Support staff | UC-033, UC-051 |
| Languages/levels/certificates | UC-034, UC-035 |
| Settings/widgets | UC-006, UC-039, UC-040 |
| Backup | UC-041 |
| Service categories | UC-042 |
