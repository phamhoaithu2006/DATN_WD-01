<?php

use App\Http\Controllers\Api\Admin\AdminProfileController;
use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\CustomerManagerController;
use App\Http\Controllers\Api\Admin\DatabaseBackupController;
use App\Http\Controllers\Api\Admin\DestinationController;
use App\Http\Controllers\Api\Admin\GuideController;
use App\Http\Controllers\Api\Admin\NotificationController;
use App\Http\Controllers\Api\Admin\PaymentController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\Admin\SettingController;
use App\Http\Controllers\Api\Admin\SupportStaffController;
use App\Http\Controllers\Api\Admin\TourManagerController;
use App\Http\Controllers\Api\Admin\WidgetController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Customer\CustomerController;
use App\Http\Controllers\Api\Customer\CustomerDashboardController;
use App\Http\Controllers\Api\Customer\TourController;
use App\Http\Controllers\Api\Customer\WishlistController;
use App\Http\Controllers\Api\PublicSettingController;
use App\Http\Controllers\Api\PublicWidgetController;
use Illuminate\Support\Facades\Route;

// =================================== đăng ký, login, logout =====================================
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
// ==============================================================================================

// ======================================= CUSTOMER ==============================================
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::get('/profile/summary', [CustomerDashboardController::class, 'summary']);
    Route::get('/profile/bookings', [CustomerDashboardController::class, 'bookings']);
    Route::put('/profile/update', [CustomerController::class, 'updateProfile']);
    Route::put('/profile/change-password', [CustomerController::class, 'changePassword']);
});

Route::post('/forgot-password', [CustomerController::class, 'forgotPassword']);
Route::post('/reset-password', [CustomerController::class, 'resetPassword']);
Route::post('/travel-assistant', [CustomerDashboardController::class, 'travelAssistant']);

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

    // Chi tiết tour theo slug   
    Route::get('/{slug}', [TourController::class, 'show_gdkh']);
});
// ==============================================================================================

   //lấy dánh sách role
    Route::get('/roles', [CustomerManagerController::class, 'index_role']);

// Public system settings and widgets
Route::get('/settings/public', [PublicSettingController::class, 'show']);
Route::get('/widgets', [PublicWidgetController::class, 'index']);
// ==============================================================================================



//========================================= ADMIN ===============================================
Route::prefix('admin')->group(function () {
    // CHỨC NĂNG BÁO CÁO & THỐNG KÊ
    Route::get('/reports/overview', [ReportController::class, 'getOverviewStatistics']);
    Route::get('/reports/charts', [ReportController::class, 'getChartStatistics']);

    //============================================Quản lý user==================================
    // Quản lý khách hàng
    Route::get('/customers/statistics', [CustomerManagerController::class, 'statistics']);
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
    Route::get('/guides/search', [GuideController::class, 'search']);
    Route::get('/guides/filter', [GuideController::class, 'filter']);
    //Xem chi tiết HDV
    Route::get('/guides/{id}', [GuideController::class, 'show']);
    //Thêm HDV
    Route::post('/guides', [GuideController::class, 'store']);
    //Sửa HDV
    Route::put('/guides/{id}', [GuideController::class, 'update']);
    //Xóa HDV
    Route::delete('/guides/{id}', [GuideController::class, 'destroy']);

    //=============================================Quản lý nhân viên hỗ trợ================================
    Route::get('/support-staff', [SupportStaffController::class, 'index']);       // Xem danh sách + Lọc
    Route::post('/support-staff', [SupportStaffController::class, 'store']);     // Thêm mới
    Route::get('/support-staff/{id}', [SupportStaffController::class, 'show']);   // Xem chi tiết
    Route::put('/support-staff/{id}', [SupportStaffController::class, 'update']); // Cập nhật


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
    Route::get('tours/public', [TourManagerController::class, 'publicIndex']); // Hiển thị danh sách tour cho user

    // Giao diện Quản lý (Admin)
    Route::prefix('tours')->group(function () {
        Route::get('/', [TourManagerController::class, 'index']);                  // Quản lý tour (không hiện tour bị ẩn)
        Route::post('/', [TourManagerController::class, 'store']);                 // Thêm tour
        Route::put('/{id}', [TourManagerController::class, 'update']);             // Sửa tour
        Route::delete('/{id}', [TourManagerController::class, 'destroy']);         // Xóa tour (Soft delete)

        Route::get('/hidden-list', [TourManagerController::class, 'hiddenTours']); // Lấy danh sách tour bị ẩn
        Route::patch('/{id}/hide', [TourManagerController::class, 'hide']);        // Ẩn tour
        Route::patch('/{id}/unhide', [TourManagerController::class, 'unhide']);    // Bỏ ẩn tour
    });
    //===========================================================================================


    //============================================Cài đặt hệ thống public========================
    Route::get('/settings/public', [PublicSettingController::class, 'show']);
    Route::get('/widgets', [PublicWidgetController::class, 'index']);
    //===========================================================================================


    //============================================Cài đặt hệ thống admin=========================
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
    //===========================================================================================


    //================================Chức năng gửi thông báo ====================================
    //Tìm kiếm và lọc user
    Route::get('/notifications/users', [NotificationController::class, 'getUsers']);
    //Tạo bản nháp thông báo
    Route::post('/notifications/draft', [NotificationController::class, 'saveDraft']);
    //Hiển thị danh sách bản nháp 
    Route::get('/notifications/drafts', [NotificationController::class, 'listDrafts']);
    //xem chi tiết bản nháp
    Route::get('/notifications/draft/{id}', [NotificationController::class, 'showDraft']);
    // Route cập nhật bản nháp (sử dụng ID trong URL)
    Route::put('/notifications/draft/{id}', [NotificationController::class, 'updateDraft']);
    //Xóa mềm bản nháp 
    Route::delete('/notifications/draft/{id}', [NotificationController::class, 'destroy']);
    //Danh sách bản nháp xóa mềm 
    Route::get('/notifications/drafts/trashed', [NotificationController::class, 'listTrashedDrafts']);
    //Khôi phục xóa mềm
    Route::post('/notifications/draft/restore/{id}', [NotificationController::class, 'restoreDraft']);
    //Xóa vĩnh viễn bản nháp
    Route::delete('/notifications/draft/force-delete/{id}', [NotificationController::class, 'forceDeleteDraft']);
    //Gửi thông báo 
    Route::post('/notifications/send/{id}', [NotificationController::class, 'sendNotification']);
    //Hiển thị thông báo đã gửi 
    Route::get('/notifications/get-all-send', [NotificationController::class, 'getAllSentNotifications']);
    //Thu hồi lại thông báo đã gửi
    Route::delete('/notifications/revoke/{draft_id}', [NotificationController::class, 'revoke']);


});
