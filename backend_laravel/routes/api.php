<?php

use App\Http\Controllers\Api\Admin\AdminProfileController;
use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\CustomerManagerController;
use App\Http\Controllers\Api\Admin\DatabaseBackupController;
use App\Http\Controllers\Api\Admin\DestinationController;
use App\Http\Controllers\Api\Admin\GuideController;
use App\Http\Controllers\Api\Admin\PaymentController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\Admin\SettingController;
use App\Http\Controllers\Api\Admin\SupportStaffController;
use App\Http\Controllers\Api\Admin\TourManagerController;
use App\Http\Controllers\Api\Admin\WidgetController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Customer\CustomerController;
use App\Http\Controllers\Api\Customer\CustomerDashboardController;
use App\Http\Controllers\Api\Customer\TourController;
use App\Http\Controllers\Api\Customer\WishlistController;
use App\Http\Controllers\Api\PublicSettingController;
use App\Http\Controllers\Api\PublicWidgetController;
use Illuminate\Support\Facades\Route;

// Đăng ký và đăng nhập cho người dùng 
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    // Đăng xuất (chỉ có thể thực hiện khi người dùng đã đăng nhập)
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    // Lấy thông tin người dùng hiện tại (chỉ có thể thực hiện khi người dùng đã đăng nhập)
    Route::middleware(['auth:sanctum', 'admin'])->get('/me', function () {
        return response()->json([
            'user' => request()->user()->load('role'),
        ]);
    });
});

// Khách hàng đã đăng nhập
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']); 
    Route::get('/profile/summary', [CustomerDashboardController::class, 'summary']); 
    Route::get('/profile/bookings', [CustomerDashboardController::class, 'bookings']); 
    Route::put('/profile/update', [CustomerController::class, 'updateProfile']); 
    Route::put('/profile/change-password', [CustomerController::class, 'changePassword']); 
});

// Đặt lại mật khẩu cho khách hàng 
Route::post('/forgot-password', [CustomerController::class, 'forgotPassword']);
Route::post('/reset-password', [CustomerController::class, 'resetPassword']);
Route::post('/travel-assistant', [CustomerDashboardController::class, 'travelAssistant']);

// Quản lý tour cho khách hàng
Route::prefix('tours')->group(function () {
    Route::get('/search', [TourController::class, 'search_gdkh']);
    Route::get('/filter', [TourController::class, 'filter_gdkh']);
    Route::get('/', [TourController::class, 'index_gdkh']);
    Route::get('/{slug}', [TourController::class, 'show_gdkh']);

    // Quản lý danh sách yêu thích (wishlist) cho khách hàng
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('wishlist', [WishlistController::class, 'index']);
        Route::post('wishlist', [WishlistController::class, 'store']);
        Route::delete('wishlist/{tour_id}', [WishlistController::class, 'destroy']);
    });

    // Chi tiết tour theo slug  
    Route::get('/{slug}', [TourController::class, 'show_gdkh']);
});

// Admin 
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    // Chức năng báo cáo & thống kê
    Route::get('/reports/overview', [ReportController::class, 'getOverviewStatistics']);
    Route::get('/reports/charts', [ReportController::class, 'getChartStatistics']);

    // Quản lý khách hàng
    Route::get('/customers/statistics', [CustomerManagerController::class, 'statistics']);
    Route::get('/customers/count', [CustomerManagerController::class, 'count']);
    Route::get('/customers', [CustomerManagerController::class, 'index']);
    Route::get('/customers/search', [CustomerManagerController::class, 'search']);
    Route::post('/customers', [CustomerManagerController::class, 'store']);
    Route::get('/customers/{id}', [CustomerManagerController::class, 'show']);
    Route::put('/customers/{id}', [CustomerManagerController::class, 'update']);
    Route::patch('/customers/{id}/lock', [CustomerManagerController::class, 'lock']);
    Route::patch('/customers/{id}/unlock', [CustomerManagerController::class, 'unlock']);

    // Quản lý HDV
    // Tính tổng số lượng 
    Route::get('/guides/statistics', [GuideController::class, 'statistics']);
    //Lấy danh sách 
    Route::get('/guides', [GuideController::class, 'index']);
    Route::get('/guides/search', [GuideController::class, 'search']);
    Route::get('/guides/filter', [GuideController::class, 'filter']);
    //Xem chi tiết 
    Route::get('/guides/{id}', [GuideController::class, 'show']);
    //Thêm thông tin 
    Route::post('/guides', [GuideController::class, 'store']);
    //Sửa thông tin 
    Route::put('/guides/{id}', [GuideController::class, 'update']);
    //Xóa thông tin 
    Route::delete('/guides/{id}', [GuideController::class, 'destroy']);

    // Quản lý nhân viên hỗ trợ
    // Xem danh sách 
    Route::get('/support-staff', [SupportStaffController::class, 'index']);
    // Tính tổng số lượng 
    Route::get('/support-staff/statistics', [SupportStaffController::class, 'statistics']);
    // Thêm thông tin 
    Route::post('/support-staff', [SupportStaffController::class, 'store']);
    // Xem chi tiết 
    Route::get('/support-staff/{id}', [SupportStaffController::class, 'show']);
    // Sửa thông tin 
    Route::put('/support-staff/{id}', [SupportStaffController::class, 'update']);
    // Xóa thông tin 
    Route::delete('/support-staff/{id}', [SupportStaffController::class, 'destroy']);

    // Quản lý địa chỉ tour
    // Tìm kiếm 
    Route::get('destinations/search', [DestinationController::class, 'search']);
    // Lấy danh sách |  GET        |  http://127.0.0.1:8000/api/destinations
    // Xem chi tiết  |  GET        |  http://127.0.0.1:8000/api/destinations/{id}
    // Thêm mới      |  POST       |  http://127.0.0.1:8000/api/destinations
    // Cập nhật      |  PUT/PATCH  |  http://127.0.0.1:8000/api/destinations/{id}
    // Xóa mềm       |  DELETE     |  http://127.0.0.1:8000/api/destinations/{id}
    // Tích hợp cả 5 chức năng 
    Route::apiResource('destinations', DestinationController::class);
    // Lấy danh sách xóa mềm 
    Route::get('destinations/trash/list', [DestinationController::class, 'trashed']);
    // Khôi phục xóa mềm
    Route::post('destinations/{id}/restore', [DestinationController::class, 'restore']);
    // Xoá vĩnh viễn
    Route::delete('destinations/{id}/force-delete', [DestinationController::class, 'forceDelete']);

    // Quản lý danh mục tour
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/search', [CategoryController::class, 'search']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);
    Route::get('/categories-trashed', [CategoryController::class, 'trashed']);
    Route::patch('/categories/{id}/restore', [CategoryController::class, 'restore']);

    // Quản lý tour
    // Giao diện cho khách hàng 
    Route::get('tours/public', [TourManagerController::class, 'publicIndex']);

    // Giao diện cho admin
    Route::prefix('tours')->group(function () {
        Route::get('/', [TourManagerController::class, 'index']); // Quản lý tour (không hiện tour bị ẩn)
        Route::post('/', [TourManagerController::class, 'store']); // Thêm tour 
        Route::put('/{id}', [TourManagerController::class, 'update']); // Sửa tour
        Route::delete('/{id}', [TourManagerController::class, 'destroy']); // Xóa tour 

        Route::get('/hidden-list', [TourManagerController::class, 'hiddenTours']); // Lấy danh sách tour bị ẩn
        Route::patch('/{id}/hide', [TourManagerController::class, 'hide']); // Ẩn tour
        Route::patch('/{id}/unhide', [TourManagerController::class, 'unhide']); // Hiện tour
    });

    // Cài đặt hệ thống và widget công khai 
    Route::get('/settings/public', [PublicSettingController::class, 'show']);
    Route::get('/widgets', [PublicWidgetController::class, 'index']);

    // Cài đặt hệ thống cho admin
    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update']);

    // Quản lý widget
    Route::get('/widgets', [WidgetController::class, 'index']);
    Route::post('/widgets', [WidgetController::class, 'store']);
    Route::get('/widgets/{id}', [WidgetController::class, 'show']);
    Route::put('/widgets/{id}', [WidgetController::class, 'update']);
    Route::delete('/widgets/{id}', [WidgetController::class, 'destroy']);
    Route::patch('/widgets/{id}/toggle-status', [WidgetController::class, 'toggleStatus']);

    // Quản lý thanh toán
    Route::get('/payments', [PaymentController::class, 'index']);
    Route::get('/payments/{id}', [PaymentController::class, 'show']);
    Route::patch('/payments/{id}/confirm', [PaymentController::class, 'confirm']);
    Route::patch('/payments/{id}/fail', [PaymentController::class, 'fail']);
    Route::patch('/payments/{id}/refund', [PaymentController::class, 'refund']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/profile', [AdminProfileController::class, 'show']);
        Route::put('/profile', [AdminProfileController::class, 'update']);
        Route::put('/profile/password', [AdminProfileController::class, 'changePassword']);
    });
});
