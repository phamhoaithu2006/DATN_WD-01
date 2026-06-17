<?php

use App\Http\Controllers\Api\Admin\AdminProfileController;
use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\CustomerManagerController;
use App\Http\Controllers\Api\Admin\DestinationController;
use App\Http\Controllers\Api\Admin\GuideController;
use App\Http\Controllers\Api\Admin\PaymentController;
use App\Http\Controllers\Api\Admin\SettingController;
use App\Http\Controllers\Api\Admin\TourManagerController;
use App\Http\Controllers\Api\Admin\WidgetController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Customer\CustomerController;
use App\Http\Controllers\Api\Customer\TourController;
use App\Http\Controllers\Api\Customer\WishlistController;
use App\Http\Controllers\Api\PublicSettingController;
use App\Http\Controllers\Api\PublicWidgetController;
use Illuminate\Support\Facades\Route;

//=================================== đăng ký, login, logout =====================================
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    Route::middleware(['auth:sanctum', 'admin'])->get('/me', function () {
        return response()->json([
            'user' => request()->user()->load('role'),
        ]);
    });
});
//==============================================================================================

//======================================= CUSTOMER ==============================================
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::put('/profile/update', [CustomerController::class, 'updateProfile']);
    Route::put('/profile/change-password', [CustomerController::class, 'changePassword']);
});

Route::post('/forgot-password', [CustomerController::class, 'forgotPassword']);
Route::post('/reset-password', [CustomerController::class, 'resetPassword']);

Route::prefix('tours')->group(function () {
    Route::get('/search', [TourController::class, 'search_gdkh']);
    Route::get('/filter', [TourController::class, 'filter_gdkh']);
    Route::get('/', [TourController::class, 'index_gdkh']);
    Route::get('/{slug}', [TourController::class, 'show_gdkh']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('wishlist', [WishlistController::class, 'index']);
        Route::post('wishlist', [WishlistController::class, 'store']);
        Route::delete('wishlist/{tour_id}', [WishlistController::class, 'destroy']);
    });
});
//==============================================================================================

// Public system settings and widgets
Route::get('/settings/public', [PublicSettingController::class, 'show']);
Route::get('/widgets', [PublicWidgetController::class, 'index']);
//==============================================================================================

//========================================= ADMIN ===============================================
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    // Quản lý khách hàng
    Route::get('/customers/count', [CustomerManagerController::class, 'count']);
    Route::get('/customers', [CustomerManagerController::class, 'index']);
    Route::get('/customers/search', [CustomerManagerController::class, 'search']);
    Route::post('/customers', [CustomerManagerController::class, 'store']);
    Route::get('/customers/{id}', [CustomerManagerController::class, 'show']);
    Route::put('/customers/{id}', [CustomerManagerController::class, 'update']);
    Route::patch('/customers/{id}/lock', [CustomerManagerController::class, 'lock']);
    Route::patch('/customers/{id}/unlock', [CustomerManagerController::class, 'unlock']);

    // Quản lý HDV
    Route::get('/guides/statistics', [GuideController::class, 'statistics']);
    Route::get('/guides', [GuideController::class, 'index']);
    Route::get('/guides/{id}', [GuideController::class, 'show']);
    Route::post('/guides', [GuideController::class, 'store']);
    Route::put('/guides/{id}', [GuideController::class, 'update']);
    Route::delete('/guides/{id}', [GuideController::class, 'destroy']);

    // Quản lý địa điểm tour
    Route::get('destinations/search', [DestinationController::class, 'search']);
    Route::apiResource('destinations', DestinationController::class);
    Route::get('destinations/trash/list', [DestinationController::class, 'trashed']);
    Route::post('destinations/{id}/restore', [DestinationController::class, 'restore']);
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
    Route::get('tours/public', [TourManagerController::class, 'publicIndex']);
    Route::prefix('tours')->group(function () {
        Route::get('/', [TourManagerController::class, 'index']);
        Route::post('/', [TourManagerController::class, 'store']);
        Route::put('/{id}', [TourManagerController::class, 'update']);
        Route::delete('/{id}', [TourManagerController::class, 'destroy']);
        Route::get('/hidden-list', [TourManagerController::class, 'hiddenTours']);
        Route::patch('/{id}/hide', [TourManagerController::class, 'hide']);
        Route::patch('/{id}/unhide', [TourManagerController::class, 'unhide']);
    });

    // Quản lý cài đặt admin
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

    Route::get('/profile', [AdminProfileController::class, 'show']);
    Route::put('/profile', [AdminProfileController::class, 'update']);
    Route::put('/profile/password', [AdminProfileController::class, 'changePassword']);
});
