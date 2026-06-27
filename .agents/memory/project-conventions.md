---
type: project
created: 2026-06-13
updated: 2026-06-13
---

# Project Conventions - Maison Uniforme E-Commerce

Tài liệu này ghi nhận các quy ước lập trình, kiến trúc hệ thống và quy tắc nghiệp vụ quan trọng của dự án Maison Uniforme E-Commerce để đảm bảo tính đồng nhất giữa các AI Agent và Lập trình viên.

---

## 1. Tech Stack & Architecture

- **Backend:** Laravel 12.x REST API (các endpoint chính nằm tại `routes/api.php`).
- **Database:** MySQL chạy trực tiếp trên host server (Cổng 3306).
  - Các trường có tiền tố `sapo_` là bất khả xâm phạm và dùng để ánh xạ với SAPO ERP.
  - Tuyệt đối **KHÔNG** chạy các lệnh `delete all`, `truncate`, `migrate:fresh`, hoặc `db:wipe` trên Database của dự án.
- **Admin Panel:** Filament v3.3 được dùng để xây dựng bảng quản trị backend và thực hiện các thao tác thủ công (đồng bộ, tách biến thể).
- **Frontend SPA:** React 19 + TailwindCSS v4 build bằng Vite (mã nguồn đặt tại `resources/js/`).

---

## 2. Quy ước Backend (Laravel & Filament)

### Tối ưu hóa Big Data & Sync
- **Chunk / Batch Processing:** Luôn dùng `chunk()` hoặc `upsert()` khi thao tác với mảng dữ liệu lớn từ SAPO gửi về.
- **Eager Loading:** Tránh lỗi N+1 query bằng cách luôn sử dụng `with()` khi truy vấn các mối quan hệ (ví dụ: `Product` -> `Variants` / `Images`, `Order` -> `OrderItems`).
- **Ghi log:** Hạn chế đặt `Log::info` trong các vòng lặp xử lý hàng nghìn bản ghi để tránh làm đầy ổ đĩa.

### Tích hợp SAPO ERP
- **Quy tắc Đồng bộ Sản phẩm:** Đồng bộ 1-to-1 (1 sản phẩm SAPO = 1 sản phẩm trên Web, không tự động tách theo màu). Không đồng bộ ảnh nếu trường `images_customized` trên Panel quản trị là `true`.
- **Tách biến thể:** Cho phép Admin tách biến thể theo màu sắc thủ công bằng row action "Tách biến thể" trong `ProductResource`.
- **Đẩy đơn hàng (Order Push):** Thực hiện đẩy đơn hàng sang SAPO trong hàm `store()` của `OrderController` ngay sau khi tạo xong các item đơn hàng (KHÔNG dùng Observer `created` của Model Order do có nguy cơ bất đồng bộ dữ liệu). Sử dụng Observer `updated` để cập nhật trạng thái đơn hàng sang SAPO.
- **Đồng bộ trạng thái:** Sử dụng hàm `mapSapoToWebStatus()` để ánh xạ trạng thái dựa trên 4 trường của SAPO: `status` + `financial_status` + `fulfillment_status` + `issue_status`.
- **Đồng bộ tồn kho qua SKU (One-way Web-to-Sapo):**
  - Đồng bộ tồn kho 1 chiều từ Web lên SAPO để giữ tính nhất quán cho các sản phẩm tách màu thủ công trên Web.
  - Chỉ đồng bộ các biến thể có đủ `sapo_inventory_item_id` và `sku`.
  - Đối chiếu biến thể thủ công tại trang Filament SAPO Sync (`filament.pages.sapo-sync`) qua SKU. Hệ thống có tính năng tự động liên kết (Auto-heal) lại các ID nếu bị thiếu nhưng trùng SKU.

### Tích hợp Vận chuyển Quốc tế MDL Express
- **HSCode mặc định:** Nếu sản phẩm không có HSCode cụ thể, sử dụng mã mặc định `6109` (Áo thun cotton).
- **Thời điểm đẩy đơn:** Chỉ đẩy đơn hàng quốc tế (`is_international = true`) sang MDL Express **sau khi đơn hàng đã thanh toán thành công** (thay vì khi vừa tạo đơn).
- Đăng ký Webhook nhận trạng thái cập nhật tại `/api/v1/mdl/webhook` để cập nhật hành trình đơn hàng tự động.

### Cổng thanh toán VNPAY
- **Timezone:** Bắt buộc áp múi giờ `Asia/Ho_Chi_Minh` cho trường `vnp_CreateDate` và `vnp_ExpireDate` để tránh lỗi múi giờ (Code 15).
- Tự động hủy đơn hàng chưa thanh toán sau 48 giờ và khôi phục tồn kho tương ứng.

---

## 3. Quy ước Frontend (React SPA)

- Sử dụng **React 19** và **TailwindCSS v4**.
- Tất cả API client gọi qua **Axios** với cấu hình sẵn.
- **Quy tắc thiết kế UI:**
  - Giao diện phải hiện đại, trực quan, hỗ trợ thiết kế Responsive tốt.
  - Sử dụng Google Fonts (ví dụ: Inter, Outfit) thay cho font mặc định của trình duyệt.
  - Áp dụng các hiệu ứng micro-interaction (hover, transition) mượt mà.
  - Không sử dụng ảnh placeholder tĩnh; luôn sử dụng ảnh thực tế hoặc sinh ảnh khi phát triển.

---

## 4. Quy tắc làm việc của AI Agent (Andrej Karpathy's Principles)

1. **Think Before Coding:** Luôn đọc kỹ tài liệu liên quan trước khi sửa mã nguồn. Không tự ý suy diễn hoặc thay đổi thiết kế hệ thống khi chưa chắc chắn.
2. **Simplicity First:** Thiết kế đơn giản, gọn gàng, tránh Over-engineering.
3. **Surgical Changes:** Sửa đổi chính xác từng dòng mã cần thiết. Giữ nguyên các comment cũ của lập trình viên và không refactor lan man sang các hàm không liên quan.
4. **Goal-Driven:** Luôn chạy kiểm tra lại cú pháp, test case trước khi bàn giao công việc cho Lập trình viên.

---

## 5. Quy trình triển khai (Deployment) - Non-Docker

Dự án chạy trực tiếp trên host server, không sử dụng Docker. Quy trình triển khai như sau:

- **Thư mục chạy trên Server:** `/home/hbweb/domains/hbweb.vn/tmdt`
- **Địa chỉ truy cập:** `http://45.124.84.162:8090`
- **PHP 8.2 Host Binary:** `/usr/local/php82/bin/php82`
- **Nginx Web Server:** Lắng nghe trực tiếp trên cổng 8090, chuyển tiếp qua php82 socket `/usr/local/php82/sockets/hbweb.sock`.
- **Tường lửa (Firewall):** Cổng `8090` được cấu hình mở trong tường lửa CSF của server (DirectAdmin) tại `/etc/csf/csf.conf` trong tham số `TCP_IN`. File này ở chế độ immutable (`chattr +i`), khi cấu hình hoặc thay đổi cổng cần gỡ bỏ immutable (`chattr -i`), sửa đổi, chạy reload `csf -r`, sau đó khôi phục lại `chattr +i`.
- **Thông tin kết nối SSH Server:**
  - **Host IP:** `45.124.84.162`
  - **Port:** `26266`
  - **Username:** `root`
  - **Password:** `R3mdKyjK`

### Quy trình triển khai tự động (Automated Deploy):
Chạy script Python từ thư mục gốc ở máy local:
```bash
python deploy.py
```
Script này sẽ tự động:
1. Build assets ở local: `npm run build`
2. Đóng gói thư mục `public/build` thành `public_build.tar` và tải lên server qua SFTP.
3. SSH kết nối vào server, dọn dẹp các thay đổi cục bộ (`git checkout`), kéo code mới nhất từ GitLab (`git pull origin main`).
4. Giải nén assets frontend đè vào thư mục `public/build/`.
5. Cài đặt các package composer mới, migrate DB, đồng bộ settings seeder và clear cache bằng PHP 8.2 của host.

### Quy trình triển khai thủ công (Manual Deploy):
Nếu cần thực hiện thủ công từng bước, hãy làm theo quy trình dưới đây:

1. **Build assets ở máy local:**
   ```bash
   npm run build
   ```
2. **Nén thư mục `public/build` thành file `public_build.tar`:**
   ```bash
   tar -cf public_build.tar -C public/build .
   ```
3. **Tải file `public_build.tar` lên server** tại thư mục `/home/hbweb/domains/hbweb.vn/tmdt/` (sử dụng SFTP/SCP qua cổng `26266`).
4. **SSH vào server** với quyền `root` qua cổng `26266`.
5. **Thực hiện chuỗi lệnh cập nhật trên server:**
   ```bash
   # Di chuyển vào thư mục dự án
   cd /home/hbweb/domains/hbweb.vn/tmdt
   
   # Loại bỏ các thay đổi tạm thời trên server để tránh xung đột git pull
   git checkout -- .
   
   # Pull mã nguồn mới nhất từ GitLab
   git pull origin main
   
   # Giải nén gói giao diện frontend
   tar -xf public_build.tar -C public/build/
   rm public_build.tar
   
   # Cập nhật thư viện composer bằng PHP 8.2 host
   /usr/local/php82/bin/php82 /usr/local/bin/composer install --no-dev --optimize-autoloader --no-interaction
   
   # Chạy migration cập nhật cấu trúc database
   /usr/local/php82/bin/php82 artisan migrate --force
   
   # Phân quyền đọc ghi cho thư mục assets
   chmod -R 777 public/build/
   
   # Đồng bộ dữ liệu seeder cài đặt và xóa cache ứng dụng
   /usr/local/php82/bin/php82 artisan db:seed --class=SettingsSyncSeeder --force
   /usr/local/php82/bin/php82 artisan optimize:clear
   ```
