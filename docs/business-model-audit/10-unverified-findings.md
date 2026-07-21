# Danh sách các điểm chưa xác minh và giới hạn đã có bằng chứng

## Phạm vi và quy ước

Tài liệu này chỉ tổng hợp các điểm đã được ghi tại [reverse-engineering/10-unverified-findings.md](../reverse-engineering/10-unverified-findings.md) và giới hạn đã được chứng minh trong bảy module source audit. Đây không phải backlog, không phải yêu cầu thay đổi và không tự chuyển một khoảng trống thành BUG.

- **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**: phạm vi source nêu trong tài liệu gốc đã được kiểm tra nhưng không có artifact/hành vi đủ để kết luận.
- **[Suy luận từ source code]**: câu hỏi được nối từ nhiều hành vi source có thật; source không tuyên bố ý định nghiệp vụ.
- **Bất nhất trực tiếp**: các artifact source thể hiện contract/cấu trúc/hành vi khác nhau.

Mỗi `UV-###` dưới đây truy về dòng cùng ID trong [tài liệu bằng chứng gốc](../reverse-engineering/10-unverified-findings.md), nơi đã ghi đầy đủ File, Class/Component, Method, Route, Model và Migration. Ma trận xử lý UV không sinh BR/SR nằm tại [00-rule-catalog-and-methodology.md](00-rule-catalog-and-methodology.md#39-unverified-finding).

## Business và flow

| ID | Điểm chưa xác minh/bất nhất | Trạng thái | Source Code Reference chính |
| --- | --- | --- | --- |
| UV-001 | Mục tiêu định lượng, KPI và chủ sở hữu nghiệp vụ | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/routes/api.php`; `backend_laravel/app`; `frontend_react/src/routes/AppRoutes.jsx`; inventory 63 bảng |
| UV-002 | SLA xử lý và cam kết chất lượng vận hành | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/app/Http/Controllers/Api/Support/SupportRequestController.php`; `backend_laravel/app/Http/Controllers/Api/Admin/PaymentController.php`; `backend_laravel/app/Http/Controllers/Api/Admin/TourReviewController.php`; `backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php` |
| UV-003 | Hoa hồng hoặc thù lao hướng dẫn viên/nhân viên | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | Tìm kiếm `commission`, `hoa_hong`, `hoa hồng` trong `backend_laravel/app`, `backend_laravel/routes`, `frontend_react/src` |
| UV-004 | Workflow yêu cầu và xử lý hoàn tiền | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/app/Http/Controllers/Api/Admin/PaymentController.php`; `backend_laravel/database/migrations/2026_06_10_220160_create_refund_requests_table.php` |
| UV-005 | Chính sách hoàn/hủy theo từng tour hoặc sản phẩm | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php`; `backend_laravel/app/Services/VnpayPaymentLifecycleService.php` |
| UV-006 | Áp dụng promotion trong booking customer | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/app/Http/Controllers/Api/Admin/BookingController.php`; `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php`; `backend_laravel/database/migrations/2026_06_10_220050_create_promotions_table.php`; `backend_laravel/database/migrations/2026_06_10_220150_create_promotion_usages_table.php` |
| UV-007 | Module blog | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/database/migrations/2026_06_10_220120_create_blogs_table.php`; routes backend và React |
| UV-008 | Module partner và partner service | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | Ba migration partner; `backend_laravel/tests/Feature/PartnerApiTest.php`; `backend_laravel/routes/api.php` |
| UV-009 | Quan hệ thay thế giữa support legacy và `support_requests` | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | Migrations `support_tickets`, `support_messages`, `support_requests`; `backend_laravel/app/Http/Controllers/Api/Support/SupportRequestController.php` |
| UV-010 | OTP được trả trong response, không có delivery và không dùng expiry | **Bất nhất trực tiếp** | `backend_laravel/app/Http/Controllers/Api/Customer/CustomerController.php::{forgotPassword,resetPassword}`; migration `backend_laravel/database/migrations/2026_06_13_144107_add_otp_to_users_table.php` |
| UV-011 | Setting `require_2fa` chưa có luồng xác thực | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/app/Http/Controllers/Api/Admin/SettingController.php`; `backend_laravel/app/Http/Controllers/Api/AuthController.php`; `frontend_react/src/components/admin/settings/SecuritySettingsForm.jsx` |
| UV-012 | Vòng đời assignment chỉ có một phần | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/app/Services/GuideAssignmentService.php`; assignment/replacement controllers; assignment migrations |
| UV-013 | Vòng đời attendance session và stage chưa khép kín | **Bất nhất trực tiếp** | `backend_laravel/app/Services/GuideTourOperationService.php::{createAttendanceSession,advanceStage}`; `backend_laravel/app/Http/Controllers/Api/Guide/GuideAttendanceController.php` |
| UV-014 | State transition của support request, tour và departure không có ma trận đầy đủ | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/app/Http/Controllers/Api/Support/SupportRequestController.php`; `backend_laravel/app/Http/Controllers/Api/Admin/TourManagerController.php`; `backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureController.php` |
| UV-015 | Guide không có action hủy replacement request | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/app/Http/Controllers/Api/Guide/GuideTourController.php`; `backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideReplacementRequestController.php`; `backend_laravel/routes/api.php` |
| UV-016 | Export/import báo cáo phía server | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/app/Http/Controllers/Api/Admin/ReportController.php`; `frontend_react/src/pages/admin/reportStatistics/ReportStatisticsPage.jsx` |
| UV-017 | Restore backup và mục tiêu khôi phục | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/app/Services/DatabaseBackupService.php`; `backend_laravel/app/Http/Controllers/Api/Admin/DatabaseBackupController.php`; `backend_laravel/app/Console/Commands/DatabaseBackupCommand.php`; backup routes/console schedule |

## Database và tính nhất quán kỹ thuật

| ID | Điểm chưa xác minh/bất nhất | Trạng thái | Source Code Reference chính |
| --- | --- | --- | --- |
| UV-018 | `ServiceCategorySeeder` không parse được | **Bất nhất trực tiếp** | `backend_laravel/database/seeders/ServiceCategorySeeder.php`; `backend_laravel/database/seeders/DatabaseSeeder.php`; `php -l` tại dòng lỗi được ghi trong tài liệu gốc |
| UV-019 | File model `GuideDestination.php` khai báo sai class | **Bất nhất trực tiếp** | `backend_laravel/app/Models/GuideDestination.php`; `backend_laravel/app/Models/Guide.php`; `backend_laravel/app/Models/Destination.php`; migration `guide_destinations` |
| UV-020 | Ba file khai báo cùng `TourGuideAssignment` | **Bất nhất trực tiếp** | `backend_laravel/app/Models/GuideDestination.php`; `backend_laravel/app/Models/TourGuideAssignments.php`; `backend_laravel/app/Models/TourGuideAssignment.php` |
| UV-021 | `User::guide()` là `hasOne` nhưng DB không unique `guides.user_id` | **Bất nhất trực tiếp** | `backend_laravel/app/Models/User.php`; `backend_laravel/app/Models/Guide.php`; migration `backend_laravel/database/migrations/2026_06_14_145318_create_guides_table.php` |
| UV-022 | `reviews.guide_id` vẫn nullable sau khi tách tour review | **Bất nhất trực tiếp** | Ba migration review/tour-review; `backend_laravel/app/Models/Review.php` |
| UV-023 | `notifications.draft_id` không có FK/index/relation model | **Bất nhất trực tiếp** | Migration `backend_laravel/database/migrations/2026_06_24_165838_add_draft_id_to_notifications_table.php`; `backend_laravel/app/Models/Notification.php`; `backend_laravel/app/Models/NotificationDraft.php`; `backend_laravel/app/Http/Controllers/Api/Admin/NotificationController.php` |
| UV-024 | FK `partners.service_type_id` khác theo driver | **Bất nhất trực tiếp** | Migrations `backend_laravel/database/migrations/2026_06_25_075333_create_partners_table.php`, `backend_laravel/database/migrations/2026_07_03_104500_sync_partner_service_types_to_service_categories.php` |
| UV-025 | Assignment có cả `note` và `notes` | **Bất nhất trực tiếp** | `backend_laravel/app/Models/TourGuideAssignment.php`; `backend_laravel/app/Models/Guide.php`; hai migration assignment |
| UV-026 | Constraint khác nhau giữa SQLite và driver khác | **Bất nhất trực tiếp** | Migrations users/tours/reviews/tour_reviews/partner có nhánh `DB::getDriverName()`; [ERD](../reverse-engineering/07-database-erd.md) |
| UV-027 | Một số FK không có relation Eloquent tương ứng | **Bất nhất trực tiếp** | Migrations của `tours.created_by`, `bookings.promotion_id/assigned_staff_id`, `chat_conversations.user_id`; models tương ứng |
| UV-028 | Notification type `support_message` không nằm trong enum migration | **Bất nhất trực tiếp** | `backend_laravel/app/Http/Controllers/Api/Support/SupportNotificationController.php::sendNotification()`; migration `backend_laravel/database/migrations/2026_06_10_220130_create_notifications_table.php`; đã lập BUG-SA-001 |
| UV-029 | Hai luồng tạo booking tác động sức chứa khác nhau | **[Suy luận từ source code]** | `backend_laravel/app/Http/Controllers/Api/Admin/BookingController.php::store()`; `backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php::store()`; booking/departure migrations |
| UV-030 | Admin cập nhật payment không có state guard như VNPAY | **[Suy luận từ source code]** | `backend_laravel/app/Http/Controllers/Api/Admin/PaymentController.php`; `backend_laravel/app/Http/Controllers/Api/Customer/VnpayPaymentController.php`; `backend_laravel/app/Services/VnpayPaymentLifecycleService.php`; đã lập BUG-AB-004 cho mệnh đề FR-005 |

## API, frontend và phân quyền chưa khép kín

| ID | Điểm chưa xác minh/bất nhất | Trạng thái | Source Code Reference chính |
| --- | --- | --- | --- |
| UV-031 | Backend tour review chưa nối frontend tour/admin | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | Review routes/controllers; `frontend_react/src/routes/AppRoutes.jsx`; `frontend_react/src/components/admin/AdminSidebar.jsx`; customer pages/services |
| UV-032 | Forgot-password frontend là placeholder | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `frontend_react/src/routes/AppRoutes.jsx`; auth placeholder; `backend_laravel/app/Http/Controllers/Api/Customer/CustomerController.php::{forgotPassword,resetPassword}` |
| UV-033 | Guide history có backend/page nhưng router dùng trang chờ | **Bất nhất trực tiếp** | `frontend_react/src/routes/AppRoutes.jsx`; guide history page/service; `backend_laravel/app/Http/Controllers/Api/Guide/GuideReviewController.php::tourHistory()` |
| UV-034 | Attendance frontend chưa gọi đủ check-out/stage | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `frontend_react/src/pages/guide`; guide API services; `backend_laravel/app/Http/Controllers/Api/Guide/GuideAttendanceController.php`; `backend_laravel/app/Services/GuideTourOperationService.php` |
| UV-035 | Service category chưa có route/page/menu React chuẩn | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `frontend_react/src/routes/AppRoutes.jsx`; admin sidebar; service-category artifacts; `backend_laravel/app/Http/Controllers/Api/Admin/ServiceCategoryController.php` |
| UV-036 | `GET /api/roles` là public | **[Suy luận từ source code]** | `backend_laravel/routes/api.php`; `backend_laravel/app/Http/Controllers/Api/Admin/CustomerManagerController.php::index_role()` |
| UV-037 | `DestinationController::update()` không validate request | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/app/Http/Controllers/Api/Admin/DestinationController.php::{store,update}` |
| UV-038 | `cancel_reason` của đơn nghỉ không có validation | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php::cancel()` |
| UV-039 | Queue có cấu hình nhưng không có nghiệp vụ dispatch | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/config/queue.php`; `backend_laravel/app`; notification/chat/backup producers |
| UV-040 | Response API không có envelope thống nhất | **Bất nhất trực tiếp** | 51 controller dưới `backend_laravel/app/Http/Controllers/Api`; 14 API Resource; `backend_laravel/routes/api.php` |

## Non-functional và kiểm thử chưa có bằng chứng đầy đủ

| ID | Điểm chưa xác minh/bất nhất | Trạng thái | Source Code Reference chính |
| --- | --- | --- | --- |
| UV-041 | Audit log toàn hệ thống | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/app`; migration `backend_laravel/database/migrations/2026_06_10_220140_create_system_logs_table.php`; `BookingStatusHistory` chỉ là lịch sử cục bộ |
| UV-042 | Thiếu test Feature trực tiếp cho nhiều module active | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | 18 file test được kiểm kê trong source; mapping test tại [SRS](../reverse-engineering/04-srs.md) và bảy [test-case artifacts](test-cases) |
| UV-043 | Runtime migration trên từng DB driver | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | 80 migration PHP active; `backend_laravel/config/database.php`; inventory 63 bảng |
| UV-044 | NFR production ngoài các cơ chế code cục bộ | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `backend_laravel/composer.json`; config; `frontend_react/package.json`; source ứng dụng |
| UV-045 | Version Node chuẩn do project tuyên bố | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** | `frontend_react/package.json`; lock file; không có `engines.node` ở root package |

## Giới hạn bổ sung đã được source audit ghi nhận

Các mục dưới đây giữ nguyên nhãn/kết luận của module audit và không được nâng thành BUG khi tài liệu không đặt requirement trực tiếp tương ứng.

| Phạm vi audit | Giới hạn đã chứng minh | Source audit |
| --- | --- | --- |
| BR-017 | Departure được insert trước notification; không có transaction gộp hai thao tác và không có rollback departure nếu notification ném exception. | [modules/01-auth-catalog.md](modules/01-auth-catalog.md) — BR-017 |
| BR-026 | Booking/payment đã commit trước khi tạo URL; lỗi `createPaymentUrl()` không có transaction hoàn tác dữ liệu đã ghi. | [modules/02-booking-payment.md](modules/02-booking-payment.md) — BR-026 |
| BR-045 | **[Suy luận từ source code]** Migration backfill insert trước delete và không có transaction tường minh; lỗi delete sau insert để dữ liệu ở cả hai bảng. | [modules/03-reviews.md](modules/03-reviews.md) — BR-045 |
| BR-048 | **[Suy luận từ source code]** Guide-review upsert không lock; DB unique ngăn hai row trùng nhưng source không xử lý riêng unique exception khi hai request cạnh tranh. | [modules/03-reviews.md](modules/03-reviews.md) — BR-048 |
| BR-059–BR-060 | **[Suy luận từ source code]** Một số guard direct assignment nằm ngoài transaction/không lock; module audit ghi rủi ro concurrency nhưng rule tuần tự không đặt invariant tương ứng. | [modules/04-guide-operations.md](modules/04-guide-operations.md) — BR-059–BR-060 |
| BR-083 | Revoke xóa notification trước khi update draft, không có transaction/lock; exception sau delete tạo partial state như module audit mô tả. | [modules/05-support-notifications.md](modules/05-support-notifications.md) — BR-083 |
| BR-085–BR-086 | Backup không có lock giữa hai lần tạo cùng giây; **[Suy luận từ source code]** cache check/write của scheduled backup không nguyên tử giữa hai tiến trình. | [modules/06-admin-platform.md](modules/06-admin-platform.md) — BR-085–BR-086 |
| BR-087 | Conversation và messages không nằm trong một transaction bao toàn bộ flow; unique session chỉ bảo vệ hai row conversation cùng session. | [modules/06-admin-platform.md](modules/06-admin-platform.md) — BR-087 |
| SR-007 | **[Suy luận từ source code]** `SupportProfileController::update()` ghi user trước support profile và không có transaction; lỗi lần save thứ hai tạo partial update. | [modules/07-cross-document-requirements.md](modules/07-cross-document-requirements.md) — SR-007 |
| SR-008 | `notifications_count` luôn 0; một số count được tính sau `limit`; base query date-based không loại mọi departure cancelled/completed. | [modules/07-cross-document-requirements.md](modules/07-cross-document-requirements.md) — SR-008 |
| SR-012 | Service frontend đọc trạng thái VNPAY tồn tại nhưng caller React cho service đó: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**. | [modules/07-cross-document-requirements.md](modules/07-cross-document-requirements.md) — SR-012 |

## Giới hạn kết quả kiểm thử

- Có 437 test case thiết kế tại bảy file trong `docs/business-model-audit/test-cases`.
- Các dòng `Đã có test` hoặc tham chiếu test chỉ chứng minh assertion đã tồn tại trong source test.
- Artifact chứng minh toàn bộ 437 case đã được chạy trong phiên audit: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- Thống kê chính xác và phép kiểm ID nằm tại [09-traceability-matrix.md](09-traceability-matrix.md#kiểm-soát-tổng).
