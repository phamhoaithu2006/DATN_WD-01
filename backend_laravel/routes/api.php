<?php


use App\Http\Controllers\Api\Admin\AdminProfileController;
use App\Http\Controllers\Api\Admin\BookingController;
use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\CertificateController;
use App\Http\Controllers\Api\Admin\CustomerManagerController;
use App\Http\Controllers\Api\Admin\DatabaseBackupController;
use App\Http\Controllers\Api\Admin\DestinationController;
use App\Http\Controllers\Api\Admin\GuideController;
use App\Http\Controllers\Api\Admin\LanguageController;
use App\Http\Controllers\Api\Admin\NotificationController;
use App\Http\Controllers\Api\Admin\PartnerController;
use App\Http\Controllers\Api\Admin\PartnerServiceController;
use App\Http\Controllers\Api\Admin\PaymentController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\Admin\SettingController;
use App\Http\Controllers\Api\Admin\SupportStaffController;
use App\Http\Controllers\Api\Admin\TourDepartureController;
use App\Http\Controllers\Api\Admin\TourManagerController;
use App\Http\Controllers\Api\Admin\WidgetController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Customer\CustomerController;
use App\Http\Controllers\Api\Customer\CustomerDashboardController;
use App\Http\Controllers\Api\Customer\NotificationCustomerController;
use App\Http\Controllers\Api\Customer\TourController;
use App\Http\Controllers\Api\Customer\WishlistController;
use App\Http\Controllers\Api\Guide\GuideProfileController;
use App\Http\Controllers\Api\PublicSettingController;
use App\Http\Controllers\Api\PublicWidgetController;
use Illuminate\Support\Facades\Route;



//======Đăng ký và đăng nhập cho người dùng======
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

    //======Thông báo khách hàng, hdv, nvht (dùng chung được hết)======
    // Hiển thị danh sách thông báo của khách hàng
    Route::get('/notifications/customers', [NotificationCustomerController::class, 'getMyNotifications']);
    // Xem chi tiết thông báo
    Route::get('/notifications/customers/{id}', [NotificationCustomerController::class, 'getNotificationDetail']);
    // API đếm số lượng thông báo chưa đọc
    Route::get('/notifications/customers/unread-count', [NotificationCustomerController::class, 'getUnreadCount']);
    // API đánh dấu đã đọc (sử dụng PATCH vì cập nhật một phần dữ liệu)
    Route::patch('/notifications/customers/{id}/read', [NotificationCustomerController::class, 'markAsRead']);
});

//===================== Đặt lại mật khẩu user=============
//xác nhận email or sdt, gửi otp
Route::post('/forgot-password', [CustomerController::class, 'forgotPassword']);
//Xác nhận otp và sửa lại mk
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



//======Admin======
Route::prefix('admin')->group(function () {
    Route::get('/settings/public', [PublicSettingController::class, 'show']);
    Route::get('/widgets', [PublicWidgetController::class, 'index']);
    Route::middleware(['auth:sanctum', 'role:admin'])->get('/roles', [CustomerManagerController::class, 'index_role']);

    // Chức năng báo cáo & thống kê
    Route::get('/reports/overview', [ReportController::class, 'getOverviewStatistics']);
    Route::get('/reports/charts', [ReportController::class, 'getChartStatistics']);

    // Quản lý sao lưu database
    Route::get('/backups', [DatabaseBackupController::class, 'index']);
    Route::post('/backups', [DatabaseBackupController::class, 'store']);
    Route::get('/backups/{filename}/download', [DatabaseBackupController::class, 'download']);
    Route::delete('/backups/{filename}', [DatabaseBackupController::class, 'destroy']);

    //======Quản lý user======
    // Quản lý người dùng
    Route::get('/customers/statistics', [CustomerManagerController::class, 'statistics']);
    Route::get('/customers/count', [CustomerManagerController::class, 'count']);
    // Lấy danh sách người dùng
    Route::get('/customers', [CustomerManagerController::class, 'index']);
    // Chức năng tìm kiếm
    Route::get('/customers/search', [CustomerManagerController::class, 'search']);
    // Thêm người dùng
    Route::post('/customers', [CustomerManagerController::class, 'store']);
    // Xem chi tiết
    Route::get('/customers/{id}', [CustomerManagerController::class, 'show']);
    // Sửa tài khoản
    Route::put('/customers/{id}', [CustomerManagerController::class, 'update']);
    // Khóa tài khoản
    Route::patch('/customers/{id}/lock', [CustomerManagerController::class, 'lock']);
    //Khôi phục tài khoản
    Route::patch('/customers/{id}/unlock', [CustomerManagerController::class, 'unlock']);

    // Quản lý HDV
    Route::get('guides/trashed',         [GuideController::class, 'trashed']);
    Route::get('guides/search',          [GuideController::class, 'search']);
    Route::get('guides/filter',          [GuideController::class, 'filter']);
    Route::get('guides/statistics',      [GuideController::class, 'statistics']);
    Route::patch('guides/{id}/restore',  [GuideController::class, 'restore']);
    Route::delete('guides/{id}/force',   [GuideController::class, 'forceDelete']);
    Route::get('guides',                 [GuideController::class, 'index']);
    Route::post('guides',                [GuideController::class, 'store']);
    Route::get('guides/{id}',            [GuideController::class, 'show']);
    Route::put('guides/{id}',            [GuideController::class, 'update']);
    Route::delete('guides/{id}',         [GuideController::class, 'destroy']);

    // Dropdown cho frontend
    Route::get('languages',              [LanguageController::class, 'index']);
    Route::get('certificates',           [CertificateController::class, 'index']);
    Route::get('guide-specializations',  function () {
        return response()->json([
            'message' => 'Danh sách chuyên môn',
            'data'    => \App\Models\GuideSpecialization::all(),
        ]);
    });
    // Quản lý đối tác
    Route::get('partners/service-types',   [PartnerController::class, 'serviceTypes']);
    Route::get('partners/statistics',      [PartnerController::class, 'statistics']);
    Route::get('partners/trashed',         [PartnerController::class, 'trashed']);
    Route::patch('partners/{id}/restore',  [PartnerController::class, 'restore']);
    Route::delete('partners/{id}/force',   [PartnerController::class, 'forceDestroy']);
    Route::get('partners',                 [PartnerController::class, 'index']);
    Route::post('partners',                [PartnerController::class, 'store']);
    Route::get('partners/{id}',            [PartnerController::class, 'show']);
    Route::put('partners/{id}',            [PartnerController::class, 'update']);
    Route::delete('partners/{id}',         [PartnerController::class, 'destroy']);
    Route::get('partners/{partnerId}/services',                [PartnerServiceController::class, 'index']);
    Route::post('partners/{partnerId}/services',               [PartnerServiceController::class, 'store']);
    Route::get('partners/{partnerId}/services/{id}',           [PartnerServiceController::class, 'show']);
    Route::put('partners/{partnerId}/services/{id}',           [PartnerServiceController::class, 'update']);
    Route::delete('partners/{partnerId}/services/{id}',        [PartnerServiceController::class, 'destroy']);
    Route::patch('partners/{partnerId}/services/{id}/restore', [PartnerServiceController::class, 'restore']);
    Route::delete('partners/{partnerId}/services/{id}/force',  [PartnerServiceController::class, 'forceDestroy']);
    // Quản lý nhân viên hỗ trợ
    // Xem danh sách
    Route::get('/support-staff', [SupportStaffController::class, 'index']);
    // Tính tổng số lượng
    Route::get('/support-staff/statistics', [SupportStaffController::class, 'statistics']);
    // Thêm thông tin
    Route::post('/support-staff', [SupportStaffController::class, 'store']);
    // Xem chi tiết
    Route::get('/support-staff/{id}', [SupportStaffController::class, 'show']);
    // Sửa thông tin
    Route::put('/support-staff/{id}', [SupportStaffController::class, 'update']);
    // Xóa thông tin
    Route::delete('/support-staff/{id}', [SupportStaffController::class, 'destroy']);

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
    Route::prefix('tours')->group(function () {
        Route::get('/', [TourManagerController::class, 'index']); // Quản lý tour (không hiện tour bị ẩn)
        Route::post('/', [TourManagerController::class, 'store']); // Thêm tour
        Route::put('/{id}', [TourManagerController::class, 'update']); // Sửa tour
        Route::delete('/{id}', [TourManagerController::class, 'destroy']); // Xóa tour

        Route::get('/hidden-list', [TourManagerController::class, 'hiddenTours']); // Lấy danh sách tour bị ẩn
        Route::patch('/{id}/hide', [TourManagerController::class, 'hide']); // Ẩn tour
        Route::patch('/{id}/unhide', [TourManagerController::class, 'unhide']); // Hiện tour

        // Quản lý lịch khởi hành (Tour Departures)
        Route::get('/{tourId}/departures', [TourDepartureController::class, 'index']);   // Danh sách lịch khởi hành của tour
        Route::post('/{tourId}/departures', [TourDepartureController::class, 'store']);  // Thêm lịch khởi hành mới
        Route::put('/departures/{id}', [TourDepartureController::class, 'update']);       // Cập nhật lịch khởi hành
        Route::delete('/departures/{id}', [TourDepartureController::class, 'destroy']);   // Xóa lịch khởi hành
    });

    // Cài đặt hệ thống và widget công khai
    Route::get('/settings/public', [PublicSettingController::class, 'show']);
    Route::get('/widgets', [PublicWidgetController::class, 'index']);

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

    // Quản lý thanh toán
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

    //======Booking======
    Route::prefix('bookings')->group(function () {
        Route::get('/',            [BookingController::class, 'index']);
        Route::get('/statistics',  [BookingController::class, 'statistics']);
        Route::get('/{id}',        [BookingController::class, 'show']);
        Route::post('/',           [BookingController::class, 'store']);
        Route::put('/{id}',        [BookingController::class, 'update']);
        Route::patch('/{id}/cancel', [BookingController::class, 'softDelete']);
        Route::delete('/{id}',     [BookingController::class, 'destroy']);
    });


    //======Chức năng gửi thông báo======
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
    //Xóa mềm bản nháp
    Route::delete('/notifications/draft/{id}', [NotificationController::class, 'destroy']);
    //Danh sách bản nháp xóa mềm
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
});

//=============================== Hướng dẫn viên ===============================
Route::middleware('auth:sanctum')->group(function () {
    //Lấy thông tin hdv
    Route::get('/guide/profile', [GuideProfileController::class, 'show']);
    //Sửa thông tin hdv
    Route::put('/guide/profile', [GuideProfileController::class, 'update']);
    //Sửa lại pass khi nhớ mk cũ
    Route::put('/guide/change-password', [GuideProfileController::class, 'changePassword']);
});