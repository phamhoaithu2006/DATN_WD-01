<?php
use App\Http\Controllers\Api\Admin\AdminProfileController;
use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\CustomerManagerController;
use App\Http\Controllers\Api\Admin\DestinationController;
use App\Http\Controllers\Api\Admin\PaymentController;
use App\Http\Controllers\Api\Admin\SettingController;
use App\Http\Controllers\Api\Admin\WidgetController;
use App\Http\Controllers\Api\Admin\TourController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Admin\GuideController;
use App\Http\Controllers\Api\Customer\CustomerController;
use App\Http\Controllers\Api\PublicSettingController;
use App\Http\Controllers\Api\PublicWidgetController;
use Illuminate\Support\Facades\Route;

//===================================đk, login, logout======================================
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});
//==========================================================================================

//================================================== CUSTOMER ===========================================

//=============================Lấy thông tin khách hàng khi đăng nhập ==========================
//Lấy thông tin user khi đăng nhập
Route::middleware('auth:sanctum')->get('/user', [AuthController::class, 'me']);
//Edit
Route::middleware('auth:sanctum')->group(function () {
    //Edit thông tin (ko bao gồm pass)
    Route::put('/profile/update', [CustomerController::class, 'updateProfile']);
    //Edit pass (TH: nhớ pass cũ)
    Route::put('/profile/change-password', [CustomerController::class, 'changePassword']);
});
//Edit pass (không nhớ mật khẩu - cho xác nhận email or sdt -> gửi otp -> đổi pass)
//Gửi OTP
Route::post('/forgot-password', [CustomerController::class, 'forgotPassword']);
//Xác nhận OTP và Đổi pass
Route::post('/reset-password', [CustomerController::class, 'resetPassword']);
//===============================================================================================

//============================== Api tour giao diện customer ====================================
// Các API cho khách hàng (không cần bảo mật cao, ai cũng truy cập được)
Route::prefix('tours')->group(function () {
    // Danh sách tour
    Route::get('/', [TourController::class, 'index']); 
    // Chi tiết tour theo slug   
    Route::get('/{slug}', [TourController::class, 'show']); 
});


//========================================== ADMIN ====================================================
Route::middleware('auth:sanctum')->prefix('admin')->group(function () { 
//middleware('auth:sanctum') là lớp bảo vệ (authentication middleware) của Laravel Sanctum.

    //============================================Quản lý user==================================
    //Tính tổng số lượng tài khoảng 
    Route::get('/customers/count', [CustomerManagerController::class, 'count']);
    //lấy danh sách user
    Route::get('/customers', [CustomerManagerController::class, 'index']);
    //Chức năng search
    Route::get('/customers/search', [CustomerManagerController::class, 'search']);
    //Thêm user
    Route::post('/customers', [CustomerManagerController::class, 'store']);
    //Xem chi tiết
    Route::get('/customers/{id}', [CustomerManagerController::class, 'show']);
    // Edit
    Route::put('/customers/{id}', [CustomerManagerController::class, 'update']);
    // Khóa tk
    Route::patch('/customers/{id}/lock', [CustomerManagerController::class, 'lock']);
    //Khôi phục tài khoản 
    Route::patch('/customers/{id}/unlock', [CustomerManagerController::class, 'unlock']);
    //==========================================================================================

    //==========================================Quản lý HDV==========================================
    //Tính tổng số lượng HDV
    Route::get('/guides/statistics', [GuideController::class, 'statistics']);
    //Lấy danh sách HDV
    Route::get('/guides', [GuideController::class, 'index']);
    //Xem chi tiết HDV
    Route::get('/guides/{id}', [GuideController::class, 'show']);
    //Thêm HDV
    Route::post('/guides', [GuideController::class, 'store']);
    //Sửa HDV
    Route::put('/guides/{id}', [GuideController::class, 'update']);
    //Xóa HDV
    Route::delete('/guides/{id}', [GuideController::class, 'destroy']);


    //====================================Quản lý địa chỉ tour ======================================
    //Tìm kiếm
    Route::get('destinations/search', [DestinationController::class, 'search']);
    //Lấy danh sách |  GET        |  http://127.0.0.1:8000/api/destinations
    //Xem chi tiết  |  GET        |  http://127.0.0.1:8000/api/destinations/{id}
    //Thêm mới      |  POST       |  http://127.0.0.1:8000/api/destinations
    //Cập nhật      |  PUT/PATCH  |  http://127.0.0.1:8000/api/destinations/{id}
    //Xóa mềm       |  DELETE     |  http://127.0.0.1:8000/api/destinations/{id}
    //Router tích hợp cả 5 chức năng
    Route::apiResource('destinations', DestinationController::class);
    //Lấy danh sách xóa mềm
    Route::get('destinations/trash/list', [DestinationController::class, 'trashed']);
    //Khôi phục bản ghi đã xóa mềm
    Route::post('destinations/{id}/restore', [DestinationController::class, 'restore']);
    //xóa vĩnh viễn bản ghi
    Route::delete('destinations/{id}/force-delete', [DestinationController::class, 'forceDelete']);
    //===============================================================================================


    //============================================Quản lý danh mục tour=========================
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/search', [CategoryController::class, 'search']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);
    Route::get('/categories-trashed', [CategoryController::class, 'trashed']);
    Route::patch('/categories/{id}/restore', [CategoryController::class, 'restore']);
    //===========================================================================================


    //============================================Quản lý Tour==================================
    // Giao diện User
    Route::get('tours/public', [TourController::class, 'publicIndex']); // Hiển thị danh sách tour cho user

    // Giao diện Quản lý (Admin)
    Route::prefix('admin/tours')->group(function () {
        Route::get('/hidden-list', [TourController::class, 'hiddenTours']); // Lấy danh sách tour bị ẩn
        Route::get('/', [TourController::class, 'index']);                  // Quản lý tour (không hiện tour bị ẩn)
        Route::post('/', [TourController::class, 'store']);                 // Thêm tour
        Route::put('/{id}', [TourController::class, 'update']);             // Sửa tour
        Route::delete('/{id}', [TourController::class, 'destroy']);         // Xóa tour (Soft delete)
        
        Route::patch('/{id}/hide', [TourController::class, 'hide']);        // Ẩn tour
        Route::patch('/{id}/unhide', [TourController::class, 'unhide']);    // Bỏ ẩn tour
    });
    //===========================================================================================


    //============================================Cài đặt hệ thống public========================
    Route::get('/settings/public', [PublicSettingController::class, 'show']);
    Route::get('/widgets', [PublicWidgetController::class, 'index']);
    //===========================================================================================


    //============================================Cài đặt hệ thống admin=========================
    Route::prefix('admin')->group(function () {
        Route::get('/settings', [SettingController::class, 'index']);
        Route::put('/settings', [SettingController::class, 'update']);

        Route::get('/widgets', [WidgetController::class, 'index']);
        Route::post('/widgets', [WidgetController::class, 'store']);
        Route::get('/widgets/{id}', [WidgetController::class, 'show']);
        Route::put('/widgets/{id}', [WidgetController::class, 'update']);
        Route::delete('/widgets/{id}', [WidgetController::class, 'destroy']);
        Route::patch('/widgets/{id}/toggle-status', [WidgetController::class, 'toggleStatus']);

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
    //===========================================================================================

});
