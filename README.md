# DATN_WD-01

## Cài đặt và chạy dự án bằng Laragon

### Yêu cầu

- PHP 8.2, Composer và MySQL trong Laragon.
- Node.js và npm.
- Bật MySQL trong Laragon trước khi chạy backend.

### Cài đặt lần đầu

```bat
cd C:\laragon\www\DATN_WD-01
git fetch origin
git switch --track origin/feature/pending-booking-payment
```

Backend Laravel:

```bat
cd C:\laragon\www\DATN_WD-01\backend_laravel
composer install
copy .env.example .env
php artisan key:generate
```

Cập nhật database và VNPay Sandbox trong `backend_laravel/.env`:

```env
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://127.0.0.1:5173

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=backend_laravel
DB_USERNAME=root
DB_PASSWORD=

VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL="${FRONTEND_URL}/payment/vnpay/return"
```

`VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET` phải thuộc cùng một tài khoản VNPay Sandbox. Không commit các giá trị bí mật này lên Git.

```bat
php artisan optimize:clear
php artisan migrate --seed
php artisan storage:link
```

Frontend React không cần file `.env` khi backend chạy tại `127.0.0.1:8000`:

```bat
cd C:\laragon\www\DATN_WD-01\frontend_react
npm install
```

### Chạy dự án hằng ngày

Terminal backend:

```bat
cd C:\laragon\www\DATN_WD-01\backend_laravel
php artisan serve --host=127.0.0.1 --port=8000
```

Terminal frontend:

```bat
cd C:\laragon\www\DATN_WD-01\frontend_react
npm run dev -- --host 127.0.0.1
```

Terminal scheduler để tự động hủy đơn VNPay quá hạn và hoàn lại chỗ:

```bat
cd C:\laragon\www\DATN_WD-01\backend_laravel
php artisan schedule:work
```

Ba terminal trên phải tiếp tục chạy trong lúc kiểm thử thanh toán.

### Kiểm tra VNPay

Trước khi thanh toán, kiểm tra hai địa chỉ:

```text
http://127.0.0.1:8000/api
http://127.0.0.1:5173/payment/vnpay/return
```

Nếu vừa thay đổi `backend_laravel/.env`, chạy:

```bat
php artisan optimize:clear
```

`127.0.0.1` chỉ dùng cho môi trường local. Khi triển khai, callback và IPN phải sử dụng domain HTTPS công khai.
