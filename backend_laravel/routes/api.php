<?php


use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Admin\CustomerController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Admin\GuideController;

//===================================đk, login, logout======================================
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});
//==========================================================================================

Route::middleware('auth:sanctum')->prefix('admin')->group(function () { //middleware('auth:sanctum') là lớp bảo vệ (authentication middleware) của Laravel Sanctum.

    //============================================Quản lý user==================================
    //Tính tổng số lượng tài khoảng
    Route::get('/customers/count', [CustomerController::class, 'count']);
    //lấy danh sách user
    Route::get('/customers', [CustomerController::class, 'index']);
    //Chức năng search
    Route::get('/customers/search', [CustomerController::class, 'search']);
    //Thêm user
    Route::post('/customers', [CustomerController::class, 'store']);
    //Xem chi tiết
    Route::get('/customers/{id}', [CustomerController::class, 'show']);
    // Edit
    Route::put('/customers/{id}', [CustomerController::class, 'update']);
    // Khóa tk
    Route::patch('/customers/{id}/lock', [CustomerController::class, 'lock']);
    //Khôi phục tài khoản
    Route::patch('/customers/{id}/unlock', [CustomerController::class, 'unlock']);

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
});
