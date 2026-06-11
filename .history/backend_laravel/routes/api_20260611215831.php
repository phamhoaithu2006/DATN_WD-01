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
//Tạo 
Route::post('/customers', [CustomerController::class, 'store']);
//===========================================================================================