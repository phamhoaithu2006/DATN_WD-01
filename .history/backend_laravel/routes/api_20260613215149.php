<?php


use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Admin\CustomerManagerController;
use App\Http\Controllers\Api\Customer\CustomerController;
use App\Http\Controllers\Api\AuthController;

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


//=============================Giao diện khách hàng khi đăng nhập ==========================
//Lấy thông tin user khi đăng nhập
Route::middleware('auth:sanctum')->get('/user', [AuthController::class, 'me']);
//Edit
Route::middleware('auth:sanctum')->group(function () {
    //Edit thông tin (ko bao gồm pass)
    Route::put('/profile/update', [CustomerController::class, 'updateProfile']);
    //Edit pass (TH: nhớ pass cũ)
    Route::put('/profile/change-password', [CustomerController::class, 'changePassword']);
});
//Edit pass ()
Route::post('/forgot-password', [CustomerController::class, 'forgotPassword']);
Route::post('/reset-password', [CustomerController::class, 'resetPassword']);
//==========================================================================================



