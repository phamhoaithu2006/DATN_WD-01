# API Specification — hiện trạng từ source code

## Baseline và quy ước

Tài liệu này mô tả hiện trạng, không đề xuất API hoặc nghiệp vụ mới. Baseline được lấy trực tiếp bằng:

    cd backend_laravel
    php artisan route:list --except-vendor --json

Kết quả hiện hành: **239 route ứng dụng**, gồm 238 route API và 1 route web. Route không đổi so với baseline; snapshot hậu sửa có **83 migration PHP active** và **22 file test PHP**.

| Nhóm | Số route |
|---|---:|
| Public/Auth | 20 |
| Authenticated-shared | 6 |
| Customer | 20 |
| Admin | 153 |
| Tour guide | 28 |
| Support staff | 12 |
| **Tổng** | **239** |

Quy ước:

- GET/HEAD là một route Laravel chấp nhận GET và HEAD; chỉ tính một route trong baseline.
- Body = JSON hoặc multipart/form-data tùy có file; Q = query string; P = path parameter.
- “Không có rule tường minh” nghĩa là method không gọi validate/Validator/Form Request. Không đồng nghĩa dữ liệu bất kỳ chắc chắn được chấp nhận.
- G-401: route dùng auth:sanctum trả JSON 401 khi chưa xác thực; nguồn: backend_laravel/bootstrap/app.php, closure render AuthenticationException.
- G-403: middleware role trả 403 khi role không khớp; nguồn: backend_laravel/app/Http/Middleware/CheckRole.php, CheckRole::handle.
- G-404: route-model binding, findOrFail/firstOrFail hoặc kiểm tra ownership trả 404.
- G-422: Laravel validation/Form Request/ValidationException trả 422.
- G-429: throttle vượt giới hạn trả 429.
- Nếu không ghi status riêng, response()->json/Resource dùng status 200 theo method.
- Các cấu trúc response bên dưới chỉ ghi key được tạo trực tiếp trong controller hoặc Resource được gọi. Phần không quan sát được ghi **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

### Mã nguồn controller

Các mã dưới đây được dùng ở cột “Handler/nguồn”; mỗi mã ánh xạ duy nhất tới file và class.

| Mã | File — class |
|---|---|
| PUB-WEB | backend_laravel/routes/web.php — Route Closure |
| PUB-AUTH | backend_laravel/app/Http/Controllers/Api/AuthController.php — App\Http\Controllers\Api\AuthController |
| PUB-CHAT | backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php — App\Http\Controllers\Api\Chat\ChatBotController |
| PUB-CAT | backend_laravel/app/Http/Controllers/Api/PublicCatalogController.php — App\Http\Controllers\Api\PublicCatalogController |
| PUB-TOUR | backend_laravel/app/Http/Controllers/Api/Customer/TourController.php — App\Http\Controllers\Api\Customer\TourController |
| PUB-REV | backend_laravel/app/Http/Controllers/Api/TourReviewController.php — App\Http\Controllers\Api\TourReviewController |
| PUB-SET | backend_laravel/app/Http/Controllers/Api/PublicSettingController.php — App\Http\Controllers\Api\PublicSettingController |
| PUB-WID | backend_laravel/app/Http/Controllers/Api/PublicWidgetController.php — App\Http\Controllers\Api\PublicWidgetController |
| CUS-PRO | backend_laravel/app/Http/Controllers/Api/Customer/CustomerController.php — App\Http\Controllers\Api\Customer\CustomerController |
| CUS-DASH | backend_laravel/app/Http/Controllers/Api/Customer/CustomerDashboardController.php — App\Http\Controllers\Api\Customer\CustomerDashboardController |
| CUS-BOOK | backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php — App\Http\Controllers\Api\Customer\CustomerBookingController |
| CUS-PAY | backend_laravel/app/Http/Controllers/Api/Customer/VnpayPaymentController.php — App\Http\Controllers\Api\Customer\VnpayPaymentController |
| CUS-GREV | backend_laravel/app/Http/Controllers/Api/Customer/GuideReviewController.php — App\Http\Controllers\Api\Customer\GuideReviewController |
| CUS-TREV | backend_laravel/app/Http/Controllers/Api/Customer/TourReviewController.php — App\Http\Controllers\Api\Customer\TourReviewController |
| CUS-WISH | backend_laravel/app/Http/Controllers/Api/Customer/WishlistController.php — App\Http\Controllers\Api\Customer\WishlistController |
| CUS-SUP | backend_laravel/app/Http/Controllers/Api/Customer/CustomerSupportRequestController.php — App\Http\Controllers\Api\Customer\CustomerSupportRequestController |
| SHR-NOT | backend_laravel/app/Http/Controllers/Api/Customer/NotificationCustomerController.php — App\Http\Controllers\Api\Customer\NotificationCustomerController |
| GUI-PRO | backend_laravel/app/Http/Controllers/Api/Guide/GuideProfileController.php — App\Http\Controllers\Api\Guide\GuideProfileController |
| GUI-DASH | backend_laravel/app/Http/Controllers/Api/Guide/GuideDashboardController.php — App\Http\Controllers\Api\Guide\GuideDashboardController |
| GUI-REV | backend_laravel/app/Http/Controllers/Api/Guide/GuideReviewController.php — App\Http\Controllers\Api\Guide\GuideReviewController |
| GUI-TOUR | backend_laravel/app/Http/Controllers/Api/Guide/GuideTourController.php — App\Http\Controllers\Api\Guide\GuideTourController |
| GUI-ATT | backend_laravel/app/Http/Controllers/Api/Guide/GuideAttendanceController.php — App\Http\Controllers\Api\Guide\GuideAttendanceController |
| GUI-LEAVE | backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php — App\Http\Controllers\Api\Guide\GuideLeaveRequestController |
| SUP-PRO | backend_laravel/app/Http/Controllers/Api/Support/SupportProfileController.php — App\Http\Controllers\Api\Support\SupportProfileController |
| SUP-REQ | backend_laravel/app/Http/Controllers/Api/Support/SupportRequestController.php — App\Http\Controllers\Api\Support\SupportRequestController |
| SUP-NOT | backend_laravel/app/Http/Controllers/Api/Support/SupportNotificationController.php — App\Http\Controllers\Api\Support\SupportNotificationController |

Nguồn route cho toàn bộ endpoint API trong các bảng: backend_laravel/routes/api.php. Nguồn route web: backend_laravel/routes/web.php.

### Model và migration liên quan đến các luồng được kiểm toán

Quy ước truy vết trong bảng này: thư mục model là `backend_laravel/app/Models`; model `X` tương ứng class `App\Models\X` và file `X.php` trong thư mục đó. Mỗi tên migration là file trong `backend_laravel/database/migrations`. Các service hoặc nguồn query builder không theo quy ước này được ghi đầy đủ đường dẫn.

| Luồng | Model/source dữ liệu | Migration |
|---|---|---|
| Auth/register/login và customer profile | `backend_laravel/app/Models/User.php`, `Role.php`, `Setting.php`; token qua trait Sanctum trên `User` | `0001_01_01_000000_create_users_table.php`; `2026_06_10_055225_create_personal_access_tokens_table.php`; `2026_06_10_215900_create_roles_table.php`; `2026_06_10_215910_add_vivugo_columns_to_users_table.php`; `2026_06_13_000001_create_settings_table.php` |
| VNPAY và quản lý payment admin | `Payment`, `Booking`, `TourDeparture`, `BookingStatusHistory`; lifecycle tại `backend_laravel/app/Services/VnpayPaymentLifecycleService.php`; admin transition tại `Admin/PaymentController.php::updateStatus()` | `2026_06_10_220040_create_tour_departures_table.php`; `2026_06_10_220060_create_bookings_table.php`; `2026_06_10_220090_create_payments_table.php`; `2026_06_10_220200_create_booking_status_histories_table.php`; `2026_07_15_000000_add_vnpay_expiry_to_payments_table.php` |
| Booking/contact | `Booking`, `BookingContact`, `BookingParticipant`; customer Form Request/controller và `Admin/BookingController` | `2026_06_10_220060_create_bookings_table.php`; `2026_06_10_220070_create_booking_contacts_table.php`; `2026_06_10_220080_create_booking_participants_table.php`; `2026_07_22_010000_make_booking_contact_email_nullable.php` |
| Hồ sơ/dashboard Guide | `Guide`, `User`, `GuideLanguage`, `GuideExperience`, `Language`, `LanguageLevel`, `Certificate`, `Review` | `2026_06_14_145318_create_guides_table.php`; `2026_06_24_042942_create_languages_table.php`; `2026_06_24_042945_create_language_levels_table.php`; `2026_06_24_042945_create_certificates_table.php`; `2026_06_24_042946_drop_and_recreate_guide_languages_table.php`; `2026_06_24_042950_drop_and_recreate_guide_experiences_table.php`; `2026_07_22_000000_restore_certificate_type_to_guides_table.php` |
| Widget | `Banner`; `Admin/WidgetController.php`, `PublicWidgetController.php` | `2026_06_10_220190_create_banners_table.php`; `2026_06_13_000002_add_widget_columns_to_banners_table.php`; `2026_07_22_000000_make_banner_image_url_nullable.php` |
| Đơn nghỉ Guide | `GuideLeaveRequest`, `GuideLeaveRequestAttachment`, `Guide`, `Notification`, `User` | `2026_07_13_000000_create_guide_leave_requests_tables.php`; `2026_06_10_220130_create_notifications_table.php`; `2026_06_24_161627_modify_notifications_table.php`; `2026_06_24_165838_add_draft_id_to_notifications_table.php` |
| Review và lịch sử tour của Guide | `Review`, `Guide`, `TourGuideAssignment`, `TourDeparture`, `Tour` | `2026_06_10_220100_create_reviews_table.php`; `2026_07_11_112416_add_guide_context_to_reviews_table.php`; `2026_06_28_092905_create_tour_guide_assignments_table.php`; `2026_06_10_220040_create_tour_departures_table.php` |
| Danh sách/chi tiết tour và yêu cầu thay Guide | `Guide`, `TourDeparture`, `TourGuideAssignment`, `Booking`, `Notification`; `guide_replacement_requests` được `GuideTourController` và `AdminGuideReplacementRequestController` thao tác bằng query builder, không có model trong `backend_laravel/app/Models` | `2026_06_10_220040_create_tour_departures_table.php`; `2026_06_10_220060_create_bookings_table.php`; `2026_06_10_220130_create_notifications_table.php`; `2026_06_24_161627_modify_notifications_table.php`; `2026_06_24_165838_add_draft_id_to_notifications_table.php`; `2026_06_28_092905_create_tour_guide_assignments_table.php`; `2026_07_07_080821_add_assignment_fields_to_tour_guide_assignments_table.php`; `2026_07_12_000000_create_guide_replacement_requests_table.php` |
| Điểm danh và stage | `AttendanceSession`, `Attendance`, `BookingParticipant`, `TourDepartureStage`, `TourItinerary`, `TourDeparture`, `Guide`, `TourGuideAssignment` | `2026_06_10_220040_create_tour_departures_table.php`; `2026_06_10_220080_create_booking_participants_table.php`; `2026_06_14_145318_create_guides_table.php`; `2026_06_27_000001_create_tour_itineraries_table.php`; `2026_06_28_092905_create_tour_guide_assignments_table.php`; `2026_07_02_143241_create_guide_attendance_and_stage_tables.php`; `2026_07_07_080821_add_assignment_fields_to_tour_guide_assignments_table.php`; `2026_07_18_000000_add_boundary_to_attendance_sessions_table.php` |

## Public/Auth — 20 route

| # | Method, endpoint | Actor/auth/rate limit | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|---|
| 1 | GET/HEAD / | Public; middleware web | PUB-WEB::Closure | Không input; không có rule tường minh. | Blade view welcome, 200. |
| 2 | POST /api/auth/register | Public; throttle 5/phút | PUB-AUTH::register | Body: full_name required string≤150; email required email≤150 unique users; phone required string≤20 unique users; password required string, min lấy `Setting::intValueFor('password_min_length', 8)`, confirmed. | 201: `{message, token, user}`; response không có `token_expires_at`; G-422/G-429; G-404 nếu role customer không tồn tại qua firstOrFail. Regression: `AuthBookingBusinessModelRegressionTest.php`. |
| 3 | POST /api/auth/login | Public; throttle 6/phút | PUB-AUTH::login | Body: identifier required string; password required string; remember sometimes boolean. | 200: `{message, token, user}` với user đã load role; response không có `token_expires_at`; 401 sai thông tin; 403 tài khoản không active; G-422/G-429. |
| 4 | GET/HEAD /api/catalog/categories | Public | PUB-CAT::categories | Không input; không có rule tường minh. | 200 JSON status, data; chỉ category active có tour published/bookable theo query. |
| 5 | GET/HEAD /api/catalog/destinations | Public | PUB-CAT::destinations | Không input; không có rule tường minh. | 200 JSON status, data; chỉ destination active có tour published/bookable theo query. |
| 6 | POST /api/chatbot | Public; throttle 20/phút | PUB-CHAT::handleChat | Body: message required string max1000; session_id nullable string max100. | 200: reply, session_id; fallback khi Gemini lỗi; G-422/G-429. Gemini warning/error được ghi log. |
| 7 | POST /api/forgot-password | Public; throttle 5/phút | CUS-PRO::forgotPassword | Body: identifier required. | 200 “Lưu thành công” và otp_in_db hoặc “Lưu thất bại”; 404 tài khoản không tồn tại; G-422/G-429. Không thấy gửi email/SMS hoặc expiry OTP. |
| 8 | GET/HEAD /api/home | Public | PUB-CAT::home | Q được method đọc để tạo payload trang chủ; không gọi validate tường minh. | 200: status, data của catalog trang chủ; review lấy loại visible. |
| 9 | POST /api/reset-password | Public | CUS-PRO::resetPassword | Body: identifier required; otp required; password required string min theo Setting mặc định 8, confirmed. | 200 thành công; 400 OTP sai/tài khoản không tồn tại; G-422. |
| 10 | GET/HEAD /api/roles | Public | backend_laravel/app/Http/Controllers/Api/Admin/CustomerManagerController.php — CustomerManagerController::index_role | Không input; không có rule tường minh. | 200 JSON danh sách Role. |
| 11 | GET/HEAD /api/settings/public | Public | PUB-SET::show | Không input; không có rule tường minh. | 200: success, data; chỉ các key trong Setting::PUBLIC_KEYS. |
| 12 | GET/HEAD /api/tours | Public | PUB-TOUR::index_gdkh | Q: keyword string≤255; category_id,destination_id integer≥1; departure_date/start_date date; guests/min_slots integer≥1; min_price,max_price numeric≥0; duration_days integer≥1; per_page 1..50; sort in latest,price_asc,price_desc,departure_soon,rating_desc,duration_asc,duration_desc. | TourResource collection phân trang, 200; G-422. |
| 13 | GET/HEAD /api/tours/filter | Public | PUB-TOUR::filter_gdkh | Cùng validation với /api/tours. | TourResource collection phân trang, 200; G-422. |
| 14 | GET/HEAD /api/tours/search | Public | PUB-TOUR::search_gdkh | Cùng validation với /api/tours. | TourResource collection phân trang, 200; G-422. |
| 15 | GET/HEAD /api/tours/{slug} | Public | PUB-TOUR::show_gdkh | P slug string; route không có regex; không có validate tường minh. | TourResource, 200; G-404 nếu không có tour published mang slug. |
| 16 | GET/HEAD /api/tours/{slug}/reviews | Public | PUB-REV::index | P slug; Q rating nullable integer 1..5; sort nullable in newest,oldest,highest,lowest; per_page nullable integer 5..50. | 200: status, message, summary, data paginator của PublicTourReviewResource; G-404 nếu tour không published; G-422. |
| 17 | POST /api/travel-assistant | Public; không có throttle ở route | PUB-CHAT::handleChat | Body: message required string max1000; session_id nullable string max100. | Giống /api/chatbot nhưng không có G-429 từ throttle route này; 200/fallback; G-422. |
| 18 | GET/HEAD /api/vnpay/return-status | Public; throttle 60/phút | CUS-PAY::returnStatus | Q là payload callback VNPAY; controller kiểm cấu hình, chữ ký/merchant, `vnp_TxnRef`, `vnp_Amount` và mã kết quả. Không có Laravel validation rule tường minh. | 200: response trạng thái payment/booking; 503 khi VNPAY chưa cấu hình; 422 khi chữ ký/merchant không hợp lệ hoặc amount không khớp; 404 khi reference không tách được payment ID, payment không tồn tại/không phải VNPAY hoặc thiếu booking; G-429. |
| 19 | GET/HEAD /api/webhooks/vnpay | Public; throttle 60/phút | CUS-PAY::ipn | Q payload IPN VNPAY; xác minh cấu hình, chữ ký/merchant, reference và amount bằng service/controller; không có validate tường minh. | HTTP 200 cho mọi nhánh do `ipnResponse()` không đặt status HTTP; body `{RspCode, Message}` với code quan sát được `99` chưa cấu hình, `97` signature sai, `02` không tìm thấy order, `04` amount sai, `01` đã xác nhận hoặc `00` đã xử lý; G-429. |
| 20 | GET/HEAD /api/widgets | Public | PUB-WID::index | Q position nullable string; page nullable string. | 200: status, message, data widget visible; G-422. |

## Authenticated-shared — 6 route

| # | Method, endpoint | Actor/auth | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|---|
| 21 | POST /api/auth/logout | Mọi user xác thực; auth:sanctum | PUB-AUTH::logout | Không body/rule tường minh; dùng currentAccessToken. | 200 message; G-401. |
| 22 | GET/HEAD /api/auth/me | Mọi user xác thực; auth:sanctum | Closure tại backend_laravel/routes/api.php | Không input/rule tường minh. | 200: user đã load role và supportStaff.user; G-401. |
| 23 | GET/HEAD /api/notifications/customers | Mọi user xác thực; auth:sanctum | SHR-NOT::getMyNotifications | Không validation tường minh; paginator cố định 10. | 200: message, data paginator; G-401. Controller đồng bộ reminder review cho customer và lọc loại guide_review_request khỏi non-customer. |
| 24 | GET/HEAD /api/notifications/customers/unread-count | Mọi user xác thực | SHR-NOT::getUnreadCount | Không input/rule tường minh. | 200: unread_count; G-401. |
| 25 | GET/HEAD /api/notifications/customers/{id} | Mọi user xác thực; P id whereNumber | SHR-NOT::getNotificationDetail | P id số; ownership theo user_id; không validation body. | 200: message, data và tự đánh dấu read; 404 nếu không thuộc user/không tồn tại; G-401. |
| 26 | PATCH /api/notifications/customers/{id}/read | Mọi user xác thực; P id whereNumber | SHR-NOT::markAsRead | P id số; ownership theo user_id; không body/rule. | 200 message; 404 nếu không thuộc user/không tồn tại; G-401. |

## Customer — 20 route

Tất cả route trong mục này dùng auth:sanctum và role:customer; áp dụng G-401/G-403.

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 27 | GET/HEAD /api/user | PUB-AUTH::me | Không input/rule tường minh. | 200: user kèm role; G-401/G-403. |
| 28 | GET/HEAD /api/profile/summary | CUS-DASH::summary | Không input/rule tường minh. | 200: status, data hồ sơ + bookings_count + wishlist_count. |
| 29 | GET/HEAD /api/profile/bookings | CUS-DASH::bookings | Không input/rule tường minh; lọc user_id hiện tại. | 200: status, data; mỗi booking bổ sung can_review_tour và tour_review qua CustomerTourReviewResource. |
| 30 | PUT /api/profile/update | CUS-PRO::updateProfile | Body: full_name required string≤150; phone nullable string≤20, không có rule unique; avatar nullable image jpg/jpeg/png/webp max5120. | 200: `{success, message, data}` với `data` là user mới nhất; G-422. Regression: `AuthBookingBusinessModelRegressionTest.php`. |
| 31 | PUT /api/profile/change-password | CUS-PRO::changePassword | Body: current_password required; new_password required, min theo `Setting::intValueFor('password_min_length', 8)`, confirmed nên request cần `new_password_confirmation`. | 200: `{message}`; 400 mật khẩu hiện tại sai; G-422. |
| 32 | POST /api/customer/bookings/preview | CUS-BOOK::preview | Body: tour_departure_id required integer exists; quantity_summary required array min1; từng rule_id nullable integer exists tour_age_pricing_rules, quantity required integer min0; tổng quantity phải ≥1. | 200: success, data giá; G-404; G-422 khi tour/departure không bookable, không đủ chỗ hoặc input sai. |
| 33 | POST /api/customer/bookings | CUS-BOOK::store; Form Request backend_laravel/app/Http/Requests/Customer/StoreBookingRequest.php::rules/after | Body: tour_departure_id required exists; number_of_people integer 1..20; note≤2000; quantity_summary array≤20, rule_id exists, quantity 0..20; contact bắt buộc với name≤150, **email nullable** và nếu có phải hợp lệ≤150, phone≤20, address≤255, special_request≤2000; participants array 1..20, full_name≤150, birth_date≤today, gender male/female/other, phone≤20, identity_number≤30, participant_type adult/child/infant. Số participant và tổng quantity phải bằng number_of_people. | 201: success, message, data booking + checkout_url; thiếu contact email lưu `NULL`; DOB participant quyết định rule/`unit_price`, tổng các participant được dùng cho cả booking và payment, không lấy tổng từ `quantity_summary`; G-404/G-422. Regression: `AuthBookingBusinessModelRegressionTest.php`. |
| 34 | POST /api/customer/bookings/{booking}/continue-payment | CUS-BOOK::continuePayment | P booking whereNumber/binding; không body rule; ownership và trạng thái pending/unpaid/VNPAY pending được kiểm trong transaction. | 200: success, message, data + checkout_url; 404 khi không sở hữu; 422 khi không thể tiếp tục hoặc đã hết hạn. |
| 35 | PATCH /api/customer/bookings/{booking}/cancel | CUS-BOOK::cancel | P booking whereNumber/binding; không body rule; ownership và trạng thái được kiểm trong transaction. | 200 success/data; 404 khi không sở hữu; 422 nếu không được hủy. Hủy lặp là idempotent theo service/controller. |
| 36 | GET/HEAD /api/customer/payments/vnpay/{payment} | CUS-PAY::status | P payment whereNumber/binding; không body rule; kiểm booking.user_id. | 200 JSON trạng thái payment/booking; 404 nếu không thuộc user. |
| 37 | GET/HEAD /api/customer/guide-reviewable-bookings | CUS-GREV::reviewableBookings | Không input/rule tường minh; lọc booking của user hiện tại. | 200: status, data các booking đủ điều kiện cùng guide/review hiện tại. |
| 38 | POST /api/customer/guide-reviews | CUS-GREV::store; Form Request backend_laravel/app/Http/Requests/Customer/StoreGuideReviewRequest.php::rules | Body: booking_id required integer exists; guide_id required integer exists; rating required integer 1..5; comment nullable string max2000. | 201 khi tạo mới, 200 khi cập nhật; response status/message/data GuideReviewResource; G-404 booking không thuộc user; G-422 chưa hoàn tất hoặc guide không thuộc assignment. |
| 39 | GET/HEAD /api/customer/guides/{guide}/reviews | CUS-GREV::guideReviews | P guide whereNumber/binding; không query validation tường minh. | 200 JSON các review visible của guide; G-404 binding. |
| 40 | GET/HEAD /api/customer/guides/{guide}/tour-history | CUS-GREV::guideTourHistory | P guide whereNumber/binding; không query validation tường minh. | 200 JSON lịch sử tour hoàn tất của guide; G-404 binding. |
| 41 | POST /api/customer/tour-reviews | CUS-TREV::store; Form Request backend_laravel/app/Http/Requests/Customer/StoreTourReviewRequest.php::rules; throttle 10/phút | Body: booking_id required integer exists; rating required integer 1..5; comment nullable string max2000. | 201: status, message, data CustomerTourReviewResource; 404 booking không thuộc user; 409 đã có review; G-422 chưa đủ điều kiện; G-429. |
| 42 | PUT /api/customer/tour-reviews/{tourReview} | CUS-TREV::update; Form Request backend_laravel/app/Http/Requests/Customer/UpdateTourReviewRequest.php::rules; throttle 10/phút | P tourReview whereNumber; Body rating required integer 1..5; comment nullable string max2000. | 200: status, message, data; 404 nếu không sở hữu; G-422/G-429. Status hidden/spam được giữ nguyên. |
| 43 | POST /api/customer/support-requests | CUS-SUP::store | Body: full_name required string≤255; email required email≤255; category required in technical,payment,account,feedback,general; subject required string≤255; description required string≤10000; attachments nullable array max5; từng file jpg/jpeg/png/webp/pdf/doc/docx max5120. | 201: success, message, data ticket kèm attachments; G-422; 500 khi exception, các file mới được dọn sau rollback. |
| 44 | GET/HEAD /api/tours/wishlist | CUS-WISH::index | Không input/rule; lấy wishlist của user, paginate 10. | 200 paginator/Resource theo controller. |
| 45 | POST /api/tours/wishlist | CUS-WISH::store | Body tour_id required exists:tours,id. | 200 message; G-422. syncWithoutDetaching nên gọi lặp không tạo quan hệ trùng. |
| 46 | DELETE /api/tours/wishlist/{tour_id} | CUS-WISH::destroy | P tour_id; không route whereNumber và không validation tường minh. | 200 message; detach quan hệ của user hiện tại. |

## Support staff — 12 route

Tất cả dùng auth:sanctum và role:support staff; áp dụng G-401/G-403.

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 47 | GET/HEAD /api/support/profile | SUP-PRO::show | Không input/rule. | 200: success, message, data user + role + supportStaff.user. |
| 48 | PUT /api/support/profile | SUP-PRO::update | Body: full_name sometimes required string≤150; email sometimes required email≤150 unique bỏ qua user; phone sometimes nullable string≤20; status sometimes required active/inactive. | 200 success/data; 404 nếu chưa có supportStaff profile; G-422. |
| 49 | PUT /api/support/change-password | SUP-PRO::changePassword | Body old_password required string; new_password required string min6 confirmed. | 200 success; 422 nếu mật khẩu cũ sai hoặc mật khẩu mới trùng cũ; G-422. |
| 50 | GET/HEAD /api/support/requests | SUP-REQ::index | Q search nullable string≤255; status pending/in_progress/resolved; category technical/payment/account/feedback/general; priority low/medium/high. | 200: success, data paginator 10, counts; G-422. |
| 51 | GET/HEAD /api/support/requests/badge-count | SUP-REQ::badgeCount | Không input/rule. | 200: count ticket pending + in_progress. |
| 52 | GET/HEAD /api/support/requests/{supportRequest} | SUP-REQ::show | P supportRequest whereNumber/binding. | 200: success, data kèm user/assignedTo/attachments; G-404 binding. |
| 53 | PATCH /api/support/requests/{supportRequest}/status | SUP-REQ::updateStatus | P supportRequest whereNumber; Body status required in pending,in_progress,resolved. | 200: success, message, data; G-404/G-422. |
| 54 | GET/HEAD /api/notifications/support | SUP-NOT::getMyNotifications | Không input/rule; paginate 10, ownership theo user_id. | 200: message, data. |
| 55 | POST /api/notifications/support/send | SUP-NOT::sendNotification | Body title required string≤255; message required string. | 200 success; transaction tạo một notification `type=support`, `status=unread` cho từng admin cùng metadata người gửi; 404 nếu không tìm thấy admin; G-422. |
| 56 | GET/HEAD /api/notifications/support/unread-count | SUP-NOT::getUnreadCount | Không input/rule. | 200: unread_count. |
| 57 | GET/HEAD /api/notifications/support/{id} | SUP-NOT::getNotificationDetail | P id whereNumber; ownership theo user_id; không body. | 200 message/data và tự đánh dấu read; 404 nếu không thuộc user. |
| 58 | PATCH /api/notifications/support/{id}/read | SUP-NOT::markAsRead | P id whereNumber; ownership theo user_id. | 200 message/data; 404 nếu không thuộc user. |

## Tour guide — 28 route

Tất cả dùng auth:sanctum và role:tour guide; áp dụng G-401/G-403. Các API vận hành tour còn kiểm tra user có Guide profile và assignment không cancelled cho departure trong GuideTourOperationService.

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 59 | PUT /api/guide/change-password | GUI-PRO::changePassword | Body old_password required; new_password required string min6 confirmed nên cần `new_password_confirmation`. | 200: `{success, message}`; 400 khi mật khẩu cũ sai hoặc mật khẩu mới trùng cũ; validation trả 422 `{success:false,message,errors}`. |
| 60 | GET/HEAD /api/guide/dashboard | GUI-DASH::show | Không input/rule. | 200 `{status,message,data}`. Khi không có Guide profile, controller vẫn trả 200 với guide ID null, các count bằng 0 và các collection rỗng; không có nhánh 404 trong method. |
| 61 | GET/HEAD /api/guide/leave-requests | GUI-LEAVE::index | Q được đọc nhưng không validate: status (bỏ qua nếu `all`), created_month, created_year, from_date, to_date, per_page; per_page được clamp 1..50. | 200 `{status,message,summary,data}`. Khi thiếu bảng hoặc không có Guide profile, vẫn trả 200 với paginator và summary rỗng. |
| 62 | POST /api/guide/leave-requests | GUI-LEAVE::store | Body start_date required date after_or_equal today+5 ngày; end_date required date after_or_equal start_date; reason required string 10..2000; `evidence` nullable array max8; `evidence.*` là file jpg/jpeg/png/webp/pdf max5120. | 201 `{status,message,data}`; 500 nếu bảng leave chưa tồn tại; 404 nếu không có Guide profile; 422 nếu trùng khoảng với đơn pending/approved hoặc validation lỗi. |
| 63 | GET/HEAD /api/guide/leave-requests/summary | GUI-LEAVE::summary | Không input/rule. | 200 `{status,message,data}`; thiếu bảng hoặc không có Guide profile đều trả summary với ba count bằng 0, không trả 404. |
| 64 | PATCH /api/guide/leave-requests/{leaveRequest}/cancel | GUI-LEAVE::cancel | P route-model binding; controller đọc `cancel_reason` trực tiếp, **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về validation cho field này. | 200 `{status,message,data}`; 500 nếu bảng leave chưa tồn tại; 404 nếu binding lỗi, không có Guide profile hoặc đơn không thuộc Guide; 422 nếu status không phải pending. |
| 65 | GET/HEAD /api/guide/profile | GUI-PRO::show | Không input/rule. | 200 `{success,message,data}` gồm guide, user, guideLanguages và certificates; 404 nếu chưa có Guide profile. |
| 66 | PUT /api/guide/profile | GUI-PRO::update | Body: full_name sometimes string≤255; email sometimes email≤255 unique bỏ qua user; phone sometimes nullable string≤10; avatar nullable image jpg/jpeg/png/webp max5120; certificate_type sometimes string≤100; experience_years sometimes integer 0..40; status sometimes active/inactive; languages sometimes array, language_id required_with và exists, level_id nullable integer nhưng không có exists; certificates sometimes array, certificate_id required_with và exists, issued_year 1900..năm hiện tại. | 200 `{success,message,data}`; `certificate_type` được ghi/đọc từ cột nullable `guides.certificate_type`; 404 nếu không có profile; G-422; 500 nếu lưu avatar hoặc transaction lỗi. Không tìm thấy kiểm tra `level_id` thuộc language trong method. |
| 67 | GET/HEAD /api/guide/reviews | GUI-REV::reviews | Q rating và per_page được đọc trực tiếp, không gọi validate; rating được cast int khi có; per_page được clamp 1..50. | 200 `{status,message,summary,data}` với paginator. Không có Guide profile vẫn trả 200 `{status,message,data:[]}`; không có nhánh 404/422 tường minh trong method. |
| 68 | GET/HEAD /api/guide/tour-history | GUI-REV::tourHistory | Q keyword, from_date, to_date, per_page được đọc trực tiếp, không gọi validate; per_page được clamp 1..50. | 200 `{status,message,guide,data}` với paginator. Không có Guide profile vẫn trả 200 `{status,message,data:[]}`; không có nhánh 404/422 tường minh trong method. |
| 69 | GET/HEAD /api/guide/tours | GUI-TOUR::index | Q keyword, destination_id, from_date, to_date, sort (`newest/oldest` mới đổi sort) và per_page được đọc, không validate; per_page chỉ được cap tối đa 50 trong helper. | 200 `{message,data}` paginator; không có Guide profile vẫn trả 200 với empty paginator, không trả 404. |
| 70 | GET/HEAD /api/guide/tours/completed | GUI-TOUR::completed | Q và cách xử lý giống #69; query lọc departure completed hoặc return_date trước hôm nay. | 200 `{message,data}` paginator; không có Guide profile vẫn trả 200 empty paginator. |
| 71 | GET/HEAD /api/guide/tours/ongoing | GUI-TOUR::ongoing | Q và cách xử lý giống #69; query lọc khoảng ngày chứa hôm nay và loại completed/cancelled/canceled. | 200 `{message,data}` paginator; không có Guide profile vẫn trả 200 empty paginator. |
| 72 | GET/HEAD /api/guide/tours/upcoming | GUI-TOUR::upcoming | Q và cách xử lý giống #69; query lọc departure_date sau hôm nay. | 200 `{message,data}` paginator; không có Guide profile vẫn trả 200 empty paginator. |
| 73 | GET/HEAD /api/guide/tours/{departureId} | GUI-TOUR::show | P departureId; không route whereNumber/validation tường minh; query bắt buộc assignment của Guide hiện tại có status khác cancelled. | 200 `{message,data}`; không có Guide profile trả 200 với `data:null`; 404 khi departure không tồn tại hoặc không thuộc assignment qua `firstOrFail()`. |
| 74 | GET/HEAD /api/guide/tours/{tourDeparture}/attendance-sessions | GUI-ATT::sessions | P route-model binding; không query/body rule. | 200 `{status,message,data}` AttendanceSessionResource collection; 403 nếu user không có Guide profile hoặc không được assign departure; G-404 cho binding. Không có ValidationException trong service method này. |
| 75 | POST /api/guide/tours/{tourDeparture}/attendance-sessions | GUI-ATT::storeSession; Form Request backend_laravel/app/Http/Requests/StoreAttendanceSessionRequest.php::rules | Body boundary required in departure,return. | 201 `{status,message,data}`; 403 nếu không có Guide profile/assignment; G-404 cho binding/row lock; G-422 nếu tour không ongoing, boundary không đúng ngày hoặc input sai. |
| 76 | POST /api/guide/tours/{tourDeparture}/attendance-sessions/{attendanceSession}/check-in | GUI-ATT::checkIn; Form Request backend_laravel/app/Http/Requests/AttendanceActionRequest.php::rules | Body participant_id required integer exists booking_participants. | 200 attendance data; 403 nếu không có Guide profile/assignment; G-404 cho binding; G-422 nếu tour/session/boundary/participant không hợp lệ hoặc participant đã check-in. |
| 77 | POST /api/guide/tours/{tourDeparture}/attendance-sessions/{attendanceSession}/check-out | GUI-ATT::checkOut; Form Request backend_laravel/app/Http/Requests/AttendanceActionRequest.php::rules | Body participant_id required integer exists booking_participants. | 200 attendance data; 403 nếu không có Guide profile/assignment; G-404 cho binding; G-422 nếu tour/session/boundary/participant không hợp lệ, chưa check-in hoặc đã check-out. |
| 78 | PATCH /api/guide/tours/{tourDeparture}/attendance-sessions/{attendanceSession}/notes | GUI-ATT::updateNote; Form Request backend_laravel/app/Http/Requests/UpdateAttendanceNoteRequest.php::rules | Body participant_id required integer exists; note nullable string≤1000; status sometimes nullable in not_checked_in,absent. | 200 attendance data; 403 nếu không có Guide profile/assignment; G-404 cho binding; G-422 nếu tour/session/boundary/participant không hợp lệ hoặc đổi status sau check-in. |
| 79 | GET/HEAD /api/guide/tours/{tourDeparture}/attendance/statistics | GUI-ATT::statistics; Form Request backend_laravel/app/Http/Requests/AttendanceSessionQueryRequest.php::rules | Q attendance_session_id nullable integer exists; attendance_boundary nullable in departure,return. | 200 current_session và các count; 403 nếu không có Guide profile/assignment; G-404 cho departure binding; G-422 nếu input sai hoặc session/boundary không thuộc departure. |
| 80 | GET/HEAD /api/guide/tours/{tourDeparture}/customers | GUI-ATT::customers; Form Request backend_laravel/app/Http/Requests/GuideTourCustomerIndexRequest.php::rules | Q keyword nullable string≤100; status in checked_in,not_checked_in,absent,checked_out; attendance_session_id nullable exists; attendance_boundary departure/return; per_page 1..100. | 200 current_session, Resource collection và meta; 403 nếu không có Guide profile/assignment; G-404 cho departure binding; G-422 nếu query sai hoặc session/boundary không thuộc departure. |
| 81 | GET/HEAD /api/guide/tours/{tourDeparture}/customers/{bookingParticipant} | GUI-ATT::showCustomer | Hai P route-model binding; không input/rule. | 200 GuideTourCustomerDetailResource; 403 nếu không có Guide profile/assignment; G-404 cho binding; G-422 nếu participant không thuộc booking confirmed+paid của departure. |
| 82 | GET/HEAD /api/guide/tours/{tourDeparture}/overview | GUI-ATT::overview | P route-model binding; không input/rule. | 200 GuideTourOverviewResource; 403 nếu không có Guide profile/assignment; G-404 cho binding/row lock. Không có ValidationException tường minh trong `getOverview()`. |
| 83 | POST /api/guide/tours/{tourDeparture}/replacement-requests | GUI-TOUR::requestReplacement; Form Request backend_laravel/app/Http/Requests/StoreGuideReplacementRequest.php::rules | Body reason required string 10..2000; evidence nullable file jpg/jpeg/png/webp/pdf max5120. | 201 `{message,data}`; 404 nếu route binding lỗi hoặc không có Guide profile; 403 nếu Guide không có assignment active trên departure; 409 nếu đã có request pending; 422 nếu còn dưới 5 ngày hoặc validation lỗi. |
| 84 | GET/HEAD /api/guide/tours/{tourDeparture}/replacement-requests/status | GUI-TOUR::replacementRequestStatus | P route-model binding; không query/body rule; query theo departure và current_guide_id, không kiểm assignment hiện tại. | 200 `{message,data}` với request mới nhất hoặc null; không có Guide profile cũng trả 200 `data:null`; G-404 chỉ từ route-model binding. |
| 85 | GET/HEAD /api/guide/tours/{tourDeparture}/stages | GUI-ATT::stages | P route-model binding; không input/rule; service tạo stage từ itinerary nếu chưa có. | 200 current_stage (có thể null) + TourDepartureStageResource collection; 403 nếu không có Guide profile/assignment; G-404 cho binding/row lock. Không có ValidationException tường minh trong `getStages()`. |
| 86 | POST /api/guide/tours/{tourDeparture}/stages/advance | GUI-ATT::advanceStage | P route-model binding; không body/rule. | 200 current_stage + stages; 403 nếu không có Guide profile/assignment; G-404 cho binding/row lock; G-422 nếu departure không ongoing, không có stage in_progress hoặc đã ở stage cuối. |

## Scheduler và console liên quan

Các mục dưới đây không phải HTTP route và không nằm trong tổng 239:

| Lịch | Command | Hành vi/nguồn |
|---|---|---|
| Mỗi phút | db:backup --scheduled | backend_laravel/routes/console.php; command backend_laravel/app/Console/Commands/DatabaseBackupCommand.php — DatabaseBackupCommand::handle. |
| Mỗi phút | vnpay:expire-pending-payments | backend_laravel/routes/console.php; command backend_laravel/app/Console/Commands/ExpirePendingVnpayPayments.php — ExpirePendingVnpayPayments::handle. |
| Mỗi giờ, withoutOverlapping | guide-reviews:send-reminders | backend_laravel/routes/console.php; command backend_laravel/app/Console/Commands/SendGuideReviewReminders.php — SendGuideReviewReminders::handle. |
| Theo lệnh thủ công | inspire | Closure command trong backend_laravel/routes/console.php; không có nghiệp vụ ứng dụng khác trong source route. |

## Admin — 153 route

Tất cả dùng auth:sanctum và role:admin; áp dụng G-401/G-403.

### Mã nguồn controller admin

| Mã | File — class |
|---|---|
| ADM-BACK | backend_laravel/app/Http/Controllers/Api/Admin/DatabaseBackupController.php — DatabaseBackupController |
| ADM-BOOK | backend_laravel/app/Http/Controllers/Api/Admin/BookingController.php — BookingController |
| ADM-CAT | backend_laravel/app/Http/Controllers/Api/Admin/CategoryController.php — CategoryController |
| ADM-CERT | backend_laravel/app/Http/Controllers/Api/Admin/CertificateController.php — CertificateController |
| ADM-USER | backend_laravel/app/Http/Controllers/Api/Admin/CustomerManagerController.php — CustomerManagerController |
| ADM-DEST | backend_laravel/app/Http/Controllers/Api/Admin/DestinationController.php — DestinationController |
| ADM-LEAVE | backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideLeaveRequestController.php — AdminGuideLeaveRequestController |
| ADM-REPL | backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideReplacementRequestController.php — AdminGuideReplacementRequestController |
| ADM-GUIDE | backend_laravel/app/Http/Controllers/Api/Admin/GuideController.php — GuideController |
| ADM-LANG | backend_laravel/app/Http/Controllers/Api/Admin/LanguageController.php — LanguageController |
| ADM-BELL | backend_laravel/app/Http/Controllers/Api/Admin/AdminNotificationBellController.php — AdminNotificationBellController |
| ADM-NOT | backend_laravel/app/Http/Controllers/Api/Admin/NotificationController.php — NotificationController |
| ADM-PAY | backend_laravel/app/Http/Controllers/Api/Admin/PaymentController.php — PaymentController |
| ADM-PRO | backend_laravel/app/Http/Controllers/Api/Admin/AdminProfileController.php — AdminProfileController |
| ADM-REP | backend_laravel/app/Http/Controllers/Api/Admin/ReportController.php — ReportController |
| ADM-SVC | backend_laravel/app/Http/Controllers/Api/Admin/ServiceCategoryController.php — ServiceCategoryController |
| ADM-SET | backend_laravel/app/Http/Controllers/Api/Admin/SettingController.php — SettingController |
| ADM-STAFF | backend_laravel/app/Http/Controllers/Api/Admin/SupportStaffController.php — SupportStaffController |
| ADM-ASG | backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php — TourDepartureGuideAssignmentController |
| ADM-DEPB | backend_laravel/app/Http/Controllers/Api/Admin/AdminTourDepartureBookingController.php — AdminTourDepartureBookingController |
| ADM-TREV | backend_laravel/app/Http/Controllers/Api/Admin/TourReviewController.php — TourReviewController |
| ADM-TOUR | backend_laravel/app/Http/Controllers/Api/Admin/TourManagerController.php — TourManagerController |
| ADM-DEP | backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureController.php — TourDepartureController |
| ADM-WID | backend_laravel/app/Http/Controllers/Api/Admin/WidgetController.php — WidgetController |

### Backup database — 4 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 87 | GET/HEAD /api/admin/backups | ADM-BACK::index | Không input/rule. | 200: status, message, data danh sách file từ DatabaseBackupService::listBackups. |
| 88 | POST /api/admin/backups | ADM-BACK::store | Không body/rule. | 201: status, message, data backup; 422 RuntimeException từ dịch vụ/mysqldump. |
| 89 | DELETE /api/admin/backups/{filename} | ADM-BACK::destroy | P filename; controller không Laravel-validate, DatabaseBackupService kiểm định dạng/tồn tại. | 200 message; 404 InvalidArgumentException. |
| 90 | GET/HEAD /api/admin/backups/{filename}/download | ADM-BACK::download | P filename; kiểm bằng DatabaseBackupService::downloadPath. | 200 BinaryFileResponse content-type application/sql; 404 filename không hợp lệ/không tồn tại. |

### Booking — 7 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 91 | GET/HEAD /api/admin/bookings | ADM-BOOK::index | Q search nullable string≤100; status in pending,confirmed,completed,cancelled; payment_status in unpaid,paid,failed,refunded; from_date date; to_date date≥from_date; per_page 5..100; sort_by created_at,total_amount,booking_code; sort_dir asc/desc. | 200: success, data items, meta; G-422. |
| 92 | POST /api/admin/bookings | ADM-BOOK::store | Body user_id/tour_id required exists; tour_departure_id,promotion_id,staff_id nullable exists; number_of_people integer≥1; unit_price,discount_amount numeric≥0; note; contact tùy chọn với name/phone required_with; participants tùy chọn, mỗi phần tử có full_name, birth_date≤today và các trường phone/gender/identity_number/participant_type. | 201 success/message/data; G-404/G-422. Nếu không có participants phải có number_of_people và unit_price; nếu có participants phải có departure đúng tour và ít nhất một người lớn. |
| 93 | GET/HEAD /api/admin/bookings/statistics | ADM-BOOK::statistics | Q year được ép integer; không có validation range/tường minh. | 200: success, data tổng số theo booking/payment status và doanh thu paid, non-cancelled. |
| 94 | GET/HEAD /api/admin/bookings/{id} | ADM-BOOK::show | P id; không route regex/rule. | 200 success/data kèm user,tour,departure,contact,participants,payment,statusHistories; G-404. |
| 95 | PUT /api/admin/bookings/{id} | ADM-BOOK::update | Body number_of_people integer≥1; unit_price/discount_amount numeric≥0; status pending/confirmed/completed/cancelled; payment_status prohibited; note,cancel_reason; staff_id exists; contact/participants cùng rule như create và đều nullable/sometimes. | 200 success/data; G-404/G-422. Transaction re-query và `lockForUpdate()` booking trước state guard; `cancelled` là terminal, yêu cầu chuyển sang trạng thái khác trả `422` tại `status`; chỉ transition đầu tiên sang cancelled giải phóng slot. |
| 96 | DELETE /api/admin/bookings/{id} | ADM-BOOK::destroy | P id; không body. | 200 message nếu booking đã cancelled; 404 không tồn tại; 422 nếu chưa cancelled. Method gọi delete, không thấy forceDelete trong source method. |
| 97 | PATCH /api/admin/bookings/{id}/cancel | ADM-BOOK::softDelete | P id; không body/rule. | 200 success/message; G-404; transaction + lockForUpdate, gọi lặp trên booking cancelled không giải phóng slot lần nữa. |

### Danh mục tour — 7 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 98 | GET/HEAD /api/admin/categories | ADM-CAT::index | Không input/rule. | 200 status/message/data; chỉ status active. |
| 99 | POST /api/admin/categories | ADM-CAT::store | Body name required string≤150 unique; description nullable string; thumbnail_image nullable image jpg/jpeg/png/webp max5120; thumbnail_alt_text≤255; status active/inactive. | 201 status/message/data; G-422. |
| 100 | GET/HEAD /api/admin/categories-trashed | ADM-CAT::trashed | Không input/rule. | 200 status/message/data onlyTrashed. |
| 101 | GET/HEAD /api/admin/categories/search | ADM-CAT::search | Q name required string≤150. | 200 status/message/count/data; G-422. |
| 102 | PUT /api/admin/categories/{id} | ADM-CAT::update | P id; Body name sometimes required string≤150 unique bỏ qua id; description nullable; thumbnail image như create; thumbnail_alt_text≤255; status active/inactive. | 200 status/message/data; 404 không tồn tại; G-422. |
| 103 | DELETE /api/admin/categories/{id} | ADM-CAT::destroy | P id; không body. | 200 message, soft delete; 404 không tồn tại. |
| 104 | PATCH /api/admin/categories/{id}/restore | ADM-CAT::restore | P id; không body. | 200 status/message/data; 404 nếu không nằm trong onlyTrashed. |

### Chứng chỉ — 5 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 105 | GET/HEAD /api/admin/certificates | ADM-CERT::index | Q search được dùng nhưng không validate tường minh. | 200 message/data. |
| 106 | POST /api/admin/certificates | ADM-CERT::store | Body name required string≤150 unique; issued_by nullable string≤150. | 201 message/data; G-422. |
| 107 | GET/HEAD /api/admin/certificates/{id} | ADM-CERT::show | P id; không body/rule. | 200 message/data; 404 không tồn tại. |
| 108 | PUT /api/admin/certificates/{id} | ADM-CERT::update | Body name required string≤150 unique bỏ qua id; issued_by nullable string≤150. | 200 message/data; 404; G-422. |
| 109 | DELETE /api/admin/certificates/{id} | ADM-CERT::destroy | P id; không body/rule. | 200 message; 404 không tồn tại; 422 nếu certificate đang được guide sử dụng. |

### Người dùng — 9 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 110 | GET/HEAD /api/admin/customers | ADM-USER::index | Không query/rule; method thực tế lấy toàn bộ User, không chỉ role customer. | 200 status/message/data kèm bookings_count. |
| 111 | POST /api/admin/customers | ADM-USER::store | Body full_name required string≤255; email required email unique; password required min6; phone nullable string≤10; role_id required exists; avatar nullable image jpg/jpeg/png/webp max5120. | 201 status/message/data user+role; G-422. |
| 112 | GET/HEAD /api/admin/customers/count | ADM-USER::count | Không input/rule. | 200 status/data số user nhóm theo role_id. |
| 113 | GET/HEAD /api/admin/customers/search | ADM-USER::search | Q role_id,status,search,exclude_completed_support_staff được dùng; không validate tường minh. | 200 status/data collection. |
| 114 | GET/HEAD /api/admin/customers/statistics | ADM-USER::statistics | Không input/rule. | 200 status/data total_users,active_users,locked_users,total_bookings cho role customer. |
| 115 | GET/HEAD /api/admin/customers/{id} | ADM-USER::show | P id; không body. | 200 status/message/data user+role+bookings_count; 404. |
| 116 | PUT /api/admin/customers/{id} | ADM-USER::update | Body full_name sometimes string≤255; email sometimes email unique bỏ qua id; phone nullable≤15; status active/inactive; password min6; role_id exists; avatar nullable image jpg/jpeg/png/webp max2048. | 200 status/message/data; 404; G-422. |
| 117 | PATCH /api/admin/customers/{id}/lock | ADM-USER::lock | P id; không body/rule. | 200 khi chuyển status inactive; 404 không tồn tại; 422 nếu đã inactive. |
| 118 | PATCH /api/admin/customers/{id}/unlock | ADM-USER::unlock | P id; không body/rule. | 200 khi chuyển active; 404 không tồn tại; 422 nếu đã active. |

### Điểm đến — 9 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 119 | GET/HEAD /api/admin/destinations | ADM-DEST::index | Không input/rule. | 200 JSON mảng Destination::all. |
| 120 | POST /api/admin/destinations | ADM-DEST::store | Body name required string; slug required unique destinations; province_city required; country required. | 201 model JSON; G-422. |
| 121 | GET/HEAD /api/admin/destinations/search | ADM-DEST::search | Q keyword nullable string≤255; city,country nullable string≤100. | 200 success/data paginator 15; 404 khi paginator isEmpty; G-422. |
| 122 | GET/HEAD /api/admin/destinations/trash/list | ADM-DEST::trashed | Không input/rule. | 200 mảng onlyTrashed. |
| 123 | GET/HEAD /api/admin/destinations/{destination} | ADM-DEST::show | P destination do apiResource; controller nhận id, findOrFail. | 200 success/data; G-404. |
| 124 | PUT/PATCH /api/admin/destinations/{destination} | ADM-DEST::update | P destination; body được truyền trực tiếp request->all; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về validation input update. | 200 model JSON; G-404. |
| 125 | DELETE /api/admin/destinations/{destination} | ADM-DEST::destroy | P binding/id; không body. | 200 message, soft delete; G-404. |
| 126 | DELETE /api/admin/destinations/{id}/force-delete | ADM-DEST::forceDelete | P id; không body. | 200 message; G-404 nếu không nằm trong onlyTrashed. |
| 127 | POST /api/admin/destinations/{id}/restore | ADM-DEST::restore | P id; không body. | 200 message; G-404 nếu không nằm trong onlyTrashed. |

### Đơn nghỉ và yêu cầu thay HDV — 9 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 128 | GET/HEAD /api/admin/guide-leave-requests | ADM-LEAVE::index | Q status,leave_state,created_month,created_year,created_from,created_to,search,per_page được dùng; không validate tường minh; per_page ép 1..100. | 200 status/message/summary/data paginator. |
| 129 | GET/HEAD /api/admin/guide-leave-requests/{leaveRequest} | ADM-LEAVE::show | P route-model binding; không input/rule. | 200 status/message/data; G-404. |
| 130 | POST /api/admin/guide-leave-requests/{leaveRequest}/approve | ADM-LEAVE::approve | Body admin_note nullable string≤2000. | 200 status/message/data/summary; 422 nếu đơn cancelled hoặc thời gian nghỉ đã qua; G-404/G-422. |
| 131 | PATCH /api/admin/guide-leave-requests/{leaveRequest}/decision | ADM-LEAVE::updateDecision | Body status required approved/rejected; admin_note nullable string≤2000 qua updateStatus. | 200 status/message/data/summary; 422 cancelled/đã quá hạn; G-404/G-422. |
| 132 | POST /api/admin/guide-leave-requests/{leaveRequest}/reject | ADM-LEAVE::reject | Body admin_note nullable string≤2000. | 200 status/message/data/summary; 422 cancelled/đã quá hạn; G-404/G-422. |
| 133 | GET/HEAD /api/admin/guide-replacement-requests | ADM-REPL::index | Q status,per_page được dùng; không validate tường minh. | 200 message/data paginator; pending được xếp trước. |
| 134 | POST /api/admin/guide-replacement-requests/{id}/approve | ADM-REPL::approve | P id; Body admin_note nullable string≤2000. | 200 message/data replacement_guide_id; 404 request/departure; 409 đã xử lý; 422 không tìm được guide thay thế; G-422. |
| 135 | POST /api/admin/guide-replacement-requests/{id}/reject | ADM-REPL::reject | P id; Body admin_note nullable string≤2000. | 200 message; 404 request/departure; 409 đã xử lý; G-422. |
| 136 | GET/HEAD /api/admin/guide-specializations | Closure tại backend_laravel/routes/api.php | Không input/rule; gọi GuideSpecialization::all. | 200 message/data. |

### Hướng dẫn viên — 15 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 137 | GET/HEAD /api/admin/guides | ADM-GUIDE::index | Q per_page được helper đọc; không validation tường minh. | 200 message/data paginator. |
| 138 | POST /api/admin/guides | ADM-GUIDE::store | Body user_id required integer exists, unique guide chưa xóa; experience_years required integer 0..40; status active/inactive/locked; destination_ids required array min1, từng id distinct exists; languages array với language_id exists, level_id nullable exists; experiences array với certificate_id exists, issued_year 1900..năm hiện tại. | 201 message/data; G-422; 500 khi transaction ném exception. |
| 139 | GET/HEAD /api/admin/guides/available-users | ADM-GUIDE::availableUsers | Không input/rule. | 200 message/data user role tour guide chưa có guide. |
| 140 | GET/HEAD /api/admin/guides/destination-options | ADM-DEST::options | Không input/rule. | 200 data destination active. |
| 141 | GET/HEAD /api/admin/guides/filter | ADM-GUIDE::filter | Q search,status,leave_status,experience_years,language,destination_id,per_page; không validate tường minh. | 200 message/data paginator. |
| 142 | GET/HEAD /api/admin/guides/search | ADM-GUIDE::search | Q search,per_page; không validate tường minh. | 200 message/data paginator. |
| 143 | GET/HEAD /api/admin/guides/statistics | ADM-GUIDE::statistics | Không input/rule. | 200 message,total,data nhóm theo status. |
| 144 | GET/HEAD /api/admin/guides/trashed | ADM-GUIDE::trashed | Q per_page; không validate tường minh. | 200 message/data onlyTrashed paginator. |
| 145 | GET/HEAD /api/admin/guides/{id} | ADM-GUIDE::show | P id; không body. | 200 message/data; 404. |
| 146 | PUT /api/admin/guides/{id} | ADM-GUIDE::update | Body experience_years sometimes 0..40; status active/inactive/locked; destination_ids sometimes array min1 distinct exists; languages/experiences cùng nested rules như create. | 200 message/data; 404; G-422; 500 transaction error. |
| 147 | DELETE /api/admin/guides/{id} | ADM-GUIDE::destroy | P id; không body. | 200 message, soft delete; 404. |
| 148 | POST /api/admin/guides/{id}/avatar | ADM-GUIDE::uploadAvatar | Body avatar required image jpg/jpeg/png/webp max2048. | 200 message/data avatar_url; 404 guide; 422 chưa liên kết user/G-422. |
| 149 | DELETE /api/admin/guides/{id}/avatar | ADM-GUIDE::deleteAvatar | P id; không body. | 200 message; 404 guide; 422 chưa liên kết user. |
| 150 | DELETE /api/admin/guides/{id}/force | ADM-GUIDE::forceDelete | P id; không body. | 200 message; 404; 422 nếu không thể xóa vì dữ liệu liên quan. |
| 151 | PATCH /api/admin/guides/{id}/restore | ADM-GUIDE::restore | P id; không body. | 200 message; 404. |

### Ngôn ngữ và cấp độ — 9 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 152 | GET/HEAD /api/admin/languages | ADM-LANG::index | Không input/rule. | 200 message/data kèm levels. |
| 153 | POST /api/admin/languages | ADM-LANG::store | Body name required string≤100 unique; levels nullable array, từng item required string≤20. | 201 message/data; G-422; 500 exception sau rollback. |
| 154 | GET/HEAD /api/admin/languages/{id} | ADM-LANG::show | P id; không body. | 200 message/data; 404. |
| 155 | PUT /api/admin/languages/{id} | ADM-LANG::update | Body name required string≤100 unique bỏ qua id. | 200 message/data; 404; G-422. |
| 156 | DELETE /api/admin/languages/{id} | ADM-LANG::destroy | P id; không body. | 200 message; 404. |
| 157 | GET/HEAD /api/admin/languages/{languageId}/levels | ADM-LANG::levels | P languageId; không body. | 200 message/data; 404 language. |
| 158 | POST /api/admin/languages/{languageId}/levels | ADM-LANG::storeLevel | Body level_name required string≤20 và closure kiểm unique trong cùng language. | 201 message/data; 404 language; G-422. |
| 159 | PUT /api/admin/languages/{languageId}/levels/{levelId} | ADM-LANG::updateLevel | Body level_name required string≤20, unique trong language bỏ qua level hiện tại. | 200 message/data; 404 level; G-422. |
| 160 | DELETE /api/admin/languages/{languageId}/levels/{levelId} | ADM-LANG::destroyLevel | Hai P; không body. | 200 message; 404 level. |

### Chuông thông báo admin — 4 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 161 | GET/HEAD /api/admin/notification-bell | ADM-BELL::index | Không validation tường minh; lọc user_id hiện tại. | 200 message/data danh sách gần nhất theo controller. |
| 162 | PATCH /api/admin/notification-bell/read-all | ADM-BELL::markAllAsRead | Không body/rule. | 200 message; chỉ notification của admin hiện tại. |
| 163 | GET/HEAD /api/admin/notification-bell/unread-count | ADM-BELL::unreadCount | Không input/rule. | 200 unread_count. |
| 164 | PATCH /api/admin/notification-bell/{id}/read | ADM-BELL::markAsRead | P id; ownership user_id, không body. | 200 message/data; 404 nếu không thuộc admin. |

### Chiến dịch thông báo — 13 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 165 | POST /api/admin/notifications/draft | ADM-NOT::saveDraft | Body title required string≤255; message required string; target_type required all/role/specific; target_ids nullable array. Method còn đọc id nhưng id không nằm trong validation. | 200 message/data NotificationDraft; G-422. |
| 166 | DELETE /api/admin/notifications/draft/force-delete/{id} | ADM-NOT::forceDeleteDraft | P id; không body/rule. | 200 message; 404 nếu draft không tồn tại. |
| 167 | POST /api/admin/notifications/draft/restore/{id} | ADM-NOT::restoreDraft | P id; không body/rule. | 200 message/data; 404 nếu không tồn tại hoặc không ở thùng rác. |
| 168 | GET/HEAD /api/admin/notifications/draft/{id} | ADM-NOT::showDraft | P id; không query/body rule. | 200 message/data; 404 nếu không tồn tại hoặc status không phải draft. |
| 169 | PUT /api/admin/notifications/draft/{id} | ADM-NOT::updateDraft | Body title required string≤255; message required string; target_type required all/role/specific; target_ids nullable array. | 200 message/data; 404 nếu không phải draft/không tồn tại; G-422. |
| 170 | DELETE /api/admin/notifications/draft/{id} | ADM-NOT::destroy | P id; không body/rule. | 200 message, soft delete; 404. |
| 171 | GET/HEAD /api/admin/notifications/drafts | ADM-NOT::listDrafts | Không input/rule. | 200 message/data các draft chưa gửi. |
| 172 | GET/HEAD /api/admin/notifications/drafts/trashed | ADM-NOT::listTrashedDrafts | Không input/rule. | 200 message/data onlyTrashed. |
| 173 | GET/HEAD /api/admin/notifications/get-all-send | ADM-NOT::getAllSentNotifications | Không input/rule. | 200 message/data campaign status sent; total_recipients được controller đếm theo title và thời gian. |
| 174 | POST /api/admin/notifications/preview-recipients | ADM-NOT::previewRecipients | Body user_ids và role_ids được đọc với mặc định mảng rỗng; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về validation kiểu/phần tử. | 200 JSON collection id/full_name distinct. |
| 175 | DELETE /api/admin/notifications/revoke/{draft_id} | ADM-NOT::revoke | P draft_id; không body/rule. | 200 message và xóa notification theo draft_id, đưa draft về status draft; 404 nếu campaign không ở sent. |
| 176 | POST /api/admin/notifications/send/{id} | ADM-NOT::sendNotification | P draft id; không body/rule; target lấy từ draft. | 200 message số người nhận; 404 draft không tồn tại/đã gửi hoặc không có recipient. Transaction lấy `lockForUpdate()` trên draft trước khi kiểm tra `status=draft`, sau đó bulk insert và chuyển `sent`; request đồng thời lấy lock sau đọc trạng thái mới và không insert lần hai. |
| 177 | GET/HEAD /api/admin/notifications/users | ADM-NOT::getUsers | Q keyword, role_ids được dùng; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về validation. | 200 paginator 20 trực tiếp. |

### Thanh toán — 5 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 178 | GET/HEAD /api/admin/payments | ADM-PAY::index | Q status,payment_method,booking_code được dùng; không validate tường minh. | 200 status/message/data collection. |
| 179 | GET/HEAD /api/admin/payments/{id} | ADM-PAY::show | P id; không body. | 200 status/message/data payment+booking.user; 404. |
| 180 | PATCH /api/admin/payments/{id}/confirm | ADM-PAY::confirm | Body transaction_code sometimes nullable string≤100; gateway_response sometimes nullable array. | 200 khi `pending→success` hoặc `failed→success`, đồng bộ booking.payment_status=`paid`; 404; G-422 cho transition khác. `updateStatus()` dùng transaction và `lockForUpdate()` payment. |
| 181 | PATCH /api/admin/payments/{id}/fail | ADM-PAY::fail | P id; không body/rule. | 200 chỉ khi `pending→failed`, đồng bộ booking.payment_status=`failed`; 404; G-422 cho transition khác. Cùng transaction/row lock trong `updateStatus()`. |
| 182 | PATCH /api/admin/payments/{id}/refund | ADM-PAY::refund | P id; không body/rule. | 200 chỉ khi `success→refunded`, đồng bộ booking.payment_status=`refunded`; 404; G-422 cho transition khác. Cùng transaction/row lock trong `updateStatus()`. |

### Hồ sơ admin — 3 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 183 | GET/HEAD /api/admin/profile | ADM-PRO::show | Không input/rule. | 200 status/message/data user hiện tại. |
| 184 | PUT /api/admin/profile | ADM-PRO::update | Body full_name sometimes required string≤150; email sometimes required email≤150 unique bỏ qua user; phone nullable string≤20; nhận một trong `avatar_url` nullable string≤500 hoặc file `avatar` image JPG/JPEG/PNG/WebP tối đa 5120 KB. | 200 status/message/data; file được lưu tại disk `public/avatars` và URL được ghi vào `users.avatar_url`; gửi đồng thời `avatar` và key `avatar_url` trả G-422 tại field `avatar`. |
| 185 | PUT /api/admin/profile/password | ADM-PRO::changePassword | Body current_password required string; password required string min6 confirmed. | 200 status/message; 422 mật khẩu hiện tại sai hoặc validation. |

### Báo cáo và role — 3 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 186 | GET/HEAD /api/admin/reports/charts | ADM-REP::getChartStatistics | Q year được ép int, mặc định năm hiện tại; không validation range/tường minh. | 200 success/message/data gồm revenue_by_month_chart, booking_by_month_chart, customer_by_month_chart, top_destinations. |
| 187 | GET/HEAD /api/admin/reports/overview | ADM-REP::getOverviewStatistics | Q year ép int, mặc định năm hiện tại; không validation range/tường minh. | 200 success/message/data tổng doanh thu, booking, completion rate, average revenue. |
| 188 | GET/HEAD /api/admin/roles | ADM-USER::index_role | Không input/rule. | 200 status/data roles id,name. |

### Loại dịch vụ — 5 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 189 | GET/HEAD /api/admin/service-categories | ADM-SVC::index; Form Request backend_laravel/app/Http/Requests/IndexServiceCategoryRequest.php::rules | Q search nullable string≤255 được trim; status nullable boolean; page integer≥1; per_page 1..100. | 200 success/message/data items + pagination; validation lỗi trả JSON 422 success=false/errors. |
| 190 | POST /api/admin/service-categories | ADM-SVC::store; StoreServiceCategoryRequest::rules | Body name required string≤255 unique service_categories; description nullable string; status required boolean; name được trim. | 201 success/message/data ServiceCategoryResource; validation lỗi JSON 422. |
| 191 | GET/HEAD /api/admin/service-categories/{id} | ADM-SVC::show | P id whereNumber; không body/rule. | 200 success/message/data; 404 success=false/errors=[]. |
| 192 | PUT/PATCH /api/admin/service-categories/{id} | ADM-SVC::update; UpdateServiceCategoryRequest::rules | P id whereNumber; Body name required string≤255 unique bỏ qua id; description nullable string; status required boolean. | 200 success/message/data; 404; validation lỗi JSON 422. |
| 193 | DELETE /api/admin/service-categories/{id} | ADM-SVC::destroy | P id whereNumber; không body. | 200 success/message/data=null, service gọi delete; 404. |

### Cấu hình — 3 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 194 | GET/HEAD /api/admin/settings | ADM-SET::index | Không input/rule. | 200 status/message/data cho Setting::ALLOWED_KEYS. |
| 195 | PUT /api/admin/settings | ADM-SET::update | Chỉ nhận ALLOWED_KEYS. Rule: site/footer/contact/logo/address string/email theo max trong source; password_min_length 6..32; session_timeout_minutes 15..10080; các cờ require_2fa/remember/notify/payment/backup boolean; language vi/en; timezone Asia/Ho_Chi_Minh,Asia/Bangkok,UTC; date_format một trong 3 định dạng; currency VND/USD; payment_gateway vnpay/momo/zalopay/cash; vat_percent 0..100; invoice_prefix≤20; backup_frequency daily/weekly/monthly; backup_time H:i; backup_retention_days≥1. | 200 status/message/data; G-422. |
| 196 | GET/HEAD /api/admin/settings/public | PUB-SET::show | Không input/rule. Route vẫn nằm trong middleware admin dù dùng public controller. | 200 success/data chỉ PUBLIC_KEYS. |

### Nhân viên hỗ trợ — 12 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 197 | GET/HEAD /api/admin/support-staff | ADM-STAFF::index | Q search,code,name,email,phone,role,status,specialization,rating_from,rating_to,per_page; không validate tường minh; per_page chỉ ép tối thiểu 1. | 200 status/message/data paginator. |
| 198 | POST /api/admin/support-staff | ADM-STAFF::store | Body user_id required integer exists; specialization required in noi_dia,quoc_te; experience_years required 0..40; role required string≤100; status nullable active/inactive/hidden; performance_rating nullable numeric 0..5. | 201 status/message/data; 422 validation, user không có role support staff, hoặc profile đã hoàn chỉnh; G-404 user. |
| 199 | GET/HEAD /api/admin/support-staff/available-users | ADM-STAFF::availableUsers | Không input/rule. | 200 status/message/data user role support staff chưa có profile hoàn chỉnh. |
| 200 | GET/HEAD /api/admin/support-staff/statistics | ADM-STAFF::statistics | Không input/rule. | 200 status/message/data total,active,inactive,hidden,average_rating,role_options,top_staff. |
| 201 | GET/HEAD /api/admin/support-staff/trashed | ADM-STAFF::trashed | Q search,code,name,email,phone,per_page; không validate tường minh. | 200 status/message/data onlyTrashed paginator. |
| 202 | GET/HEAD /api/admin/support-staff/{id} | ADM-STAFF::show | P id; không body. | 200 status/data; G-404. |
| 203 | PUT /api/admin/support-staff/{id} | ADM-STAFF::update | Body user_id sometimes required exists, unique support_staff bỏ qua id/chưa xóa; specialization,experience_years,role,status,performance_rating là sometimes required với cùng rule create. | 200 status/message/data; 404; 422 validation hoặc user không role support staff. |
| 204 | DELETE /api/admin/support-staff/{id} | ADM-STAFF::destroy | P id; không body. | 200 status/message, soft delete; G-404. |
| 205 | POST /api/admin/support-staff/{id}/avatar | ADM-STAFF::uploadAvatar | Body avatar required image jpg/jpeg/png/webp max2048. | 200 status/message/data; 404; 422 chưa liên kết user/G-422. |
| 206 | DELETE /api/admin/support-staff/{id}/avatar | ADM-STAFF::deleteAvatar | P id; không body. | 200 status/message/data; 404; 422 chưa liên kết user. |
| 207 | DELETE /api/admin/support-staff/{id}/force-delete | ADM-STAFF::forceDestroy | P id; không body. | 200 status/message; G-404 nếu không nằm trong onlyTrashed. |
| 208 | PATCH /api/admin/support-staff/{id}/restore | ADM-STAFF::restore | P id; không body. | 200 status/message/data; G-404 nếu không nằm trong onlyTrashed. |

### Lập kế hoạch, phân công HDV và khách theo lịch — 8 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 209 | GET/HEAD /api/admin/tour-departures/guide-planning | ADM-ASG::planning | Q from nullable date; to nullable date≥from; tour_id nullable integer exists; per_page 1..100. | 200 message/data paginator; G-422. |
| 210 | POST /api/admin/tour-departures/{departure}/assign-guide | ADM-ASG::assign | P departure binding; Body guide_id required integer exists. | 201 message/data assignment; 422 nếu departure có ngày đi `<= hôm nay`; write transaction khóa departure và kiểm tra lại mutation guard; G-404/G-422 từ validation/GuideAssignmentService. |
| 211 | POST /api/admin/tour-departures/{departure}/auto-assign-guide | ADM-ASG::autoAssign | P binding; không body/rule. | 201 message/data assignment; G-404/G-422 nếu không có guide phù hợp hoặc departure bị khóa/đã có lead. |
| 212 | POST /api/admin/tour-departures/{departure}/direct-assign-guide | ADM-ASG::directAssign | Body guide_id required integer exists; force_area_mismatch nullable boolean. | 201 message/data; 409 yêu cầu xác nhận lệch khu vực; 422 khi departure bị khóa, trùng lịch hoặc đơn nghỉ; transaction khóa departure và kiểm tra lại guard; G-404/G-422. |
| 213 | GET/HEAD /api/admin/tour-departures/{departure}/direct-guide-candidates | ADM-ASG::directCandidates | Q mode eligible/all; keyword string≤255; from/to date và to≥from; destination_id exists; language_ids array với từng id exists; per_page 1..100. | 200 message/data paginator có is_area_match,is_available,is_eligible,blocking_reasons; 422 nếu departure có ngày đi `<= hôm nay`; G-404/G-422. |
| 214 | PATCH /api/admin/tour-departures/{departure}/guide-assignments/{assignment}/cancel | ADM-ASG::cancel | Hai P binding; không body; xác minh assignment thuộc departure. | 200 message; 404 nếu không thuộc departure; 422 nếu departure bị khóa; transaction khóa departure, kiểm tra lại guard, khóa assignment rồi xóa và gửi thông báo. |
| 215 | GET/HEAD /api/admin/tour-departures/{departure}/guide-candidates | ADM-ASG::candidates | P binding; không query/rule. | 200 message/data từ GuideAssignmentService::eligibleGuidesQuery; 422 nếu departure có ngày đi `<= hôm nay`; G-404/G-422. |
| 216 | GET/HEAD /api/admin/tour-departures/{tourDeparture}/booked-customers | ADM-DEPB::index | P binding; Q search nullable string≤100; status,payment_status nullable string≤50; per_page 1..100. | 200 success/message/data gồm departure và bookings paginator; G-404/G-422. |

### Kiểm duyệt đánh giá tour — 3 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 217 | GET/HEAD /api/admin/tour-reviews | ADM-TREV::index | Q search nullable string≤100; status in TourReview::STATUSES; rating 1..5; tour_id exists; from_date date; to_date≥from_date; per_page 5..100. | 200 status/message/summary/data paginator AdminTourReviewResource; G-422. |
| 218 | GET/HEAD /api/admin/tour-reviews/{tourReview} | ADM-TREV::show | P tourReview whereNumber; không input/rule. | 200 status/message/data AdminTourReviewResource; G-404. |
| 219 | PATCH /api/admin/tour-reviews/{tourReview}/status | ADM-TREV::updateStatus; Form Request backend_laravel/app/Http/Requests/Admin/UpdateTourReviewStatusRequest.php::rules | P whereNumber; Body status required in TourReview::STATUSES (visible,hidden,spam theo model). | 200 status/message/data; G-404/G-422. Transaction khóa review, ghi moderated_by/moderated_at và tính lại điểm tour. |

### Tour và lịch khởi hành — 14 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 220 | GET/HEAD /api/admin/tours | ADM-TOUR::index | Q search,status,price_from,price_to được dùng; không validate tường minh; paginate 10. | 200 status/message/data paginator TourResource; loại status hidden. |
| 221 | POST /api/admin/tours | ADM-TOUR::store | Multipart/body: thumbnail_image và gallery_images ảnh jpg/jpeg/png/webp max5120; category_id,destination_id required integer; title required string≤255; summary≤500; description; duration_days≥1; duration_nights nullable; base_price numeric; discount_price nullable numeric; max_slots integer; status draft/published/hidden/cancelled. Itinerary array có day_number,type,title,time,duration,transport,description,images theo rule source. age_pricing_rules có label,min/max age, pricing_type percentage/fixed/free, price_value,sort_order,is_active. | 201 status/message/data TourResource; G-422. Custom validation: max_age≥min_age, khoảng tuổi không chồng, percentage≤100; duration_nights được tính duration_days−1. |
| 222 | PUT /api/admin/tours/departures/{id} | ADM-DEP::update | P id; Body departure_date sometimes date≥today; base_price/discount_price nullable numeric≥0; total_slots integer≥1; status open/closed/completed/cancelled; confirm_booked_change boolean; change_reason required string 3..1000. | 200 data/changes/notification; 409 nếu đã có booking nhưng chưa xác nhận; 422 lịch không được sửa, total_slots<booked_slots hoặc giá không hợp lệ; G-404/G-422. |
| 223 | DELETE /api/admin/tours/departures/{id} | ADM-DEP::destroy | P id; không body; TourDepartureMutationGuard kiểm lịch có thể sửa. | 200 status/message; 404; 422 lịch bị khóa hoặc có bất kỳ booking liên kết. |
| 224 | GET/HEAD /api/admin/tours/hidden-list | ADM-TOUR::hiddenTours | Không input/rule; paginate 10. | 200 status/message/data TourResource paginator. |
| 225 | GET/HEAD /api/admin/tours/public | ADM-TOUR::publicIndex | Q search,price_from,price_to được dùng; không validate tường minh. | 200 status/message/data published TourResource paginator 10. |
| 226 | GET/HEAD /api/admin/tours/statistics | ADM-TOUR::statistics | Q year, mặc định năm hiện tại; không validate tường minh. | 200 JSON thống kê tổng, trạng thái, giá/rating trung bình và top tour; schema key đầy đủ nằm trực tiếp trong method. |
| 227 | GET/HEAD /api/admin/tours/{id} | ADM-TOUR::show | P id; không body. | 200 status/message/data TourResource kèm category,destination,images,itinerary,departure,agePricingRules; G-404. |
| 228 | PUT /api/admin/tours/{id} | ADM-TOUR::update | Cùng nhóm field create; các field chính dùng sometimes; thêm available_slots nullable integer. Khi request có itinerary/age_pricing_rules thì đồng bộ lại toàn bộ; cùng custom rule khoảng tuổi. | 200 status/message/data TourResource; G-404/G-422. duration_nights tiếp tục được tính từ duration_days. |
| 229 | DELETE /api/admin/tours/{id} | ADM-TOUR::destroy | P id; không body. | 200 status/message, soft delete; G-404. |
| 230 | PATCH /api/admin/tours/{id}/hide | ADM-TOUR::hide | P id; không body. | 200 status/message/data; chuyển status hidden; G-404. |
| 231 | PATCH /api/admin/tours/{id}/unhide | ADM-TOUR::unhide | P id; không body. | 200 status/message/data, chuyển hidden→published; 400 nếu tour không hidden; G-404. |
| 232 | GET/HEAD /api/admin/tours/{tourId}/departures | ADM-DEP::index | P tourId; không query/body rule. | 200 status/message/data danh sách departure đã serialize; G-404 tour. |
| 233 | POST /api/admin/tours/{tourId}/departures | ADM-DEP::store | P tourId; Body departure_date required date≥today; base_price nullable, required_with discount_price, numeric≥0; discount_price nullable numeric≥0; total_slots required integer≥1; status required open/closed/completed/cancelled. | 201 status/message/data; G-404/G-422. return_date tự tính từ duration_nights; booked_slots=0; discount không được vượt base theo normalize method. |

### Widget — 6 route

| # | Method, endpoint | Handler/nguồn | Request và validation | Response/status/exception |
|---:|---|---|---|---|
| 234 | GET/HEAD /api/admin/widgets | ADM-WID::index | Q status,type,position,page được dùng; không validate tường minh. | 200 status/message/data collection. |
| 235 | POST /api/admin/widgets | ADM-WID::store | Body title required string≤255; display_title nullable≤255; type required in Banner::TYPES; image_url required_if type=image string≤500; html_content required_if type=html string; link_url≤500; position in Banner::POSITIONS; display_pages array và item in Banner::DISPLAY_PAGES; sort_order integer≥0; start_date date; end_date≥start_date; status active/inactive. | 201 status/message/data; widget HTML được phép bỏ `image_url` và schema lưu null; G-422. |
| 236 | GET/HEAD /api/admin/widgets/{id} | ADM-WID::show | P id; không input/rule. | 200 status/message/data; 404. |
| 237 | PUT /api/admin/widgets/{id} | ADM-WID::update | Cùng rule create nhưng title/type là sometimes|required; các field còn lại theo WidgetController::rules(true). | 200 status/message/data; 404; G-422. |
| 238 | DELETE /api/admin/widgets/{id} | ADM-WID::destroy | P id; không body. | 200 status/message; 404. |
| 239 | PATCH /api/admin/widgets/{id}/toggle-status | ADM-WID::toggleStatus | P id; không body. | 200 status/message/data; 404; chuyển active↔inactive. |

## Kiểm soát độ phủ route

- Public/Auth: #1–#20 = 20.
- Authenticated-shared: #21–#26 = 6.
- Customer: #27–#46 = 20.
- Support staff: #47–#58 = 12.
- Tour guide: #59–#86 = 28.
- Admin: #87–#239 = 153.
- Tổng: **239/239 route** trong output của php artisan route:list --except-vendor --json.
- Route health /up được cấu hình tại backend_laravel/bootstrap/app.php nhưng không xuất hiện trong baseline 239 của lệnh có --except-vendor, vì vậy không được cộng thêm vào bảng.

## Xác minh hậu sửa ngày 2026-07-22

| Contract hiện hành | Source Code Reference | Test Reference |
|---|---|---|
| Contact email booking nullable và rollback bảo toàn row | `StoreBookingRequest::rules()`; `CustomerBookingController::store()`; `2026_07_22_010000_make_booking_contact_email_nullable.php::up/down()` | `AuthBookingBusinessModelRegressionTest.php`: bỏ email/lưu null và rollback thành chuỗi rỗng |
| `certificate_type` Guide nullable, tối đa 100 ký tự | `GuideProfileController::show()/update()`; `Guide::$fillable`; `2026_07_22_000000_restore_certificate_type_to_guides_table.php` | `GuideBusinessModelRegressionTest.php`: round-trip 100 ký tự, 101 ký tự trả `422` |
| Widget HTML không cần image | `WidgetController::rules()/payload()`; `2026_07_22_000000_make_banner_image_url_nullable.php::up/down()` | `BusinessModelAuditBugFixTest.php`: create HTML không ảnh và rollback giữ row |
| Admin avatar nhận URL hoặc file, không nhận đồng thời | `AdminProfileController::update()` | `BusinessModelAuditBugFixTest.php`: upload file, mutual exclusion và biên 5120 KB |
| Payment transition có row lock | `Admin\PaymentController::updateStatus()` | `AuthBookingBusinessModelRegressionTest.php`: bốn transition hợp lệ và tám transition bị từ chối; `PaymentBookingSafetyTest.php` kiểm đồng bộ booking |
| Booking cancelled terminal và release slot có row lock | `Admin\BookingController::update()/softDelete()/releaseBookedSlots()` | `BusinessModelAuditBugFixTest.php`; `BusinessModelConcurrencyMysqlTest.php`: hai process MySQL chỉ release một lần |
| Support notification dùng enum `support`; gửi draft có row lock | `SupportNotificationController::sendNotification()`; `Admin\NotificationController::sendNotification()` | `BusinessModelAuditBugFixTest.php`; `BusinessModelConcurrencyMysqlTest.php`: hai process MySQL nhận `200 + 404`, chỉ một notification/recipient |

Các contract trên được kiểm tra trong snapshot có 83 migration và 22 file test PHP. Test mục tiêu đã chạy trên SQLite và MySQL; sáu kịch bản concurrency đa tiến trình đã chạy trên MySQL. Tài liệu không suy rộng kết quả row-lock sang driver chưa được chạy.
