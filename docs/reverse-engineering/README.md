# Reverse Engineering Business Requirements từ Source Code

Tài liệu này là điểm vào của bộ hồ sơ tái dựng nghiệp vụ ViVuGo từ source code. Baseline được khảo sát là commit `d9ddfd25c02d94ebfd1cd12ce42341cfbeaa6219` trên nhánh tài liệu `docs/reverse-engineering-business-requirements`.

Nguyên tắc áp dụng cho toàn bộ bộ tài liệu:

- Kết luận phải có Source Code Reference gồm file, class/component, method, route, model và migration khi loại artifact đó tồn tại.
- Nội dung ghép từ hành vi nhưng không được source tuyên bố trực tiếp mang nhãn **[Suy luận từ source code]**.
- Nội dung chưa đủ bằng chứng mang nhãn **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**.
- Migration `.bak`, dữ liệu production, `.env`, secret và quy trình thủ công ngoài repository không được dùng làm sự thật nghiệp vụ.

Phạm vi kiểm kê tại baseline: 239 route ứng dụng gồm 238 API và 1 web route; 63 bảng duy nhất từ migration PHP active; 51 controller, 43 file model, 14 service, 14 Form Request, 14 API Resource, 80 migration PHP active, 21 seeder, 3 factory, 18 test backend, 62 page và 60 component React. Nguồn và cách tái kiểm tra nằm tại [Source Evidence Index](source-evidence-index.md).

## Executive Summary

Hệ thống là nền tảng quản lý và bán tour với các không gian public/customer, tour guide, support staff và admin. Bằng chứng về domain, actor, module, menu, chức năng, phạm vi đã xác minh và các giới hạn được tổng hợp tại [Executive Summary & Domain Analysis](01-executive-domain-analysis.md).

## Domain Analysis

Bounded context, actor, vai trò, frontend surface, backend module và database-only artifact được truy vết tại [Domain Analysis](01-executive-domain-analysis.md). Các nhận định về ranh giới domain không được source tuyên bố trực tiếp đều được đánh dấu suy luận.

## Module Analysis

Phân tích từng module gồm chức năng, actor, input, output, business flow, database, business rule và Source Code Reference tại [Module Analysis](02-module-analysis.md).

## Business Rules

96 business rule `BR-001`–`BR-096`, mỗi rule gắn bằng chứng route/controller/service/model/migration, nằm tại [Business Rules](03-business-rules-brd.md#6-business-rules).

## BRD

BRD gồm giới thiệu, mục tiêu có bằng chứng, phạm vi, stakeholder, actor, module, process, rule, ràng buộc, báo cáo, notification, audit, phân quyền, quy trình và glossary tại [BRD](03-business-rules-brd.md).

## SRS

25 Functional Requirement `FR-001`–`FR-025` và 13 NFR chỉ dựa trên bằng chứng nằm tại [SRS](04-srs.md). Mỗi FR có actor, trigger, precondition, main/alternative/exception flow, database, validation, authorization, API, response và Source Code Reference.

## Use Case

53 use case `UC-001`–`UC-053`, bao phủ actor, trigger, điều kiện, luồng chính, nhánh thay thế, ngoại lệ, dữ liệu và nguồn, nằm tại [Use Case](05-use-cases.md).

## State Machine

10 state machine Mermaid chỉ mô tả các trạng thái và chuyển trạng thái tìm thấy trong controller, service, request, model hoặc migration, nằm tại [State Machine](06-process-and-state-diagrams.md#2-state-machine).

## Sequence Diagram

13 sequence diagram Mermaid cho các luồng có bằng chứng nằm tại [Sequence Diagram](06-process-and-state-diagrams.md#2-sequence-diagram).

## Activity Diagram

13 activity diagram Mermaid nằm tại [Activity Diagram](06-process-and-state-diagrams.md#3-activity-diagram).

## ERD

7 ERD Mermaid bao phủ 63/63 bảng active, cùng inventory quan hệ, cardinality, FK, index, unique, soft delete, audit và sai khác driver, nằm tại [Database Design & ERD](07-database-erd.md).

## API

Đặc tả 239/239 route ứng dụng theo method, URI, request, response, validation, authorization và Source Code Reference nằm tại [API Specification](08-api-specification.md). Trong đó 238 route là API và 1 route là web health/welcome theo route list tại baseline.

## Permission Matrix

Ma trận Role × Function, kèm phân biệt quyền từ middleware, ownership và trạng thái integration frontend, nằm tại [Permission Matrix](09-permission-crud-matrices.md#2-permission-matrix).

## CRUD Matrix

Ma trận CRUD theo module và actor nằm tại [CRUD Matrix](09-permission-crud-matrices.md#3-crud-matrix).

## Danh sách các điểm chưa xác minh

45 điểm chưa xác minh, suy luận hoặc bất nhất trực tiếp, mỗi điểm kèm phạm vi bằng chứng đã kiểm tra, nằm tại [Danh sách các điểm chưa xác minh](10-unverified-findings.md). Danh sách này không phải backlog và không tự chọn giải pháp thay cho quyết định nghiệp vụ.

## Tài liệu hỗ trợ truy vết

- [Source Evidence Index](source-evidence-index.md): inventory route, controller, model, service, request, resource, migration, seeder, factory, test và frontend artifact.
- [State Machine và Process Diagrams](06-process-and-state-diagrams.md): 10 state machine cùng sequence/activity diagram.
- [Database Inventory](07-database-erd.md): toàn bộ bảng, FK, index, unique và ràng buộc vật lý.
- [API Route Inventory](08-api-specification.md): bảng route đầy đủ, không chỉ các endpoint tiêu biểu.

## Giới hạn của baseline

- Không đọc hoặc sửa `.env`, secret, payment config hay production config.
- Không khẳng định dữ liệu production, hành vi hạ tầng hoặc quy trình thủ công ngoài source.
- Không khẳng định migration chạy thành công trên mọi driver khi chưa có artifact runtime; khác biệt driver được ghi tại ERD.
- Một lỗi cú pháp có sẵn được phát hiện ở `backend_laravel/database/seeders/ServiceCategorySeeder.php` do merge marker; bộ tài liệu chỉ ghi nhận, không sửa source ứng dụng.
- Hai file model đặt tên sai cùng khai báo `TourGuideAssignment`; bộ tài liệu ghi nhận bất nhất autoload nhưng không tự kết luận lỗi runtime chưa được chứng minh.
