# Executive Summary và Domain Analysis

## 1. Mục đích và nguyên tắc tài liệu

Tài liệu này tái dựng phạm vi nghiệp vụ của source code tại thời điểm phân tích. Nội dung chỉ được ghi nhận khi có đường dẫn truy vết đến route, controller, service, model, migration, seeder, test hoặc frontend component.

- Nội dung gián tiếp được ghi nhãn **[Suy luận từ source code]**.
- Nội dung không có chứng cứ được ghi **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- Việc một API đã tồn tại không đồng nghĩa giao diện đã tích hợp API đó.
- Giới hạn hiển thị hoặc kiểm tra ở React không được xem là cơ chế phân quyền backend.

## 2. Executive Summary

Source code thể hiện một hệ thống web mang tên ViVuGo, phục vụ công bố tour, tìm kiếm lịch khởi hành, đặt tour, thanh toán VNPAY, quản lý vận hành tour, phân công và vận hành hướng dẫn viên, tiếp nhận hỗ trợ, thông báo và quản trị dữ liệu nền.

Tên ViVuGo có bằng chứng trực tiếp tại:

- File: `backend_laravel/database/seeders/SettingSeeder.php`; class `SettingSeeder`; method `run`; khóa `site_name = ViVuGo`.
- File: `backend_laravel/README.md`; phần “Dữ liệu mẫu ViVuGo”.
- File: `frontend_react/src/components/BrandLogo.jsx`; component `BrandLogo`.
- File: `frontend_react/src/locales/vi.json`; các chuỗi giao diện ViVuGo.

Các luồng nghiệp vụ có triển khai end-to-end rõ nhất gồm:

1. Khách tìm tour đã xuất bản và lịch còn mở, xem chi tiết, xem trước giá, tạo booking và chuyển sang VNPAY.
2. Hệ thống lưu booking, liên hệ, hành khách, payment và lịch sử trạng thái; sử dụng transaction và khóa bản ghi khi giữ chỗ.
3. Admin quản lý tour, lịch khởi hành, booking, payment, tài khoản, hướng dẫn viên, nhân viên hỗ trợ, thông báo và cấu hình.
4. Hướng dẫn viên xem tour được phân công, quản lý điểm danh, tiến độ hành trình, yêu cầu đổi hướng dẫn viên và xin nghỉ.
5. Nhân viên hỗ trợ tiếp nhận, nhận xử lý và hoàn tất yêu cầu hỗ trợ.
6. Backend đã triển khai đánh giá tour công khai, khách tạo/sửa và admin kiểm duyệt. React hiện chưa có page/service quản lý đánh giá tour; trang chi tiết tour vẫn hiển thị nội dung giữ chỗ và khối đánh giá trang chủ đang bị comment.

Nguồn tổng quát:

- Route backend: `backend_laravel/routes/api.php`.
- Router frontend: `frontend_react/src/routes/AppRoutes.jsx`; component `AppRoutes`.
- Dữ liệu mẫu luồng vận hành: `backend_laravel/database/seeders/DemoWorkflowSeeder.php`; class `DemoWorkflowSeeder`.
- Kiểm thử đánh giá tour: `backend_laravel/tests/Feature/TourReviewApiTest.php`.

Không tìm thấy tài liệu sản phẩm độc lập trong source mô tả mục tiêu doanh thu, KPI, SLA hoặc chủ sở hữu sản phẩm. Do đó:

> **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về mục tiêu kinh doanh định lượng, KPI, SLA và cơ cấu chủ sở hữu nghiệp vụ.

## 3. Domain có bằng chứng

### 3.1 Domain chính

**[Suy luận từ source code]** Domain chính là quản lý và vận hành dịch vụ tour du lịch trực tuyến.

Bằng chứng:

- `Tour`, `TourDeparture`, `Booking`, `BookingParticipant`, `Payment`, `TourGuideAssignment`, `Attendance` là các model lõi tại `backend_laravel/app/Models`.
- Các bảng tương ứng được tạo trong `backend_laravel/database/migrations/2026_06_10_220020_create_tours_table.php`, `2026_06_10_220040_create_tour_departures_table.php`, `2026_06_10_220060_create_bookings_table.php`, `2026_06_10_220080_create_booking_participants_table.php`, `2026_06_10_220090_create_payments_table.php`, `2026_06_28_092905_create_tour_guide_assignments_table.php` và `2026_07_02_143241_create_guide_attendance_and_stage_tables.php`.
- Route công khai và customer tại `backend_laravel/routes/api.php` cung cấp catalog, tour, booking, wishlist, payment, review và hỗ trợ.

### 3.2 Các bounded context quan sát được

**[Suy luận từ source code]** Việc nhóm controller, service và bảng dưới đây thành các bounded context là cách phân loại kiến trúc được suy ra từ cấu trúc source; source code không khai báo trực tiếp tên hoặc ranh giới bounded context.

| Bounded context | Bằng chứng trực tiếp |
| --- | --- |
| Danh mục và nội dung tour | `TourController`, `PublicCatalogController`, `TourManagerController`; models `Tour`, `Category`, `Destination`, `TourItinerary`, `TourImage` |
| Lịch khởi hành và giá | `TourDepartureController`, `TourPricingService`; models `TourDeparture`, `TourAgePricingRule` |
| Booking và hành khách | `CustomerBookingController`, admin `BookingController`; models `Booking`, `BookingContact`, `BookingParticipant`, `BookingStatusHistory` |
| Thanh toán | `VnpayPaymentController`, admin `PaymentController`, `VnpayService`, `VnpayPaymentLifecycleService`; model `Payment` |
| Hướng dẫn viên | admin `GuideController`, guide `GuideTourController`, `GuideProfileController`; models `Guide`, `GuideLanguage`, `GuideExperience`; pivot `guide_destinations` được ánh xạ qua `Guide::destinations()` và `Destination::guides()`. App model `GuideDestination`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** vì file `backend_laravel/app/Models/GuideDestination.php` lại khai báo class `TourGuideAssignment` |
| Phân công và vận hành tour | `TourDepartureGuideAssignmentController`, `GuideAssignmentService`, `GuideAttendanceController`, `GuideTourOperationService` |
| Đánh giá | public/customer/admin `TourReviewController`, customer/guide `GuideReviewController`; models `TourReview`, `Review` |
| Hỗ trợ | `CustomerSupportRequestController`, support `SupportRequestController`; models `SupportRequest`, `SupportRequestAttachment` |
| Thông báo | admin `NotificationController`, các notification bell/customer/support controller; models `Notification`, `NotificationDraft` |
| Cấu hình và sao lưu | `SettingController`, `PublicSettingController`, `WidgetController`, `DatabaseBackupController`, `DatabaseBackupService` |
| Trợ lý du lịch | `ChatBotController`; models `ChatConversation`, `ChatMessage` |

## 4. Actor và vai trò

### 4.1 Vai trò được seed

| Role lưu trong hệ thống | Mô tả từ seeder | Bằng chứng |
| --- | --- | --- |
| `customer` | Khách hàng | `backend_laravel/database/seeders/RoleSeeder.php`; `RoleSeeder::run` |
| `tour guide` | Hướng dẫn viên | cùng nguồn |
| `support staff` | Nhân viên hỗ trợ | cùng nguồn |
| `admin` | Quản trị viên | cùng nguồn |

Quan hệ dữ liệu:

- Model `User::role()` thuộc về `Role`; file `backend_laravel/app/Models/User.php`.
- Model `Role::users()` có nhiều `User`; file `backend_laravel/app/Models/Role.php`.
- FK `users.role_id` được thêm bởi `backend_laravel/database/migrations/2026_06_10_215910_add_vivugo_columns_to_users_table.php`.

### 4.2 Khả năng theo actor

| Actor | Khả năng có route backend | Không gian UI có bằng chứng |
| --- | --- | --- |
| Guest | Xem home/catalog/tour/review tour công khai; đăng ký/đăng nhập; gọi chatbot/travel assistant; nhận kết quả VNPAY | `/`, `/tours/*`, `/destinations`, `/deals`, `/auth/*`, `/payment/vnpay/return` |
| Customer | Hồ sơ, booking, payment, wishlist, đánh giá tour/HDV, yêu cầu hỗ trợ, thông báo | Các route `/customer/*` trong `AppRoutes`; một số hành động được render nội bộ bởi `CustomerPage` |
| Tour guide | Hồ sơ, dashboard, tour được phân công, khách tour, điểm danh, tiến độ tour, review, lịch sử, yêu cầu đổi HDV và nghỉ phép | `/guide`, `/guide/tours`, `/guide/attendance`, `/guide/reviews`, `/guide/notifications`, `/guide/profile` |
| Support staff | Hồ sơ, yêu cầu hỗ trợ, thông báo và gửi thông báo tới admin | `/support`, `/support/profile`, `/support/requests`, `/support/notifications`, `/support/work-schedule` |
| Admin | Quản trị catalog, tour, lịch, booking, payment, user, guide, support staff, report, notification, settings, backup, review tour | Các route `/api/admin/*`; React có UI cho phần lớn module nhưng chưa có UI tour review. `BackupSettingsPage.jsx` chỉ hiển thị cấu hình backup qua `/api/admin/settings`, không gọi `/api/admin/backups*` |

Nguồn authorization backend:

- File: `backend_laravel/routes/api.php`; middleware `auth:sanctum` và `role:customer|tour guide|support staff|admin`.
- File: `backend_laravel/app/Http/Middleware/CheckRole.php`; class `CheckRole`.
- File: `backend_laravel/bootstrap/app.php`; đăng ký alias middleware `role`.

Nguồn guard frontend:

- File: `frontend_react/src/components/admin/ProtectedAdminRoute.jsx`; component `ProtectedAdminRoute`.
- File: `frontend_react/src/routes/AppRoutes.jsx`; helpers `protect`, `adminPage`, `guidePage`, `supportPage`.

### 4.3 Stakeholder

**[Suy luận từ source code]** Các actor trên được phân loại là stakeholder vận hành trực tiếp vì có bằng chứng trong role, route và giao diện; source không có khai báo stakeholder độc lập.

**[Suy luận từ source code]** VNPAY và Gemini được phân loại là hệ thống tích hợp bên ngoài, không phải stakeholder con người, dựa trên các lời gọi tích hợp sau:

- VNPAY: `backend_laravel/app/Services/VnpayService.php`; class `VnpayService`; methods `createPaymentUrl`, `verifyResponse`.
- Gemini: `backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php`; method `callGemini` gọi Google Generative Language API.

> **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về ban điều hành, chủ sở hữu sản phẩm, kế toán, đối tác thanh toán với tư cách actor đăng nhập, cơ quan quản lý hoặc stakeholder phê duyệt yêu cầu.

## 5. Danh sách module và mức độ tích hợp

| Module | Backend | React | Ghi chú bằng chứng |
| --- | --- | --- | --- |
| Authentication/RBAC | Có | Có | Sanctum, role middleware, login/register/logout |
| Hồ sơ người dùng | Có | Có | Customer, guide, support, admin profile APIs |
| Public catalog/home | Có | Có | `/home`, `/catalog/*`, `/tours*` |
| Wishlist | Có | Có | Customer-only API và profile favorites |
| Booking | Có | Có | Preview, create, continue payment, cancel, admin CRUD |
| VNPAY/payment | Có | Có | Checkout, return, IPN, admin status operations |
| Tour review | Có | **Chưa tích hợp UI** | Backend public/customer/admin đầy đủ; React không có service/page/admin menu |
| Guide review | Có | Có nhưng có mismatch props ở profile | Notification bell gọi modal đúng; `ProfileDashboard` truyền sai props |
| Customer support | Có | Có | Ticket, file đính kèm, support xử lý trạng thái |
| Chat AI | Có | Có | Frontend tạo session nhưng service hiện không gửi `session_id` |
| Admin catalog/tour/departure | Có | Có | Categories, destinations, tours, itineraries, prices, departures |
| Guide assignment/replacement | Có | Có | Tự động/trực tiếp, xung đột lịch/nghỉ, yêu cầu thay thế |
| Attendance/stage | Có | Có một phần | Backend có check-out/stage; UI attendance không gọi check-out theo inventory frontend |
| Guide leave | Có | Có | Guide gửi/hủy; admin duyệt/từ chối/đổi quyết định |
| Notifications | Có | Có | Admin campaigns, role-specific bells; guide UI đang dùng endpoint customer dùng chung |
| Reports | Có | Có | Overview/charts và export CSV phía client |
| Settings/widgets | Có | Có | Settings UI; widget API có backend, banner hiển thị public |
| Database backup | Có | Chỉ có UI cấu hình | Backend có admin API, command và scheduler. React `BackupSettingsPage.jsx` dùng `SettingsDetailPage`/`adminSettingService.js` để gọi `/api/admin/settings`; **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về lời gọi React tới `/api/admin/backups*` |
| Languages/certificates | Có | Có | CRUD admin |
| Service categories | Có | **Không có route/page React** | Có service/components rời nhưng không được gắn vào `AppRoutes` |
| Promotions/partners/blogs/refunds/support messages/system logs | Chủ yếu migration/seeder | Không thấy UI nghiệp vụ hoàn chỉnh | Xem mục artifacts chưa thành module end-to-end trong file 02 |

## 6. Menu có bằng chứng

### 6.1 Admin sidebar

Nguồn: `frontend_react/src/components/admin/AdminSidebar.jsx`; constant `menuItems`; component `AdminSidebar`.

- Tổng Quan
- Tour
- Lịch Khởi Hành
- Booking
- Người Dùng
- Nhân Viên Hỗ Trợ
- Hướng Dẫn Viên
- Báo Cáo & Thống Kê
- Thông Báo
- Cài Đặt Hệ Thống

Không có mục “Đánh Giá”, categories, destinations, languages hoặc certificates trong `menuItems`, dù một số route tương ứng tồn tại trong `AppRoutes`.

### 6.2 Guide sidebar

Nguồn: `frontend_react/src/components/guide/GuideSidebar.jsx`; constant `guideMenuItems`; component `GuideSidebar`.

- Trang chủ
- Tour của tôi
- Điểm danh
- Lịch sử Tour
- Đánh giá
- Thông báo

Route `/guide/history` hiện render `GuideComingSoonPage`; `/guide/customers` và `/guide/messages` cũng render component trống.

### 6.3 Support sidebar

Nguồn: `frontend_react/src/components/support/SupportSidebar.jsx`; constant `supportMenuItems`; component `SupportSidebar`.

- Trang chủ
- Lịch làm việc
- Yêu cầu hỗ trợ
- Thông báo

### 6.4 Customer navigation

Nguồn: các component header/customer và `frontend_react/src/pages/customer/CustomerPage.jsx`.

- Trang chủ, tour, điểm đến, ưu đãi, hỗ trợ.
- Khi đăng nhập: hồ sơ, booking, yêu thích, cài đặt.
- Header lấy một phần dữ liệu mega menu từ `/catalog/categories`, `/catalog/destinations` và `/tours`; nội dung chính sách có phần viết cố định tại frontend.

## 7. Ranh giới hệ thống

### 7.1 Thành phần bên trong repository

```text
Trình duyệt
  -> React SPA (frontend_react)
  -> Laravel JSON API (backend_laravel/routes/api.php)
  -> Eloquent models / services
  -> Database theo Laravel migrations
  -> Public storage cho avatar, tour image, support evidence, leave/replacement evidence
```

Bằng chứng:

- Axios base URL: `frontend_react/src/services/apiClient.js`; `VITE_API_URL` hoặc `http://127.0.0.1:8000/api`.
- API routing: `backend_laravel/bootstrap/app.php` và `backend_laravel/routes/api.php`.
- File storage: `CustomerController::updateProfile`, `TourManagerController::store/update`, `CustomerSupportRequestController::store`, `GuideLeaveRequestController::store`.

### 7.2 Hệ thống bên ngoài

**[Suy luận từ source code]** Phân loại các thành phần sau là “hệ thống bên ngoài” được suy ra từ hướng gọi và cấu hình tích hợp trong source code.

| Hệ thống | Hướng tích hợp | Bằng chứng |
| --- | --- | --- |
| VNPAY | Backend tạo URL thanh toán; nhận return/IPN; xác minh HMAC SHA-512 | `VnpayService`, `VnpayPaymentController`; routes `/webhooks/vnpay`, `/vnpay/return-status` |
| Gemini Generative Language API | Backend gửi prompt và lịch sử chat, nhận câu trả lời | `ChatBotController::callGemini` |
| Trình duyệt storage | React lưu token/session, wishlist optimistic và lịch sử chat | `frontend_react/src/services/authStorage.js`, `CustomerPage.jsx`, `ChatBox.jsx` |

> **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về tích hợp SMS gateway, hệ thống email production, CRM, ERP hoặc hệ thống kế toán bên ngoài.

## 8. Stack và runtime có bằng chứng

### Backend

| Thành phần | Phiên bản/chứng cứ |
| --- | --- |
| PHP | `^8.2`; `backend_laravel/composer.json` |
| Laravel | `^12.0`; cùng file |
| Laravel Sanctum | `^4.3`; cùng file |
| Pest | `^3.8`; cùng file và `backend_laravel/tests/Pest.php` |
| Scheduler/queue worker | Composer script `dev` chạy `php artisan queue:listen`; `routes/console.php` khai báo scheduler |
| Database | Laravel connection được cấu hình qua `backend_laravel/config/database.php`; migrations là schema chuẩn |

### Frontend

| Thành phần | Phiên bản/chứng cứ |
| --- | --- |
| React | `^19.2.6`; `frontend_react/package.json` |
| React Router | `^7.17.0`; cùng file |
| Axios | `^1.17.0`; cùng file |
| Tailwind CSS | `^4.3.1`; cùng file và `frontend_react/vite.config.js` |
| Vite | `^8.0.12`; `frontend_react/package.json` |
| Node.js theo dependency Vite | `^20.19.0 || >=22.12.0`; `frontend_react/package-lock.json`, package `vite` |
| i18next | `^26.3.1`; cùng file |
| Recharts | `^3.9.0`; cùng file |

Không có trường `engines` trong `frontend_react/package.json` hoặc file khóa runtime riêng như `.nvmrc` trong source đã đọc. Vì vậy, khoảng phiên bản trên là yêu cầu của dependency Vite, không phải một khai báo runtime độc lập của project:

> **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về phiên bản Node.js được project khóa độc lập ngoài ràng buộc engine của dependency Vite trong lockfile.

## 9. Phạm vi tài liệu

### Trong phạm vi

- Source backend Laravel: routes, middleware, controllers, requests, resources, services, models, migrations, seeders, commands, scheduler và test.
- Source React: router, layouts, sidebar/header, pages, components, API services, client validation và browser storage.
- Hành vi API và dữ liệu có thể truy vết từ source.
- Các mismatch giữa backend API và React.

### Ngoài phạm vi có bằng chứng

- Dữ liệu production thực tế và cấu hình bí mật trong `.env`.
- Hợp đồng thương mại với VNPAY hoặc Google.
- Quy trình thủ công ngoài phần mềm.
- Hạ tầng triển khai production, SLA, monitoring và incident response.
- Yêu cầu nghiệp vụ chưa hiện diện trong source.

Các phần trên được ghi là ngoài phạm vi tài liệu reverse engineering, không phải kết luận rằng tổ chức không có các quy trình đó.

## 10. Quy ước Source Code Reference

Mỗi module trong tài liệu tiếp theo sử dụng mẫu:

```text
- Route: METHOD /api/...
- File: đường/dẫn/tương/đối
- Class/Component: Tên class hoặc React component
- Method: method xử lý; ghi N/A nếu file không có class/method tương ứng
- Model: model dữ liệu liên quan
- Migration: migration tạo/thay đổi bảng
```

Quy tắc diễn giải:

- `Route` backend được tính từ prefix `/api` do `bootstrap/app.php` nạp `routes/api.php`.
- `Route UI` là route React trong `AppRoutes.jsx` và không phải API authorization.
- “Backend có, UI chưa tích hợp” chỉ dùng khi route/controller backend tồn tại nhưng không tìm thấy service/page/route React gọi luồng đó.
- “Placeholder” chỉ dùng khi component hiển thị nội dung giữ chỗ, render trống hoặc code bị comment có bằng chứng.
