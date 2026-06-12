<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CustomerController;


//
// Định nghĩa route GET để lấy danh sách khách hàng
// Khi client gọi tới: /api/customers, nó sẽ chạy hàm index trong CustomerController
Route::get('/customers', [CustomerController::class, 'index']);
Route::get('/customers/search', [CustomerController::class, 'search']);