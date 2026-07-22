<?php

use App\Http\Controllers\Api\Admin\AdminGuideLeaveRequestController;
use App\Http\Controllers\Api\Admin\AdminGuideReplacementRequestController;
use App\Http\Controllers\Api\Admin\AdminNotificationBellController;
use App\Http\Controllers\Api\Admin\AdminNotificationController;
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
use App\Http\Controllers\Api\Admin\TourReviewController as AdminTourReviewController;
use App\Http\Controllers\Api\Admin\WidgetController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Chat\ChatBotController;
use App\Http\Controllers\Api\Customer\CustomerBookingController;
use App\Http\Controllers\Api\Customer\CustomerController;
use App\Http\Controllers\Api\Customer\CustomerDashboardController;
use App\Http\Controllers\Api\Customer\CustomerSupportRequestController;
use App\Http\Controllers\Api\Customer\GuideReviewController as CustomerGuideReviewController;
use App\Http\Controllers\Api\Customer\NotificationCustomerController;
use App\Http\Controllers\Api\Customer\TourController;
use App\Http\Controllers\Api\Customer\TourReviewController as CustomerTourReviewController;
use App\Http\Controllers\Api\Customer\VnpayPaymentController;
use App\Http\Controllers\Api\Customer\WishlistController;
use App\Http\Controllers\Api\Guide\GuideAttendanceController;
use App\Http\Controllers\Api\Guide\GuideDashboardController;
use App\Http\Controllers\Api\Guide\GuideLeaveRequestController;
use App\Http\Controllers\Api\Guide\GuideProfileController;
use App\Http\Controllers\Api\Guide\GuideReviewController as GuideGuideReviewController;
use App\Http\Controllers\Api\Guide\GuideTourController;
use App\Http\Controllers\Api\PublicCatalogController;
use App\Http\Controllers\Api\PublicSettingController;
use App\Http\Controllers\Api\PublicWidgetController;
use App\Http\Controllers\Api\Support\SupportChatController;
use App\Http\Controllers\Api\Support\SupportNotificationController;
use App\Http\Controllers\Api\Support\SupportProfileController;
use App\Http\Controllers\Api\Support\SupportRequestController;
use App\Http\Controllers\Api\TourReviewController as PublicTourReviewController;
use App\Models\GuideSpecialization;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| CHATBOT / TRỢ LÝ DU LỊCH AI
|--------------------------------------------------------------------------
*/

Route::middleware('throttle:20,1')->post('/chatbot', [ChatBotController::class, 'handleChat']);
Route::post('/travel-assistant', [ChatBotController::class, 'handleChat']);
Route::get('/travel-assistant/messages', [ChatBotController::class, 'getMessages']);

/*
|--------------------------------------------------------------------------
| XÁC THỰC (ĐĂNG KÝ / ĐĂNG NHẬP / ĐĂNG XUẤT / QUÊN MẬT KHẨU)
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    Route::middleware('auth:sanctum')->get('/me', function () {
        $user = request()->user()->load(['role', 'supportStaff.user']);

        return response()->json([
            'user' => $user,
        ]);
    });
});

Route::post('/forgot-password', [CustomerController::class, 'forgotPassword'])->middleware('throttle:5,1');
Route::post('/reset-password', [CustomerController::class, 'resetPassword']);

/*
|--------------------------------------------------------------------------
| DỮ LIỆU CÔNG KHAI (không cần đăng nhập)
|--------------------------------------------------------------------------
*/
Route::get('/roles', [CustomerManagerController::class, 'index_role']);
Route::get('/home', [PublicCatalogController::class, 'home']);
Route::get('/catalog/categories', [PublicCatalogController::class, 'categories']);
Route::get('/catalog/destinations', [PublicCatalogController::class, 'destinations']);
Route::get('/settings/public', [PublicSettingController::class, 'show']);
Route::get('/widgets', [PublicWidgetController::class, 'index']);

Route::prefix('tours')->group(function () {
    Route::get('/search', [TourController::class, 'search_gdkh']);
    Route::get('/filter', [TourController::class, 'filter_gdkh']);
    Route::get('/', [TourController::class, 'index_gdkh']);

    // Wishlist - chỉ khách hàng đã đăng nhập
    Route::middleware(['auth:sanctum', 'role:customer'])->group(function () {
        Route::get('wishlist', [WishlistController::class, 'index']);
        Route::post('wishlist', [WishlistController::class, 'store']);
        Route::delete('wishlist/{tour_id}', [WishlistController::class, 'destroy']);
    });

    Route::get('/{slug}/reviews', [PublicTourReviewController::class, 'index']);
    Route::get('/{slug}', [TourController::class, 'show_gdkh']);
});

/*
|--------------------------------------------------------------------------
| VNPAY (webhook + trạng thái thanh toán - không cần đăng nhập)
|--------------------------------------------------------------------------
*/
Route::get('webhooks/vnpay', [VnpayPaymentController::class, 'ipn'])->middleware('throttle:60,1');
Route::get('vnpay/return-status', [VnpayPaymentController::class, 'returnStatus'])->middleware('throttle:60,1');

/*
|--------------------------------------------------------------------------
| KHÁCH HÀNG ĐÃ ĐĂNG NHẬP
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:customer'])->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::get('/profile/summary', [CustomerDashboardController::class, 'summary']);
    Route::get('/profile/bookings', [CustomerDashboardController::class, 'bookings']);
    Route::put('/profile/update', [CustomerController::class, 'updateProfile']);
    Route::put('/profile/change-password', [CustomerController::class, 'changePassword']);

    // Đặt tour
    Route::post('customer/bookings/preview', [CustomerBookingController::class, 'preview']);
    Route::post('customer/bookings', [CustomerBookingController::class, 'store']);
    Route::post('customer/bookings/{booking}/continue-payment', [CustomerBookingController::class, 'continuePayment'])->whereNumber('booking');
    Route::patch('customer/bookings/{booking}/cancel', [CustomerBookingController::class, 'cancel'])->whereNumber('booking');
    Route::get('customer/payments/vnpay/{payment}', [VnpayPaymentController::class, 'status'])->whereNumber('payment');

    // Đánh giá HDV
    Route::get('customer/guide-reviewable-bookings', [CustomerGuideReviewController::class, 'reviewableBookings']);
    Route::post('customer/guide-reviews', [CustomerGuideReviewController::class, 'store']);
    Route::get('customer/guides/{guide}/reviews', [CustomerGuideReviewController::class, 'guideReviews'])->whereNumber('guide');
    Route::get('customer/guides/{guide}/tour-history', [CustomerGuideReviewController::class, 'guideTourHistory'])->whereNumber('guide');

    // Đánh giá tour
    Route::post('customer/tour-reviews', [CustomerTourReviewController::class, 'store'])->middleware('throttle:10,1');
    Route::put('customer/tour-reviews/{tourReview}', [CustomerTourReviewController::class, 'update'])
        ->whereNumber('tourReview')
        ->middleware('throttle:10,1');

    // Yêu cầu hỗ trợ
    Route::post('/customer/support-requests', [CustomerSupportRequestController::class, 'store']);
});

/*
|--------------------------------------------------------------------------
| THÔNG BÁO (dùng chung nhiều vai trò)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/notifications/customers', [NotificationCustomerController::class, 'getMyNotifications']);
    Route::get('/notifications/customers/unread-count', [NotificationCustomerController::class, 'getUnreadCount']);
    Route::get('/notifications/customers/{id}', [NotificationCustomerController::class, 'getNotificationDetail'])
        ->whereNumber('id');
    Route::patch('/notifications/customers/{id}/read', [NotificationCustomerController::class, 'markAsRead'])
        ->whereNumber('id');
});

/*
|--------------------------------------------------------------------------
| NHÂN VIÊN HỖ TRỢ
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:support staff'])->group(function () {
    // Chat trực tiếp với khách hàng (chuyển giao từ AI)
    Route::get('/support/chat/pending', [SupportChatController::class, 'pendingList']);
    Route::get('/support/chat/mine', [SupportChatController::class, 'myActiveList']);
    Route::get('/support/chat/{conversation}', [SupportChatController::class, 'show'])->whereNumber('conversation');
    Route::post('/support/chat/{conversation}/accept', [SupportChatController::class, 'accept'])->whereNumber('conversation');
    Route::post('/support/chat/{conversation}/reply', [SupportChatController::class, 'reply'])->whereNumber('conversation');
    Route::post('/support/chat/{conversation}/close', [SupportChatController::class, 'close'])->whereNumber('conversation');

    Route::get('/support/profile', [SupportProfileController::class, 'show']);
    Route::put('/support/profile', [SupportProfileController::class, 'update']);
    Route::put('/support/change-password', [SupportProfileController::class, 'changePassword']);

    // Yêu cầu hỗ trợ (ticket)
    Route::get('/support/requests/badge-count', [SupportRequestController::class, 'badgeCount']);
    Route::get('/support/requests', [SupportRequestController::class, 'index']);
    Route::get('/support/requests/{supportRequest}', [SupportRequestController::class, 'show'])->whereNumber('supportRequest');
    Route::patch('/support/requests/{supportRequest}/status', [SupportRequestController::class, 'updateStatus'])->whereNumber('supportRequest');

    // Thông báo nhân viên hỗ trợ
    Route::get('/notifications/support', [SupportNotificationController::class, 'getMyNotifications']);
    Route::get('/notifications/support/unread-count', [SupportNotificationController::class, 'getUnreadCount']);
    Route::get('/notifications/support/{id}', [SupportNotificationController::class, 'getNotificationDetail'])->whereNumber('id');
    Route::patch('/notifications/support/{id}/read', [SupportNotificationController::class, 'markAsRead'])->whereNumber('id');
    Route::post('/notifications/support/send', [SupportNotificationController::class, 'sendNotification']);
});

/*
|--------------------------------------------------------------------------
| ADMIN
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::get('guides/destination-options', [DestinationController::class, 'options']);
    Route::get('/settings/public', [PublicSettingController::class, 'show']);
    Route::get('/widgets', [PublicWidgetController::class, 'index']);
    Route::get('/roles', [CustomerManagerController::class, 'index_role']);

    Route::apiResource('service-categories', ServiceCategoryController::class)
        ->parameters(['service-categories' => 'id'])
        ->whereNumber('id');

    // Báo cáo & thống kê
    Route::get('/reports/overview', [ReportController::class, 'getOverviewStatistics']);
    Route::get('/reports/charts', [ReportController::class, 'getChartStatistics']);

    // Quản lý đánh giá tour
    Route::get('/tour-reviews', [AdminTourReviewController::class, 'index']);
    Route::get('/tour-reviews/{tourReview}', [AdminTourReviewController::class, 'show'])->whereNumber('tourReview');
    Route::patch('/tour-reviews/{tourReview}/status', [AdminTourReviewController::class, 'updateStatus'])->whereNumber('tourReview');

    // Sao lưu database
    Route::get('/backups', [DatabaseBackupController::class, 'index']);
    Route::post('/backups', [DatabaseBackupController::class, 'store']);
    Route::get('/backups/{filename}/download', [DatabaseBackupController::class, 'download']);
    Route::delete('/backups/{filename}', [DatabaseBackupController::class, 'destroy']);

    // Quản lý người dùng
    Route::get('/customers/statistics', [CustomerManagerController::class, 'statistics']);
    Route::get('/customers/count', [CustomerManagerController::class, 'count']);
    Route::get('/customers', [CustomerManagerController::class, 'index']);
    Route::get('/customers/search', [CustomerManagerController::class, 'search']);
    Route::post('/customers', [CustomerManagerController::class, 'store']);
    Route::get('/customers/{id}', [CustomerManagerController::class, 'show']);
    Route::put('/customers/{id}', [CustomerManagerController::class, 'update']);
    Route::patch('/customers/{id}/lock', [CustomerManagerController::class, 'lock']);
    Route::patch('/customers/{id}/unlock', [CustomerManagerController::class, 'unlock']);

    // Quản lý hướng dẫn viên
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

    // Dropdown dùng chung (ngôn ngữ, chứng chỉ, chuyên môn)
    Route::get('languages', [LanguageController::class, 'index']);
    Route::get('certificates', [CertificateController::class, 'index']);
    Route::get('guide-specializations', function () {
        return response()->json([
            'message' => 'Danh sách chuyên môn',
            'data' => GuideSpecialization::all(),
        ]);
    });

    // Quản lý chứng chỉ
    Route::post('certificates', [CertificateController::class, 'store']);
    Route::get('certificates/{id}', [CertificateController::class, 'show']);
    Route::put('certificates/{id}', [CertificateController::class, 'update']);
    Route::delete('certificates/{id}', [CertificateController::class, 'destroy']);

    // Quản lý ngôn ngữ
    Route::post('languages', [LanguageController::class, 'store']);
    Route::get('languages/{id}', [LanguageController::class, 'show']);
    Route::put('languages/{id}', [LanguageController::class, 'update']);
    Route::delete('languages/{id}', [LanguageController::class, 'destroy']);
    Route::get('languages/{languageId}/levels', [LanguageController::class, 'levels']);
    Route::post('languages/{languageId}/levels', [LanguageController::class, 'storeLevel']);
    Route::put('languages/{languageId}/levels/{levelId}', [LanguageController::class, 'updateLevel']);
    Route::delete('languages/{languageId}/levels/{levelId}', [LanguageController::class, 'destroyLevel']);

    // Quản lý nhân viên hỗ trợ
    Route::get('/support-staff', [SupportStaffController::class, 'index']);
    Route::get('/support-staff/statistics', [SupportStaffController::class, 'statistics']);
    Route::get('/support-staff/available-users', [SupportStaffController::class, 'availableUsers']);
    Route::get('/support-staff/trashed', [SupportStaffController::class, 'trashed']);
    Route::post('/support-staff', [SupportStaffController::class, 'store']);
    Route::get('/support-staff/{id}', [SupportStaffController::class, 'show']);
    Route::put('/support-staff/{id}', [SupportStaffController::class, 'update']);
    Route::post('/support-staff/{id}/avatar', [SupportStaffController::class, 'uploadAvatar']);
    Route::delete('/support-staff/{id}/avatar', [SupportStaffController::class, 'deleteAvatar']);
    Route::delete('/support-staff/{id}', [SupportStaffController::class, 'destroy']);
    Route::patch('/support-staff/{id}/restore', [SupportStaffController::class, 'restore']);
    Route::delete('/support-staff/{id}/force-delete', [SupportStaffController::class, 'forceDestroy']);

    // Quản lý địa điểm/điểm đến
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

    // Cài đặt hệ thống
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

    // Hồ sơ admin
    Route::get('/profile', [AdminProfileController::class, 'show']);
    Route::put('/profile', [AdminProfileController::class, 'update']);
    Route::put('/profile/password', [AdminProfileController::class, 'changePassword']);

    // Quản lý booking
    Route::prefix('bookings')->group(function () {
        Route::get('/', [BookingController::class, 'index']);
        Route::get('/statistics', [BookingController::class, 'statistics']);
        Route::get('/{id}', [BookingController::class, 'show']);
        Route::post('/', [BookingController::class, 'store']);
        Route::put('/{id}', [BookingController::class, 'update']);
        Route::patch('/{id}/cancel', [BookingController::class, 'softDelete']);
        Route::delete('/{id}', [BookingController::class, 'destroy']);
    });

    // Gửi thông báo
    Route::get('/notifications/users', [NotificationController::class, 'getUsers']);
    Route::post('/notifications/preview-recipients', [NotificationController::class, 'previewRecipients']);
    Route::post('/notifications/draft', [NotificationController::class, 'saveDraft']);
    Route::get('/notifications/drafts', [NotificationController::class, 'listDrafts']);
    Route::get('/notifications/draft/{id}', [NotificationController::class, 'showDraft']);
    Route::put('/notifications/draft/{id}', [NotificationController::class, 'updateDraft']);
    Route::delete('/notifications/draft/{id}', [NotificationController::class, 'destroy']);
    Route::get('/notifications/drafts/trashed', [NotificationController::class, 'listTrashedDrafts']);
    Route::post('/notifications/draft/restore/{id}', [NotificationController::class, 'restoreDraft']);
    Route::delete('/notifications/draft/force-delete/{id}', [NotificationController::class, 'forceDeleteDraft']);
    Route::post('/notifications/send/{id}', [NotificationController::class, 'sendNotification']);
    Route::get('/notifications/get-all-send', [NotificationController::class, 'getAllSentNotifications']);
    Route::delete('/notifications/revoke/{draft_id}', [NotificationController::class, 'revoke']);

    // Chuông thông báo admin
    Route::get('notification-bell/unread-count', [AdminNotificationBellController::class, 'unreadCount']);
    Route::get('notification-bell', [AdminNotificationBellController::class, 'index']);
    Route::patch('notification-bell/read-all', [AdminNotificationBellController::class, 'markAllAsRead']);
    Route::patch('notification-bell/{id}/read', [AdminNotificationBellController::class, 'markAsRead']);

    // Quản lý lịch trình / phân công HDV
    Route::get('tour-departures/{tourDeparture}/booked-customers', [AdminTourDepartureBookingController::class, 'index']);
    Route::prefix('tour-departures')->group(function () {
        Route::get('guide-planning', [TourDepartureGuideAssignmentController::class, 'planning']);
        Route::get('{departure}/guide-candidates', [TourDepartureGuideAssignmentController::class, 'candidates']);
        Route::post('{departure}/auto-assign-guide', [TourDepartureGuideAssignmentController::class, 'autoAssign']);
        Route::post('{departure}/assign-guide', [TourDepartureGuideAssignmentController::class, 'assign']);
        Route::patch('{departure}/guide-assignments/{assignment}/cancel', [TourDepartureGuideAssignmentController::class, 'cancel']);
        Route::get('{departure}/direct-guide-candidates', [TourDepartureGuideAssignmentController::class, 'directCandidates']);
        Route::post('{departure}/direct-assign-guide', [TourDepartureGuideAssignmentController::class, 'directAssign']);
    });

    // Yêu cầu đổi HDV
    Route::get('guide-replacement-requests', [AdminGuideReplacementRequestController::class, 'index']);
    Route::post('guide-replacement-requests/{id}/approve', [AdminGuideReplacementRequestController::class, 'approve']);
    Route::post('guide-replacement-requests/{id}/reject', [AdminGuideReplacementRequestController::class, 'reject']);

    // Đơn xin nghỉ HDV
    Route::get('guide-leave-requests', [AdminGuideLeaveRequestController::class, 'index']);
    Route::get('guide-leave-requests/{leaveRequest}', [AdminGuideLeaveRequestController::class, 'show']);
    Route::post('guide-leave-requests/{leaveRequest}/approve', [AdminGuideLeaveRequestController::class, 'approve']);
    Route::post('guide-leave-requests/{leaveRequest}/reject', [AdminGuideLeaveRequestController::class, 'reject']);
    Route::patch('guide-leave-requests/{leaveRequest}/decision', [AdminGuideLeaveRequestController::class, 'updateDecision']);
});

/*
|--------------------------------------------------------------------------
| HƯỚNG DẪN VIÊN
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:tour guide'])->group(function () {
    Route::get('/guide/profile', [GuideProfileController::class, 'show']);
    Route::get('/guide/dashboard', [GuideDashboardController::class, 'show']);
    Route::get('/guide/reviews', [GuideGuideReviewController::class, 'reviews']);
    Route::get('/guide/tour-history', [GuideGuideReviewController::class, 'tourHistory']);
    Route::put('/guide/profile', [GuideProfileController::class, 'update']);
    Route::put('/guide/change-password', [GuideProfileController::class, 'changePassword']);

    // Tour được phân công (⚠️ route cụ thể PHẢI đứng trước {departureId})
    Route::get('/guide/tours/upcoming', [GuideTourController::class, 'upcoming']);
    Route::get('/guide/tours/ongoing', [GuideTourController::class, 'ongoing']);
    Route::get('/guide/tours/completed', [GuideTourController::class, 'completed']);
    Route::get('/guide/tours', [GuideTourController::class, 'index']);
    Route::get('/guide/tours/{tourDeparture}/overview', [GuideAttendanceController::class, 'overview']);
    Route::get('/guide/tours/{tourDeparture}/customers', [GuideAttendanceController::class, 'customers']);
    Route::get('/guide/tours/{tourDeparture}/customers/{bookingParticipant}', [GuideAttendanceController::class, 'showCustomer']);
    Route::get('/guide/tours/{tourDeparture}/attendance/statistics', [GuideAttendanceController::class, 'statistics']);
    Route::get('/guide/tours/{tourDeparture}/attendance-sessions', [GuideAttendanceController::class, 'sessions']);
    Route::post('/guide/tours/{tourDeparture}/attendance-sessions', [GuideAttendanceController::class, 'storeSession']);
    Route::post('/guide/tours/{tourDeparture}/attendance-sessions/{attendanceSession}/check-in', [GuideAttendanceController::class, 'checkIn']);
    Route::post('/guide/tours/{tourDeparture}/attendance-sessions/{attendanceSession}/check-out', [GuideAttendanceController::class, 'checkOut']);
    Route::patch('/guide/tours/{tourDeparture}/attendance-sessions/{attendanceSession}/notes', [GuideAttendanceController::class, 'updateNote']);
    Route::get('/guide/tours/{tourDeparture}/stages', [GuideAttendanceController::class, 'stages']);
    Route::post('/guide/tours/{tourDeparture}/stages/advance', [GuideAttendanceController::class, 'advanceStage']);
    Route::get('/guide/tours/{departureId}', [GuideTourController::class, 'show']);
    Route::post('/guide/tours/{tourDeparture}/replacement-requests', [GuideTourController::class, 'requestReplacement']);
    Route::get('/guide/tours/{tourDeparture}/replacement-requests/status', [GuideTourController::class, 'replacementRequestStatus']);

    // Đơn xin nghỉ HDV
    Route::get('/guide/leave-requests/summary', [GuideLeaveRequestController::class, 'summary']);
    Route::get('/guide/leave-requests', [GuideLeaveRequestController::class, 'index']);
    Route::post('/guide/leave-requests', [GuideLeaveRequestController::class, 'store']);
    Route::patch('/guide/leave-requests/{leaveRequest}/cancel', [GuideLeaveRequestController::class, 'cancel']);
});
