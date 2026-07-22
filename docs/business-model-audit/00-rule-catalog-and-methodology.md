# Danh mục yêu cầu chuẩn hóa và phương pháp Audit Business Model

## 1. Baseline và nguyên tắc khử trùng lặp

- Baseline audit lịch sử: commit `d9ddfd25c02d94ebfd1cd12ce42341cfbeaa6219`. Snapshot hậu sửa ngày 2026-07-22 là working tree nhánh `fix/business-model-audit-bugs`, kế thừa commit tài liệu `044d8cd59083e5f7ca5a1a202b0fdc581be47bc5`; xem `11-post-fix-verification.md`.
- Bộ tài liệu đầu vào gồm đủ 12 file trong `docs/reverse-engineering`: `README.md`, `01-executive-domain-analysis.md`, `02-module-analysis.md`, `03-business-rules-brd.md`, `04-srs.md`, `05-use-cases.md`, `06-process-and-state-diagrams.md`, `07-database-erd.md`, `08-api-specification.md`, `09-permission-crud-matrices.md`, `10-unverified-findings.md`, `source-evidence-index.md`.
- `BR-001`–`BR-096` là yêu cầu chuẩn gốc. Một FR, UC, process, diagram, API hoặc dòng ma trận diễn đạt lại cùng hành vi được ánh xạ về BR tương ứng, không sinh thêm rule.
- Chỉ tạo `SR-###` khi tài liệu có một mệnh đề chức năng/NFR trực tiếp, source có hành vi tương ứng, nhưng nội dung đó chưa được câu chữ của `BR-001`–`BR-096` bao phủ.
- `UV-001`–`UV-045` là câu hỏi, bất nhất hoặc khoảng trống bằng chứng. Chúng không được chuyển thành BR/SR.
- Khoảng trống frontend mà tài liệu đã ghi đúng hiện trạng không phải là yêu cầu triển khai và không phải BUG.
- Route baseline: `php artisan route:list --except-vendor --json` trả **239 route**, gồm route web `#1` và 238 route API `#2`–`#239` theo `08-api-specification.md`.

## 2. Danh mục canonical

### 2.1. Business Rule gốc

| Nhóm canonical | ID được giữ nguyên | File audit chi tiết |
|---|---|---|
| Xác thực, catalog, tour, departure | `BR-001`–`BR-020` | `docs/business-model-audit/modules/01-auth-catalog.md` |
| Booking, pricing, VNPAY | `BR-021`–`BR-034` | `docs/business-model-audit/modules/02-booking-payment.md` |
| Review và mở đầu assignment | `BR-035`–`BR-053` | `docs/business-model-audit/modules/03-reviews.md` |
| Assignment, vận hành guide, leave/replacement | `BR-054`–`BR-073` | `docs/business-model-audit/modules/04-guide-operations.md` |
| Support và notification | `BR-074`–`BR-084` | `docs/business-model-audit/modules/05-support-notifications.md` |
| Backup, chatbot, báo cáo và CRUD quản trị | `BR-085`–`BR-096` | `docs/business-model-audit/modules/06-admin-platform.md` |

Sáu khoảng trên liên tục, không chồng lấn và chứa đúng 96 ID. Mỗi `BR-###` ánh xạ một-một về chính nó trong `docs/reverse-engineering/03-business-rules-brd.md`.

### 2.2. Supplemental Requirement

| ID | Mệnh đề chuẩn hóa không trùng BR | Document ID nguồn |
|---|---|---|
| SR-001 | Public lấy danh sách, tìm kiếm, lọc, sắp xếp, phân trang tour `published` và xem chi tiết tour `published` theo slug bằng API `/api/tours*`. | FR-002; UC-004; API #12–#15; CRUD module 2 |
| SR-002 | User có Sanctum token đọc phiên hiện tại; `/api/auth/me` dùng cho mọi user xác thực, còn `/api/user` giới hạn role customer. | FR-001; UC-002; API #22, #27; Permission §2.1–§2.2 |
| SR-003 | Customer đọc summary của chính mình gồm thông tin hồ sơ, `bookings_count` và `wishlist_count`. | FR-001; UC-010; API #28 |
| SR-004 | Customer xem, thêm và bỏ tour trong wishlist; thêm lặp cùng cặp user-tour không tạo pivot trùng. | FR-003; UC-012; API #44–#46; CRUD module 3 |
| SR-005 | Admin xem/cập nhật hồ sơ của chính mình và đổi mật khẩu sau khi xác minh mật khẩu hiện tại; UC-019 còn yêu cầu validate/upload avatar vào public storage. | FR-001; UC-019; API #183–#185 |
| SR-006 | Tour guide xem/cập nhật hồ sơ liên kết của chính mình, gồm các field guide được API chấp nhận, và đổi mật khẩu sau khi xác minh mật khẩu cũ. | FR-001, FR-017; UC-043; API #59, #65–#66 |
| SR-007 | Support staff xem/cập nhật đồng bộ user và support profile của chính mình, đồng thời đổi mật khẩu sau khi xác minh mật khẩu cũ. | FR-001, FR-021; UC-051; API #47–#49 |
| SR-008 | Tour guide đọc dashboard tổng hợp assignment, tour, khách paid, thu nhập và review; thiếu Guide profile vẫn nhận payload rỗng có cấu trúc với HTTP 200. | FR-019; UC-044; API #60 |
| SR-009 | Admin xem danh sách booking/khách theo một departure, hỗ trợ search, status, payment status và phân trang. | FR-016; UC-026; API #216 |
| SR-010 | Route khai báo các giới hạn riêng: register 5/phút, login 6/phút, forgot-password 5/phút, chatbot 20/phút, tour-review customer 10/phút và VNPAY return/IPN 60/phút; `/api/travel-assistant` không có throttle route riêng. | NFR-003; API #2, #3, #6, #7, #17–#19, #41–#42 |
| SR-011 | Tour guide liệt kê tour được phân công theo all/upcoming/ongoing/completed, lọc/sắp xếp/phân trang và chỉ xem chi tiết departure thuộc assignment không cancelled của mình. | FR-019; UC-045; API #69–#73 |
| SR-012 | Customer chỉ đọc trạng thái payment VNPAY gắn với booking thuộc chính mình; payment khác loại hoặc không sở hữu trả 404. | FR-005; UC-015; API #36 |
| SR-013 | Feed notification theo role chỉ đọc/đổi read-state bản ghi thuộc user hiện tại: admin bell hỗ trợ list/count/read-one/read-all; support inbox hỗ trợ list/count/detail/read-one. | FR-010; UC-038, UC-053; API #54, #56–#58, #161–#164 |

Phân tích source và test cho `SR-001`–`SR-013` nằm tại `modules/07-cross-document-requirements.md` và `test-cases/07-supplemental-test-cases.md`.

## 3. Ánh xạ Document ID → BR/SR

### 3.1. BRD Business Process và quy trình

| Document ID | Canonical ID |
|---|---|
| BP-01 | BR-001–BR-003 |
| BP-02 | BR-021–BR-033; SR-012 |
| BP-03 | BR-035–BR-052 |
| BP-04 | BR-017–BR-020; BR-053–BR-061; SR-009 |
| BP-05 | BR-062–BR-067; SR-008; SR-011 |
| BP-06 | BR-068–BR-073 |
| BP-07 | BR-074–BR-080; BR-084 |
| BP-08 | BR-081–BR-089; SR-013 |
| QTN-01 | BR-001–BR-008; SR-002–SR-007 |
| QTN-02 | BR-009–BR-020; BR-023–BR-024; SR-001; SR-009 |
| QTN-03 | BR-021–BR-034; SR-012 |
| QTN-04 | BR-035–BR-052 |
| QTN-05 | BR-053–BR-067; SR-008; SR-011 |
| QTN-06 | BR-068–BR-073 |
| QTN-07 | BR-074–BR-080; BR-084 |
| QTN-08 | BR-081–BR-089; SR-013 |

### 3.2. Functional Requirement

| Document ID | Canonical ID |
|---|---|
| FR-001 | BR-001–BR-007; SR-002–SR-007 |
| FR-002 | BR-009–BR-012; BR-023; BR-095; SR-001 |
| FR-003 | SR-004 |
| FR-004 | BR-021–BR-028; BR-035–BR-036; BR-096 |
| FR-005 | BR-026–BR-034; SR-012 |
| FR-006 | BR-035–BR-045; BR-052 |
| FR-007 | BR-035; BR-046–BR-052 |
| FR-008 | BR-074–BR-079 |
| FR-009 | BR-087–BR-089 |
| FR-010 | BR-051; BR-080–BR-084; SR-013 |
| FR-011 | BR-090 |
| FR-012 | BR-008; BR-091 |
| FR-013 | BR-093 |
| FR-014 | BR-093 |
| FR-015 | BR-013–BR-016; BR-023–BR-024 |
| FR-016 | BR-017–BR-020; BR-023; SR-009 |
| FR-017 | BR-092; SR-006 |
| FR-018 | BR-053–BR-061; BR-072–BR-073 |
| FR-019 | BR-050; BR-062–BR-067; SR-008; SR-011 |
| FR-020 | BR-068–BR-071 |
| FR-021 | BR-078–BR-080; BR-084; BR-092; SR-007; SR-013 |
| FR-022 | BR-094 |
| FR-023 | BR-012; BR-095 |
| FR-024 | BR-085–BR-086 |
| FR-025 | BR-093 |

### 3.3. Non-Functional Requirement

| Document ID | Canonical ID / cách xử lý |
|---|---|
| NFR-001 | BR-001–BR-004; BR-006 |
| NFR-002 | BR-004; BR-027–BR-028; BR-037; BR-040; BR-046–BR-047; BR-062; BR-070; BR-072; BR-080; SR-002–SR-007; SR-009; SR-011–SR-013 |
| NFR-003 | BR-038 đối với tour review; SR-010 đối với toàn bộ declaration route |
| NFR-004 | Các BR có transaction: BR-014, BR-019, BR-025, BR-028, BR-030–BR-034, BR-037, BR-040–BR-041, BR-048–BR-049, BR-056, BR-060–BR-061, BR-064–BR-067, BR-069, BR-073, BR-075–BR-077, BR-082, BR-084, BR-096; SR-006 có transaction cập nhật profile guide |
| NFR-005 | Các BR có `lockForUpdate`: BR-025, BR-028, BR-030–BR-033, BR-037, BR-040–BR-041, BR-056, BR-060–BR-061, BR-064–BR-073, BR-082, BR-096 |
| NFR-006 | BR-045; BR-076; SR-006. Các rollback transaction khác đi cùng NFR-004 |
| NFR-007 | BR-089. Phần “không có logging thống nhất” là giới hạn bằng chứng, không sinh SR |
| NFR-008 | BR-086. Phần “không có cache catalog/report” là giới hạn bằng chứng, không sinh SR |
| NFR-009 | BR-033; BR-051; BR-086 |
| NFR-010 | Chỉ mô tả queue config; Job/dispatch thực tế: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; không sinh SR |
| NFR-011 | BR-005; BR-068; BR-072; BR-074–BR-076; BR-085; SR-006 |
| NFR-012 | BR-042; BR-050; BR-079–BR-080; BR-085; BR-087–BR-090; SR-001; SR-004; SR-008–SR-011; SR-013 |
| NFR-013 | BR-025; BR-041; BR-044; BR-051; BR-060; BR-069–BR-073; BR-075–BR-084. Phần “không có audit toàn hệ thống” không sinh SR |

### 3.4. Use Case

| Document ID | Canonical ID | Document ID | Canonical ID |
|---|---|---|---|
| UC-001 | BR-001 | UC-028 | BR-034 |
| UC-002 | BR-002–BR-004; SR-002 | UC-029 | BR-092 |
| UC-003 | BR-007 | UC-030 | BR-053–BR-061 |
| UC-004 | BR-009–BR-010; BR-012; BR-023; SR-001 | UC-031 | BR-072–BR-073 |
| UC-005 | BR-042–BR-043 | UC-032 | BR-068–BR-071 |
| UC-006 | BR-012; BR-095 | UC-033 | BR-092 |
| UC-007 | BR-087–BR-089 | UC-034 | BR-094 |
| UC-008 | BR-029–BR-033 | UC-035 | BR-094 |
| UC-009 | BR-080 | UC-036 | BR-044 |
| UC-010 | BR-005–BR-006; SR-003 | UC-037 | BR-081–BR-083 |
| UC-011 | BR-035–BR-036 | UC-038 | SR-013 |
| UC-012 | SR-004 | UC-039 | BR-095 |
| UC-013 | BR-021–BR-026 | UC-040 | BR-012; BR-095 |
| UC-014 | BR-027–BR-028 | UC-041 | BR-085–BR-086 |
| UC-015 | SR-012 | UC-042 | BR-093 |
| UC-016 | BR-035–BR-045 | UC-043 | SR-006 |
| UC-017 | BR-035; BR-046–BR-052 | UC-044 | SR-008 |
| UC-018 | BR-074–BR-077 | UC-045 | BR-062–BR-063; SR-011 |
| UC-019 | SR-005 | UC-046 | BR-064–BR-066 |
| UC-020 | BR-090 | UC-047 | BR-067 |
| UC-021 | BR-008; BR-091 | UC-048 | BR-072 |
| UC-022 | BR-093 | UC-049 | BR-068–BR-070 |
| UC-023 | BR-093 | UC-050 | BR-049–BR-050 |
| UC-024 | BR-013–BR-016; BR-023–BR-024 | UC-051 | SR-007 |
| UC-025 | BR-017–BR-020 | UC-052 | BR-078–BR-079 |
| UC-026 | SR-009 | UC-053 | BR-080; BR-084; SR-013 |
| UC-027 | BR-096 | — | — |

### 3.5. State Machine, Sequence và Activity Diagram

| Diagram ID | Canonical ID |
|---|---|
| SM-01 Tour review | BR-039–BR-045 |
| SM-02 Booking/VNPAY | BR-025–BR-034 |
| SM-03 Support request | BR-075; BR-078–BR-079 |
| SM-04 Guide leave | BR-068–BR-071 |
| SM-05 Guide replacement | BR-072–BR-073 |
| SM-06 Attendance | BR-064–BR-066 |
| SM-07 Tour stage | BR-067 |
| SM-08 Guide assignment | BR-056–BR-061 |
| SM-09 Notification campaign | BR-081–BR-083 |
| SM-10 Tour hide/unhide | BR-016 |
| §2.11 Enum chưa đủ vòng đời | Không phải requirement; giữ là giới hạn xác minh |

| Diagram ID | Canonical ID | Diagram ID | Canonical ID |
|---|---|---|---|
| SEQ-01 Auth | BR-001–BR-003 | ACT-01 Auth | BR-001–BR-003 |
| SEQ-02 Booking/VNPAY | BR-021–BR-033 | ACT-02 Booking/VNPAY | BR-021–BR-033 |
| SEQ-03 Tour review | BR-035–BR-045 | ACT-03 Tour review | BR-035–BR-045 |
| SEQ-04 Guide review | BR-046–BR-052 | ACT-04 Guide review | BR-046–BR-052 |
| SEQ-05 Departure update | BR-018–BR-020 | ACT-05 Departure mutation | BR-018–BR-020 |
| SEQ-06 Assignment | BR-053–BR-061 | ACT-06 Assignment | BR-053–BR-061 |
| SEQ-07 Attendance/stage | BR-062–BR-067 | ACT-07 Attendance/stage | BR-062–BR-067 |
| SEQ-08 Support | BR-074–BR-079 | ACT-08 Support | BR-074–BR-079 |
| SEQ-09 Guide leave | BR-068–BR-071 | ACT-09 Guide leave | BR-068–BR-071 |
| SEQ-10 Replacement | BR-072–BR-073 | ACT-10 Replacement | BR-072–BR-073 |
| SEQ-11 Notification campaign | BR-081–BR-083 | ACT-11 Notification campaign | BR-081–BR-083 |
| SEQ-12 Chatbot | BR-087–BR-089 | ACT-12 Chatbot | BR-087–BR-089 |
| SEQ-13 Backup | BR-085–BR-086 | ACT-13 Backup | BR-085–BR-086 |

### 3.6. ERD

| ERD section | Canonical ID |
|---|---|
| ERD-01 Xác thực và hạ tầng | BR-001–BR-008; SR-002–SR-007 |
| ERD-02 Catalog và thiết kế tour | BR-009–BR-020; BR-023–BR-024; SR-001; SR-004 |
| ERD-03 Booking, promotion, payment | BR-021–BR-034; BR-096; SR-009; SR-012 |
| ERD-04 Đánh giá | BR-035–BR-052 |
| ERD-05 Guide và vận hành | BR-053–BR-073; SR-006; SR-008; SR-011 |
| ERD-06 Nội dung, notification, support, chat | BR-074–BR-084; BR-087–BR-089; SR-013 |
| ERD-07 Cấu hình, partner, support staff | BR-085–BR-086; BR-092–BR-095; SR-007 |

ERD là bằng chứng schema, FK, unique và index theo migration. Các bảng partner/promotion/refund/system log chỉ có schema nhưng không có flow nghiệp vụ được xác minh không sinh thêm SR.

### 3.7. API Specification — đủ #1–#239

| API # | Canonical ID |
|---|---|
| #1 | Route welcome web; không phải business requirement |
| #2 | BR-001; SR-010 |
| #3 | BR-002–BR-003; SR-010 |
| #4–#5 | BR-010 |
| #6 | BR-087–BR-089; SR-010 |
| #7 | BR-007; SR-010 |
| #8 | BR-009–BR-011 |
| #9 | BR-007 |
| #10 | BR-008 |
| #11 | BR-095 |
| #12–#15 | BR-023; SR-001 |
| #16 | BR-042–BR-043 |
| #17 | BR-087–BR-089; SR-010 ghi nhận không có throttle riêng |
| #18–#19 | BR-029–BR-033; SR-010 |
| #20 | BR-012 |
| #21 | BR-003 |
| #22 | SR-002 |
| #23–#26 | BR-051; BR-080 |
| #27 | SR-002 |
| #28 | SR-003 |
| #29 | BR-035–BR-036 |
| #30–#31 | BR-005–BR-006 |
| #32–#35 | BR-021–BR-028 |
| #36 | SR-012 |
| #37–#40 | BR-046–BR-050 |
| #41–#42 | BR-035–BR-045; SR-010 |
| #43 | BR-074–BR-077 |
| #44–#46 | SR-004 |
| #47–#49 | SR-007 |
| #50–#53 | BR-078–BR-079 |
| #54, #56–#58 | BR-080; SR-013 |
| #55 | BR-084 |
| #59, #65–#66 | SR-006 |
| #60 | SR-008 |
| #61–#64 | BR-068–BR-070 |
| #67–#68 | BR-050 |
| #69–#73 | BR-050; BR-062; SR-011 |
| #74–#82 | BR-062–BR-066; SR-011 |
| #83–#84 | BR-072 |
| #85–#86 | BR-062; BR-067 |
| #87–#90 | BR-085–BR-086 |
| #91–#97 | BR-023–BR-024; BR-096 |
| #98–#104 | BR-093 |
| #105–#109 | BR-094 |
| #110–#118 | BR-008; BR-091 |
| #119–#127 | BR-093 |
| #128–#132 | BR-068–BR-071 |
| #133–#135 | BR-072–BR-073 |
| #136 | BR-053; BR-092 |
| #137–#151 | BR-092 |
| #152–#160 | BR-094 |
| #161–#164 | SR-013 |
| #165–#177 | BR-081–BR-083 |
| #178–#182 | BR-034 |
| #183–#185 | SR-005 |
| #186–#187 | BR-090 |
| #188 | BR-008 |
| #189–#193 | BR-093 |
| #194–#196 | BR-095 |
| #197–#208 | BR-092 |
| #209–#215 | BR-053–BR-061 |
| #216 | SR-009 |
| #217–#219 | BR-041; BR-044 |
| #220–#233 | BR-013–BR-020; BR-023–BR-024 |
| #234–#239 | BR-012; BR-095 |

### 3.8. Permission Matrix và CRUD Matrix

| Document section/module | Canonical ID |
|---|---|
| Permission §2.1 Public/auth/shared | BR-001–BR-012; BR-029–BR-033; BR-080; BR-087–BR-089; BR-095; SR-001–SR-002; SR-010 |
| Permission §2.2 Customer | BR-005–BR-007; BR-021–BR-052; BR-074–BR-077; SR-002–SR-004; SR-012 |
| Permission §2.3 Admin | BR-008; BR-013–BR-020; BR-034; BR-044; BR-053–BR-061; BR-068–BR-073; BR-081–BR-086; BR-090–BR-096; SR-005; SR-009; SR-013 |
| Permission §2.4 Tour guide | BR-049–BR-050; BR-062–BR-073; SR-006; SR-008; SR-011 |
| Permission §2.5 Support staff | BR-078–BR-080; BR-084; SR-007; SR-013 |
| Frontend Guard Matrix §3 | BR-004 và các SR theo actor; guard frontend không thay backend authorization |
| CRUD module 1 Authentication/profile | BR-001–BR-008; SR-002–SR-003; SR-005–SR-007 |
| CRUD module 2 Public catalog | BR-009–BR-012; BR-023; SR-001 |
| CRUD module 3 Wishlist | SR-004 |
| CRUD module 4–5 Booking/VNPAY | BR-021–BR-034; BR-036; BR-096; SR-012 |
| CRUD module 6–7 Review | BR-035–BR-052 |
| CRUD module 8–10 Support/chat/notification | BR-074–BR-084; BR-087–BR-089; SR-013 |
| CRUD module 11 Dashboard/report | BR-090; SR-003; SR-008 |
| CRUD module 12–16 User/catalog/departure | BR-008; BR-013–BR-020; BR-091; BR-093; SR-009 |
| CRUD module 17–20 Guide/assignment/attendance/leave | BR-053–BR-073; BR-092; SR-006; SR-008; SR-011 |
| CRUD module 21–25 Support/language/settings/backup/service category | BR-080; BR-084–BR-086; BR-092–BR-095; SR-007; SR-013 |

### 3.9. Unverified Finding

| Document ID | Xử lý trong catalog |
|---|---|
| UV-001–UV-003 | Bằng chứng để trả lời các câu hỏi nghiệp vụ: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; không sinh requirement |
| UV-004–UV-017 | Bằng chứng xác minh các flow/capability được hỏi: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; không sinh requirement |
| UV-018–UV-030 | Bất nhất source/schema hoặc câu hỏi tính toàn vẹn; audit module chỉ lập BUG khi có yêu cầu tài liệu trực tiếp bị source vi phạm |
| UV-031–UV-040 | Khoảng trống frontend/API/phân quyền đã được tài liệu mô tả; không sinh requirement và không tự động trở thành BUG |
| UV-041–UV-045 | Thiếu bằng chứng audit/test/runtime/NFR; không sinh requirement |

## 4. Bất nhất tham chiếu chéo trong tài liệu

1. `03-business-rules-brd.md` §9.3 dẫn payment admin tới `BR-088–BR-089`; hai BR này là chatbot. Nguồn đúng của payment admin là `BR-034`, `Admin\PaymentController::{confirm,fail,refund,updateStatus}`.
2. Cùng §9.3 dẫn leave tới `BR-061–BR-071`; nhóm leave thực tế là `BR-068–BR-071`. `BR-061` là xóa assignment, `BR-062`–`BR-067` là vận hành guide.
3. FR-005 Exception Flow yêu cầu từ chối payment transition không hợp lệ. Sai lệch lịch sử được lập `BUG-AB-004`; source hậu sửa đã triển khai ma trận tại `Admin\PaymentController::updateStatus()` và được xác minh trong `11-post-fix-verification.md`.
4. UC-037 ghi revoke notification campaign có transaction; BR-083, NFR-004 và `Admin\NotificationController::revoke()` xác nhận flow này không có transaction. Đây là bất nhất nội bộ tài liệu, không phải BUG source mới.
5. FR-019 đặt Guide profile làm precondition toàn module; UC-044 và API #60 mô tả nhánh dashboard không có profile vẫn trả HTTP 200 với payload rỗng, đúng với `GuideDashboardController::show()`. Đây là bất nhất nội bộ tài liệu, không phải BUG source mới.
6. `BUG-XD-001` là sai lệch lịch sử giữa FR-018/UC-030/API #211 và assignment source. Source hậu sửa gọi `TourDepartureMutationGuard` ở sáu endpoint, đồng thời kiểm tra lại trong write transaction.
7. `BUG-XD-002` là sai lệch lịch sử của `certificate_type`. Source hậu sửa khôi phục cột `guides.certificate_type VARCHAR(100) NULL`, bổ sung `$fillable` và validation tương ứng.
8. `BUG-XD-003` là sai lệch lịch sử về avatar admin. `AdminProfileController::update()` hậu sửa nhận file ảnh tối đa 5.120 KB, ghi public storage, giữ input URL cũ và từ chối gửi đồng thời hai input.
9. Các mục frontend thiếu integration tại UV-031–UV-035 và các mô tả placeholder trong Module Analysis là mô tả đúng hiện trạng, không phải cam kết đã triển khai.

## 5. Rubric audit áp dụng cho từng BR/SR

| # | Trục kiểm tra | Bằng chứng bắt buộc |
|---:|---|---|
| 1 | File xử lý | Path tracked đầy đủ |
| 2 | Hàm xử lý | Class/component và method/function |
| 3 | Service/Action/Use Case/Domain Service/Repository | Tên class/method; nếu không dùng ghi `Không sử dụng` |
| 4 | Observer/Listener/Event | Tên artifact; nếu không dùng ghi `Không sử dụng` |
| 5 | Middleware/Policy/Gate | Route group, middleware và ownership/assignment check |
| 6 | Model/Migration | Model đọc/ghi và migration định nghĩa bảng/cột |
| 7 | Database mutation | Read/Insert/Update/Delete/Soft Delete/Restore/Pivot/History |
| 8 | Transaction | Vị trí `DB::transaction()`/begin/commit hoặc ghi không có |
| 9 | Rollback | Điều kiện rollback/bù trừ hoặc ghi không có |
| 10 | Locking | `lockForUpdate`, unique/conditional update hoặc ghi không có |
| 11 | Idempotency | Kết quả khi gọi lại và constraint hỗ trợ |
| 12 | Validation | Toàn bộ rule request/query/path có bằng chứng |
| 13 | Authorization | Actor được phép/bị chặn và vị trí kiểm tra |
| 14 | Audit log/history | Bảng/cột/service ghi actor/time/history hoặc ghi không có |
| 15 | Notification/API integration | Notification/email/SMS/webhook/external API có bằng chứng |
| 16 | Queue/Cache/Scheduler | Job/dispatch/cache/schedule thực tế hoặc ghi không sử dụng |
| 17 | Exception handling | Validation/authorization/not-found/try-catch/status response |
| 18 | Data integrity | Duplicate, lost update, dirty write, race, data loss, deadlock, partial update dựa trên code/schema |
| 19 | Kết luận | `Đúng`, `Sai` hoặc `Thiếu`; chỉ lập BUG khi tài liệu yêu cầu trực tiếp trái source |

Nếu một artifact hoặc cơ chế không có sau khi đã truy vết, dùng đúng câu: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.

## 6. Source Code Reference

- Route/baseline: `backend_laravel/routes/api.php`; `backend_laravel/routes/console.php`; `backend_laravel/bootstrap/app.php`; output `php artisan route:list --except-vendor --json`.
- Canonical BR: `docs/reverse-engineering/03-business-rules-brd.md`, mục 8.
- FR/NFR: `docs/reverse-engineering/04-srs.md`.
- UC: `docs/reverse-engineering/05-use-cases.md`.
- Diagram: `docs/reverse-engineering/06-process-and-state-diagrams.md`.
- ERD: `docs/reverse-engineering/07-database-erd.md`.
- API: `docs/reverse-engineering/08-api-specification.md`.
- Permission/CRUD: `docs/reverse-engineering/09-permission-crud-matrices.md`.
- UV: `docs/reverse-engineering/10-unverified-findings.md`.
- Source inventory: `docs/reverse-engineering/source-evidence-index.md`.
