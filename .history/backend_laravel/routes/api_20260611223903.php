<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Admin\CustomerController;


//============================================Quản lý user==================================
// Định nghĩa route GET để lấy danh sách khách hàng
// Khi client gọi tới: /api/customers, nó sẽ chạy hàm index trong CustomerController
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
//===========================================================================================