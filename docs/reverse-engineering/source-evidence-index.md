# Source Evidence Index

## 1. Baseline truy vết

Tài liệu này là chỉ mục source dùng cho bộ tài liệu reverse engineering. Các số liệu được lấy từ file tracked tại đúng baseline dưới đây; tài liệu sinh trong `docs/` ở working tree không được cộng vào 518 file tracked.

| Thuộc tính | Giá trị xác minh | Lệnh nguồn |
| --- | --- | --- |
| Commit | `d9ddfd25c02d94ebfd1cd12ce42341cfbeaa6219` | `git rev-parse HEAD` |
| Branch | `docs/reverse-engineering-business-requirements` | `git branch --show-current` |
| File tracked | 518 | `git ls-files \| wc -l` |
| Phân bố cấp cao | 317 file dưới `backend_laravel`, 200 file dưới `frontend_react`, 1 `.gitignore` ở root | `cut -d/ -f1 < <(git ls-files) \| sort \| uniq -c` |

Không dùng thời điểm sửa file làm bằng chứng nghiệp vụ. Commit và đường dẫn tương đối repository là khóa truy vết chính.

### 1.1 Snapshot hậu sửa ngày 2026-07-22

- Nhánh làm việc: `fix/business-model-audit-bugs`, kế thừa commit `044d8cd59083e5f7ca5a1a202b0fdc581be47bc5`; thay đổi hậu sửa chưa có commit riêng tại thời điểm lập chỉ mục.
- Route vẫn là 238 API và 1 web route; schema vẫn có 63 bảng.
- Inventory hiện hành: 83 migration `.php` active và 22 file test PHP.
- Bốn file test bổ sung: `AuthBookingBusinessModelRegressionTest.php`, `BusinessModelAuditBugFixTest.php`, `BusinessModelConcurrencyMysqlTest.php`, `GuideBusinessModelRegressionTest.php`.
- Kết quả thực thi và mapping 15 BUG nằm tại [Xác minh hậu sửa Business Model](../business-model-audit/11-post-fix-verification.md).

Các inventory 80 migration/18 test bên dưới được giữ làm bằng chứng cho baseline lịch sử; khi đọc hành vi hiện tại phải áp dụng snapshot hậu sửa này.

## 2. Phạm vi phân tích

### 2.1 Bao gồm

- Laravel: routes, bootstrap, middleware, controllers, services, Form Requests, API Resources, models, commands, config và provider.
- Database: 80 migration `.php` đang được Laravel nhận diện, 1 migration `.bak`, 21 seeders và 3 factories.
- Verification: 18 file test PHP trong `backend_laravel/tests`.
- React: router/entrypoint, 62 pages, 60 components, 31 frontend services và cấu hình package/build.
- File cấu hình dependency: Composer, npm/Vite/ESLint, PHPUnit và các config Laravel tracked.

### 2.2 Loại khỏi phân tích hành vi

| Nhóm loại trừ | Số file tracked | Bằng chứng |
| --- | ---: | --- |
| `vendor/` | 0 | `git ls-files \| rg '(^\|/)vendor/'` |
| `node_modules/` | 0 | `git ls-files \| rg '(^\|/)node_modules/'` |
| `dist/` hoặc `build/` | 0 | `git ls-files \| rg '(^\|/)(dist\|build)/'` |
| `.git/` | 0 | Git metadata không nằm trong `git ls-files`. |
| `.agents/` | 0 | `git ls-files \| rg '(^\|/)\.agents/'` |
| Runtime/cache/storage placeholders | 12 | 1 `backend_laravel/.appdata/PsySH/psysh_history` và 11 `.gitignore` dưới `bootstrap/cache`/`storage`. |
| Binary assets | 2 | `backend_laravel/public/favicon.ico`, `frontend_react/src/assets/hero.png`. |

Các file runtime/cache và binary ở trên chỉ được đếm, không được dùng để kết luận business flow. `.env`, dependency đã cài và output build không thuộc tập 518 file tracked.

## 3. Inventory thực chứng

| Artifact | Số lượng | Quy tắc đếm |
| --- | ---: | --- |
| Application routes | 239 | 238 URI bắt đầu `api/` và 1 route `/`; lọc từ `php artisan route:list --json`. |
| Bảng `Schema::create` duy nhất | 63 | 65 lời gọi trên migration `.php`, unique theo tên bảng; `guide_languages` và `guide_experiences` mỗi bảng được tạo hai lần do migration drop/recreate. |
| Controllers | 51 | File `.php` tracked dưới `app/Http/Controllers`. |
| Model files | 43 | File `.php` tracked dưới `app/Models`; xem cảnh báo class collision tại mục 4.5. |
| Services | 14 | File `.php` tracked dưới `app/Services`. |
| Form Requests | 14 | File `.php` tracked dưới `app/Http/Requests`. |
| API Resources | 14 | File `.php` tracked dưới `app/Http/Resources`. |
| Migration active | 80 | File kết thúc `.php` dưới `database/migrations`. |
| Migration backup | 1 | `2026_06_14_144719_create_destinations_table.php.bak`; không thuộc glob migration `.php` active. |
| Seeders | 21 | File `.php` tracked dưới `database/seeders`. |
| Factories | 3 | File `.php` tracked dưới `database/factories`. |
| Tests | 18 | Toàn bộ file `.php` tracked dưới `tests`, gồm Feature, Unit và bootstrap test. |
| React pages | 62 | File `.jsx/.tsx/.js/.ts` tracked dưới `src/pages`. |
| React components | 60 | File `.jsx/.tsx/.js/.ts` tracked dưới `src/components`. |
| Frontend services | 31 | File `.jsx/.tsx/.js/.ts` tracked dưới `src/services`. |

Số file là inventory cấu trúc, không tự chứng minh artifact có route đang hoạt động hoặc có nghiệp vụ end-to-end.

## 4. Source catalog

### 4.1 Routes, bootstrap và middleware

```text
backend_laravel/routes/api.php
backend_laravel/routes/console.php
backend_laravel/routes/web.php
backend_laravel/bootstrap/app.php
backend_laravel/bootstrap/providers.php
backend_laravel/app/Providers/AppServiceProvider.php
backend_laravel/app/Http/Middleware/CheckRole.php
backend_laravel/app/Http/Middleware/EnsureAdmin.php
```

- `routes/api.php`: application API routes.
- `routes/web.php`: route `/` duy nhất trong baseline application routes.
- `routes/console.php`: scheduler cho database backup, hết hạn VNPAY và nhắc đánh giá guide.
- `bootstrap/app.php`: đăng ký API/web/console routing, alias middleware và JSON authentication exception.

### 4.2 Controllers — 51 file

```text
backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideLeaveRequestController.php
backend_laravel/app/Http/Controllers/Api/Admin/AdminGuideReplacementRequestController.php
backend_laravel/app/Http/Controllers/Api/Admin/AdminNotificationBellController.php
backend_laravel/app/Http/Controllers/Api/Admin/AdminProfileController.php
backend_laravel/app/Http/Controllers/Api/Admin/AdminTourDepartureBookingController.php
backend_laravel/app/Http/Controllers/Api/Admin/BookingController.php
backend_laravel/app/Http/Controllers/Api/Admin/CategoryController.php
backend_laravel/app/Http/Controllers/Api/Admin/CertificateController.php
backend_laravel/app/Http/Controllers/Api/Admin/CustomerManagerController.php
backend_laravel/app/Http/Controllers/Api/Admin/DatabaseBackupController.php
backend_laravel/app/Http/Controllers/Api/Admin/DestinationController.php
backend_laravel/app/Http/Controllers/Api/Admin/GuideController.php
backend_laravel/app/Http/Controllers/Api/Admin/LanguageController.php
backend_laravel/app/Http/Controllers/Api/Admin/NotificationController.php
backend_laravel/app/Http/Controllers/Api/Admin/PaymentController.php
backend_laravel/app/Http/Controllers/Api/Admin/ReportController.php
backend_laravel/app/Http/Controllers/Api/Admin/ServiceCategoryController.php
backend_laravel/app/Http/Controllers/Api/Admin/SettingController.php
backend_laravel/app/Http/Controllers/Api/Admin/SupportStaffController.php
backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureController.php
backend_laravel/app/Http/Controllers/Api/Admin/TourDepartureGuideAssignmentController.php
backend_laravel/app/Http/Controllers/Api/Admin/TourManagerController.php
backend_laravel/app/Http/Controllers/Api/Admin/TourReviewController.php
backend_laravel/app/Http/Controllers/Api/Admin/WidgetController.php
backend_laravel/app/Http/Controllers/Api/AuthController.php
backend_laravel/app/Http/Controllers/Api/BaseController.php
backend_laravel/app/Http/Controllers/Api/Chat/ChatBotController.php
backend_laravel/app/Http/Controllers/Api/Customer/CustomerBookingController.php
backend_laravel/app/Http/Controllers/Api/Customer/CustomerController.php
backend_laravel/app/Http/Controllers/Api/Customer/CustomerDashboardController.php
backend_laravel/app/Http/Controllers/Api/Customer/CustomerSupportRequestController.php
backend_laravel/app/Http/Controllers/Api/Customer/GuideReviewController.php
backend_laravel/app/Http/Controllers/Api/Customer/NotificationCustomerController.php
backend_laravel/app/Http/Controllers/Api/Customer/TourController.php
backend_laravel/app/Http/Controllers/Api/Customer/TourReviewController.php
backend_laravel/app/Http/Controllers/Api/Customer/VnpayPaymentController.php
backend_laravel/app/Http/Controllers/Api/Customer/WishlistController.php
backend_laravel/app/Http/Controllers/Api/Guide/GuideAttendanceController.php
backend_laravel/app/Http/Controllers/Api/Guide/GuideDashboardController.php
backend_laravel/app/Http/Controllers/Api/Guide/GuideLeaveRequestController.php
backend_laravel/app/Http/Controllers/Api/Guide/GuideProfileController.php
backend_laravel/app/Http/Controllers/Api/Guide/GuideReviewController.php
backend_laravel/app/Http/Controllers/Api/Guide/GuideTourController.php
backend_laravel/app/Http/Controllers/Api/PublicCatalogController.php
backend_laravel/app/Http/Controllers/Api/PublicSettingController.php
backend_laravel/app/Http/Controllers/Api/PublicWidgetController.php
backend_laravel/app/Http/Controllers/Api/Support/SupportNotificationController.php
backend_laravel/app/Http/Controllers/Api/Support/SupportProfileController.php
backend_laravel/app/Http/Controllers/Api/Support/SupportRequestController.php
backend_laravel/app/Http/Controllers/Api/TourReviewController.php
backend_laravel/app/Http/Controllers/Controller.php
```

### 4.3 Services — 14 file

```text
backend_laravel/app/Services/AdminNotificationService.php
backend_laravel/app/Services/BookingReviewEligibilityService.php
backend_laravel/app/Services/DatabaseBackupService.php
backend_laravel/app/Services/GuideAssignmentService.php
backend_laravel/app/Services/GuideReviewNotificationService.php
backend_laravel/app/Services/GuideReviewService.php
backend_laravel/app/Services/GuideTourOperationService.php
backend_laravel/app/Services/ServiceCategoryService.php
backend_laravel/app/Services/TourDepartureChangeNotificationService.php
backend_laravel/app/Services/TourDepartureMutationGuard.php
backend_laravel/app/Services/TourPricingService.php
backend_laravel/app/Services/TourReviewService.php
backend_laravel/app/Services/VnpayPaymentLifecycleService.php
backend_laravel/app/Services/VnpayService.php
```

### 4.4 Form Requests và API Resources

Form Requests — 14 file:

```text
backend_laravel/app/Http/Requests/Admin/UpdateTourReviewStatusRequest.php
backend_laravel/app/Http/Requests/AttendanceActionRequest.php
backend_laravel/app/Http/Requests/AttendanceSessionQueryRequest.php
backend_laravel/app/Http/Requests/Customer/StoreBookingRequest.php
backend_laravel/app/Http/Requests/Customer/StoreGuideReviewRequest.php
backend_laravel/app/Http/Requests/Customer/StoreTourReviewRequest.php
backend_laravel/app/Http/Requests/Customer/UpdateTourReviewRequest.php
backend_laravel/app/Http/Requests/GuideTourCustomerIndexRequest.php
backend_laravel/app/Http/Requests/IndexServiceCategoryRequest.php
backend_laravel/app/Http/Requests/StoreAttendanceSessionRequest.php
backend_laravel/app/Http/Requests/StoreGuideReplacementRequest.php
backend_laravel/app/Http/Requests/StoreServiceCategoryRequest.php
backend_laravel/app/Http/Requests/UpdateAttendanceNoteRequest.php
backend_laravel/app/Http/Requests/UpdateServiceCategoryRequest.php
```

API Resources — 14 file:

```text
backend_laravel/app/Http/Resources/AdminTourReviewResource.php
backend_laravel/app/Http/Resources/AttendanceSessionResource.php
backend_laravel/app/Http/Resources/CustomerTourReviewResource.php
backend_laravel/app/Http/Resources/GuideReviewResource.php
backend_laravel/app/Http/Resources/GuideTourCustomerDetailResource.php
backend_laravel/app/Http/Resources/GuideTourCustomerResource.php
backend_laravel/app/Http/Resources/GuideTourOverviewResource.php
backend_laravel/app/Http/Resources/PublicTourReviewResource.php
backend_laravel/app/Http/Resources/ServiceCategoryResource.php
backend_laravel/app/Http/Resources/TourDepartureResource.php
backend_laravel/app/Http/Resources/TourDepartureStageResource.php
backend_laravel/app/Http/Resources/TourItineraryImageResource.php
backend_laravel/app/Http/Resources/TourItineraryResource.php
backend_laravel/app/Http/Resources/TourResource.php
```

### 4.5 Models — 43 file

```text
backend_laravel/app/Models/Attendance.php
backend_laravel/app/Models/AttendanceSession.php
backend_laravel/app/Models/Banner.php
backend_laravel/app/Models/Booking.php
backend_laravel/app/Models/BookingContact.php
backend_laravel/app/Models/BookingParticipant.php
backend_laravel/app/Models/BookingStatusHistory.php
backend_laravel/app/Models/Category.php
backend_laravel/app/Models/Certificate.php
backend_laravel/app/Models/ChatConversation.php
backend_laravel/app/Models/ChatMessage.php
backend_laravel/app/Models/Destination.php
backend_laravel/app/Models/Guide.php
backend_laravel/app/Models/GuideDestination.php
backend_laravel/app/Models/GuideExperience.php
backend_laravel/app/Models/GuideLanguage.php
backend_laravel/app/Models/GuideLeaveRequest.php
backend_laravel/app/Models/GuideLeaveRequestAttachment.php
backend_laravel/app/Models/GuideSpecialization.php
backend_laravel/app/Models/Language.php
backend_laravel/app/Models/LanguageLevel.php
backend_laravel/app/Models/Notification.php
backend_laravel/app/Models/NotificationDraft.php
backend_laravel/app/Models/Payment.php
backend_laravel/app/Models/Review.php
backend_laravel/app/Models/Role.php
backend_laravel/app/Models/ServiceCategory.php
backend_laravel/app/Models/Setting.php
backend_laravel/app/Models/SupportRequest.php
backend_laravel/app/Models/SupportRequestAttachment.php
backend_laravel/app/Models/SupportStaff.php
backend_laravel/app/Models/Tour.php
backend_laravel/app/Models/TourAgePricingRule.php
backend_laravel/app/Models/TourDeparture.php
backend_laravel/app/Models/TourDepartureStage.php
backend_laravel/app/Models/TourGuideAssignment.php
backend_laravel/app/Models/TourGuideAssignments.php
backend_laravel/app/Models/TourImage.php
backend_laravel/app/Models/TourItinerary.php
backend_laravel/app/Models/TourItineraryImage.php
backend_laravel/app/Models/TourReview.php
backend_laravel/app/Models/User.php
backend_laravel/app/Models/Wishlist.php
```

#### Cảnh báo class/filename collision trong ba file

| File | Class thực tế | Kết quả đối chiếu |
| --- | --- | --- |
| `backend_laravel/app/Models/TourGuideAssignment.php` | `App\Models\TourGuideAssignment` | Filename canonical. |
| `backend_laravel/app/Models/TourGuideAssignments.php` | `App\Models\TourGuideAssignment` | Filename số nhiều không khớp class; trùng fully-qualified class với file canonical. |
| `backend_laravel/app/Models/GuideDestination.php` | `App\Models\TourGuideAssignment` | Filename không khớp class; trùng fully-qualified class với hai file trên. |

Bằng chứng: `rg -n '^class ' backend_laravel/app/Models/*.php`. Đây là class collision/mismatch trực tiếp từ source; không tự kết luận file nào được autoloader nạp thành công ở production.

### 4.6 Migrations — 80 active `.php` tại baseline, 83 tại snapshot hậu sửa và 1 `.bak`

```text
backend_laravel/database/migrations/0001_01_01_000000_create_users_table.php
backend_laravel/database/migrations/0001_01_01_000001_create_cache_table.php
backend_laravel/database/migrations/0001_01_01_000002_create_jobs_table.php
backend_laravel/database/migrations/2026_06_10_055225_create_personal_access_tokens_table.php
backend_laravel/database/migrations/2026_06_10_215900_create_roles_table.php
backend_laravel/database/migrations/2026_06_10_215910_add_vivugo_columns_to_users_table.php
backend_laravel/database/migrations/2026_06_10_220000_create_categories_table.php
backend_laravel/database/migrations/2026_06_10_220010_create_destinations_table.php
backend_laravel/database/migrations/2026_06_10_220020_create_tours_table.php
backend_laravel/database/migrations/2026_06_10_220030_create_tour_images_table.php
backend_laravel/database/migrations/2026_06_10_220040_create_tour_departures_table.php
backend_laravel/database/migrations/2026_06_10_220050_create_promotions_table.php
backend_laravel/database/migrations/2026_06_10_220060_create_bookings_table.php
backend_laravel/database/migrations/2026_06_10_220070_create_booking_contacts_table.php
backend_laravel/database/migrations/2026_06_10_220080_create_booking_participants_table.php
backend_laravel/database/migrations/2026_06_10_220090_create_payments_table.php
backend_laravel/database/migrations/2026_06_10_220100_create_reviews_table.php
backend_laravel/database/migrations/2026_06_10_220110_create_wishlists_table.php
backend_laravel/database/migrations/2026_06_10_220120_create_blogs_table.php
backend_laravel/database/migrations/2026_06_10_220130_create_notifications_table.php
backend_laravel/database/migrations/2026_06_10_220140_create_system_logs_table.php
backend_laravel/database/migrations/2026_06_10_220150_create_promotion_usages_table.php
backend_laravel/database/migrations/2026_06_10_220160_create_refund_requests_table.php
backend_laravel/database/migrations/2026_06_10_220170_create_support_tickets_table.php
backend_laravel/database/migrations/2026_06_10_220180_create_support_messages_table.php
backend_laravel/database/migrations/2026_06_10_220190_create_banners_table.php
backend_laravel/database/migrations/2026_06_10_220200_create_booking_status_histories_table.php
backend_laravel/database/migrations/2026_06_10_220210_create_tour_destinations_table.php
backend_laravel/database/migrations/2026_06_13_000001_create_settings_table.php
backend_laravel/database/migrations/2026_06_13_000002_add_widget_columns_to_banners_table.php
backend_laravel/database/migrations/2026_06_13_144107_add_otp_to_users_table.php
backend_laravel/database/migrations/2026_06_14_145318_create_guides_table.php
backend_laravel/database/migrations/2026_06_14_145321_create_guide_languages_table.php
backend_laravel/database/migrations/2026_06_14_145322_create_guide_experiences_table.php
backend_laravel/database/migrations/2026_06_17_000000_drop_name_from_users_table.php
backend_laravel/database/migrations/2026_06_22_032814_create_support_staff_table.php
backend_laravel/database/migrations/2026_06_24_042942_create_languages_table.php
backend_laravel/database/migrations/2026_06_24_042945_create_certificates_table.php
backend_laravel/database/migrations/2026_06_24_042945_create_language_levels_table.php
backend_laravel/database/migrations/2026_06_24_042946_drop_and_recreate_guide_languages_table.php
backend_laravel/database/migrations/2026_06_24_042950_drop_and_recreate_guide_experiences_table.php
backend_laravel/database/migrations/2026_06_24_152026_create_notification_drafts_table.php
backend_laravel/database/migrations/2026_06_24_155228_add_deleted_at_to_notification_drafts_table.php
backend_laravel/database/migrations/2026_06_24_161627_modify_notifications_table.php
backend_laravel/database/migrations/2026_06_24_165838_add_draft_id_to_notifications_table.php
backend_laravel/database/migrations/2026_06_25_075330_create_partner_service_types_table.php
backend_laravel/database/migrations/2026_06_25_075333_create_partners_table.php
backend_laravel/database/migrations/2026_06_25_081003_add_fields_to_partners_table.php
backend_laravel/database/migrations/2026_06_25_081004_create_partner_services_table.php
backend_laravel/database/migrations/2026_06_27_000001_create_tour_itineraries_table.php
backend_laravel/database/migrations/2026_06_27_000002_create_tour_itinerary_images_table.php
backend_laravel/database/migrations/2026_06_27_143012_create_guide_specializations_table.php
backend_laravel/database/migrations/2026_06_27_143013_add_specialization_id_to_guides_table.php
backend_laravel/database/migrations/2026_06_27_151320_create_guide_specialization_pivot_table.php
backend_laravel/database/migrations/2026_06_27_151322_remove_specialization_id_from_guides_table.php
backend_laravel/database/migrations/2026_06_28_092905_create_tour_guide_assignments_table.php
backend_laravel/database/migrations/2026_07_01_000001_add_user_id_to_support_staff_table.php
backend_laravel/database/migrations/2026_07_01_031420_add_avatar_url_to_guides_table.php
backend_laravel/database/migrations/2026_07_02_143241_create_guide_attendance_and_stage_tables.php
backend_laravel/database/migrations/2026_07_03_031102_create_service_categories_table.php
backend_laravel/database/migrations/2026_07_03_104500_sync_partner_service_types_to_service_categories.php
backend_laravel/database/migrations/2026_07_03_112000_add_thumbnail_fields_to_categories_table.php
backend_laravel/database/migrations/2026_07_03_120000_create_tour_age_pricing_rules_table.php
backend_laravel/database/migrations/2026_07_03_120100_add_pricing_snapshot_to_booking_participants_table.php
backend_laravel/database/migrations/2026_07_04_000001_add_specialization_and_experience_years_to_support_staff_table.php
backend_laravel/database/migrations/2026_07_04_005529_add_unique_booking_code_to_bookings_table.php
backend_laravel/database/migrations/2026_07_06_000001_add_base_and_discount_price_to_tour_departures_table.php
backend_laravel/database/migrations/2026_07_07_040324_backfill_missing_booking_payments.php
backend_laravel/database/migrations/2026_07_07_055358_create_guide_destinations_table.php
backend_laravel/database/migrations/2026_07_07_080821_add_assignment_fields_to_tour_guide_assignments_table.php
backend_laravel/database/migrations/2026_07_11_112416_add_guide_context_to_reviews_table.php
backend_laravel/database/migrations/2026_07_12_000000_create_guide_replacement_requests_table.php
backend_laravel/database/migrations/2026_07_13_000000_create_guide_leave_requests_tables.php
backend_laravel/database/migrations/2026_07_15_000000_add_vnpay_expiry_to_payments_table.php
backend_laravel/database/migrations/2026_07_15_193903_create_chat_conversations_table.php
backend_laravel/database/migrations/2026_07_15_193904_create_chat_messages_table.php
backend_laravel/database/migrations/2026_07_16_220919_create_support_requests_table.php
backend_laravel/database/migrations/2026_07_16_220920_create_support_request_attachments_table.php
backend_laravel/database/migrations/2026_07_18_000000_add_boundary_to_attendance_sessions_table.php
backend_laravel/database/migrations/2026_07_21_000000_create_tour_reviews_table.php
backend_laravel/database/migrations/2026_07_22_000000_make_banner_image_url_nullable.php
backend_laravel/database/migrations/2026_07_22_000000_restore_certificate_type_to_guides_table.php
backend_laravel/database/migrations/2026_07_22_010000_make_booking_contact_email_nullable.php
```

File backup được catalog riêng:

```text
backend_laravel/database/migrations/2026_06_14_144719_create_destinations_table.php.bak
```

Laravel migration discovery theo file `.php` không nhận file `.php.bak`; vì vậy file `.bak` không được tính vào 80 migration active ở baseline hay 83 migration active tại snapshot hậu sửa. File này vẫn là tracked evidence và chứa thêm một lời gọi tạo bảng `destinations`, nhưng không được gộp vào số 63 tên bảng active.

### 4.7 Seeders và factories

Seeders — 21 file:

```text
backend_laravel/database/seeders/BannerSeeder.php
backend_laravel/database/seeders/BookingSeeder.php
backend_laravel/database/seeders/CategorySeeder.php
backend_laravel/database/seeders/CertificateSeeder.php
backend_laravel/database/seeders/DatabaseSeeder.php
backend_laravel/database/seeders/DemoWorkflowSeeder.php
backend_laravel/database/seeders/DestinationSeeder.php
backend_laravel/database/seeders/GuideReviewSeeder.php
backend_laravel/database/seeders/GuideSeeder.php
backend_laravel/database/seeders/GuideSpecializationSeeder.php
backend_laravel/database/seeders/LanguageSeeder.php
backend_laravel/database/seeders/PromotionSeeder.php
backend_laravel/database/seeders/RoleSeeder.php
backend_laravel/database/seeders/ServiceCategorySeeder.php
backend_laravel/database/seeders/SettingSeeder.php
backend_laravel/database/seeders/SupportStaffSeeder.php
backend_laravel/database/seeders/TourGuideAssignmentSeeder.php
backend_laravel/database/seeders/TourReviewSeeder.php
backend_laravel/database/seeders/TourSeeder.php
backend_laravel/database/seeders/TourTestingDataSeeder.php
backend_laravel/database/seeders/UserSeeder.php
```

Factories — 3 file:

```text
backend_laravel/database/factories/ServiceCategoryFactory.php
backend_laravel/database/factories/TourReviewFactory.php
backend_laravel/database/factories/UserFactory.php
```

Seeder/factory chỉ là bằng chứng dữ liệu mẫu hoặc test fixture. Không biến bản ghi mẫu thành business rule nếu controller/service/migration không xác nhận.

### 4.8 Commands, scheduler và config

Commands — 3 file:

```text
backend_laravel/app/Console/Commands/DatabaseBackupCommand.php
backend_laravel/app/Console/Commands/ExpirePendingVnpayPayments.php
backend_laravel/app/Console/Commands/SendGuideReviewReminders.php
```

Scheduler:

```text
backend_laravel/routes/console.php
```

Config Laravel — 11 file:

```text
backend_laravel/config/app.php
backend_laravel/config/auth.php
backend_laravel/config/cache.php
backend_laravel/config/database.php
backend_laravel/config/filesystems.php
backend_laravel/config/logging.php
backend_laravel/config/mail.php
backend_laravel/config/queue.php
backend_laravel/config/sanctum.php
backend_laravel/config/services.php
backend_laravel/config/session.php
```

Bootstrap/dependency/test configuration:

```text
backend_laravel/app/Providers/AppServiceProvider.php
backend_laravel/bootstrap/app.php
backend_laravel/bootstrap/providers.php
backend_laravel/composer.json
backend_laravel/composer.lock
backend_laravel/phpunit.xml
frontend_react/eslint.config.js
frontend_react/package.json
frontend_react/package-lock.json
frontend_react/vite.config.js
```

### 4.9 Tests — 18 file tại baseline; 22 file tại snapshot hậu sửa

```text
backend_laravel/tests/Feature/ApiRateLimitTest.php
backend_laravel/tests/Feature/BackupSettingsTest.php
backend_laravel/tests/Feature/DatabaseBackupApiTest.php
backend_laravel/tests/Feature/DemoWorkflowSeederTest.php
backend_laravel/tests/Feature/ExampleTest.php
backend_laravel/tests/Feature/GuideReviewApiTest.php
backend_laravel/tests/Feature/GuideTourAttendanceApiTest.php
backend_laravel/tests/Feature/PartnerApiTest.php
backend_laravel/tests/Feature/PaymentBookingSafetyTest.php
backend_laravel/tests/Feature/PublicCatalogApiTest.php
backend_laravel/tests/Feature/RbacAuthorizationTest.php
backend_laravel/tests/Feature/ServiceCategoryApiTest.php
backend_laravel/tests/Feature/TourDepartureApiTest.php
backend_laravel/tests/Feature/TourReviewApiTest.php
backend_laravel/tests/Feature/TourTestingDataSeederTest.php
backend_laravel/tests/Pest.php
backend_laravel/tests/TestCase.php
backend_laravel/tests/Unit/ExampleTest.php
backend_laravel/tests/Feature/AuthBookingBusinessModelRegressionTest.php
backend_laravel/tests/Feature/BusinessModelAuditBugFixTest.php
backend_laravel/tests/Feature/BusinessModelConcurrencyMysqlTest.php
backend_laravel/tests/Feature/GuideBusinessModelRegressionTest.php
```

### 4.10 React router và entrypoint

```text
frontend_react/src/main.jsx
frontend_react/src/App.jsx
frontend_react/src/routes/AppRoutes.jsx
```

`AppRoutes.jsx` là catalog route UI có bằng chứng. Page tồn tại nhưng không được import/render tại router không tự trở thành route truy cập được.

### 4.11 React pages — 62 file

```text
frontend_react/src/pages/admin/AdminDashboardPage.jsx
frontend_react/src/pages/admin/BookingManagementPage.jsx
frontend_react/src/pages/admin/GuideManagementPage.jsx
frontend_react/src/pages/admin/GuideTrashPage.jsx
frontend_react/src/pages/admin/Notifications/AdminNotificationsPage.jsx
frontend_react/src/pages/admin/SupportStaffManagementPage.jsx
frontend_react/src/pages/admin/SupportStaffTrashPage.jsx
frontend_react/src/pages/admin/UserManagementPage.jsx
frontend_react/src/pages/admin/categories/TourTypeCreatePage.jsx
frontend_react/src/pages/admin/categories/TourTypeEditPage.jsx
frontend_react/src/pages/admin/categories/TourTypeListPage.jsx
frontend_react/src/pages/admin/categories/TourTypeTrashPage.jsx
frontend_react/src/pages/admin/certificate/CertificateManagementPage.jsx
frontend_react/src/pages/admin/destinations/DestinationCreatePage.jsx
frontend_react/src/pages/admin/destinations/DestinationEditPage.jsx
frontend_react/src/pages/admin/destinations/DestinationListPage.jsx
frontend_react/src/pages/admin/destinations/DestinationTrashPage.jsx
frontend_react/src/pages/admin/language/LanguageManagementPage.jsx
frontend_react/src/pages/admin/reportStatistics/ReportStatisticsPage.jsx
frontend_react/src/pages/admin/settings/BackupSettingsPage.jsx
frontend_react/src/pages/admin/settings/LocaleSettingsPage.jsx
frontend_react/src/pages/admin/settings/NotificationSettingsPage.jsx
frontend_react/src/pages/admin/settings/PaymentSettingsPage.jsx
frontend_react/src/pages/admin/settings/SecuritySettingsPage.jsx
frontend_react/src/pages/admin/settings/SettingsDetailPage.jsx
frontend_react/src/pages/admin/settings/SettingsHomePage.jsx
frontend_react/src/pages/admin/settings/SystemSettingsPage.jsx
frontend_react/src/pages/admin/tourDepartures/GuideAssignmentPage.jsx
frontend_react/src/pages/admin/tourDepartures/TourDepartureCreatePage.jsx
frontend_react/src/pages/admin/tourDepartures/TourDepartureEditPage.jsx
frontend_react/src/pages/admin/tourDepartures/TourDepartureListPage.jsx
frontend_react/src/pages/admin/tours/TourCreatePage.jsx
frontend_react/src/pages/admin/tours/TourDetailPage.jsx
frontend_react/src/pages/admin/tours/TourEditPage.jsx
frontend_react/src/pages/admin/tours/TourHiddenPage.jsx
frontend_react/src/pages/admin/tours/TourListPage.jsx
frontend_react/src/pages/auth/AuthPage.jsx
frontend_react/src/pages/auth/ForgotPasswordPage.jsx
frontend_react/src/pages/customer/CustomerPage.jsx
frontend_react/src/pages/customer/CustomerSupportPage.jsx
frontend_react/src/pages/customer/DestinationsPage.jsx
frontend_react/src/pages/customer/GuideReviewPage.jsx
frontend_react/src/pages/customer/HomePage.jsx
frontend_react/src/pages/customer/ProfileDashboard.jsx
frontend_react/src/pages/customer/ProfileForm.jsx
frontend_react/src/pages/customer/TourDetailPage.jsx
frontend_react/src/pages/customer/ToursPage.jsx
frontend_react/src/pages/customer/VnpayPaymentResultPage.jsx
frontend_react/src/pages/guide/GuideAttendancePage.jsx
frontend_react/src/pages/guide/GuideDashboardPage.jsx
frontend_react/src/pages/guide/GuideHistoryPage.jsx
frontend_react/src/pages/guide/GuideNotificationsPage.jsx
frontend_react/src/pages/guide/GuideProfilePage.jsx
frontend_react/src/pages/guide/GuideReviews/GuideReviewsPage.jsx
frontend_react/src/pages/guide/GuideSchedulePage.jsx
frontend_react/src/pages/guide/GuideToursPage.jsx
frontend_react/src/pages/guide/guidePageUtils.js
frontend_react/src/pages/support/SupportDashboardPage.jsx
frontend_react/src/pages/support/SupportNotificationsPage.jsx
frontend_react/src/pages/support/SupportProfilePage.jsx
frontend_react/src/pages/support/SupportRequestsPage.jsx
frontend_react/src/pages/support/SupportWorkSchedulePage.jsx
```

### 4.12 React components — 60 file

```text
frontend_react/src/components/BrandLogo.jsx
frontend_react/src/components/admin/AdminPageHeader.jsx
frontend_react/src/components/admin/AdminSidebar.jsx
frontend_react/src/components/admin/ProtectedAdminRoute.jsx
frontend_react/src/components/admin/bookings/BookingBadge.jsx
frontend_react/src/components/admin/bookings/BookingDetailModal.jsx
frontend_react/src/components/admin/bookings/BookingFilters.jsx
frontend_react/src/components/admin/bookings/BookingIcons.jsx
frontend_react/src/components/admin/bookings/BookingPagination.jsx
frontend_react/src/components/admin/bookings/BookingStats.jsx
frontend_react/src/components/admin/bookings/BookingTable.jsx
frontend_react/src/components/admin/bookings/bookingConstants.js
frontend_react/src/components/admin/bookings/bookingFormatters.js
frontend_react/src/components/admin/categories/CategoryForm.jsx
frontend_react/src/components/admin/categories/CategoryTable.jsx
frontend_react/src/components/admin/destinations/DestinationForm.jsx
frontend_react/src/components/admin/guides/AdminGuideLeaveRequestsPanel.jsx
frontend_react/src/components/admin/notifications/AdminNotificationBell.jsx
frontend_react/src/components/admin/serviceCategories/ServiceCategoryDetailModal.jsx
frontend_react/src/components/admin/serviceCategories/ServiceCategoryForm.jsx
frontend_react/src/components/admin/serviceCategories/ServiceCategoryTable.jsx
frontend_react/src/components/admin/settings/BackupSettingsForm.jsx
frontend_react/src/components/admin/settings/BannerManager.jsx
frontend_react/src/components/admin/settings/LocaleSettingsForm.jsx
frontend_react/src/components/admin/settings/NotificationSettingsForm.jsx
frontend_react/src/components/admin/settings/PaymentSettingsForm.jsx
frontend_react/src/components/admin/settings/SecuritySettingsForm.jsx
frontend_react/src/components/admin/settings/SettingDashboard.jsx
frontend_react/src/components/admin/settings/SettingField.jsx
frontend_react/src/components/admin/settings/SettingPanel.jsx
frontend_react/src/components/admin/settings/SettingSectionForm.jsx
frontend_react/src/components/admin/settings/SettingSwitch.jsx
frontend_react/src/components/admin/settings/SystemSettingsForm.jsx
frontend_react/src/components/admin/tourDepartures/TourDepartureBookingModal.jsx
frontend_react/src/components/admin/tourDepartures/TourDepartureForm.jsx
frontend_react/src/components/admin/tourDepartures/TourDepartureTable.jsx
frontend_react/src/components/admin/tours/TourForm.jsx
frontend_react/src/components/admin/users/UserDetailModal.jsx
frontend_react/src/components/admin/users/UserFilters.jsx
frontend_react/src/components/admin/users/UserFormModal.jsx
frontend_react/src/components/admin/users/UserStats.jsx
frontend_react/src/components/admin/users/UserTable.jsx
frontend_react/src/components/auth/AuthCard.jsx
frontend_react/src/components/auth/LoginForm.jsx
frontend_react/src/components/auth/RegisterForm.jsx
frontend_react/src/components/auth/UserDashboard.jsx
frontend_react/src/components/common/LanguageSwitcher.jsx
frontend_react/src/components/customer/BookingCountdown.jsx
frontend_react/src/components/customer/ChatBox.jsx
frontend_react/src/components/customer/CustomerNotificationBell.jsx
frontend_react/src/components/customer/Footer.jsx
frontend_react/src/components/customer/GuideReviewModal.jsx
frontend_react/src/components/customer/Header.jsx
frontend_react/src/components/customer/Icon.jsx
frontend_react/src/components/customer/TourCard.jsx
frontend_react/src/components/guide/GuideLeaveRequestWidget.jsx
frontend_react/src/components/guide/GuideNotificationBell.jsx
frontend_react/src/components/guide/GuideSidebar.jsx
frontend_react/src/components/support/SupportNotificationBell.jsx
frontend_react/src/components/support/SupportSidebar.jsx
```

### 4.13 Frontend services — 31 file

```text
frontend_react/src/services/adminAccountApi.js
frontend_react/src/services/adminDashboardApi.js
frontend_react/src/services/adminGuideLeaveRequestApi.js
frontend_react/src/services/adminGuideReplacementRequestApi.js
frontend_react/src/services/adminNotificationApi.js
frontend_react/src/services/adminSettingService.js
frontend_react/src/services/apiClient.js
frontend_react/src/services/authApi.js
frontend_react/src/services/authStorage.js
frontend_react/src/services/bookingApi.js
frontend_react/src/services/categoryApi.jsx
frontend_react/src/services/certificateApi.js
frontend_react/src/services/customerApi.js
frontend_react/src/services/customerReviewApi.js
frontend_react/src/services/destinationApi.js
frontend_react/src/services/guideDashboardApi.js
frontend_react/src/services/guideLeaveRequestApi.js
frontend_react/src/services/guideNotificationApi.js
frontend_react/src/services/guideProfileApi.js
frontend_react/src/services/guideTourApi.js
frontend_react/src/services/languageApi.js
frontend_react/src/services/paymentApi.js
frontend_react/src/services/publicWidgetApi.js
frontend_react/src/services/reportApi.js
frontend_react/src/services/serviceCategoryApi.js
frontend_react/src/services/supportNotificationApi.js
frontend_react/src/services/supportProfileApi.js
frontend_react/src/services/supportRequestApi.js
frontend_react/src/services/supportStaffApi.js
frontend_react/src/services/tourDepartureApi.js
frontend_react/src/services/toursApi.jsx
```

File service tồn tại chỉ chứng minh có client code. Để xác nhận UI flow phải đối chiếu import/call từ router/page/component và route backend tương ứng.

## 5. Capability không tìm thấy trong source tracked

Lệnh directory scan:

```bash
for capability in Policies Gates Events Listeners Jobs Observers Actions DTO DTOs Repositories Notifications Helpers Traits; do
  git ls-files | rg -i "^backend_laravel/app/${capability}/|^backend_laravel/app/.*/${capability}/" | wc -l
done
```

Kết quả tại baseline: tất cả các tên directory trên đều có count `0`.

| Capability | Evidence scan | Kết luận giới hạn |
| --- | --- | --- |
| Policies/Gates nghiệp vụ | Không có directory `app/Policies`, `app/Gates`; không tìm thấy `Gate::`, policy class hoặc gọi `authorize()` trên controller. | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về Laravel Policy/Gate nghiệp vụ. Authorization hiện có bằng middleware, FormRequest `authorize()` và kiểm tra trong controller/service; không gọi các cơ chế này là Policy/Gate. |
| Events/Listeners | Không có `app/Events`, `app/Listeners`; symbol scan không tìm thấy dispatch event nghiệp vụ. | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về Event/Listener nghiệp vụ. |
| Jobs | Không có `app/Jobs`; không tìm thấy `ShouldQueue`, `dispatch(`, `Queue::` trong `app/routes/config`. | Queue config và migration `jobs` tồn tại, nhưng **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về job nghiệp vụ được dispatch. |
| Observers | Không có `app/Observers`; không tìm thấy `observe(`. | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về Eloquent Observer. |
| Actions | Không có `app/Actions`. | Private method `GuideTourController::actionPolicy()` chỉ là tên method trả action UI, không phải Action class/directory. |
| DTO/DTOs | Không có `app/DTO` hoặc `app/DTOs`. | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về DTO class riêng. |
| Repositories | Không có `app/Repositories`; từ “Migration Repository Table” chỉ xuất hiện trong comment config database. | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về repository layer nghiệp vụ. |
| Notification classes | Không có `app/Notifications`. | Notification vẫn có model/controller/service và bảng; không có bằng chứng Laravel Notification class/queue notification. |
| Helpers/Traits | Không có directory `app/Helpers`, `app/Traits`. | **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** về helper/trait nghiệp vụ riêng dưới các directory này. |

Symbol scan dùng để kiểm tra chéo:

```bash
rg -n "Gate::|->can\(|authorize\(|Policy|ShouldQueue|dispatch\(|event\(|Event::|Observer|observe\(|Repository|DataTransferObject|DTO" \
  backend_laravel/app backend_laravel/routes backend_laravel/config --glob '*.php'
```

Kết quả `authorize()` tìm thấy nằm trong 14 Form Requests; đây không phải bằng chứng về Policy/Gate class. Không biến count directory bằng 0 thành khẳng định framework không hỗ trợ capability; chỉ ghi rằng project tracked không triển khai artifact tương ứng.

## 6. Syntax scan PHP

| Chỉ số | Kết quả |
| --- | ---: |
| File PHP tracked được quét | 282 |
| `php -l` thành công | 281 |
| `php -l` thất bại | 1 |

Failure duy nhất:

```text
backend_laravel/database/seeders/ServiceCategorySeeder.php
Line: 28
PHP Parse error: syntax error, unexpected token "<<", expecting "]"
```

Source chứa conflict markers tại dòng 28–32:

```text
Marker mở: <<<<<<< Updated upstream
Marker phân cách: =======
Marker đóng: >>>>>>> Stashed changes
```

Lệnh tái kiểm:

```bash
git ls-files '*.php' | while IFS= read -r php_file; do
  php -l "$php_file" >/dev/null || echo "$php_file"
done
```

Đây là kết quả syntax scan, không phải kết quả chạy Pest hay chứng minh 281 file còn lại đúng nghiệp vụ. File lỗi chỉ được ghi nhận, không được sửa trong tác vụ tài liệu này.

## 7. Lệnh tái kiểm inventory

Chạy từ repository root, ngoại trừ lệnh route được ghi rõ `cd backend_laravel`.

### 7.1 Baseline và tracked scope

```bash
git rev-parse HEAD
git branch --show-current
git ls-files | wc -l
cut -d/ -f1 < <(git ls-files) | sort | uniq -c
```

Expected:

```text
d9ddfd25c02d94ebfd1cd12ce42341cfbeaa6219
docs/reverse-engineering-business-requirements
518
317 backend_laravel
200 frontend_react
1 .gitignore
```

### 7.2 Application routes

```bash
cd backend_laravel
php artisan route:list --json | php -r '
$routes = json_decode(stream_get_contents(STDIN), true);
$api = array_filter($routes, fn ($route) => str_starts_with($route["uri"], "api/"));
$app = array_filter($routes, fn ($route) => $route["uri"] === "/" || str_starts_with($route["uri"], "api/"));
echo "api=".count($api).PHP_EOL;
echo "application=".count($app).PHP_EOL;
'
```

Expected: `api=238`, `application=239`. Artisan trả 244 route tổng cộng; 5 route còn lại đến từ framework/vendor (`_boost`, Sanctum CSRF, storage GET/PUT, health `/up`) và không được tính là application route của tài liệu.

### 7.3 Schema, migrations và database artifacts

```bash
git ls-files 'backend_laravel/database/migrations/*.php' | wc -l
git ls-files 'backend_laravel/database/migrations/*.bak' | wc -l
git ls-files 'backend_laravel/database/migrations/*.php' \
  | xargs rg -o --no-filename "Schema::create\(['\"]\K[^'\"]+" -P \
  | sort -u | wc -l
git ls-files 'backend_laravel/database/seeders/*.php' | wc -l
git ls-files 'backend_laravel/database/factories/*.php' | wc -l
```

Expected lần lượt: `80`, `1`, `63`, `21`, `3`. Nếu đếm lời gọi `Schema::create(` thay vì unique table name, expected là `65` do hai migration drop/recreate.

### 7.4 Backend artifacts

```bash
git ls-files | rg '^backend_laravel/app/Http/Controllers/.*\.php$' | wc -l
git ls-files | rg '^backend_laravel/app/Models/.*\.php$' | wc -l
git ls-files | rg '^backend_laravel/app/Services/.*\.php$' | wc -l
git ls-files | rg '^backend_laravel/app/Http/Requests/.*\.php$' | wc -l
git ls-files | rg '^backend_laravel/app/Http/Resources/.*\.php$' | wc -l
git ls-files | rg '^backend_laravel/tests/.*\.php$' | wc -l
```

Expected lần lượt: `51`, `43`, `14`, `14`, `14`, `18`.

### 7.5 Frontend artifacts

```bash
git ls-files | rg '^frontend_react/src/pages/.*\.(jsx|tsx|js|ts)$' | wc -l
git ls-files | rg '^frontend_react/src/components/.*\.(jsx|tsx|js|ts)$' | wc -l
git ls-files | rg '^frontend_react/src/services/.*\.(jsx|tsx|js|ts)$' | wc -l
```

Expected lần lượt: `62`, `60`, `31`.

## 8. Cross-document map

| Tài liệu | Vai trò | Nguồn evidence chính |
| --- | --- | --- |
| [01-executive-domain-analysis.md](./01-executive-domain-analysis.md) | Executive summary, domain, actor, module/menu/function inventory. | Route groups, middleware role, controllers, React router/sidebar/pages. |
| [02-module-analysis.md](./02-module-analysis.md) | Phân tích từng module: input/output/flow/database/business rule. | Route → controller/request/service → model/migration → frontend/test. |
| [03-business-rules-brd.md](./03-business-rules-brd.md) | Business rules và BRD reverse-engineered. | Method/validation/state/query cụ thể; không dùng source thiếu evidence. |
| [04-srs.md](./04-srs.md) | Functional/NFR requirements có truy vết. | 25 FR, NFR có evidence, test traceability. |
| [05-use-cases.md](./05-use-cases.md) | Use case theo actor/module. | Trigger/precondition/flow/exception từ controller/service và UI route. |
| [06-process-and-state-diagrams.md](./06-process-and-state-diagrams.md) | Sequence/activity/state diagrams. | Chuyển trạng thái và transaction/lock trong controller/service/migration. |
| [07-database-erd.md](./07-database-erd.md) | ERD, FK, unique, index, cardinality và rollback/backfill. | 80 migration `.php` tại baseline, 83 tại snapshot hậu sửa; model chỉ dùng bổ trợ quan hệ ORM. |
| [08-api-specification.md](./08-api-specification.md) | API method/path/request/validation/auth/response catalog. | `route:list`, `routes/api.php`, Form Requests, controllers/resources/tests. |
| [09-permission-crud-matrices.md](./09-permission-crud-matrices.md) | Permission matrix và CRUD matrix. | Middleware/ownership/assignment checks và route/controller mutations. |
| `source-evidence-index.md` | Baseline, source catalog, commands tái kiểm và quy ước trích nguồn. | `git ls-files`, syntax scan, artifact/route/schema counts. |

Nếu tài liệu dẫn kết luận khác source tại commit baseline, source ở commit baseline được ưu tiên; khác biệt phải được ghi là điểm chưa xác minh, không tự hòa giải bằng giả định.

## 9. Chuẩn Source Code Reference

Mỗi kết luận chức năng hoặc business rule nên có block theo thứ tự sau, chỉ điền thành phần có evidence:

```markdown
### Source Code Reference

- File: `backend_laravel/...` hoặc `frontend_react/...`
- Class/Component: tên class PHP hoặc component/hook React
- Method/Function: method/function trực tiếp tạo hành vi
- Route: `METHOD /api/...` hoặc React path nếu có
- Model: model được đọc/ghi nếu có
- Migration: migration định nghĩa bảng/cột/FK/index/unique nếu có
- Test: test trực tiếp xác nhận nhánh nếu có
- Baseline: `d9ddfd25c02d94ebfd1cd12ce42341cfbeaa6219`
```

Quy tắc áp dụng:

1. Dùng đường dẫn tương đối repository đầy đủ, không chỉ ghi basename khi có file trùng tên như ba `TourReviewController` hoặc hai `GuideReviewController`.
2. Route phải gồm HTTP method và URI; route name hoặc tên controller không thay thế URI.
3. Database constraint lấy migration làm nguồn chính; model/property không thay thế bằng chứng FK/index/unique.
4. Frontend page/component tồn tại chưa chứng minh được route hoặc API call; phải đối chiếu `AppRoutes.jsx` và service/import/call site.
5. Seeder/factory chỉ là dữ liệu mẫu/test fixture, không tự tạo business rule.
6. Config queue/jobs table/queue listener không chứng minh có job nghiệp vụ; phải có Job class hoặc dispatch call.
7. Nếu kết luận ghép từ nhiều đoạn source nhưng không có tuyên bố trực tiếp, gắn nhãn **[Suy luận từ source code]**.
8. Nếu scan không có evidence, ghi **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** và kèm directory/symbol/route đã kiểm tra.
9. Line number có thể dùng để định vị tại commit baseline, nhưng không thay thế File/Class/Method vì line sẽ thay đổi sau edit.

## 10. Kiểm tra tính toàn vẹn của catalog

Catalog phải được đối chiếu hai chiều:

- Mọi path liệt kê trong code block bắt đầu bằng `backend_laravel/` hoặc `frontend_react/` phải tồn tại.
- Danh sách controllers/models/services/requests/resources/migrations/seeders/factories/tests/pages/components/services phải bằng đúng tập tương ứng từ `git ls-files`, không chỉ bằng count.
- Markdown code fences phải đóng đủ; không có trailing whitespace; `git diff --check` phải sạch.
- Các file `docs/` sinh mới không được cộng vào 518 tracked files của commit baseline.

Lệnh kiểm path tối thiểu:

```bash
rg -o '^(backend_laravel|frontend_react)/[^[:space:]]+$' \
  docs/reverse-engineering/source-evidence-index.md \
  | while IFS= read -r source_path; do
      test -e "$source_path" || echo "MISSING $source_path"
    done
```
