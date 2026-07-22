# Xác minh hậu sửa Business Model — 2026-07-22

## Phạm vi và baseline

- Nhánh làm việc: `fix/business-model-audit-bugs`.
- Snapshot được xác minh: working tree kế thừa commit tài liệu `044d8cd59083e5f7ca5a1a202b0fdc581be47bc5`. Các thay đổi hậu sửa chưa có commit riêng tại thời điểm lập tài liệu này.
- Phạm vi: 15 BUG đã đăng ký trong `08-bug-register.md`; không mở rộng sang các mục `UV-*` chưa có Business Rule được xác nhận.
- Route không thay đổi: `php artisan route:list --path=api --json` trả 238 API route.
- Database vẫn có 63 bảng; migration tăng từ 80 lên 83 và test PHP tăng từ 18 lên 22 file.

## Kết quả tổng hợp

| Phạm vi | Đúng | Sai | Thiếu | Tổng |
| --- | ---: | ---: | ---: | ---: |
| Business Rule `BR-001`–`BR-096` | 96 | 0 | 0 | 96 |
| Supplemental Requirement `SR-001`–`SR-013` | 13 | 0 | 0 | 13 |
| **Tổng** | **109** | **0** | **0** | **109** |

Kết quả trên là kết luận đối chiếu source hậu sửa. Lịch sử diagnosis của 15 BUG vẫn được giữ nguyên trong bug register; disposition hiện tại của cả 15 BUG là **Resolved** theo source và test mục tiêu.

## Ma trận BUG → source fix → bằng chứng

| BUG | Source fix | Database/Transaction/Lock | Bằng chứng tự động | Disposition |
| --- | --- | --- | --- | --- |
| BUG-AB-001 | `StoreBookingRequest::rules()`, `CustomerBookingController::store()` | Migration `2026_07_22_010000_make_booking_contact_email_nullable.php`; rollback đổi `NULL` thành `''` trước khi khôi phục `NOT NULL` | `AuthBookingBusinessModelRegressionTest.php`: bỏ email vẫn tạo booking và lưu `NULL`; kiểm rollback | Resolved |
| BUG-AB-002 | `AuthController::register()`, `CustomerController::updateProfile()`, `StoreBookingRequest::rules()` | Validation được giới hạn theo độ dài cột users/contact/participant; request sai dừng trước insert/update | `AuthBookingBusinessModelRegressionTest.php`: ma trận biên và biên +1 | Resolved |
| BUG-AB-003 | `CustomerBookingController::store()` | `bookings.total_amount` và `payments.amount` lấy từ tổng `pricedParticipants.unit_price` trong transaction tạo booking | `AuthBookingBusinessModelRegressionTest.php`: client chọn nhóm miễn phí nhưng DOB người lớn vẫn tính và lưu giá người lớn | Resolved |
| BUG-AB-004 | `PaymentController::updateStatus()` | Khóa payment bằng `lockForUpdate()`; chỉ cho `pending→success|failed`, `failed→success`, `success→refunded`; cạnh khác trả `422` | `AuthBookingBusinessModelRegressionTest.php` và `PaymentBookingSafetyTest.php`: ma trận hợp lệ/không hợp lệ | Resolved |
| BUG-RG-001 | `GuideLeaveRequestController::store()` | Transaction khóa guide, sau đó tái kiểm tra leave giao nhau bằng locking read | `GuideBusinessModelRegressionTest.php`; `BusinessModelConcurrencyMysqlTest.php`: hai process nhận `201 + 422`, một leave active | Resolved |
| BUG-RG-002 | `GuideLeaveRequestController::cancel()`, `AdminGuideLeaveRequestController::updateStatus()` | Cả hai flow khóa cùng leave row và tái kiểm tra state trong transaction | Hai test nêu trên: stale model bị từ chối; cancel-vs-approve MySQL nhận `200 + 422` | Resolved |
| BUG-RG-003 | `GuideTourController::requestReplacement()` | Transaction khóa departure và assignment, rồi tái kiểm tra pending; evidence file được bù trừ khi transaction không tạo request | Hai test nêu trên: hai process nhận `201 + 409`, đúng một pending | Resolved |
| BUG-RG-004 | `AdminGuideReplacementRequestController::approve()`, `reject()` | Hai action cùng khóa departure rồi request; chỉ xử lý state `pending`; assignment/request/notification nằm trong transaction | Hai test nêu trên: approve-vs-reject MySQL nhận `200 + 409`, assignment khớp state thắng | Resolved |
| BUG-SA-001 | `SupportNotificationController::sendNotification()` | Giá trị insert đổi thành enum hợp lệ `support`; batch vẫn ở trong transaction | `BusinessModelAuditBugFixTest.php`: mỗi admin nhận một notification `support`, `unread`, đúng metadata | Resolved |
| BUG-SA-002 | `WidgetController` giữ contract HTML; schema được đồng bộ | Migration `2026_07_22_000000_make_banner_image_url_nullable.php`; rollback đổi `NULL` thành `''` | `BusinessModelAuditBugFixTest.php`: tạo HTML widget không ảnh và rollback giữ row | Resolved |
| BUG-SA-003 | `Admin\BookingController::update()`, `softDelete()` | Khóa booking; `cancelled` là terminal; chỉ transition hủy đầu tiên hoàn slot | `BusinessModelAuditBugFixTest.php`; `BusinessModelConcurrencyMysqlTest.php`: hai process hủy cùng booking chỉ giảm slot một lần | Resolved |
| BUG-SA-004 | `Admin\NotificationController::sendNotification()` | Khóa draft rồi tái kiểm tra `status=draft` trước bulk insert | Hai test nêu trên: gửi lặp tuần tự và hai process MySQL chỉ tạo một row/recipient, response `200 + 404` | Resolved |
| BUG-XD-001 | `TourDepartureGuideAssignmentController::{candidates,autoAssign,assign,cancel,directCandidates,directAssign}`, `GuideAssignmentService::{autoAssign,assignSpecific}` | Gọi `TourDepartureMutationGuard`; write flow kiểm tra lại sau khi khóa departure | `GuideBusinessModelRegressionTest.php`: cả sáu API trả `422` với ngày khởi hành `<= hôm nay`; future cancel vẫn hoạt động | Resolved |
| BUG-XD-002 | `GuideProfileController::update()`, `Guide::$fillable` | Migration `2026_07_22_000000_restore_certificate_type_to_guides_table.php` khôi phục `VARCHAR(100) NULL` | `GuideBusinessModelRegressionTest.php`: PUT/GET round-trip 100 ký tự, 101 ký tự trả `422` | Resolved |
| BUG-XD-003 | `AdminProfileController::update()` | Nhận `avatar` image JPG/JPEG/PNG/WebP tối đa 5.120 KB; giữ `avatar_url`; gửi cả hai trả `422`; file lưu disk `public/avatars` | `BusinessModelAuditBugFixTest.php`: upload, mutual exclusion và giới hạn dung lượng | Resolved |

## Kết quả chạy kiểm thử

| Lệnh/phạm vi | Kết quả |
| --- | --- |
| Test mục tiêu trên SQLite | 72 passed, 353 assertions; 6 MySQL-only concurrency tests skipped |
| Test mục tiêu trên MySQL 8.4 | 72 passed, 353 assertions |
| Concurrency đa tiến trình trên MySQL 8.4 | 6 passed, 15 assertions |
| Toàn bộ Pest trên SQLite | 139 passed, 1 failed, 6 skipped, 703 assertions |
| Migration MySQL | `migrate:fresh` 83/83 thành công; rollback đúng 3 migration mới thành công; migrate lại thành công |
| PHP syntax | Tất cả 25 file PHP thay đổi/tạo mới không có lỗi cú pháp |
| `git diff --check` | Thành công |
| Frontend build | Vite 8 build thành công với Node 26; có cảnh báo chunk lớn hiện hữu |
| Frontend lint | Không đạt: 55 error, 5 warning trong frontend hiện hữu; phạm vi hậu sửa không thay đổi frontend |

Full Pest chưa xanh hoàn toàn vì `database/seeders/ServiceCategorySeeder.php:28` còn conflict marker `<<<<<<<`, được ghi nhận từ baseline tại `UV-018` và nằm ngoài 15 BUG đã xác nhận để sửa. Sáu test concurrency bị skip trên SQLite theo chủ đích vì SQLite không thực thi row lock như MySQL; cùng sáu test đã chạy và đạt trên MySQL.

Pest còn phát cảnh báo không ghi được result cache dưới `vendor/pestphp/pest/.temp` khi container chạy theo UID workspace. Cảnh báo này không làm thay đổi kết quả assertion.

## Source Code Reference

- Controllers: `AuthController`, `CustomerController`, `CustomerBookingController`, `PaymentController`, `GuideLeaveRequestController`, `AdminGuideLeaveRequestController`, `GuideTourController`, `AdminGuideReplacementRequestController`, `TourDepartureGuideAssignmentController`, `SupportNotificationController`, `NotificationController`, `BookingController`, `AdminProfileController`, `GuideProfileController`.
- Service: `GuideAssignmentService`, `TourDepartureMutationGuard`.
- Model: `Guide`, `Booking`, `Payment`, `GuideLeaveRequest`, `TourGuideAssignment`, `NotificationDraft`, `Notification`, `Banner`.
- Migration: ba migration ngày `2026_07_22` nêu trong bảng.
- Tests: `AuthBookingBusinessModelRegressionTest.php`, `BusinessModelAuditBugFixTest.php`, `GuideBusinessModelRegressionTest.php`, `BusinessModelConcurrencyMysqlTest.php`, `PaymentBookingSafetyTest.php`.

