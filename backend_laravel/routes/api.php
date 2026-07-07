<?php

use App\Http\Controllers\Api\Admin\AdminProfileController;
use App\Http\Controllers\Api\Admin\AdminTourDepartureBookingController;
use App\Http\Controllers\Api\Admin\BookingController;
use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\CertificateController;
use App\Http\Controllers\Api\Admin\CustomerManagerController;
use App\Http\Controllers\Api\Admin\DatabaseBackupController;
use App\Http\Controllers\Api\Admin\DestinationController;
use App\Http\Controllers\Api\Admin\GuideController;
use App\Http\Controllers\Api\Admin\LanguageController;
use App\Http\Controllers\Api\Admin\NotificationController;
use App\Http\Controllers\Api\Admin\PaymentController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\Admin\ServiceCategoryController;
use App\Http\Controllers\Api\Admin\SettingController;
use App\Http\Controllers\Api\Admin\SupportStaffController;
use App\Http\Controllers\Api\Admin\TourDepartureController;
use App\Http\Controllers\Api\Admin\TourDepartureGuideAssignmentController;
use App\Http\Controllers\Api\Admin\TourManagerController;
use App\Http\Controllers\Api\Admin\WidgetController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Customer\CustomerBookingController;
use App\Http\Controllers\Api\Customer\CustomerController;
use App\Http\Controllers\Api\Customer\CustomerDashboardController;
use App\Http\Controllers\Api\Customer\NotificationCustomerController;
use App\Http\Controllers\Api\Customer\TourController;
use App\Http\Controllers\Api\Customer\WishlistController;
use App\Http\Controllers\Api\Guide\GuideAttendanceController;
use App\Http\Controllers\Api\Guide\GuideDashboardController;
use App\Http\Controllers\Api\Guide\GuideProfileController;
use App\Http\Controllers\Api\Guide\GuideTourController;
use App\Http\Controllers\Api\PublicSettingController;
use App\Http\Controllers\Api\PublicWidgetController;
use App\Models\GuideSpecialization;
use Illuminate\Support\Facades\Route;

// ======Đăng ký và đăng nhập cho người dùng======
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    // Đăng xuất (chỉ có thể thực hiện khi người dùng đã đăng nhập)
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
    });
    // Lấy thông tin người dùng hiện tại (chỉ có thể thực hiện khi người dùng đã đăng nhập)
    Route::middleware('auth:sanctum')->get('/me', function () {
        return response()->json([
            'user' => request()->user()->load('role'),
        ]);
    });
});

// Khách hàng đã đăng nhập
Route::middleware(['auth:sanctum', 'role:customer'])->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::get('/profile/summary', [CustomerDashboardController::class, 'summary']);
    Route::get('/profile/bookings', [CustomerDashboardController::class, 'bookings']);
    Route::put('/profile/update', [CustomerController::class, 'updateProfile']);
    Route::put('/profile/change-password', [CustomerController::class, 'changePassword']);

    //đặt tour
    Route::post('customer/bookings/preview', [CustomerBookingController::class, 'preview']);
    Route::post('customer/bookings', [CustomerBookingController::class, 'store']);
});

Route::middleware(['auth:sanctum'])->group(function () {
// ======Thông báo khách hàng, hdv, nvht (dùng chung được hết)======
    // Hiển thị danh sách thông báo của khách hàng
    Route::get('/notifications/customers', [NotificationCustomerController::class, 'getMyNotifications']);
    // Xem chi tiết thông báo
    Route::get('/notifications/customers/{id}', [NotificationCustomerController::class, 'getNotificationDetail']);
    // API đếm số lượng thông báo chưa đọc
    Route::get('/notifications/customers/unread-count', [NotificationCustomerController::class, 'getUnreadCount']);
    // API đánh dấu đã đọc (sử dụng PATCH vì cập nhật một phần dữ liệu)
    Route::patch('/notifications/customers/{id}/read', [NotificationCustomerController::class, 'markAsRead']);
});

// ===================== Đặt lại mật khẩu user=============
// xác nhận email or sdt, gửi otp
Route::post('/forgot-password', [CustomerController::class, 'forgotPassword']);
// Xác nhận otp và sửa lại mk
Route::post('/reset-password', [CustomerController::class, 'resetPassword']);
Route::post('/travel-assistant', [CustomerDashboardController::class, 'travelAssistant']);

// Quản lý tour cho khách hàng
Route::prefix('tours')->group(function () {
    Route::get('/search', [TourController::class, 'search_gdkh']);
    Route::get('/filter', [TourController::class, 'filter_gdkh']);
    Route::get('/', [TourController::class, 'index_gdkh']);
    // Quản lý danh sách yêu thích (wishlist) cho khách hàng
    Route::middleware(['auth:sanctum', 'role:customer'])->group(function () {
        Route::get('wishlist', [WishlistController::class, 'index']);
        Route::post('wishlist', [WishlistController::class, 'store']);
        Route::delete('wishlist/{tour_id}', [WishlistController::class, 'destroy']);
    });

    // Chi tiết tour theo slug
    Route::get('/{slug}', [TourController::class, 'show_gdkh']);
});

// Lấy danh  sách role
Route::get('/roles', [CustomerManagerController::class, 'index_role']);
Route::get('/settings/public', [PublicSettingController::class, 'show']);
Route::get('/widgets', [PublicWidgetController::class, 'index']);

// ======Admin======
Route::prefix('admin')->group(function () {
    Route::get(
        'guides/destination-options',
        [DestinationController::class, 'options']
    );
    Route::get('/settings/public', [PublicSettingController::class, 'show']);
    Route::get('/widgets', [PublicWidgetController::class, 'index']);
    Route::middleware(['auth:sanctum', 'role:admin'])->get('/roles', [CustomerManagerController::class, 'index_role']);
    Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
        Route::apiResource('service-categories', ServiceCategoryController::class)
            ->parameters(['service-categories' => 'id'])
            ->whereNumber('id');
    });

    // Chức năng báo cáo & thống kê
    Route::get('/reports/overview', [ReportController::class, 'getOverviewStatistics']);
    Route::get('/reports/charts', [ReportController::class, 'getChartStatistics']);

    // Quản lý sao lưu database
    Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
        Route::get('/backups', [DatabaseBackupController::class, 'index']);
        Route::post('/backups', [DatabaseBackupController::class, 'store']);
        Route::get('/backups/{filename}/download', [DatabaseBackupController::class, 'download']);
        Route::delete('/backups/{filename}', [DatabaseBackupController::class, 'destroy']);
    });

    // ======Quản lý user======
    // Quản lý người dùng
    Route::get('/customers/statistics', [CustomerManagerController::class, 'statistics'])->middleware(['auth:sanctum', 'role:admin']);
    Route::get('/customers/count', [CustomerManagerController::class, 'count'])->middleware(['auth:sanctum', 'role:admin']);
    // Lấy danh sách người dùng
    Route::get('/customers', [CustomerManagerController::class, 'index'])->middleware(['auth:sanctum', 'role:admin']);
    // Chức năng tìm kiếm
    Route::get('/customers/search', [CustomerManagerController::class, 'search'])->middleware(['auth:sanctum', 'role:admin']);
    // Thêm người dùng
    Route::post('/customers', [CustomerManagerController::class, 'store'])->middleware(['auth:sanctum', 'role:admin']);
    // Xem chi tiết
    Route::get('/customers/{id}', [CustomerManagerController::class, 'show'])->middleware(['auth:sanctum', 'role:admin']);
    // Sửa tài khoản
    Route::put('/customers/{id}', [CustomerManagerController::class, 'update'])->middleware(['auth:sanctum', 'role:admin']);
    // Khóa tài khoản
    Route::patch('/customers/{id}/lock', [CustomerManagerController::class, 'lock'])->middleware(['auth:sanctum', 'role:admin']);
    // Khôi phục tài khoản
    Route::patch('/customers/{id}/unlock', [CustomerManagerController::class, 'unlock'])->middleware(['auth:sanctum', 'role:admin']);

    // Quản lý HDV
    Route::get('guides/trashed', [GuideController::class, 'trashed']);
    Route::get('guides/search', [GuideController::class, 'search']);
    Route::get('guides/filter', [GuideController::class, 'filter']);
    Route::get('guides/statistics', [GuideController::class, 'statistics']);
    Route::get('guides/available-users', [GuideController::class, 'availableUsers']);
    Route::patch('guides/{id}/restore', [GuideController::class, 'restore']);
    Route::delete('guides/{id}/force', [GuideController::class, 'forceDelete']);
    Route::get('guides', [GuideController::class, 'index']);
    Route::post('guides', [GuideController::class, 'store']);
    Route::get('guides/{id}', [GuideController::class, 'show']);
    Route::put('guides/{id}', [GuideController::class, 'update']);
    Route::delete('guides/{id}', [GuideController::class, 'destroy']);
    Route::post('guides/{id}/avatar', [GuideController::class, 'uploadAvatar']);
    Route::delete('guides/{id}/avatar', [GuideController::class, 'deleteAvatar']);
    // Dropdown cho frontend
    Route::get('languages', [LanguageController::class, 'index']);
    Route::get('certificates', [CertificateController::class, 'index']);
    Route::get('guide-specializations', function () {
        return response()->json([
            'message' => 'Danh sách chuyên môn',
            'data' => GuideSpecialization::all(),
        ]);
    });
    // Quản lý chứng chỉ
    Route::get('certificates', [CertificateController::class, 'index']);
    Route::post('certificates', [CertificateController::class, 'store']);
    Route::get('certificates/{id}', [CertificateController::class, 'show']);
    Route::put('certificates/{id}', [CertificateController::class, 'update']);
    Route::delete('certificates/{id}', [CertificateController::class, 'destroy']);
    // Quản lý ngôn ngữ
    Route::get('languages', [LanguageController::class, 'index']);
    Route::post('languages', [LanguageController::class, 'store']);
    Route::get('languages/{id}', [LanguageController::class, 'show']);
    Route::put('languages/{id}', [LanguageController::class, 'update']);
    Route::delete('languages/{id}', [LanguageController::class, 'destroy']);

    // Quản lý cấp độ theo ngôn ngữ
    Route::get('languages/{languageId}/levels', [LanguageController::class, 'levels']);
    Route::post('languages/{languageId}/levels', [LanguageController::class, 'storeLevel']);
    Route::put('languages/{languageId}/levels/{levelId}', [LanguageController::class, 'updateLevel']);
    Route::delete('languages/{languageId}/levels/{levelId}', [LanguageController::class, 'destroyLevel']);

    // Quản lý nhân viên hỗ trợ
    // Xem danh sách
    Route::get('/support-staff', [SupportStaffController::class, 'index']);
    // Tính tổng số lượng
    Route::get('/support-staff/statistics', [SupportStaffController::class, 'statistics']);
    // Thùng rác
    Route::get('/support-staff/trashed', [SupportStaffController::class, 'trashed']);
    // Thêm thông tin
    Route::post('/support-staff', [SupportStaffController::class, 'store']);
    // Xem chi tiết
    Route::get('/support-staff/{id}', [SupportStaffController::class, 'show']);
    // Sửa thông tin
    Route::put('/support-staff/{id}', [SupportStaffController::class, 'update']);
    // Upload avatar
    Route::post('/support-staff/{id}/avatar', [SupportStaffController::class, 'uploadAvatar']);
    // Xóa avatar
    Route::delete('/support-staff/{id}/avatar', [SupportStaffController::class, 'deleteAvatar']);
    // Xóa thông tin
    Route::delete('/support-staff/{id}', [SupportStaffController::class, 'destroy']);
    // Khôi phục từ thùng rác
    Route::patch('/support-staff/{id}/restore', [SupportStaffController::class, 'restore']);
    // Xóa vĩnh viễn
    Route::delete('/support-staff/{id}/force-delete', [SupportStaffController::class, 'forceDestroy']);

    // Quản lý địa chỉ tour
    // Tìm kiếm
    Route::get('destinations/search', [DestinationController::class, 'search']);
    // Lấy danh sách |  GET        |  http://127.0.0.1:8000/api/destinations
    // Xem chi tiết  |  GET        |  http://127.0.0.1:8000/api/destinations/{id}
    // Thêm mới      |  POST       |  http://127.0.0.1:8000/api/destinations
    // Cập nhật      |  PUT/PATCH  |  http://127.0.0.1:8000/api/destinations/{id}
    // Xóa mềm       |  DELETE     |  http://127.0.0.1:8000/api/destinations/{id}
    // Tích hợp cả 5 chức năng
    Route::apiResource('destinations', DestinationController::class);
    // Lấy danh sách xóa mềm
    Route::get('destinations/trash/list', [DestinationController::class, 'trashed']);
    // Khôi phục xóa mềm
    Route::post('destinations/{id}/restore', [DestinationController::class, 'restore']);
    // Xoá vĩnh viễn
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
    // Giao diện cho khách hàng
    Route::get('tours/public', [TourManagerController::class, 'publicIndex']);

    // Giao diện cho admin
    Route::middleware(['auth:sanctum', 'role:admin'])
        ->prefix('tours')
        ->group(function () {
            Route::get('/', [TourManagerController::class, 'index']);
            Route::get('/hidden-list', [TourManagerController::class, 'hiddenTours']);
            Route::get('/statistics', [TourManagerController::class, 'statistics']);
            Route::get('/{id}', [TourManagerController::class, 'show']);
            Route::post('/', [TourManagerController::class, 'store']);
            Route::put('/{id}', [TourManagerController::class, 'update']);
            Route::delete('/{id}', [TourManagerController::class, 'destroy']);
            Route::patch('/{id}/hide', [TourManagerController::class, 'hide']);
            Route::patch('/{id}/unhide', [TourManagerController::class, 'unhide']);

            Route::get('/{tourId}/departures', [TourDepartureController::class, 'index']);
            Route::post('/{tourId}/departures', [TourDepartureController::class, 'store']);
            Route::put('/departures/{id}', [TourDepartureController::class, 'update']);
            Route::delete('/departures/{id}', [TourDepartureController::class, 'destroy']);
        });

    // Cài đặt hệ thống cho admin
    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update']);

    // Quản lý widget
    Route::get('/widgets', [WidgetController::class, 'index']);
    Route::post('/widgets', [WidgetController::class, 'store']);
    Route::get('/widgets/{id}', [WidgetController::class, 'show']);
    Route::put('/widgets/{id}', [WidgetController::class, 'update']);
    Route::delete('/widgets/{id}', [WidgetController::class, 'destroy']);
    Route::patch('/widgets/{id}/toggle-status', [WidgetController::class, 'toggleStatus']);

    Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
        // Quản lý thanh toán
        Route::get('/payments', [PaymentController::class, 'index']);
        Route::get('/payments/{id}', [PaymentController::class, 'show']);
        Route::patch('/payments/{id}/confirm', [PaymentController::class, 'confirm']);
        Route::patch('/payments/{id}/fail', [PaymentController::class, 'fail']);
        Route::patch('/payments/{id}/refund', [PaymentController::class, 'refund']);

        Route::get('/profile', [AdminProfileController::class, 'show']);
        Route::put('/profile', [AdminProfileController::class, 'update']);
        Route::put('/profile/password', [AdminProfileController::class, 'changePassword']);

        // ======Booking======
        Route::prefix('bookings')->group(function () {
            Route::get('/', [BookingController::class, 'index']);
            Route::get('/statistics', [BookingController::class, 'statistics']);
            Route::get('/{id}', [BookingController::class, 'show']);
            Route::post('/', [BookingController::class, 'store']);
            Route::put('/{id}', [BookingController::class, 'update']);
            Route::patch('/{id}/cancel', [BookingController::class, 'softDelete']);
            Route::delete('/{id}', [BookingController::class, 'destroy']);
        });
    });

    // ======Chức năng gửi thông báo======
    // Tìm kiếm và lọc user
    Route::get('/notifications/users', [NotificationController::class, 'getUsers']);
    // Hiển thị danh sánh user đã chọn
    Route::post('/notifications/preview-recipients', [NotificationController::class, 'previewRecipients']);
    // Tạo bản nháp thông báo
    Route::post('/notifications/draft', [NotificationController::class, 'saveDraft']);
    // Hiển thị danh sách bản nháp
    Route::get('/notifications/drafts', [NotificationController::class, 'listDrafts']);
    // Xem chi tiết bản nháp
    Route::get('/notifications/draft/{id}', [NotificationController::class, 'showDraft']);
    // Route cập nhật bản nháp (sử dụng ID trong URL)
    Route::put('/notifications/draft/{id}', [NotificationController::class, 'updateDraft']);
    // Xóa mềm bản nháp
    Route::delete('/notifications/draft/{id}', [NotificationController::class, 'destroy']);
    // Danh sách bản nháp xóa mềm
    Route::get('/notifications/drafts/trashed', [NotificationController::class, 'listTrashedDrafts']);
    // Khôi phục xóa mềm
    Route::post('/notifications/draft/restore/{id}', [NotificationController::class, 'restoreDraft']);
    // Xóa vĩnh viễn bản nháp
    Route::delete('/notifications/draft/force-delete/{id}', [NotificationController::class, 'forceDeleteDraft']);
    // Gửi thông báo
    Route::post('/notifications/send/{id}', [NotificationController::class, 'sendNotification']);
    // Hiển thị thông báo đã gửi
    Route::get('/notifications/get-all-send', [NotificationController::class, 'getAllSentNotifications']);
    // Thu hồi lại thông báo đã gửi
    Route::delete('/notifications/revoke/{draft_id}', [NotificationController::class, 'revoke']);

    //==========quản lý lịch trình============
    //Hiển thị danh sách user đặt tour
    Route::get('tour-departures/{tourDeparture}/booked-customers', [AdminTourDepartureBookingController::class, 'index']);

    Route::prefix('tour-departures')->group(function () {
        Route::get(
            'guide-planning',
            [TourDepartureGuideAssignmentController::class, 'planning']
        );

        Route::get(
            '{departure}/guide-candidates',
            [TourDepartureGuideAssignmentController::class, 'candidates']
        );

        Route::post(
            '{departure}/auto-assign-guide',
            [TourDepartureGuideAssignmentController::class, 'autoAssign']
        );

        Route::post(
            '{departure}/assign-guide',
            [TourDepartureGuideAssignmentController::class, 'assign']
        );

        Route::patch(
            '{departure}/guide-assignments/{assignment}/cancel',
            [TourDepartureGuideAssignmentController::class, 'cancel']
        );
    });
});



// =============================== Hướng dẫn viên ===============================
Route::middleware('auth:sanctum')->group(function () {
    // Lấy thông tin hdv
    Route::get('/guide/profile', [GuideProfileController::class, 'show']);
    Route::get('/guide/dashboard', [GuideDashboardController::class, 'show']);
    // Sửa thông tin hdv
    Route::put('/guide/profile', [GuideProfileController::class, 'update']);
    // Sửa lại pass khi nhớ mk cũ
    Route::put('/guide/change-password', [GuideProfileController::class, 'changePassword']);
    // Tour được phân công (⚠️ specific routes PHẢI đứng trước {departureId})
    Route::get('/guide/tours/upcoming', [GuideTourController::class, 'upcoming']);
    Route::get('/guide/tours/ongoing', [GuideTourController::class, 'ongoing']);
    Route::get('/guide/tours/completed', [GuideTourController::class, 'completed']);
    Route::get('/guide/tours', [GuideTourController::class, 'index']);
    Route::get('/guide/tours/{tourDeparture}/overview', [GuideAttendanceController::class, 'overview']);
    Route::get('/guide/tours/{tourDeparture}/customers', [GuideAttendanceController::class, 'customers']);
    Route::get('/guide/tours/{tourDeparture}/customers/{bookingParticipant}', [GuideAttendanceController::class, 'showCustomer']);
    Route::get('/guide/tours/{tourDeparture}/attendance/statistics', [GuideAttendanceController::class, 'statistics']);
    Route::post('/guide/tours/{tourDeparture}/attendance-sessions', [GuideAttendanceController::class, 'storeSession']);
    Route::post('/guide/tours/{tourDeparture}/attendance-sessions/{attendanceSession}/check-in', [GuideAttendanceController::class, 'checkIn']);
    Route::post('/guide/tours/{tourDeparture}/attendance-sessions/{attendanceSession}/check-out', [GuideAttendanceController::class, 'checkOut']);
    Route::patch('/guide/tours/{tourDeparture}/attendance-sessions/{attendanceSession}/notes', [GuideAttendanceController::class, 'updateNote']);
    Route::get('/guide/tours/{tourDeparture}/stages', [GuideAttendanceController::class, 'stages']);
    Route::post('/guide/tours/{tourDeparture}/stages/advance', [GuideAttendanceController::class, 'advanceStage']);
    Route::get('/guide/tours/{departureId}', [GuideTourController::class, 'show']);
});
