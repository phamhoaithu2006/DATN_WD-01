# Kế hoạch Thiết Kế Lại Phần Hiển Thị Tour (ViVuGo)

Tài liệu này chi tiết kế hoạch thiết kế lại phần hiển thị danh sách các tour và thẻ tour (Tour Card) trên trang chủ (`HomePage.jsx`) và các trang danh sách tour nhằm tối ưu hóa tính thẩm mỹ, tính chuyên nghiệp và trải nghiệm người dùng (UX).

---

## 1. Overview (Tổng quan)
- **Mục tiêu**: Thay thế giao diện thẻ tour (Tour Card) cũ trông còn đơn giản và thô bằng một thiết kế mới hiện đại, cao cấp hơn. Đồng thời giải quyết triệt để các vấn đề hiển thị như: lỗi vỡ ảnh, thông tin đánh giá không hợp lý (ví dụ rating 0.00), và bố cục giá bị lệch dòng.
- **Phạm vi tác động**:
  - `frontend_react/src/components/customer/TourCard.jsx` (Cấu trúc thẻ Tour)
  - `frontend_react/src/styles/customer.css` (Style CSS hiển thị thẻ Tour)

---

## 2. Project Type & Stack
- **Project Type**: WEB (React SPA)
- **Tech Stack**: 
  - React (JSX)
  - Vanilla CSS (sử dụng file `customer.css` có sẵn trong dự án)
  - Icon component có sẵn (`Icon.jsx`)

---

## 3. Success Criteria (Tiêu chí thành công)
- [x] **Khắc phục lỗi vỡ ảnh**: Thêm trình xử lý lỗi ảnh (`onError`) để tự động hiển thị ảnh placeholder hoặc gradient nghệ thuật kèm icon thay vì hiển thị hình ảnh bị vỡ.
- [x] **Bố cục giá nhất quán**: Giá tiền và đơn vị `/ người` hiển thị trên cùng một hàng. Giá gốc hiển thị ở dòng dưới (nếu có giảm giá), có cơ chế giữ khoảng trống chiều cao cố định để các thẻ tour thẳng hàng tuyệt đối.
- [x] **Bấm vào thẻ để điều hướng**: Loại bỏ nút "Xem chi tiết", đổi con trỏ chuột sang `pointer` và cho phép click vào toàn bộ thẻ để chuyển hướng sang `/tours/:id`.
- [x] **Trải nghiệm tương tác (Micro-interactions)**: Card hover phải có hiệu ứng mượt mà (dịch chuyển nhẹ, bóng đổ mềm mịn, ảnh zoom nhẹ).
- [ ] **Responsive hoàn hảo**: Đảm bảo hiển thị tốt trên các thiết bị di động (Mobile, Tablet) mà không bị lệch hoặc tràn nội dung.
- [x] **Không vi phạm quy tắc thiết kế**:
  - Không tự ý sử dụng các mã màu tím/indigo đại trà của AI (tuân thủ **Purple Ban**).
  - Không sử dụng thư viện UI bên ngoài nếu không được yêu cầu.

---

## 4. File Structure (Cấu trúc file thay đổi)
```
frontend_react/
├── src/
│   ├── components/
│   │   └── customer/
│   │       └── TourCard.jsx         <-- Thay đổi cấu trúc HTML, thêm xử lý ảnh lỗi
│   └── styles/
│       └── customer.css             <-- Cập nhật style CSS cho thẻ Tour
```

---

## 5. Task Breakdown (Chi tiết công việc)

### Task 1: Nghiên cứu & Xử lý ảnh lỗi (Fallback Image)
- **Đơn vị thực hiện**: `frontend-specialist`
- **Độ ưu tiên**: P0
- **Phụ thuộc**: Không
- **Mô tả**: Thiết lập cơ chế tự động thay thế ảnh lỗi bằng một ảnh placeholder chất lượng cao hoặc một khối CSS gradient du lịch kèm biểu tượng.
- **INPUT**: File `TourCard.jsx` hiện tại.
- **OUTPUT**: File `TourCard.jsx` có hàm xử lý sự kiện `onError` cho thẻ `<img>` hoặc tự động hiển thị render block an toàn.
- **VERIFY**: Thử nghiệm với các tour Sa Pa, Phú Quốc bị lỗi ảnh ở trang chủ để kiểm tra xem ảnh lỗi đã biến mất và hiển thị placeholder thay thế chưa. [HOÀN THÀNH]

### Task 2: Cập nhật cấu trúc thẻ Tour (`TourCard.jsx`)
- **Đơn vị thực hiện**: `frontend-specialist`
- **Độ ưu tiên**: P1
- **Phụ thuộc**: Task 1
- **Mô tả**: Tái cấu trúc cấu trúc JSX của TourCard. 
  - Gộp thông tin điểm đến & danh mục hợp lý.
  - Làm mịn phần hiển thị đánh giá (Rating): Nếu rating = 0, có thể ẩn hoặc hiển thị "Chưa có đánh giá" một cách tinh tế thay vì "★ 0.00 (2847)".
  - Sắp xếp giá tiền & nút "Xem chi tiết" thẳng hàng ngang tốt hơn.
- **INPUT**: File `TourCard.jsx` sau Task 1.
- **OUTPUT**: File `TourCard.jsx` mới hoàn chỉnh.
- **VERIFY**: Build chạy thử giao diện để xem các thành phần thông tin hiển thị đúng vị trí. [HOÀN THÀNH]

### Task 3: Nâng cấp Styles CSS cho thẻ Tour (`customer.css`)
- **Đơn vị thực hiện**: `frontend-specialist`
- **Độ ưu tiên**: P1
- **Phụ thuộc**: Task 2
- **Mô tả**: Cập nhật các class `.vg-tour-card`, `.vg-tour-photo`, `.vg-tour-info`, `.vg-tour-footer` trong `customer.css`.
  - Chọn góc bo cạnh tinh tế (ví dụ bo tròn lớn hẳn 20px hoặc góc sắc cạnh hiện đại tùy theo ý kiến người dùng).
  - Làm dịu các badge "Nổi bật" và "Giảm giá" bằng màu sắc sang trọng, có thể thêm hiệu ứng kính mờ (glassmorphism) cho nền badge.
  - Thêm hiệu ứng hover cao cấp dùng CSS Transitions (zoom ảnh, dịch chuyển card lên trên 8px, đổ bóng mờ mịn màng).
- **INPUT**: File `customer.css` gốc.
- **OUTPUT**: File `customer.css` đã được cập nhật.
- **VERIFY**: Rà soát xem card có hiển thị mượt mà và đẹp mắt trên trình duyệt không. [HOÀN THÀNH]

### Task 4: Kiểm tra Responsive & Khả năng truy cập (Accessibility)
- **Đơn vị thực hiện**: `frontend-specialist`
- **Độ ưu tiên**: P2
- **Phụ thuộc**: Task 3
- **Mô tả**: Tối ưu hóa card grid trên màn hình Mobile & Tablet. Đảm bảo kích thước chữ phù hợp, khoảng cách chạm (touch target) tối thiểu 44x44px đối với nút Yêu thích và nút Xem chi tiết.
- **INPUT**: Giao diện hoàn thành ở Task 3.
- **OUTPUT**: Giao diện tối ưu responsive.
- **VERIFY**: Co giãn màn hình hoặc dùng DevTools giả lập mobile để kiểm tra layout.

---

## 6. Phase X: Verification (Xác minh cuối cùng)
- [x] Chạy lệnh kiểm tra cú pháp và build:
  ```bash
  npm run build
  ```
- [ ] Chạy kịch bản UX audit thủ công:
  - Thẻ tour không bị vỡ ảnh.
  - Hover chuyển động mượt mà, không bị khựng (lag).
  - Màu sắc hài hòa, không có màu tím lòe loẹt mặc định (Purple Ban).
- [ ] Kiểm tra responsive trên các thiết bị di động.
