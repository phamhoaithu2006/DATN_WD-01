# Audit Business Model và thiết kế test case

## Mục tiêu

Đối chiếu toàn bộ Business Model trong `docs/reverse-engineering` với source tại baseline hiện tại, phân loại `Đúng / Sai / Thiếu`, lập BUG chỉ khi có bằng chứng và thiết kế test case truy vết đến từng rule.

## Công việc

- [x] Khóa baseline, trích xuất 96 BR và khử trùng lặp yêu cầu từ BRD/SRS/Use Case/diagrams/ERD/API/matrices. → Xác minh: mọi yêu cầu có ID và nguồn tài liệu.
- [x] Audit BR-001–BR-034 qua route, validation, xử lý, dữ liệu, transaction, quyền, lỗi và toàn vẹn. → Xác minh: 34/34 rule có kết luận.
- [x] Audit BR-035–BR-073 theo cùng ma trận evidence. → Xác minh: 39/39 rule có kết luận.
- [x] Audit BR-074–BR-096 theo cùng ma trận evidence. → Xác minh: 23/23 rule có kết luận.
- [x] Thiết kế test case positive/negative/boundary/auth/idempotency/concurrency theo bằng chứng từng rule. → Xác minh: không có test case chứa hành vi ngoài source/tài liệu.
- [x] Tổng hợp BUG register và traceability matrix Document → Rule → Source → Test → BUG. → Xác minh: BUG có file, hàm, vị trí, điều kiện tái hiện và severity.
- [x] Kiểm toán độc lập độ phủ và định dạng toàn bộ báo cáo. → Xác minh: đủ 96 BR cùng mọi rule bổ sung đã xác minh; link/path/ID liên tục, không có kết luận thiếu evidence.

## Hoàn thành khi

- [x] Có bảng tổng hợp, báo cáo chi tiết theo module, test-case catalog, BUG register và traceability matrix.
- [x] Không chứa review code style, clean code, naming, performance, architecture, pattern hoặc đề xuất refactor/sửa lỗi.
- [x] Không sửa source ứng dụng, `.env`, secret hay cấu hình production.
