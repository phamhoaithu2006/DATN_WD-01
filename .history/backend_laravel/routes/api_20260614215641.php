<?php


use App\Http\Controllers\Api\Admin\AdminProfileController;
use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\CustomerManagerController;
use App\Http\Controllers\Api\Admin\DestinationController;
use App\Http\Controllers\Api\Admin\PaymentController;
use App\Http\Controllers\Api\Admin\SettingController;
use App\Http\Controllers\Api\Admin\WidgetController;
use App\Http\Controllers\Api\AuthController;
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

//====================================Quản lý địa chỉ tour ======================================
Route::apiResource('destinations', DestinationController::class);
//===============================================================================================


//============================================Quản lý danh mục tour=========================
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/search', [CategoryController::class, 'search']);
Route::post('/categories', [CategoryController::class, 'store']);
Route::put('/categories/{id}', [CategoryController::class, 'update']);
Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);
Route::get('/categories-trashed', [CategoryController::class, 'trashed']);
Route::patch('/categories/{id}/restore', [CategoryController::class, 'restore']);

//============================================Cài đặt hệ thống public========================
Route::get('/settings/public', [PublicSettingController::class, 'show']);
Route::get('/widgets', [PublicWidgetController::class, 'index']);

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
