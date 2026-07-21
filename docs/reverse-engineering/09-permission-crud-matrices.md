# Permission Matrix và CRUD Matrix

## 1. Quy ước và nguồn authorization

### 1.1 Ký hiệu Permission Matrix

| Ký hiệu | Nghĩa có thể truy vết |
| --- | --- |
| `P` | Public route, không có `auth:sanctum` |
| `A` | Chỉ yêu cầu `auth:sanctum`, không giới hạn role |
| `R` | Có middleware role tương ứng |
| `O` | Có kiểm tra ownership/current user trong controller/query |
| `AS` | Có kiểm tra assignment/scope vận hành guide |
| `—` | Không có quyền qua endpoint đó hoặc không tìm thấy endpoint |
| `API` | Backend khả dụng nhưng React chưa có route/page/service hoàn chỉnh |

Các mã trong ô có thể kết hợp, ví dụ `R+O` là vừa đúng role vừa phải sở hữu dữ liệu. Public route về mặt kỹ thuật cũng có thể được gọi khi browser đang đăng nhập; ký hiệu `P` không có nghĩa chỉ Guest được dùng.

### 1.2 Nguồn chung

- Backend routes/middleware: `backend_laravel/routes/api.php`.
- Middleware role: file `backend_laravel/app/Http/Middleware/CheckRole.php`; class `CheckRole`; alias `role` đăng ký trong `backend_laravel/bootstrap/app.php`.
- Authentication: Laravel Sanctum; `auth:sanctum`; tokens ở `personal_access_tokens`.
- Roles: file `backend_laravel/database/seeders/RoleSeeder.php`; class/method `RoleSeeder::run`; các role `customer`, `tour guide`, `support staff`, `admin`.
- Ownership/assignment không được suy ra từ menu; chỉ ghi khi controller/service query current user, booking owner, notification owner, guide profile hoặc assignment.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về Policy/Gate dùng thống nhất cho các module; quyền quan sát được chủ yếu nằm ở route middleware và kiểm tra controller/service.

## 2. Permission Matrix — Backend

### 2.1 Public, authentication và authenticated-shared

| Function | Guest | Customer | Tour guide | Support staff | Admin | Bằng chứng quyền và scope |
| --- | --- | --- | --- | --- | --- | --- |
| Đăng ký customer | `P` | `P` | `P` | `P` | `P` | `POST /auth/register`; throttle 5/phút; luôn gán role customer trong `AuthController::register` |
| Đăng nhập | `P` | `P` | `P` | `P` | `P` | `POST /auth/login`; throttle 6/phút |
| Forgot/reset password | `P` | `P` | `P` | `P` | `P` | `POST /forgot-password`, `/reset-password`; không role middleware |
| Đọc `/auth/me`, logout | `—` | `A+O` | `A+O` | `A+O` | `A+O` | Nhóm `auth:sanctum`; current token/user |
| Đọc `/user` | `—` | `R+O` | `—` | `—` | `—` | Route nằm trong group `role:customer` |
| Đọc danh sách role `/roles` | `P` | `P` | `P` | `P` | `P` | Route public gọi `CustomerManagerController::index_role` |
| Home/catalog/tour detail | `P` | `P` | `P` | `P` | `P` | `/home`, `/catalog/*`, `/tours*` không auth |
| Đọc review tour visible | `P` | `P` | `P` | `P` | `P` | `GET /tours/{slug}/reviews` public |
| Đọc public settings/widgets | `P` | `P` | `P` | `P` | `P` | `/settings/public`, `/widgets` public |
| Chatbot/travel assistant | `P` | `P` | `P` | `P` | `P` | Hai POST public; `/chatbot` throttle 20/phút |
| VNPAY return/IPN | `P` | `P` | `P` | `P` | `P` | `/vnpay/return-status`, `/webhooks/vnpay`; throttle 60/phút |
| Feed `/notifications/customers*` | `—` | `A+O` | `A+O` | `A+O` | `A+O` | Group chỉ có `auth:sanctum`; controller lọc `user_id`; **không có `role:customer`** |

Lưu ý bắt buộc: endpoint mang tên `/notifications/customers` là notification dùng chung cho mọi tài khoản đã xác thực theo middleware và comment route. Không gán độc quyền endpoint này cho customer.

### 2.2 Customer-only

| Function | Guest | Customer | Tour guide | Support staff | Admin | Bằng chứng quyền và scope |
| --- | --- | --- | --- | --- | --- | --- |
| Summary/profile/password customer | `—` | `R+O` | `—` | `—` | `—` | Group `role:customer`; current user trong controller |
| Lịch sử booking customer | `—` | `R+O` | `—` | `—` | `—` | `GET /profile/bookings`; query current user |
| Wishlist | `—` | `R+O` | `—` | `—` | `—` | Nhóm wishlist có `auth:sanctum`, `role:customer`; relation current user |
| Preview/tạo booking | `—` | `R+O` | `—` | `—` | `—` | `/customer/bookings*`; user ID lấy từ request user |
| Continue/hủy booking | `—` | `R+O` | `—` | `—` | `—` | Controller kiểm tra `booking.user_id`; không sở hữu trả `404` |
| Xem payment VNPAY | `—` | `R+O` | `—` | `—` | `—` | Ownership qua booking của payment |
| Tạo/sửa tour review | `—` | `R+O API` | `—` | `—` | `—` | `role:customer`, ownership booking/review, throttle 10/phút; React chưa nối |
| Đánh giá HDV | `—` | `R+O` | `—` | `—` | `—` | `role:customer`, booking owner và guide assignment |
| Xem review/lịch sử của guide | `—` | `R` | `—` | `—` | `—` | Customer group; guide ID là đối tượng được xem, không phải ownership guide |
| Gửi yêu cầu hỗ trợ | `—` | `R+O` | `—` | `—` | `—` | `POST /customer/support-requests`; customer ID từ current user |

### 2.3 Admin-only

| Function | Guest | Customer | Tour guide | Support staff | Admin | Bằng chứng quyền và scope |
| --- | --- | --- | --- | --- | --- | --- |
| Profile/password admin | `—` | `—` | `—` | `—` | `R+O` | `/admin/profile*`; current admin |
| Dashboard/report | `—` | `—` | `—` | `—` | `R` | `/admin/reports/*` và statistics endpoints trong admin group |
| Quản lý user/role | `—` | `—` | `—` | `—` | `R` | `/admin/customers*`, `/admin/roles`; `role:admin` |
| Quản lý category | `—` | `—` | `—` | `—` | `R` | `/admin/categories*` |
| Quản lý destination | `—` | `—` | `—` | `—` | `R` | `/admin/destinations*` |
| Quản lý tour | `—` | `—` | `—` | `—` | `R` | `/admin/tours*` |
| Quản lý departure | `—` | `—` | `—` | `—` | `R` | `/admin/tours/{tourId}/departures*`; mutation guard là state rule bổ sung |
| Xem khách theo departure | `—` | `—` | `—` | `—` | `R` | `/admin/tour-departures/{tourDeparture}/booked-customers` |
| Quản lý booking | `—` | `—` | `—` | `—` | `R` | `/admin/bookings*` |
| Quản lý payment status | `—` | `—` | `—` | `—` | `R` | `/admin/payments*` |
| Quản lý hồ sơ guide | `—` | `—` | `—` | `—` | `R` | `/admin/guides*` |
| Planning/phân công guide | `—` | `—` | `—` | `—` | `R` | `/admin/tour-departures/*guide*`; eligibility/state rules trong service |
| Duyệt replacement request | `—` | `—` | `—` | `—` | `R` | `/admin/guide-replacement-requests*` |
| Duyệt leave request | `—` | `—` | `—` | `—` | `R` | `/admin/guide-leave-requests*` |
| Quản lý support staff | `—` | `—` | `—` | `—` | `R` | `/admin/support-staff*` |
| Quản lý language/level | `—` | `—` | `—` | `—` | `R` | `/admin/languages*` |
| Quản lý certificate | `—` | `—` | `—` | `—` | `R` | `/admin/certificates*` |
| List/detail/moderate tour review | `—` | `—` | `—` | `—` | `R API` | `/admin/tour-reviews*`; test các role khác `403`; React chưa nối |
| Quản lý campaign notification | `—` | `—` | `—` | `—` | `R` | `/admin/notifications*` |
| Notification bell admin | `—` | `—` | `—` | `—` | `R+O` | `/admin/notification-bell*`; current admin notifications |
| Quản lý settings | `—` | `—` | `—` | `—` | `R` | `GET`, `PUT /admin/settings` |
| Quản lý widget | `—` | `—` | `—` | `—` | `R API` | CRUD `/admin/widgets`; chưa thấy route React admin widget |
| Quản lý backup | `—` | `—` | `—` | `—` | `R API` | Backend `/admin/backups*` khả dụng; React chỉ có UI cấu hình backup qua `/admin/settings`, không có lời gọi `/admin/backups*` |
| Quản lý service category | `—` | `—` | `—` | `—` | `R API` | API resource `/admin/service-categories`; frontend chưa nối route/page |

### 2.4 Tour-guide-only

| Function | Guest | Customer | Tour guide | Support staff | Admin | Bằng chứng quyền và scope |
| --- | --- | --- | --- | --- | --- | --- |
| Profile/password guide | `—` | `—` | `R+O` | `—` | `—` | `/guide/profile`, `/guide/change-password`; current guide |
| Dashboard guide | `—` | `—` | `R+O` | `—` | `—` | `/guide/dashboard`; current guide |
| Tour assigned list/detail | `—` | `—` | `R+AS` | `—` | `—` | `/guide/tours*`; detail/service kiểm tra assignment |
| Customer/overview theo tour | `—` | `—` | `R+AS` | `—` | `—` | `/guide/tours/{tourDeparture}/overview`, `/customers*` |
| Attendance session/check-in/out/note | `—` | `—` | `R+AS` | `—` | `—` | Attendance routes; assignment và participant/departure scope |
| Stage list/advance | `—` | `—` | `R+AS` | `—` | `—` | `/guide/tours/{tourDeparture}/stages*` |
| Gửi/xem replacement request | `—` | `—` | `R+AS` | `—` | `—` | Guide phải là current assignment |
| List/tạo/hủy leave request | `—` | `—` | `R+O` | `—` | `—` | `/guide/leave-requests*`; controller scope current guide |
| Xem reviews/tour history của mình | `—` | `—` | `R+O` | `—` | `—` | `/guide/reviews`, `/guide/tour-history`; current guide |

### 2.5 Support-staff-only

| Function | Guest | Customer | Tour guide | Support staff | Admin | Bằng chứng quyền và scope |
| --- | --- | --- | --- | --- | --- | --- |
| Profile/password support | `—` | `—` | `—` | `R+O` | `—` | `/support/profile`, `/support/change-password`; current support |
| List/detail/badge support requests | `—` | `—` | `—` | `R` | `—` | `/support/requests*`; không giới hạn list chỉ ticket đã assign |
| Đổi trạng thái support request | `—` | `—` | `—` | `R` | `—` | `PATCH /support/requests/{id}/status`; current support được gán khi in_progress/resolved |
| Notification feed riêng support | `—` | `—` | `—` | `R+O` | `—` | `/notifications/support*`; current user |
| Gửi notification tới admin | `—` | `—` | `—` | `R` | `—` | `POST /notifications/support/send`; recipients là role admin |

## 3. Frontend Guard Matrix — không thay thế backend authorization

Nguồn: `frontend_react/src/routes/AppRoutes.jsx`, `frontend_react/src/components/admin/ProtectedAdminRoute.jsx`, `frontend_react/src/services/authStorage.js`, `frontend_react/src/services/apiClient.js`.

| Nhóm route React | Guard frontend có bằng chứng | Role client cho phép | Khoảng trống/tình trạng tích hợp |
| --- | --- | --- | --- |
| `/`, `/tours/*`, `/destinations`, `/deals` | Không dùng `ProtectedAdminRoute` | Không giới hạn ở router | Chức năng public; destination page có dữ liệu demo |
| `/auth/*` | Không guard | Không giới hạn | Forgot-password page là placeholder dù API tồn tại |
| `/payment/vnpay/return` | Không guard | Không giới hạn | Phù hợp browser return public |
| `/customer/profile*`, `/customer/favorites`, `/customer/bookings`, `/customer/settings` | Không dùng guard ở `AppRoutes` | Không giới hạn ở router | Backend customer APIs vẫn dùng Sanctum + role; không coi route UI là authorization |
| `/admin/*` | `protect`/`adminPage` → `ProtectedAdminRoute` | `admin` | Thiếu tour review, service category và widget route UI |
| `/guide/*` thực | `guidePage` | `tour guide` | Dashboard/tours/attendance/reviews/notifications/profile được guard |
| `/guide/history`, `/guide/customers`, `/guide/messages` | `guidePage` nhưng render `GuideComingSoonPage` | `tour guide` | History API có; customer API nằm theo tour; messages backend không có bằng chứng |
| `/support/*` | `supportPage` | `support staff` | Work schedule page có UI nhưng không thấy backend API |
| Route không khớp | Navigate | N/A | `/admin/*` về `/admin`; wildcard về `/` |

Hành vi client bổ sung:

- `ProtectedAdminRoute` đọc token/session từ browser và redirect `/auth/login` nếu thiếu token hoặc role không nằm trong `allowedRoles`.
- Axios interceptor gắn Bearer token; `401` xóa session/chuyển login; `403` chỉ tự chuyển login khi URL browser bắt đầu `/admin`.
- Các kiểm tra này có thể bị bypass ở client; quyền server vẫn theo bảng mục 2.

## 4. CRUD Matrix — 25 module

### 4.1 Legend CRUD

| Ký hiệu | Nghĩa |
| --- | --- |
| `P`, `G`, `C`, `TG`, `S`, `A`, `AUTH` | Public route, Guest, Customer, Tour guide, Support staff, Admin, mọi user đã xác thực |
| `I` | Thao tác gián tiếp trong một use case khác, không có endpoint CRUD trực tiếp |
| `STATE` | Status action: đổi trạng thái, không phải Delete |
| `SD` | Soft delete |
| `HD` | Hard delete record |
| `FD` | Force delete sau soft delete |
| `FS` | Tạo/xóa file filesystem, không có DB model cho artifact đó |
| `—` | Không tìm thấy endpoint cho thao tác |

### 4.2 Matrix

| # | Module | Create | Read | Update | Delete/removal |
| ---: | --- | --- | --- | --- | --- |
| 1 | Authentication/RBAC/profile | `G`: register user; login tạo token | `AUTH`: current user; role list còn có route `P` | User sở hữu: profile/password | Logout xóa current token; **không có user delete endpoint trong auth** |
| 2 | Public catalog/tour search/home | `—` | `P`: home/catalog/tour/settings/widgets | `—` | `—` |
| 3 | Wishlist | `C`: attach/sync tour | `C+O`: list | `—` | `C+O`: detach; không soft delete |
| 4 | Booking/pricing/contact/participants | `C`, `A`: tạo booking; pricing preview chỉ đọc | `C+O`, `A`; `TG+AS` đọc participant theo tour | `A`: booking/contact/participants; `C+O`: `STATE` cancel pending | `A`: `HD` chỉ booking cancelled; customer cancel là `STATE`, không phải D |
| 5 | VNPAY/payment | `I`: payment tạo trong customer booking | `C+O`, `A`; callback public resolve payment | Gateway/lifecycle và `A`: `STATE` success/failed/refunded, đồng bộ booking | `—` |
| 6 | Tour review | `C+O`: POST | `P`: visible; `A`: list/detail; customer đọc qua booking history | `C+O`: nội dung; `A`: `STATE` visible/hidden/spam | `—`; không endpoint customer/admin delete |
| 7 | Guide review | `C+O`: POST `firstOrNew` | `C`: guide profile/history; `TG+O`: reviews/history | `C+O`: cùng POST cập nhật và giữ status | `—`; không moderation/delete endpoint admin |
| 8 | Customer support | `C`: tạo request/attachments | `S`: list/detail/badge toàn queue | `S`: `STATE` pending/in_progress/resolved | `—` |
| 9 | Chat AI | `P`: tạo conversation/messages qua POST | `I`: controller đọc 10 message gần nhất; không có read-list API | `—` | `—` |
| 10 | Notification | `A/S`: tạo campaign/notification; support gửi admin | `AUTH+O`: shared feed; `S+O`: support feed; `A`: campaigns/admin bell | Mark read; `A`: draft/send/revoke state; `S`: mark read | `A`: draft `SD/FD`; revoke xóa notification rows; không phải user delete |
| 11 | Dashboard/report | `—` | `A`: report/dashboard admin; `TG+O`: guide dashboard | `—` | `—` |
| 12 | User management | `A`: tạo user | `A`: list/search/detail/statistics | `A`: update và `STATE` lock/unlock | `—` dù model User có soft delete |
| 13 | Category | `A` | `P`: active qua catalog; `A`: list/search/trash | `A`: update/restore | `A`: `SD`; không force-delete endpoint |
| 14 | Destination | `A` | `P`: active qua catalog; `A`: list/search/options/trash | `A`: update/restore | `A`: `SD` và `FD` |
| 15 | Tour/itinerary/image/age pricing | `A`: transaction tạo graph | `P`: published; `A`: all/detail/statistics/hidden | `A`: graph update; `STATE` hide/unhide | `A`: tour `SD`; không restore/force endpoint |
| 16 | Departure | `A` | `P`: open/future qua catalog; `A`: list/booked customers | `A`: update có confirm/reason | `A`: `HD` chỉ khi không có booking và guard cho phép |
| 17 | Guide profile management | `A`: tạo guide/relations | `A`; `TG+O`: own profile | `A`; `TG+O`: own profile/password; restore là state/recovery | `A`: `SD` và `FD`; avatar delete là file action |
| 18 | Assignment/replacement | `A`: assignment; `TG+AS`: replacement request | `A`: planning/requests; `TG+AS`: status | `A`: `STATE` approve/reject request; assignment không update field qua endpoint | `A`: cancel assignment gọi `HD`; không delete replacement request |
| 19 | Attendance/stage | `TG+AS`: session/attendance/stages có thể sinh | `TG+AS`: overview/customer/stats/session/stage | `TG+AS`: check-in/out/note và advance stage | `—` |
| 20 | Guide leave | `TG+O`: request/attachments | `TG+O`, `A` | `TG+O`: `STATE` cancel; `A`: `STATE` approve/reject/decision | `—` dù model có soft-delete column |
| 21 | Support staff | `A`: profile | `A`; `S+O`: own profile | `A`; `S+O`: profile/password; restore/state | `A`: `SD` và `FD`; avatar delete là file action |
| 22 | Languages/levels/certificates | `A` | `A` | `A` | `A`: `HD`; language cascade levels, certificate bị chặn khi đang dùng |
| 23 | Settings/widgets | Settings `A`: upsert gián tiếp; widget `A`: create | Settings/widget `A`; public subset/widget `P` | `A`: settings update, widget update/toggle | Widget `A`: `HD`; settings `—` delete |
| 24 | Backup | `A`: `FS` tạo SQL | `A`: list/download `FS` | `—` | `A`: xóa file `FS`; không DB record |
| 25 | Service categories | `A` | `A` | `A` | `A`: `SD`; không restore/force endpoint |

### 4.3 Các điểm Delete cần phân biệt

- Booking customer cancel, payment fail/refund, khóa user, hide tour, moderation review, xử lý ticket, duyệt/từ chối request và cancel leave đều là `Update/Status action`, không phải Delete.
- Category, tour, guide, support staff và service category có soft delete qua endpoint tương ứng; chỉ destination, guide và support staff có force-delete endpoint được tìm thấy.
- Tour review không có delete endpoint; admin chỉ đổi status.
- Backup delete là xóa file trên filesystem; không có bảng/model backup.

## 5. Source Mapping theo 25 module

Đường dẫn controller bên dưới được tính từ `backend_laravel/app/Http/Controllers/Api`; mọi route nằm trong `backend_laravel/routes/api.php` nếu không ghi khác.

| # | Module | Route / File / Class / Method | Model / Migration / frontend evidence |
| ---: | --- | --- | --- |
| 1 | Authentication/RBAC/profile | `/auth/*`, `/profile/*`, `/admin/profile*`, `/guide/profile*`, `/support/profile*`.<br>`AuthController::{register,login,logout,me}`; `Customer/CustomerController`; `Admin/AdminProfileController`; `Guide/GuideProfileController`; `Support/SupportProfileController` | `User`, `Role`, `Setting`; users/roles/tokens/OTP/settings migrations.<br>`AuthPage.jsx`, `authStorage.js`, `ProtectedAdminRoute.jsx` |
| 2 | Public catalog/tour search/home | `/home`, `/catalog/*`, `/tours*`, `/settings/public`, `/widgets`.<br>`PublicCatalogController::{home,categories,destinations}`; `Customer/TourController::{index_gdkh,search_gdkh,filter_gdkh,show_gdkh}`; public setting/widget controllers | `Tour`, `TourDeparture`, `Category`, `Destination`, `Setting`, `Banner`; catalog migrations.<br>`HomePage.jsx`, `ToursPage.jsx`, `TourDetailPage.jsx`, `customerApi.js` |
| 3 | Wishlist | `GET`, `POST /tours/wishlist`; `DELETE /tours/wishlist/{tour_id}`.<br>`Customer/WishlistController::{index,store,destroy}` | `User`, `Wishlist`, `Tour`; `2026_06_10_220110_create_wishlists_table.php`.<br>`ProfileDashboard.jsx`, `customerApi.js` |
| 4 | Booking/pricing/contact/participants | `/customer/bookings*`, `/profile/bookings`, `/admin/bookings*`.<br>`Customer/CustomerBookingController::{preview,store,continuePayment,cancel}`; `CustomerDashboardController::bookings`; `Admin/BookingController` | `Booking`, `BookingContact`, `BookingParticipant`, `BookingStatusHistory`; booking family migrations.<br>`TourDetailPage.jsx`, `ProfileDashboard.jsx`, `BookingManagementPage.jsx` |
| 5 | VNPAY/payment | `/customer/payments/vnpay/{payment}`, `/vnpay/return-status`, `/webhooks/vnpay`, `/admin/payments*`.<br>`Customer/VnpayPaymentController`; `Admin/PaymentController`; `VnpayService`, `VnpayPaymentLifecycleService` | `Payment`, `Booking`; payment/VNPAY expiry migrations.<br>`VnpayPaymentResultPage.jsx`, `paymentApi.js` |
| 6 | Tour review | `/tours/{slug}/reviews`, `/customer/tour-reviews*`, `/admin/tour-reviews*`.<br>Public, customer và admin `TourReviewController`; `TourReviewService`, `BookingReviewEligibilityService` | `TourReview`, `Tour`, `Booking`; `2026_07_21_000000_create_tour_reviews_table.php`; `TourReviewApiTest.php`.<br>React chưa có integration |
| 7 | Guide review | `/customer/guide-reviewable-bookings`, `/customer/guide-reviews`, customer/guide review/history routes.<br>`Customer/GuideReviewController`; `Guide/GuideReviewController`; `GuideReviewService` | `Review`, `Guide`, `TourGuideAssignment`; reviews/guide-context migrations.<br>`GuideReviewModal.jsx`, `GuideReviewsPage.jsx`, `customerReviewApi.js` |
| 8 | Customer support | `/customer/support-requests`, `/support/requests*`.<br>`Customer/CustomerSupportRequestController::store`; `Support/SupportRequestController::{index,show,badgeCount,updateStatus}` | `SupportRequest`, `SupportRequestAttachment`; support request migrations.<br>`CustomerSupportPage.jsx`, `SupportRequestsPage.jsx`, `supportRequestApi.js` |
| 9 | Chat AI | `/chatbot`, `/travel-assistant`.<br>`Chat/ChatBotController::{handleChat,extractFilters,buildTourQuery,buildSystemPrompt,callGemini}` | `ChatConversation`, `ChatMessage`, `Tour`; chat migrations.<br>`ChatBox.jsx`, `customerApi.askTravelAssistant` |
| 10 | Notification | `/notifications/customers*`, `/notifications/support*`, `/admin/notifications*`, `/admin/notification-bell*`.<br>`NotificationCustomerController`, `SupportNotificationController`, admin `NotificationController`, `AdminNotificationBellController` | `Notification`, `NotificationDraft`, `User`; notification/draft migrations.<br>Admin/customer/guide/support bell/page/services |
| 11 | Dashboard/report | `/admin/reports/overview`, `/admin/reports/charts`, `/guide/dashboard`, module statistics endpoints.<br>`Admin/ReportController::{getOverviewStatistics,getChartStatistics}`; `Guide/GuideDashboardController::show` | Aggregate `Payment`, `Booking`, `User`, `Guide`, `Tour`; không có report migration riêng.<br>`AdminDashboardPage.jsx`, `ReportStatisticsPage.jsx`, `GuideDashboardPage.jsx` |
| 12 | User management | `/admin/customers*`, `/admin/roles` và public `/roles`.<br>`Admin/CustomerManagerController::{index,search,statistics,count,store,show,update,lock,unlock,index_role}` | `User`, `Role`, `Guide`, `SupportStaff`; users/roles/profile migrations.<br>`UserManagementPage.jsx`, `UserFormModal.jsx` |
| 13 | Category | `/admin/categories*`, `/admin/categories-trashed`.<br>`Admin/CategoryController::{index,search,store,update,destroy,trashed,restore}` | `Category`; category/thumbnail migrations.<br>Tour type list/create/edit/trash pages |
| 14 | Destination | `/admin/destinations*`, search/trash/restore/force/options.<br>`Admin/DestinationController::{index,show,store,update,destroy,trashed,restore,forceDelete,search,options}` | `Destination`; destination migration.<br>Destination list/create/edit/trash pages |
| 15 | Tour/itinerary/image/age pricing | `/admin/tours*`.<br>`Admin/TourManagerController::{index,show,publicIndex,store,update,destroy,hide,unhide,hiddenTours,statistics}`; `TourPricingService` | `Tour`, `TourImage`, `TourItinerary`, `TourItineraryImage`, `TourAgePricingRule`; corresponding migrations.<br>Tour pages, `TourForm.jsx`, `frontend_react/src/services/toursApi.jsx` |
| 16 | Departure | `/admin/tours/{tourId}/departures*`, `/admin/tour-departures/{id}/booked-customers`.<br>`Admin/TourDepartureController`; `AdminTourDepartureBookingController`; mutation/notification services | `TourDeparture`, `Booking`; departure/base-discount-price migrations.<br>Departure list/create/edit pages, `tourDepartureApi.js` |
| 17 | Guide profile management | `/admin/guides*`, `/guide/profile*`.<br>`Admin/GuideController`; `Guide/GuideProfileController` | Models hợp lệ `Guide`, `GuideLanguage`, `GuideExperience`, `Destination`; guide relation migrations. `guide_destinations` là pivot qua `Guide::destinations()`/`Destination::guides()`; App model `GuideDestination`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** vì `backend_laravel/app/Models/GuideDestination.php` khai báo class `TourGuideAssignment`.<br>Guide management/trash/profile pages |
| 18 | Assignment/replacement | `/admin/tour-departures/*guide*`, guide/admin replacement routes.<br>`TourDepartureGuideAssignmentController`; `AdminGuideReplacementRequestController`; `GuideTourController::{requestReplacement,replacementRequestStatus}`; `GuideAssignmentService` | Models hợp lệ `TourGuideAssignment`, `Guide`, `TourDeparture`, `Notification`; assignment/replacement migrations. Bảng `guide_replacement_requests` được thao tác bằng `DB::table`; App model `GuideReplacementRequest`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.<br>Departure assignment và replacement UI/services |
| 19 | Attendance/stage | `/guide/tours/{tourDeparture}/overview`, `/customers*`, `/attendance*`, `/stages*`.<br>`Guide/GuideAttendanceController`; `GuideTourOperationService` | `AttendanceSession`, `Attendance`, `TourDepartureStage`, `BookingParticipant`; attendance/stage/boundary migrations.<br>`GuideAttendancePage.jsx` |
| 20 | Guide leave | `/guide/leave-requests*`, `/admin/guide-leave-requests*`.<br>`Guide/GuideLeaveRequestController`; `Admin/AdminGuideLeaveRequestController` | `GuideLeaveRequest`, `GuideLeaveRequestAttachment`; `2026_07_13_000000_create_guide_leave_requests_tables.php`.<br>Guide leave widgets và admin leave panels/services |
| 21 | Support staff | `/admin/support-staff*`, `/support/profile*`.<br>`Admin/SupportStaffController`; `Support/SupportProfileController` | `SupportStaff`, `User`; support staff migrations.<br>Support management/trash/profile pages |
| 22 | Languages/levels/certificates | `/admin/languages*`, nested levels, `/admin/certificates*`.<br>`Admin/LanguageController`; `Admin/CertificateController` | `Language`, `LanguageLevel`, `Certificate`, guide pivots; language/certificate migrations.<br>`LanguageManagementPage.jsx`, `CertificateManagementPage.jsx` |
| 23 | Settings/widgets | `/admin/settings`, `/settings/public`, `/admin/widgets*`, `/widgets`.<br>`Admin/SettingController`, `PublicSettingController`, admin/public widget controllers | `Setting`, `Banner`; settings/banner/widget migrations.<br>Settings pages; không thấy admin widget route React |
| 24 | Backup | `/admin/backups*`; scheduler ở `backend_laravel/routes/console.php`.<br>`Admin/DatabaseBackupController`; `DatabaseBackupService`; `DatabaseBackupCommand::handle` | Filesystem/cache; model/migration backup: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**. React `frontend_react/src/pages/admin/settings/BackupSettingsPage.jsx` chỉ cấu hình settings qua `frontend_react/src/services/adminSettingService.js`; lời gọi React tới `/admin/backups*`: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** |
| 25 | Service categories | API resource `/admin/service-categories`.<br>`Admin/ServiceCategoryController`; request classes; `ServiceCategoryService` | `ServiceCategory`; `2026_07_03_031102_create_service_categories_table.php`; `ServiceCategoryApiTest.php`.<br>Service/components có nhưng chưa nối route/page |

## 6. Điểm chưa xác minh và giới hạn ma trận

- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về cơ chế permission chi tiết hơn role, ví dụ permission table/action-level ACL.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về admin được impersonate customer/guide/support.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về delete tour review hoặc admin sửa nội dung review.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về moderation guide review bởi admin.
- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về API cho support work schedule và guide messages.
- Promotions, refund requests, legacy support tickets/messages, blogs, partners/services và system logs chỉ có data artifacts rời; không được thêm vào permission/CRUD như module khả dụng.
- **[Suy luận từ source code]** Route public `/roles` làm danh sách role có thể đọc không cần đăng nhập; ma trận ghi đúng middleware hiện tại, không khẳng định đây là chủ đích nghiệp vụ.
