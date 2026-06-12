<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CustomerController;


//============================================Quản lý user==================================
// Định nghĩa route GET để lấy danh sách khách hàng
// Khi client gọi tới: /api/customers, nó sẽ chạy hàm index trong CustomerController
//lấy danh sách user
Route::get('/customers', [CustomerController::class, 'index']);
//Chức năng search
Route::get('/customers/search', [CustomerController::class, 'search']);
//Thêm user
Route::post('/customers', [CustomerController::class, 'store']);
//Xem chi tiết
Route::get('/customers/{id}', [CustomerController::class, 'show']);
// Sử dụng PUT để cập nhật toàn bộ hoặc PATCH để cập nhật một phần
Route::put('/customers/{id}', [CustomerController::class, 'update']);
//===========================================================================================