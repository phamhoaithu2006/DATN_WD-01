<?php
use App\Http\Controllers\Api\Admin\AdminProfileController;
use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\CustomerManagerController;
use App\Http\Controllers\Api\Admin\DestinationController;
use App\Http\Controllers\Api\Admin\GuideController;
use App\Http\Controllers\Api\Admin\PaymentController;
use App\Http\Controllers\Api\Admin\SettingController;
use App\Http\Controllers\Api\Customer\TourController;
use App\Http\Controllers\Api\Admin\TourManagerController;
use App\Http\Controllers\Api\Admin\WidgetController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Customer\CustomerController;
use App\Http\Controllers\Api\Customer\WishlistController;
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


Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/auth/me', function () {
        return response()->json([
            'user' => request()->user()->load('role'),
        ]);
    });

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
});
