### Cấu trúc thư mục

1. commons // File dùng chung cả dự án
2. uploads // Folder lưu trữ file upload
3. controllers // Xử lý logic
4. models // Thao tác cơ sở dữ liệu
5. views // Hiển thị
6. index.php // Điều hướng

// Không sử dụng đường dẫn tuyệt đối (file.php) localhost/mvc-basic/trang-chu.php - Không dùng cách này nữa
-> Dùng route: Gọi đến hàm trong controller để thực thi (hàm không trả về)
- Hàm không trả về: Không có return - Chỉ dùng để thực thi đoạn mã và hàm này không trả về giá trị
- Hàm có trả về: Có return - Thực thi đoạn mã và trả về giá trị

Class - Object - Hàm - Mảng

Mô hình MVC 
- Model: Dùng để tương tác với cơ sở dữ liệu
- View: Hiển trị, nhận yêu cầu người dùng
- Controller: Dùng để thực thi các đoạn mã xử lý logic

- Cấu hình DB trong file commons/env.php