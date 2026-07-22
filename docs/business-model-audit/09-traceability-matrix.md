# Traceability Matrix — Tài liệu → BR/SR → Source Audit → Test Case → BUG

## Phạm vi và quy ước join

Ma trận này chuẩn hóa chuỗi truy vết theo hai bước không làm mất thông tin:

1. Document ID trong BRD/SRS/Use Case/diagram/ERD/API/Permission/CRUD/UV ánh xạ sang canonical `BR-###` hoặc `SR-###`.
2. Mỗi canonical ID ánh xạ sang module source audit, test case thiết kế và BUG đã chứng minh.

Nguồn mapping Document ID → canonical là [00-rule-catalog-and-methodology.md](00-rule-catalog-and-methodology.md). Nguồn canonical gốc là [03-business-rules-brd.md](../reverse-engineering/03-business-rules-brd.md); source audit và test được liên kết trực tiếp trong từng bảng dưới đây.

Tất cả 437 test case là **thiết kế test**, không phải báo cáo chạy test trong phiên audit. 437 ID đã được kiểm đếm trực tiếp từ các dòng bảng `| TC-* |`: 437 dòng, 437 ID duy nhất, không có ID trùng.

## Khóa module audit và test

| Khóa | Canonical | Source audit | Test case | Số requirement | Số test case |
| --- | --- | --- | --- | ---: | ---: |
| M01/T01 | BR-001–BR-020 | [modules/01-auth-catalog.md](modules/01-auth-catalog.md) | [test-cases/01-auth-catalog-test-cases.md](test-cases/01-auth-catalog-test-cases.md) — TC-AC-001–TC-AC-061 | 20 | 61 |
| M02/T02 | BR-021–BR-034 | [modules/02-booking-payment.md](modules/02-booking-payment.md) | [test-cases/02-booking-payment-test-cases.md](test-cases/02-booking-payment-test-cases.md) — TC-BP-001–TC-BP-065 | 14 | 65 |
| M03/T03 | BR-035–BR-053 | [modules/03-reviews.md](modules/03-reviews.md) | [test-cases/03-reviews-test-cases.md](test-cases/03-reviews-test-cases.md) — TC-REV-001–TC-REV-057 | 19 | 57 |
| M04/T04 | BR-054–BR-073 | [modules/04-guide-operations.md](modules/04-guide-operations.md) | [test-cases/04-guide-operations-test-cases.md](test-cases/04-guide-operations-test-cases.md) — TC-GOP-001–TC-GOP-073 | 20 | 73 |
| M05/T05 | BR-074–BR-084 | [modules/05-support-notifications.md](modules/05-support-notifications.md) | [test-cases/05-support-notifications-test-cases.md](test-cases/05-support-notifications-test-cases.md) — TC-SA-074-01–TC-SA-084-04 | 11 | 41 |
| M06/T06 | BR-085–BR-096 | [modules/06-admin-platform.md](modules/06-admin-platform.md) | [test-cases/06-admin-platform-test-cases.md](test-cases/06-admin-platform-test-cases.md) — TC-SA-085-01–TC-SA-096-08 | 12 | 60 |
| M07/T07 | SR-001–SR-013 | [modules/07-cross-document-requirements.md](modules/07-cross-document-requirements.md) | [test-cases/07-supplemental-test-cases.md](test-cases/07-supplemental-test-cases.md) — TC-XD-001–TC-XD-080 | 13 | 80 |
| **Tổng** | **96 BR + 13 SR** | **7 module audit** | **437 ID duy nhất** | **109** | **437** |

## Document ID → canonical requirement

Các bảng trong mục này là vế trái của phép join. Cột `Canonical ID` nối trực tiếp đến mục [Ma trận canonical → source audit → test case → BUG](#ma-trận-canonical--source-audit--test-case--bug).

### BRD Business Process và quy trình

| Document ID | Canonical ID |
| --- | --- |
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

### Functional Requirement

| Document ID | Canonical ID |
| --- | --- |
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

### Non-Functional Requirement

| Document ID | Canonical ID / giới hạn mapping |
| --- | --- |
| NFR-001 | BR-001–BR-004; BR-006 |
| NFR-002 | BR-004; BR-027–BR-028; BR-037; BR-040; BR-046–BR-047; BR-062; BR-070; BR-072; BR-080; SR-002–SR-007; SR-009; SR-011–SR-013 |
| NFR-003 | BR-038 đối với tour review; SR-010 đối với toàn bộ declaration route |
| NFR-004 | Các BR có transaction: BR-014, BR-019, BR-025, BR-028, BR-030–BR-034, BR-037, BR-040–BR-041, BR-048–BR-049, BR-056, BR-060–BR-061, BR-064–BR-067, BR-069, BR-073, BR-075–BR-077, BR-082, BR-084, BR-096; SR-006 có transaction cập nhật profile guide |
| NFR-005 | Các BR có `lockForUpdate`: BR-025, BR-028, BR-030–BR-033, BR-037, BR-040–BR-041, BR-056, BR-064–BR-067, BR-096 |
| NFR-006 | BR-045; BR-076; SR-006. Các rollback transaction khác đi cùng NFR-004 |
| NFR-007 | BR-089. Phần “không có logging thống nhất” là giới hạn bằng chứng, không sinh SR |
| NFR-008 | BR-086. Phần “không có cache catalog/report” là giới hạn bằng chứng, không sinh SR |
| NFR-009 | BR-033; BR-051; BR-086 |
| NFR-010 | Chỉ mô tả queue config; Job/dispatch thực tế: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; không sinh SR |
| NFR-011 | BR-005; BR-068; BR-072; BR-074–BR-076; BR-085; SR-006 |
| NFR-012 | BR-042; BR-050; BR-079–BR-080; BR-085; BR-087–BR-090; SR-001; SR-004; SR-008–SR-011; SR-013 |
| NFR-013 | BR-025; BR-041; BR-044; BR-051; BR-060; BR-069–BR-073; BR-075–BR-084. Phần “không có audit toàn hệ thống” không sinh SR |

### Use Case

| Document ID | Canonical ID | Document ID | Canonical ID |
| --- | --- | --- | --- |
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

### State Machine, Sequence và Activity Diagram

| Diagram ID | Canonical ID |
| --- | --- |
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

| Sequence | Canonical ID | Activity | Canonical ID |
| --- | --- | --- | --- |
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

### ERD

| ERD section | Canonical ID |
| --- | --- |
| ERD-01 Xác thực và hạ tầng | BR-001–BR-008; SR-002–SR-007 |
| ERD-02 Catalog và thiết kế tour | BR-009–BR-020; BR-023–BR-024; SR-001; SR-004 |
| ERD-03 Booking, promotion, payment | BR-021–BR-034; BR-096; SR-009; SR-012 |
| ERD-04 Đánh giá | BR-035–BR-052 |
| ERD-05 Guide và vận hành | BR-053–BR-073; SR-006; SR-008; SR-011 |
| ERD-06 Nội dung, notification, support, chat | BR-074–BR-084; BR-087–BR-089; SR-013 |
| ERD-07 Cấu hình, partner, support staff | BR-085–BR-086; BR-092–BR-095; SR-007 |

Các bảng partner/promotion/refund/system log chỉ có schema nhưng chưa có flow nghiệp vụ được xác minh; chúng nối sang UV-004, UV-006, UV-008, UV-024 và UV-041, không sinh thêm BR/SR.

### API Specification

| API # | Canonical ID |
| --- | --- |
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

### Permission Matrix

| Document section | Canonical ID |
| --- | --- |
| Permission §2.1 Public/auth/shared | BR-001–BR-012; BR-029–BR-033; BR-080; BR-087–BR-089; BR-095; SR-001–SR-002; SR-010 |
| Permission §2.2 Customer | BR-005–BR-007; BR-021–BR-052; BR-074–BR-077; SR-002–SR-004; SR-012 |
| Permission §2.3 Admin | BR-008; BR-013–BR-020; BR-034; BR-044; BR-053–BR-061; BR-068–BR-073; BR-081–BR-086; BR-090–BR-096; SR-005; SR-009; SR-013 |
| Permission §2.4 Tour guide | BR-049–BR-050; BR-062–BR-073; SR-006; SR-008; SR-011 |
| Permission §2.5 Support staff | BR-078–BR-080; BR-084; SR-007; SR-013 |
| Frontend Guard Matrix §3 | BR-004 và các SR theo actor; guard frontend không thay backend authorization |

### CRUD Matrix

| Document section/module | Canonical ID |
| --- | --- |
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

### Unverified Finding

| Document ID | Canonical/trace treatment |
| --- | --- |
| UV-001–UV-003 | Bằng chứng để trả lời các câu hỏi nghiệp vụ: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; không sinh requirement |
| UV-004–UV-017 | Bằng chứng xác minh các flow/capability được hỏi: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; không sinh requirement |
| UV-018–UV-030 | Bất nhất source/schema hoặc câu hỏi tính toàn vẹn; audit module chỉ lập BUG khi có yêu cầu tài liệu trực tiếp bị source vi phạm |
| UV-031–UV-040 | Khoảng trống frontend/API/phân quyền đã được tài liệu mô tả; không sinh requirement và không tự động trở thành BUG |
| UV-041–UV-045 | Thiếu bằng chứng audit/test/runtime/NFR; không sinh requirement |

Chi tiết 45 ID và bằng chứng đã kiểm tra nằm tại [10-unverified-findings.md](10-unverified-findings.md) và [reverse-engineering/10-unverified-findings.md](../reverse-engineering/10-unverified-findings.md).

## Ma trận canonical → source audit → test case → BUG

`Không có` trong cột BUG nghĩa là không có BUG ID lịch sử cho canonical row đó; không đồng nghĩa mọi nhánh runtime đã được kiểm thử tự động. Các BUG có hậu tố `Resolved` đã được đối chiếu tại `11-post-fix-verification.md`.

### BR-001–BR-020 — M01/T01

| Canonical | Kết luận audit | Source audit | Test case thiết kế | BUG liên quan |
| --- | --- | --- | --- | --- |
| BR-001 | Đúng | M01 | TC-AC-001–TC-AC-006 | BUG-AB-002 — Resolved — TC-AC-005 |
| BR-002 | Đúng | M01 | TC-AC-007–TC-AC-011 | Không có |
| BR-003 | Đúng | M01 | TC-AC-012–TC-AC-014 | Không có |
| BR-004 | Đúng | M01 | TC-AC-015–TC-AC-017 | Không có |
| BR-005 | Đúng | M01 | TC-AC-018–TC-AC-021 | BUG-AB-002 — Resolved |
| BR-006 | Đúng | M01 | TC-AC-022–TC-AC-024 | Không có |
| BR-007 | Đúng | M01 | TC-AC-025–TC-AC-028 | Không có |
| BR-008 | Đúng | M01 | TC-AC-029–TC-AC-030 | Không có |
| BR-009 | Đúng | M01 | TC-AC-031–TC-AC-032 | Không có |
| BR-010 | Đúng | M01 | TC-AC-033–TC-AC-034 | Không có |
| BR-011 | Đúng | M01 | TC-AC-035–TC-AC-037 | Không có |
| BR-012 | Đúng | M01 | TC-AC-038–TC-AC-040 | Không có |
| BR-013 | Đúng | M01 | TC-AC-041–TC-AC-043 | Không có |
| BR-014 | Đúng | M01 | TC-AC-044–TC-AC-046 | Không có |
| BR-015 | Đúng | M01 | TC-AC-047–TC-AC-048 | Không có |
| BR-016 | Đúng | M01 | TC-AC-049–TC-AC-050 | Không có |
| BR-017 | Đúng | M01 | TC-AC-051–TC-AC-052 | Không có |
| BR-018 | Đúng | M01 | TC-AC-053–TC-AC-054 | BUG-XD-001 — Resolved — TC-AC-054 |
| BR-019 | Đúng | M01 | TC-AC-055–TC-AC-058 | Không có |
| BR-020 | Đúng | M01 | TC-AC-059–TC-AC-061 | Không có |

### BR-021–BR-034 — M02/T02

| Canonical | Kết luận audit | Source audit | Test case thiết kế | BUG liên quan |
| --- | --- | --- | --- | --- |
| BR-021 | Đúng | M02 | TC-BP-001–TC-BP-009 | BUG-AB-001/002 — Resolved — TC-BP-007–TC-BP-009 |
| BR-022 | Đúng | M02 | TC-BP-010–TC-BP-015 | Không có |
| BR-023 | Đúng | M02 | TC-BP-016–TC-BP-018 | Không có |
| BR-024 | Đúng | M02 | TC-BP-019–TC-BP-022 | BUG-AB-003 — Resolved — TC-BP-022 |
| BR-025 | Đúng | M02 | TC-BP-014, TC-BP-022–TC-BP-026 | BUG-AB-003 — Resolved — TC-BP-022 |
| BR-026 | Đúng | M02 | TC-BP-027 | Không có |
| BR-027 | Đúng | M02 | TC-BP-028–TC-BP-032 | Không có |
| BR-028 | Đúng | M02 | TC-BP-030, TC-BP-032–TC-BP-035 | Không có |
| BR-029 | Đúng | M02 | TC-BP-036–TC-BP-038 | Không có |
| BR-030 | Đúng | M02 | TC-BP-039–TC-BP-046 | Không có |
| BR-031 | Đúng | M02 | TC-BP-047–TC-BP-048 | Không có |
| BR-032 | Đúng | M02 | TC-BP-048–TC-BP-053 | Không có |
| BR-033 | Đúng | M02 | TC-BP-054–TC-BP-057 | Không có |
| BR-034 | Đúng | M02 | TC-BP-058–TC-BP-065 | BUG-AB-004 — Resolved — TC-BP-060 |

### BR-035–BR-053 — M03/T03

| Canonical | Kết luận audit | Source audit | Test case thiết kế | BUG liên quan |
| --- | --- | --- | --- | --- |
| BR-035 | Đúng | M03 | TC-REV-001–TC-REV-005 | Không có |
| BR-036 | Đúng | M03 | TC-REV-006 | Không có |
| BR-037 | Đúng | M03 | TC-REV-007–TC-REV-010 | Không có |
| BR-038 | Đúng | M03 | TC-REV-011–TC-REV-016 | Không có |
| BR-039 | Đúng | M03 | TC-REV-017–TC-REV-018 | Không có |
| BR-040 | Đúng | M03 | TC-REV-019–TC-REV-021 | Không có |
| BR-041 | Đúng | M03 | TC-REV-022–TC-REV-024 | Không có |
| BR-042 | Đúng | M03 | TC-REV-025–TC-REV-027 | Không có |
| BR-043 | Đúng | M03 | TC-REV-028 | Không có |
| BR-044 | Đúng | M03 | TC-REV-029–TC-REV-032 | Không có |
| BR-045 | Đúng | M03 | TC-REV-033–TC-REV-035 | Không có |
| BR-046 | Đúng | M03 | TC-REV-036–TC-REV-038 | Không có |
| BR-047 | Đúng | M03 | TC-REV-039–TC-REV-040 | Không có |
| BR-048 | Đúng | M03 | TC-REV-041–TC-REV-044 | Không có |
| BR-049 | Đúng | M03 | TC-REV-045–TC-REV-047 | Không có |
| BR-050 | Đúng | M03 | TC-REV-048–TC-REV-049 | Không có |
| BR-051 | Đúng | M03 | TC-REV-050–TC-REV-053 | Không có |
| BR-052 | Đúng | M03 | TC-REV-035, TC-REV-054 | Không có |
| BR-053 | Đúng | M03 | TC-REV-055–TC-REV-057 | Không có |

### BR-054–BR-073 — M04/T04

| Canonical | Kết luận audit | Source audit | Test case thiết kế | BUG liên quan |
| --- | --- | --- | --- | --- |
| BR-054 | Đúng | M04 | TC-GOP-001–TC-GOP-003 | Không có |
| BR-055 | Đúng | M04 | TC-GOP-004–TC-GOP-005 | Không có |
| BR-056 | Đúng | M04 | TC-GOP-006–TC-GOP-009 | Không có |
| BR-057 | Đúng | M04 | TC-GOP-010–TC-GOP-013 | Không có |
| BR-058 | Đúng | M04 | TC-GOP-014–TC-GOP-017 | Không có |
| BR-059 | Đúng | M04 | TC-GOP-018–TC-GOP-021 | Không có |
| BR-060 | Đúng | M04 | TC-GOP-022–TC-GOP-025 | Không có |
| BR-061 | Đúng | M04 | TC-GOP-026–TC-GOP-028 | Không có |
| BR-062 | Đúng | M04 | TC-GOP-029–TC-GOP-030 | Không có |
| BR-063 | Đúng | M04 | TC-GOP-031–TC-GOP-032 | Không có |
| BR-064 | Đúng | M04 | TC-GOP-033–TC-GOP-037 | Không có |
| BR-065 | Đúng | M04 | TC-GOP-038–TC-GOP-042 | Không có |
| BR-066 | Đúng | M04 | TC-GOP-043–TC-GOP-046 | Không có |
| BR-067 | Đúng | M04 | TC-GOP-047–TC-GOP-050 | Không có |
| BR-068 | Đúng | M04 | TC-GOP-051–TC-GOP-054 | Không có |
| BR-069 | Đúng | M04 | TC-GOP-055–TC-GOP-058 | BUG-RG-001 — Resolved — TC-GOP-058 |
| BR-070 | Đúng | M04 | TC-GOP-059–TC-GOP-061 | BUG-RG-002 — Resolved — TC-GOP-061 |
| BR-071 | Đúng | M04 | TC-GOP-061–TC-GOP-064 | BUG-RG-002 — Resolved — TC-GOP-061 |
| BR-072 | Đúng | M04 | TC-GOP-065–TC-GOP-069 | BUG-RG-003 — Resolved — TC-GOP-069 |
| BR-073 | Đúng | M04 | TC-GOP-070–TC-GOP-073 | BUG-RG-004 — Resolved — TC-GOP-073 |

### BR-074–BR-084 — M05/T05

| Canonical | Kết luận audit | Source audit | Test case thiết kế | BUG liên quan |
| --- | --- | --- | --- | --- |
| BR-074 | Đúng | M05 | TC-SA-074-01–TC-SA-074-04 | Không có |
| BR-075 | Đúng | M05 | TC-SA-075-01–TC-SA-075-04 | Không có |
| BR-076 | Đúng | M05 | TC-SA-076-01 | Không có |
| BR-077 | Đúng | M05 | TC-SA-077-01–TC-SA-077-03 | Không có |
| BR-078 | Đúng | M05 | TC-SA-078-01–TC-SA-078-05 | Không có |
| BR-079 | Đúng | M05 | TC-SA-079-01–TC-SA-079-02 | Không có |
| BR-080 | Đúng | M05 | TC-SA-080-01–TC-SA-080-04 | Không có |
| BR-081 | Đúng | M05 | TC-SA-081-01–TC-SA-081-05 | Không có |
| BR-082 | Đúng | M05 | TC-SA-082-01–TC-SA-082-05 | BUG-SA-004 — Resolved — TC-SA-082-05 |
| BR-083 | Đúng | M05 | TC-SA-083-01–TC-SA-083-04 | Không có |
| BR-084 | Đúng | M05 | TC-SA-084-01–TC-SA-084-04 | BUG-SA-001 — Resolved — TC-SA-084-01 |

### BR-085–BR-096 — M06/T06

| Canonical | Kết luận audit | Source audit | Test case thiết kế | BUG liên quan |
| --- | --- | --- | --- | --- |
| BR-085 | Đúng | M06 | TC-SA-085-01–TC-SA-085-07 | Không có |
| BR-086 | Đúng | M06 | TC-SA-086-01–TC-SA-086-07 | Không có |
| BR-087 | Đúng | M06 | TC-SA-087-01–TC-SA-087-04 | Không có |
| BR-088 | Đúng | M06 | TC-SA-088-01–TC-SA-088-02 | Không có |
| BR-089 | Đúng | M06 | TC-SA-089-01–TC-SA-089-03 | Không có |
| BR-090 | Đúng | M06 | TC-SA-090-01–TC-SA-090-03 | Không có |
| BR-091 | Đúng | M06 | TC-SA-091-01–TC-SA-091-05 | Không có |
| BR-092 | Đúng | M06 | TC-SA-092-01–TC-SA-092-05 | Không có |
| BR-093 | Đúng | M06 | TC-SA-093-01–TC-SA-093-06 | Không có |
| BR-094 | Đúng | M06 | TC-SA-094-01–TC-SA-094-04 | Không có |
| BR-095 | Đúng | M06 | TC-SA-095-01–TC-SA-095-06 | BUG-SA-002 — Resolved — TC-SA-095-05 |
| BR-096 | Đúng | M06 | TC-SA-096-01–TC-SA-096-08 | BUG-SA-003 — Resolved — TC-SA-096-05–TC-SA-096-06 |

### SR-001–SR-013 — M07/T07

| Canonical | Kết luận audit | Source audit | Test case thiết kế | BUG liên quan |
| --- | --- | --- | --- | --- |
| SR-001 | Đúng | M07 | TC-XD-001–TC-XD-007 | Không có |
| SR-002 | Đúng | M07 | TC-XD-008–TC-XD-011 | Không có |
| SR-003 | Đúng | M07 | TC-XD-012–TC-XD-014 | Không có |
| SR-004 | Đúng | M07 | TC-XD-015–TC-XD-021 | Không có |
| SR-005 | Đúng | M07 | TC-XD-022–TC-XD-027 | BUG-XD-003 — Resolved — TC-XD-027 |
| SR-006 | Đúng | M07 | TC-XD-028–TC-XD-035 | BUG-XD-002 — Resolved — TC-XD-030 |
| SR-007 | Đúng | M07 | TC-XD-036–TC-XD-041 | Không có |
| SR-008 | Đúng | M07 | TC-XD-042–TC-XD-047 | Không có |
| SR-009 | Đúng | M07 | TC-XD-048–TC-XD-053 | Không có |
| SR-010 | Đúng | M07 | TC-XD-054–TC-XD-061 | Không có |
| SR-011 | Đúng | M07 | TC-XD-062–TC-XD-069 | Không có |
| SR-012 | Đúng | M07 | TC-XD-070–TC-XD-073 | Không có |
| SR-013 | Đúng | M07 | TC-XD-074–TC-XD-080 | Không có |

## Kiểm kê BUG hợp nhất

| Nhóm | ID | Số lượng |
| --- | --- | ---: |
| AB | BUG-AB-001–BUG-AB-004 | 4 |
| RG | BUG-RG-001–BUG-RG-004 | 4 |
| SA | BUG-SA-001–BUG-SA-004 | 4 |
| XD | BUG-XD-001–BUG-XD-003 | 3 |
| **Tổng** | **15 ID duy nhất** | **15** |

Mức độ lịch sử theo [08-bug-register.md](08-bug-register.md): Critical 1, High 11, Medium 3, Low 0. Disposition hậu sửa: 15 Resolved, 0 Open.

## Kiểm soát tổng

| Đối tượng | Đúng | Sai | Thiếu | Tổng |
| --- | ---: | ---: | ---: | ---: |
| BR-001–BR-096 | 96 | 0 | 0 | 96 |
| SR-001–SR-013 | 13 | 0 | 0 | 13 |
| **Canonical** | **109** | **0** | **0** | **109** |

- 96 BR xuất hiện đúng một lần trong cột canonical của bảng BR.
- 13 SR xuất hiện đúng một lần trong cột canonical của bảng SR.
- Bảy file test chứa 437 ID duy nhất: 357 BR test case và 80 supplemental test case.
- Bug register chứa 15 BUG ID duy nhất.
