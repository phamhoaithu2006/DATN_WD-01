## Boilerplate MVC PHP OOP — Hướng dẫn sử dụng

### 1) Giới thiệu

Boilerplate này là khung dự án PHP theo kiến trúc MVC đơn giản (Model–View–Controller), hỗ trợ tổ chức mã nguồn gọn gàng, dễ mở rộng cho các bài tập, demo hoặc dự án nhỏ.

### 2) Cấu trúc thư mục

```
mvc-oop-basic-duanmau/
  commons/
    env.php            # Cấu hình môi trường (DB, base URL, …)
    function.php       # Hàm tiện ích dùng chung
  controllers/
    ProductController.php
  models/
    ProductModel.php
  views/
    trangchu.php       # View ví dụ (trang chủ)
  uploads/
    imgproduct/        # Thư mục lưu ảnh sản phẩm
  index.php            # Front controller / Router đơn giản
  doc.md               # Tài liệu kèm theo (nếu có)
```

### 3) Yêu cầu hệ thống

-   PHP >= 7.4 (khuyến nghị PHP 8.x)
-   Máy chủ web bất kỳ (PHP built-in server, Apache, Nginx, XAMPP/MAMP/Laragon)
-   MySQL/MariaDB (nếu sử dụng cơ sở dữ liệu)

### 4) Cách chạy nhanh (không cấu hình gì thêm)

Từ thư mục gốc dự án:

```bash
php -S localhost:8000
```

Mở trình duyệt tại: `http://localhost:8000`

Nếu dùng XAMPP/MAMP/Laragon, hãy đặt toàn bộ dự án vào htdocs/www tương ứng và truy cập qua `http://localhost/mvc-oop-basic-duanmau`.

### 5) Cấu hình môi trường (`commons/env.php`)

-   Đặt các biến môi trường như thông tin kết nối DB, `BASE_URL`, timezone, v.v.
-   Ví dụ các khóa cấu hình thường có:

```php
<?php
// Ví dụ: BASE_URL, DB config
define('BASE_URL', 'http://localhost:8000');

$dbConfig = [
  'host' => '127.0.0.1',
  'port' => 3306,
  'name' => 'your_database',
  'user' => 'root',
  'pass' => ''
];
```

Lưu ý: Không commit thông tin nhạy cảm lên kho mã công khai.

### 6) Router và điều hướng (`index.php`)

`index.php` đóng vai trò Front Controller, nhận `route` từ query string và điều phối đến Controller/Action tương ứng.

-   Mặc định truy cập không có `route` sẽ hiển thị view `views/trangchu.php`.
-   Ví dụ URL: `/?route=product/index` sẽ gọi `ProductController` → `index()`.

Mẫu URL đề xuất:

-   `/?route=<ten-controller>/<ten-action>`
-   Controller: PascalCase + hậu tố `Controller` (ví dụ: `ProductController`)
-   Action: phương thức `camelCase` bên trong Controller (ví dụ: `index`, `show`, `create`, …)

### 7) Controllers

-   Nơi điều phối luồng nghiệp vụ: nhận request, gọi Model, render View.
-   Ví dụ (`controllers/ProductController.php`):

```php
<?php
require_once __DIR__ . '/../models/ProductModel.php';

class ProductController {
  public function index() {
    $products = ProductModel::getAll();
    include __DIR__ . '/../views/trangchu.php';
  }

  public function show() {
    $id = $_GET['id'] ?? null;
    if (!$id) {
      http_response_code(400);
      echo 'Thiếu tham số id';
      return;
    }
    $product = ProductModel::getById((int)$id);
    include __DIR__ . '/../views/trangchu.php';
  }
}
```

### 8) Models

-   Đóng gói truy cập dữ liệu. Có thể là mảng giả lập hoặc kết nối DB thật.
-   Ví dụ (`models/ProductModel.php`):

```php
<?php
class ProductModel {
  public static function getAll(): array {
    // TODO: thay bằng truy vấn DB thật nếu cần
    return [
      ['id' => 1, 'name' => 'Sản phẩm A'],
      ['id' => 2, 'name' => 'Sản phẩm B'],
    ];
  }

  public static function getById(int $id): ?array {
    foreach (self::getAll() as $p) {
      if ($p['id'] === $id) return $p;
    }
    return null;
  }
}
```

Nếu dùng DB:

1. Tạo kết nối từ `commons/env.php` hoặc lớp DB riêng.
2. Thay logic mảng giả lập bằng truy vấn `PDO`/`mysqli` tương ứng.

### 9) Views

-   Chứa HTML hiển thị dữ liệu. Hạn chế logic nghiệp vụ, chỉ nên render.
-   Ví dụ (`views/trangchu.php`):

```php
<?php /** @var array $products */ ?>
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Trang chủ</title>
  </head>
  <body>
    <h1>Danh sách sản phẩm</h1>
    <ul>
      <?php if (!empty($products)) : ?>
        <?php foreach ($products as $p) : ?>
          <li>
            <a href="/?route=product/show&id=<?php echo (int)$p['id']; ?>">
              <?php echo htmlspecialchars($p['name']); ?>
            </a>
          </li>
        <?php endforeach; ?>
      <?php else : ?>
        <li>Chưa có sản phẩm</li>
      <?php endif; ?>
    </ul>
  </body>
  </html>
```

### 10) Uploads

-   Lưu file người dùng (ảnh, tài liệu) trong `uploads/`.
-   Đảm bảo phân quyền ghi (write) cho máy chủ web.
-   Khi triển khai production, cân nhắc lưu trữ ngoài (S3, CDN) và validate file kỹ hơn.

### 11) Quy ước đặt tên & tổ chức mã

-   Controller: `XxxController.php`, class `XxxController`, methods: `index`, `show`, `create`, `store`, `edit`, `update`, `delete`…
-   Model: `XxxModel.php`, class `XxxModel`, chỉ chứa logic dữ liệu.
-   View: file `.php` trong `views/`, đặt theo trang/chức năng.
-   Hàm dùng chung để trong `commons/function.php`.

### 12) Thêm trang/chức năng mới

1. Tạo Model (nếu cần) trong `models/`.
2. Tạo Controller trong `controllers/` với action cần thiết.
3. Tạo View tương ứng trong `views/`.
4. Điều hướng bằng cách truy cập `/?route=<controller>/<action>`.

### 13) Kết nối cơ sở dữ liệu (tuỳ chọn)

Ví dụ khởi tạo kết nối PDO dùng cấu hình trong `commons/env.php`:

```php
<?php
require_once __DIR__ . '/commons/env.php';

function getPDO(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;

  $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
    $dbConfig['host'], $dbConfig['port'], $dbConfig['name']
  );
  $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  return $pdo;
}
```

Trong Model, gọi `getPDO()` để thực thi truy vấn.
