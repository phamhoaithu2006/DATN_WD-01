# Test Case Catalog

## Phạm vi và nguyên tắc tổng hợp

- Catalog này tổng hợp bảy file test case của các module `01`–`07` hiện có tại thời điểm audit.
- Mỗi test case được đếm từ một dòng bảng bắt đầu bằng `| TC-` trong file nguồn. Không quy đổi số heading, số assertion hoặc số test function thành số test case.
- Trạng thái tự động hóa được giữ theo đúng nội dung cột `Hiện trạng tự động hóa`; catalog không tự nâng một tham chiếu test một phần thành coverage đầy đủ.
- Business Rule được lấy trực tiếp từ cột `BR`/`Business Rule` của từng test case.
- Tổng cộng có **437 test case**, **437 ID duy nhất**: 357 case phủ đủ **96 Business Rule từ BR-001 đến BR-096**, và 80 case phủ đủ **13 Supplemental Requirement từ SR-001 đến SR-013**.
- Snapshot hậu sửa ngày 2026-07-22 có 22 file test PHP. Bốn suite regression/concurrency mới đã được ánh xạ vào các dòng liên quan; số liệu dưới đây được đếm lại từ cột `Hiện trạng tự động hóa` sau cập nhật. Kết quả chạy thực nằm tại [Xác minh hậu sửa](11-post-fix-verification.md).

## Bảng tổng hợp

| Module | File test case | Dải ID | Rule được phủ | Số rule | Số test case | `Đã có test` | `Chưa có test`/chưa phủ đủ | Chỉ có exact missing-evidence phrase | Test + exact missing-evidence phrase | Có tham chiếu test, không dùng nhãn chuẩn |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Authentication, catalog, tour, departure | `docs/business-model-audit/test-cases/01-auth-catalog-test-cases.md` | TC-AC-001–TC-AC-061 | BR-001–BR-020 | 20 | 61 | 11 | 7 | 43 | 0 | 0 |
| Booking, pricing, VNPAY | `docs/business-model-audit/test-cases/02-booking-payment-test-cases.md` | TC-BP-001–TC-BP-065 | BR-021–BR-034 | 14 | 65 | 24 | 14 | 27 | 0 | 0 |
| Đánh giá tour, đánh giá hướng dẫn viên, strict candidates | `docs/business-model-audit/test-cases/03-reviews-test-cases.md` | TC-REV-001–TC-REV-057 | BR-035–BR-053 | 19 | 57 | 25 | 0 | 32 | 0 | 0 |
| Phân công, điểm danh, nghỉ và thay hướng dẫn viên | `docs/business-model-audit/test-cases/04-guide-operations-test-cases.md` | TC-GOP-001–TC-GOP-073 | BR-054–BR-073 | 20 | 73 | 11 | 0 | 62 | 0 | 0 |
| Support và notification | `docs/business-model-audit/test-cases/05-support-notifications-test-cases.md` | TC-SA-074-01–TC-SA-084-04 | BR-074–BR-084 | 11 | 41 | 0 | 0 | 38 | 0 | 3 |
| Nền tảng quản trị | `docs/business-model-audit/test-cases/06-admin-platform-test-cases.md` | TC-SA-085-01–TC-SA-096-08 | BR-085–BR-096 | 12 | 60 | 0 | 0 | 35 | 0 | 25 |
| Yêu cầu xuyên tài liệu | `docs/business-model-audit/test-cases/07-supplemental-test-cases.md` | TC-XD-001–TC-XD-080 | SR-001–SR-013 | 13 | 80 | 2 | 0 | 71 | 2 | 5 |
| **Tổng** | **7 file** | **437 ID duy nhất** | **BR-001–BR-096; SR-001–SR-013** | **109** | **437** | **73** | **21** | **308** | **2** | **33** |

### Cách đọc trạng thái tự động hóa

- `Đã có test`: cột trạng thái dùng đúng cụm từ này và dẫn test/assertion hiện hữu.
- `Chưa có test`/chưa phủ đủ: cột trạng thái ghi rõ chưa có test hoặc test hiện hữu chưa bao phủ đủ mục tiêu. Nhóm này gồm 7 case của module 01 và 14 case của module 02.
- `Chỉ có exact missing-evidence phrase`: cột trạng thái chỉ ghi **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**, không kèm tham chiếu test tự động cho một phần mục tiêu.
- `Test + exact missing-evidence phrase`: dòng vừa dẫn assertion hiện hữu vừa ghi **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE** cho phần mục tiêu còn thiếu. Hai case supplemental thuộc nhóm này là TC-XD-001 và TC-XD-035.
- `Có tham chiếu test nhưng không dùng nhãn chuẩn`: 3 case module 05, 25 case module 06 và 5 case supplemental dẫn test/assertion nhưng không dùng tiền tố `Đã có test`. Trong module 06, sáu dòng tự ghi rõ coverage còn thiếu bằng các cụm `chỉ assert` hoặc `chưa cover`: TC-SA-091-01, TC-SA-093-01, TC-SA-095-01, TC-SA-095-04, TC-SA-095-06 và TC-SA-096-07. TC-SA-085-04 có mục tiêu gồm download và delete, còn bằng chứng trong dòng chỉ nêu assertion download.
- Hai case supplemental mới dùng nhãn `Đã có test` là TC-XD-027 và TC-XD-030. Năm case supplemental có tham chiếu assertion nhưng không dùng nhãn chuẩn là TC-XD-008, TC-XD-054, TC-XD-062, TC-XD-070 và TC-XD-071.
- TC-REV-034 thuộc nhóm `Đã có test`, nhưng chính dòng nguồn ghi test rollback “không assert mọi field”. Catalog giữ nguyên nhãn nguồn và không diễn giải thành coverage đầy đủ.

## Chi tiết theo file

### 1. Authentication, catalog, tour và departure

- File: `docs/business-model-audit/test-cases/01-auth-catalog-test-cases.md`.
- Số lượng chính xác: **61** test case, từ TC-AC-001 đến TC-AC-061.
- BR coverage: **BR-001–BR-020**, đủ 20 BR.
- Trạng thái tự động hóa: 11 `Đã có test`; 7 chưa có/chưa bao phủ đầy đủ; 43 `KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE`.
- Nhãn loại test xuất hiện, giữ nguyên theo cột `Mục tiêu / Loại` (**31 nhãn duy nhất**): `Alternative`; `Alternative 409`; `Authorization`; `Authorization negative`; `Authorization, token scope`; `Authorization-state`; `Boundary`; `Boundary + negative`; `Boundary, BUG-AB-002`; `Concurrency`; `Concurrency evidence`; `Delete semantics`; `Happy`; `Happy + boundary`; `Happy + delete/insert`; `Happy + idempotency`; `Happy + negative`; `Happy + storage`; `Happy + transaction`; `Happy path`; `Negative`; `Negative + boundary`; `Negative + evidence`; `Negative boundary`; `Negative safety`; `Positive + negative matrix`; `Rate-limit`; `Source contract`; `State`; `State boundary`; `Transaction`.

### 2. Booking, pricing và VNPAY

- File: `docs/business-model-audit/test-cases/02-booking-payment-test-cases.md`.
- Số lượng chính xác: **65** test case, từ TC-BP-001 đến TC-BP-065.
- BR coverage: **BR-021–BR-034**, đủ 14 BR.
- Trạng thái tự động hóa: 24 `Đã có test`; 14 chưa có/chưa bao phủ đầy đủ; 27 `KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE`.
- Nhãn loại test xuất hiện, giữ nguyên theo cột `Mục tiêu / Loại` (**24 nhãn duy nhất**): `Alternative`; `Authorization`; `Authorization ownership`; `BUG-AB-001`; `BUG-AB-002, boundary`; `BUG-AB-003`; `BUG-AB-004`; `Boundary`; `Boundary-state`; `Concurrency`; `Concurrency + locking`; `Configuration`; `Happy`; `Happy + DB`; `Happy + boundary`; `Happy-state actions`; `Idempotency`; `Idempotency absence`; `Negative`; `Negative filter`; `Negative-state`; `Repeat behavior`; `State`; `Transaction`.

### 3. Đánh giá tour, đánh giá hướng dẫn viên và strict candidates

- File: `docs/business-model-audit/test-cases/03-reviews-test-cases.md`.
- Số lượng chính xác: **57** test case, từ TC-REV-001 đến TC-REV-057.
- BR coverage: **BR-035–BR-053**, đủ 19 BR.
- Trạng thái tự động hóa: 25 `Đã có test`; 32 `KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE`.
- Nhãn loại test xuất hiện (**40 nhãn duy nhất**): `Alternative`; `Authorization`; `Authorization/ownership`; `Authorization/state`; `Boundary`; `Boundary/negative`; `Boundary/normalization`; `Boundary/state`; `Concurrency`; `Conflict/idempotency`; `Functional`; `Functional/boundary`; `Happy`; `Happy/admin`; `Happy/create`; `Happy/filter`; `Happy/normalization`; `Happy/read`; `Happy/state`; `Happy/update`; `Idempotency/notification`; `Idempotency/upsert`; `Integration`; `Integration/transaction`; `Migration/data`; `Migration/rollback`; `Negative`; `Negative/boundary`; `Negative/filter`; `Negative/state`; `Negative/validation`; `Privacy/response`; `Regression`; `Regression/rollback`; `Scheduler`; `Security/rate-limit`; `State`; `State matrix`; `State/moderation`; `State/transaction`.

### 4. Phân công, điểm danh, nghỉ và thay hướng dẫn viên

- File: `docs/business-model-audit/test-cases/04-guide-operations-test-cases.md`.
- Số lượng chính xác: **73** test case, từ TC-GOP-001 đến TC-GOP-073.
- BR coverage: **BR-054–BR-073**, đủ 20 BR.
- Trạng thái tự động hóa: 11 `Đã có test`; 62 `KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE`.
- Nhãn loại test xuất hiện (**41 nhãn duy nhất**): `Alternative`; `Authorization`; `Authorization matrix`; `Authorization/boundary`; `Authorization/consistency`; `Authorization/state`; `Boundary`; `Boundary/file`; `Boundary/state`; `Boundary/validation`; `Concurrency`; `Concurrency/BUG`; `Concurrency/data-integrity`; `Concurrency/non-idempotent`; `Conflict/idempotency`; `Data filter`; `Exception/rollback`; `Functional`; `Happy`; `Happy/auth`; `Happy/create`; `Happy/delete`; `Happy/state`; `Happy/transaction`; `Happy/update`; `Idempotency`; `Idempotency/concurrency`; `Integration/read`; `Negative`; `Negative/boundary`; `Negative/date`; `Negative/idempotency`; `Negative/schedule`; `Negative/state`; `Ordering`; `Security/rule`; `State`; `State alternative`; `State matrix`; `State/filter`; `State/idempotency`.

### 5. Support và notification

- File: `docs/business-model-audit/test-cases/05-support-notifications-test-cases.md`.
- Số lượng chính xác: **41** test case, từ TC-SA-074-01 đến TC-SA-084-04.
- BR coverage: **BR-074–BR-084**, đủ 11 BR.
- Trạng thái tự động hóa: 38 case chỉ ghi `KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE`; 3 case dẫn test regression/concurrency hậu sửa mà không dùng nhãn chuẩn.
- Nhãn loại test xuất hiện (**28 nhãn duy nhất**): `API Feature / Aggregate`; `API Feature / Alternative + Validation`; `API Feature / Authorization`; `API Feature / Authorization ownership`; `API Feature / Boundary`; `API Feature / Business mismatch`; `API Feature / CRUD`; `API Feature / Data set`; `API Feature / Database`; `API Feature / Empty branch`; `API Feature / Exception + Idempotency`; `API Feature / Happy path`; `API Feature / Idempotency characterization`; `API Feature / Lifecycle`; `API Feature / Ownership`; `API Feature / Role filtering`; `API Feature / State`; `API Feature / State guard`; `API Feature / Validation`; `API Feature / Validation / Data set`; `Concurrency / Data Integrity`; `Concurrency / Idempotency characterization`; `Integration / Alternative flow`; `Integration / Failure characterization`; `Integration / Notification`; `Integration / Rollback filesystem`; `Integration / Transaction`; `Unit/Integration / Collision`.

### 6. Nền tảng quản trị

- File: `docs/business-model-audit/test-cases/06-admin-platform-test-cases.md`.
- Số lượng chính xác: **60** test case, từ TC-SA-085-01 đến TC-SA-096-08.
- BR coverage: **BR-085–BR-096**, đủ 12 BR.
- Trạng thái tự động hóa: 35 case ghi `KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE`; 25 case dẫn test/assertion hiện hữu mà không dùng nhãn `Đã có test`.
- Nhãn loại test xuất hiện (**44 nhãn duy nhất**): `API Feature / Aggregate`; `API Feature / Allowlist`; `API Feature / Authorization`; `API Feature / Boundary`; `API Feature / Business mismatch`; `API Feature / CRUD`; `API Feature / CRUD + Soft delete`; `API Feature / CRUD + State`; `API Feature / CRUD + Validation`; `API Feature / CRUD file`; `API Feature / Create`; `API Feature / Data exposure`; `API Feature / Filesystem`; `API Feature / Idempotency + Lock`; `API Feature / Identity`; `API Feature / Lifecycle`; `API Feature / Middleware`; `API Feature / Nested CRUD`; `API Feature / Orchestration`; `API Feature / Pricing`; `API Feature / Read`; `API Feature / Route contract`; `API Feature / Security validation`; `API Feature / Session`; `API Feature / Settings`; `API Feature / State`; `API Feature / State guard`; `API Feature / Transaction`; `API Feature / Update + Transaction`; `API Feature / Validation`; `API/Service / Validation`; `Command Integration / Alternative`; `Command Integration / Boundary time`; `Command Integration / Filesystem`; `Command Integration / Schedule`; `Concurrency / Business mismatch`; `Concurrency / Idempotency characterization`; `Integration / Constraint`; `Integration / Data set`; `Integration / Exception`; `Integration / External API fake`; `Integration / Happy path`; `Service Integration / Exception`; `Service Integration / Happy path`.

### 7. Yêu cầu xuyên tài liệu supplemental

- File: `docs/business-model-audit/test-cases/07-supplemental-test-cases.md`.
- Số lượng chính xác: **80** test case, từ TC-XD-001 đến TC-XD-080; cả 80 ID là duy nhất.
- Requirement coverage: **SR-001–SR-013**, đủ 13 SR.
- Trạng thái tự động hóa: 2 case `Đã có test`; 71 case chỉ ghi **KHÔNG TÌM THẤY BẰNG CHỨNG TRONG SOURCE CODE**; 2 case vừa dẫn assertion hiện hữu vừa ghi exact missing-evidence phrase cho phần còn thiếu; 5 case dẫn assertion hiện hữu và không dùng nhãn chuẩn.
- Nhãn loại test xuất hiện, giữ nguyên theo cột `Mục tiêu / Loại` (**24 nhãn duy nhất**): `Alternative`; `Authorization`; `Authorization matrix`; `Authorization ownership`; `BUG-XD-002`; `BUG-XD-003`; `Boundary`; `Boundary evidence`; `Business rule`; `Concurrency`; `Contract`; `Data integrity`; `Data integrity evidence`; `GET idempotency`; `Idempotency`; `Idempotency, concurrency`; `Isolation`; `Negative`; `Negative, boundary`; `Ownership negative`; `Positive`; `Positive, negative`; `Rollback, compensation`; `Source contract`.

## Coverage Business Rule

| Dải BR | File chứng minh coverage | Số BR |
| --- | --- | ---: |
| BR-001–BR-020 | `docs/business-model-audit/test-cases/01-auth-catalog-test-cases.md` | 20 |
| BR-021–BR-034 | `docs/business-model-audit/test-cases/02-booking-payment-test-cases.md` | 14 |
| BR-035–BR-053 | `docs/business-model-audit/test-cases/03-reviews-test-cases.md` | 19 |
| BR-054–BR-073 | `docs/business-model-audit/test-cases/04-guide-operations-test-cases.md` | 20 |
| BR-074–BR-084 | `docs/business-model-audit/test-cases/05-support-notifications-test-cases.md` | 11 |
| BR-085–BR-096 | `docs/business-model-audit/test-cases/06-admin-platform-test-cases.md` | 12 |
| **Tổng** | **BR-001–BR-096, không thiếu BR trong dải** | **96** |

## Coverage Supplemental Requirement

| Dải SR | File chứng minh coverage | Số SR |
| --- | --- | ---: |
| SR-001–SR-013 | `docs/business-model-audit/test-cases/07-supplemental-test-cases.md` | 13 |
| **Tổng** | **SR-001–SR-013, không thiếu SR trong dải** | **13** |

Tài liệu audit nguồn của phần này là `docs/business-model-audit/modules/07-cross-document-requirements.md`. Các case supplemental và ba BUG-XD đã được nhập vào tổng hiện tại; không còn được đánh dấu là phần chờ.
