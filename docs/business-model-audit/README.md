# Business Model Audit — ViVuGo

## Executive Summary

Tài liệu này là mục lục tổng hợp của quá trình đối chiếu Business Model trong `docs/reverse-engineering` với source code tại baseline commit `d9ddfd25c02d94ebfd1cd12ce42341cfbeaa6219`.

| Phạm vi | Đúng | Sai | Thiếu | Tổng |
| --- | ---: | ---: | ---: | ---: |
| Business Rule `BR-001`–`BR-096` | 87 | 9 | 0 | 96 |
| Supplemental Requirement `SR-001`–`SR-013` | 11 | 0 | 2 | 13 |
| **Tổng** | **98** | **9** | **2** | **109** |

- Có 437 test case ID duy nhất: 357 case cho 96 BR và 80 case cho 13 SR.
- Toàn bộ test case trong bộ tài liệu này là **thiết kế test**, không phải kết quả chạy test trong phiên audit. Cột `Hiện trạng tự động hóa` chỉ dẫn assertion đã tồn tại trong source test; audit này không xác nhận test suite đã chạy thành công.
- Có 15 BUG ID duy nhất: 1 Critical, 11 High, 3 Medium, 0 Low; gồm `BUG-AB-001`–`BUG-AB-004`, `BUG-RG-001`–`BUG-RG-004`, `BUG-SA-001`–`BUG-SA-004`, `BUG-XD-001`–`BUG-XD-003`.
- [Danh mục và phương pháp audit](00-rule-catalog-and-methodology.md)
- [Ma trận truy vết đầy đủ](09-traceability-matrix.md)
- [Bug register hợp nhất 15 BUG duy nhất](08-bug-register.md)
- [Danh sách các điểm chưa xác minh tổng hợp](10-unverified-findings.md)

## Domain Analysis

**[Suy luận từ source code]** Domain chính là quản lý và vận hành dịch vụ tour du lịch trực tuyến. Source có bằng chứng cho catalog tour, lịch khởi hành, booking, VNPAY, đánh giá, phân công/vận hành hướng dẫn viên, hỗ trợ, thông báo, chatbot, báo cáo, cấu hình và backup.

Actor có bằng chứng từ `RoleSeeder`, route middleware và frontend guard gồm `customer`, `tour guide`, `support staff`, `admin`; guest sử dụng route public. Chi tiết và Source Code Reference nằm tại [Executive Summary và Domain Analysis](../reverse-engineering/01-executive-domain-analysis.md).

## Module Analysis

| Module audit | Canonical | Kết quả | Test case thiết kế | BUG |
| --- | --- | --- | --- | --- |
| [Xác thực, catalog, tour, departure](modules/01-auth-catalog.md) | BR-001–BR-020 | 20 Đúng | [TC-AC-001–TC-AC-061](test-cases/01-auth-catalog-test-cases.md) | BUG-AB-002 |
| [Booking, pricing, VNPAY](modules/02-booking-payment.md) | BR-021–BR-034 | 14 Đúng | [TC-BP-001–TC-BP-065](test-cases/02-booking-payment-test-cases.md) | BUG-AB-001–BUG-AB-004 |
| [Đánh giá tour/guide và strict candidates](modules/03-reviews.md) | BR-035–BR-053 | 19 Đúng | [TC-REV-001–TC-REV-057](test-cases/03-reviews-test-cases.md) | Không có BUG được lập |
| [Phân công và vận hành guide](modules/04-guide-operations.md) | BR-054–BR-073 | 15 Đúng, 5 Sai | [TC-GOP-001–TC-GOP-073](test-cases/04-guide-operations-test-cases.md) | BUG-RG-001–BUG-RG-004 |
| [Support và notification](modules/05-support-notifications.md) | BR-074–BR-084 | 9 Đúng, 2 Sai | [TC-SA-074-01–TC-SA-084-04](test-cases/05-support-notifications-test-cases.md) | BUG-SA-001, BUG-SA-004 |
| [Nền tảng quản trị](modules/06-admin-platform.md) | BR-085–BR-096 | 10 Đúng, 2 Sai | [TC-SA-085-01–TC-SA-096-08](test-cases/06-admin-platform-test-cases.md) | BUG-SA-002, BUG-SA-003 |
| [Yêu cầu xuyên tài liệu](modules/07-cross-document-requirements.md) | SR-001–SR-013 | 11 Đúng, 2 Thiếu | [TC-XD-001–TC-XD-080](test-cases/07-supplemental-test-cases.md) | BUG-XD-001–BUG-XD-003 |

Mô tả module gốc, route, controller, service, model, migration và frontend được tái dựng tại [Module Analysis](../reverse-engineering/02-module-analysis.md).

## Business Rules

- Canonical gốc: 96 rule `BR-001`–`BR-096` tại [Business Rules/BRD](../reverse-engineering/03-business-rules-brd.md).
- Canonical bổ sung: 13 rule `SR-001`–`SR-013` được chuẩn hóa tại [Danh mục yêu cầu](00-rule-catalog-and-methodology.md#22-supplemental-requirement).
- Truy vết từng BR/SR tới module source audit, test case và BUG: [Traceability Matrix](09-traceability-matrix.md#ma-trận-canonical--source-audit--test-case--bug).

## BRD

BRD tái dựng gồm giới thiệu, phạm vi, stakeholder, actor, module, business process, rule, constraint, report, notification, audit, phân quyền, quy trình và glossary tại [03-business-rules-brd.md](../reverse-engineering/03-business-rules-brd.md). Ánh xạ `BP-*` và `QTN-*` sang BR/SR nằm trong [Traceability Matrix](09-traceability-matrix.md#brd-business-process-và-quy-trình).

## SRS

Functional Requirement `FR-001`–`FR-025` và Non-Functional Requirement `NFR-001`–`NFR-013`, kèm Source Code Reference, nằm tại [04-srs.md](../reverse-engineering/04-srs.md). Kết quả audit không tự sinh NFR ngoài bằng chứng. Truy vết FR/NFR sang BR/SR nằm tại [Traceability Matrix](09-traceability-matrix.md#functional-requirement).

## Use Case

53 use case `UC-001`–`UC-053` nằm tại [05-use-cases.md](../reverse-engineering/05-use-cases.md). Truy vết UC sang canonical requirement, source audit, test và BUG nằm tại [Traceability Matrix](09-traceability-matrix.md#use-case).

## Sequence Diagram

13 sequence diagram `SEQ-01`–`SEQ-13` bằng Mermaid nằm tại [06-process-and-state-diagrams.md](../reverse-engineering/06-process-and-state-diagrams.md). Mapping sang BR/SR nằm tại [Traceability Matrix](09-traceability-matrix.md#state-machine-sequence-và-activity-diagram).

## Activity Diagram

13 activity diagram `ACT-01`–`ACT-13` bằng Mermaid nằm tại [06-process-and-state-diagrams.md](../reverse-engineering/06-process-and-state-diagrams.md). Mapping sang BR/SR nằm tại [Traceability Matrix](09-traceability-matrix.md#state-machine-sequence-và-activity-diagram).

## ERD

ERD, quan hệ, cardinality, FK, index và unique được dựng theo migration tại [07-database-erd.md](../reverse-engineering/07-database-erd.md). Truy vết bảy nhóm ERD sang canonical requirement nằm tại [Traceability Matrix](09-traceability-matrix.md#erd).

## API

API Specification của 239 route, gồm một route web và 238 route API, nằm tại [08-api-specification.md](../reverse-engineering/08-api-specification.md). Mapping đầy đủ `API #1`–`#239` sang canonical requirement nằm tại [Traceability Matrix](09-traceability-matrix.md#api-specification).

## Permission Matrix

Permission Matrix theo public/auth/shared, customer, admin, tour guide và support staff nằm tại [09-permission-crud-matrices.md](../reverse-engineering/09-permission-crud-matrices.md). Mapping sang BR/SR nằm tại [Traceability Matrix](09-traceability-matrix.md#permission-matrix).

## CRUD Matrix

CRUD Matrix theo 25 module nằm tại [09-permission-crud-matrices.md](../reverse-engineering/09-permission-crud-matrices.md). Mapping sang BR/SR nằm tại [Traceability Matrix](09-traceability-matrix.md#crud-matrix).

## Danh sách các điểm chưa xác minh

Danh sách hợp nhất `UV-001`–`UV-045` và các giới hạn đã ghi trong source audit nằm tại [10-unverified-findings.md](10-unverified-findings.md). Các mục này không phải backlog và không được tự chuyển thành Business Rule hoặc BUG.

Khi không có bằng chứng, tài liệu dùng đúng câu: **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
