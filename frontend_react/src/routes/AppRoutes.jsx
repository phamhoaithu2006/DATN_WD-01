import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import { lazy, Suspense } from 'react'

import ProtectedAdminRoute from '../components/admin/ProtectedAdminRoute'

const AdminLayout = lazy(() => import('../layouts/AdminLayout'))
const GuideLayout = lazy(() => import('../layouts/GuideLayout'))
const SupportLayout = lazy(() => import('../layouts/SupportLayout'))
const BookingManagementPage = lazy(() => import('../pages/admin/BookingManagementPage'))
const BookingTrashPage = lazy(() => import('../pages/admin/BookingTrashPage'))
const BookingCancellationRequestsPage = lazy(() => import('../pages/admin/BookingCancellationRequestsPage'))
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'))
const GuideManagementPage = lazy(() => import('../pages/admin/GuideManagementPage'))
const GuideLeaveRequestsPage = lazy(() => import('../pages/admin/GuideLeaveRequestsPage'))
const GuideTrashPage = lazy(() => import('../pages/admin/GuideTrashPage'))
const SupportStaffManagementPage = lazy(() => import('../pages/admin/SupportStaffManagementPage'))
const SupportStaffTrashPage = lazy(() => import('../pages/admin/SupportStaffTrashPage'))
const UserManagementPage = lazy(() => import('../pages/admin/UserManagementPage'))
const TourTypeCreatePage = lazy(() => import('../pages/admin/categories/TourTypeCreatePage'))
const TourTypeEditPage = lazy(() => import('../pages/admin/categories/TourTypeEditPage'))
const TourTypeListPage = lazy(() => import('../pages/admin/categories/TourTypeListPage'))
const TourTypeTrashPage = lazy(() => import('../pages/admin/categories/TourTypeTrashPage'))
const DestinationPlaceManagementPage = lazy(() => import('../pages/admin/destinations/DestinationPlaceManagementPage'))
const DestinationPlaceCreatePage = lazy(() => import('../pages/admin/destinations/DestinationPlaceCreatePage'))
const DestinationPlaceEditPage = lazy(() => import('../pages/admin/destinations/DestinationPlaceEditPage'))
const BackupSettingsPage = lazy(() => import('../pages/admin/settings/BackupSettingsPage'))
const LocaleSettingsPage = lazy(() => import('../pages/admin/settings/LocaleSettingsPage'))
const NotificationSettingsPage = lazy(() => import('../pages/admin/settings/NotificationSettingsPage'))
const PaymentSettingsPage = lazy(() => import('../pages/admin/settings/PaymentSettingsPage'))
const SecuritySettingsPage = lazy(() => import('../pages/admin/settings/SecuritySettingsPage'))
const SettingsHomePage = lazy(() => import('../pages/admin/settings/SettingsHomePage'))
const SystemSettingsPage = lazy(() => import('../pages/admin/settings/SystemSettingsPage'))
const TourCreatePage = lazy(() => import('../pages/admin/tours/TourCreatePage'))
const TourEditPage = lazy(() => import('../pages/admin/tours/TourEditPage'))
const TourHiddenPage = lazy(() => import('../pages/admin/tours/TourHiddenPage'))
const TourTrashPage = lazy(() => import('../pages/admin/tours/TourTrashPage'))
const TourListPage = lazy(() => import('../pages/admin/tours/TourListPage'))
const TourDetailPage = lazy(() => import('../pages/admin/tours/TourDetailPage'))
const ReportStatisticsPage = lazy(() => import('../pages/admin/reportStatistics/ReportStatisticsPage'))
const TourDepartureListPage = lazy(() => import('../pages/admin/tourDepartures/TourDepartureListPage'))
const TourDepartureCreatePage = lazy(() => import('../pages/admin/tourDepartures/TourDepartureCreatePage'))
const TourDepartureEditPage = lazy(() => import('../pages/admin/tourDepartures/TourDepartureEditPage'))
const GuideReplacementRequestsPage = lazy(() => import('../pages/admin/tourDepartures/GuideReplacementRequestsPage'))
const AdminNotificationsPage = lazy(() => import('../pages/admin/Notifications/AdminNotificationsPage'))
const AdminReceivedNotificationsPage = lazy(() => import('../pages/admin/AdminReceivedNotificationsPage'))
const LanguageManagementPage = lazy(() => import('../pages/admin/language/LanguageManagementPage'))
const CertificateManagementPage = lazy(() => import('../pages/admin/certificate/CertificateManagementPage'))
const AuthPage = lazy(() => import('../pages/auth/AuthPage'))
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'))
const CustomerPage = lazy(() => import('../pages/customer/CustomerPage'))
const VnpayPaymentResultPage = lazy(() => import('../pages/customer/VnpayPaymentResultPage'))
const GuideAttendancePage = lazy(() => import('../pages/guide/GuideAttendancePage'))
const GuideDashboardPage = lazy(() => import('../pages/guide/GuideDashboardPage'))
const GuideHistoryPage = lazy(() => import('../pages/guide/GuideHistoryPage'))
const GuideNotificationsPage = lazy(() => import('../pages/guide/GuideNotificationsPage'))
const GuideProfilePage = lazy(() => import('../pages/guide/GuideProfilePage'))
const GuideToursPage = lazy(() => import('../pages/guide/GuideToursPage'))
const GuideReviewsPage = lazy(() => import('../pages/guide/GuideReviews/GuideReviewsPage'))
const SupportDashboardPage = lazy(() => import('../pages/support/SupportDashboardPage'))
const SupportChatbotPage = lazy(() => import('../pages/support/SupportChatbotPage'))
const SupportProfilePage = lazy(() => import('../pages/support/SupportProfilePage'))
const SupportNotificationsPage = lazy(() => import('../pages/support/SupportNotificationsPage'))
const SupportRequestsPage = lazy(() => import('../pages/support/SupportRequestsPage'))
const SupportWorkSchedulePage = lazy(() => import('../pages/support/SupportWorkSchedulePage'))
const ReviewManagement = lazy(() => import('../pages/admin/ReviewManagement'))
const HiddenTourReviews = lazy(() => import('../pages/admin/HiddenReviewManagement'))
const TourReviewDetailManagement = lazy(() => import('../pages/admin/TourReviewDetailManagement'))
const GuideReviewDetailManagement = lazy(() => import('../pages/admin/GuideReviewDetailManagement'))

const protect = (
  page,
  allowedRoles = ['admin'],
) => (
  <ProtectedAdminRoute
    allowedRoles={allowedRoles}
  >
    {page}
  </ProtectedAdminRoute>
)

const adminPage = (page) =>
  protect(
    <AdminLayout>
      {page}
    </AdminLayout>,
  )

const guidePage = (page) =>
  protect(
    <GuideLayout>
      {page}
    </GuideLayout>,
    ['tour guide'],
  )

const supportPage = (page) =>
  protect(
    <SupportLayout>
      {page}
    </SupportLayout>,
    ['support staff'],
  )

function GuideComingSoonPage({
  title,
}) {
  return (
    <div
      className="guide-blank-page"
      aria-label={title}
    />
  )
}

function AppRoutes() {
  return (
    <Suspense fallback={<div className="app-route-loading" role="status" aria-live="polite">
      <div className="app-route-loading__card">
        <span className="app-route-loading__spinner" aria-hidden="true" />
        <div className="app-route-loading__copy">
          <strong>Đang chuẩn bị hành trình</strong>
          <span>Nội dung sẽ sẵn sàng trong giây lát</span>
        </div>
        <div className="app-route-loading__skeletons" aria-hidden="true">
          <i /><i /><i />
        </div>
      </div>
    </div>}>
    <Routes>
      {/* ================= KHÁCH HÀNG ================= */}

      <Route
        path="/"
        element={<CustomerPage />}
      />

      <Route
        path="/tours/*"
        element={<CustomerPage />}
      />

      <Route
        path="/destinations"
        element={<CustomerPage />}
      />

      <Route
        path="/faqs"
        element={<CustomerPage />}
      />

      <Route
        path="/policies/*"
        element={<CustomerPage />}
      />

      <Route
        path="/deals"
        element={<CustomerPage />}
      />

      <Route
        path="/customer/profile"
        element={<CustomerPage />}
      />

      <Route
        path="/customer/profile/edit"
        element={<CustomerPage />}
      />

      <Route
        path="/customer/password"
        element={<CustomerPage />}
      />

      <Route
        path="/customer/favorites"
        element={<CustomerPage />}
      />

      <Route
        path="/customer/search"
        element={<CustomerPage />}
      />

      <Route
        path="/customer/bookings"
        element={<CustomerPage />}
      />

      <Route
        path="/customer/settings"
        element={<CustomerPage />}
      />

      <Route
        path="/payment/vnpay/return"
        element={
          <VnpayPaymentResultPage />
        }
      />

      {/* ================= XÁC THỰC ================= */}

      <Route
        path="/auth"
        element={
          <Navigate
            to="/auth/login"
            replace
          />
        }
      />

      <Route
        path="/auth/login"
        element={<AuthPage />}
      />

      <Route
        path="/auth/register"
        element={<AuthPage />}
      />

      <Route
        path="/auth/forgot-password"
        element={<ForgotPasswordPage />}
      />

      {/* ================= HƯỚNG DẪN VIÊN ================= */}

      <Route
        path="/guide"
        element={guidePage(
          <GuideDashboardPage />,
        )}
      />

      <Route
        path="/guide/tours"
        element={guidePage(
          <GuideToursPage />,
        )}
      />

      <Route
        path="/guide/attendance"
        element={guidePage(
          <GuideAttendancePage />,
        )}
      />

      <Route
        path="/guide/attendance/:tourId"
        element={guidePage(
          <GuideAttendancePage />,
        )}
      />

      <Route
        path="/guide/history"
        element={guidePage(
          <GuideHistoryPage />,
        )}
      />

      <Route
        path="/guide/reviews"
        element={guidePage(
          <GuideReviewsPage />,
        )}
      />

      <Route
        path="/guide/customers"
        element={guidePage(
          <GuideComingSoonPage
            title="Khách hàng"
          />,
        )}
      />

      <Route
        path="/guide/messages"
        element={guidePage(
          <GuideComingSoonPage
            title="Tin nhắn"
          />,
        )}
      />

      <Route
        path="/guide/notifications"
        element={guidePage(
          <GuideNotificationsPage />,
        )}
      />

      <Route
        path="/guide/profile"
        element={guidePage(
          <GuideProfilePage />,
        )}
      />

      {/* ================= NHÂN VIÊN HỖ TRỢ ================= */}

      <Route
        path="/support"
        element={supportPage(
          <SupportDashboardPage />,
        )}
      />

      <Route
        path="/support/profile"
        element={supportPage(
          <SupportProfilePage />,
        )}
      />

      <Route
        path="/support/chatbot"
        element={supportPage(
          <SupportChatbotPage />,
        )}
      />

      <Route
        path="/support/work-schedule"
        element={supportPage(
          <SupportWorkSchedulePage />,
        )}
      />

      <Route
        path="/support/requests"
        element={supportPage(
          <SupportRequestsPage />,
        )}
      />

      <Route
        path="/support/notifications"
        element={supportPage(
          <SupportNotificationsPage />,
        )}
      />

      {/* ================= ADMIN: NGƯỜI DÙNG ================= */}

      <Route
        path="/admin/users"
        element={
          <Navigate
            to="/admin/users/customers"
            replace
          />
        }
      />

      <Route
        path="/admin/users/customers"
        element={adminPage(
          <UserManagementPage
            roleName="customer"
          />,
        )}
      />

      <Route
        path="/admin/users/admins"
        element={adminPage(
          <UserManagementPage
            roleName="admin"
          />,
        )}
      />

      <Route
        path="/admin/users/support-staff"
        element={adminPage(
          <UserManagementPage
            roleName="support staff"
          />,
        )}
      />

      <Route
        path="/admin/users/tour-guides"
        element={adminPage(
          <UserManagementPage
            roleName="tour guide"
          />,
        )}
      />

      {/* ================= ADMIN: CÀI ĐẶT ================= */}

      <Route
        path="/admin/settings"
        element={adminPage(
          <SettingsHomePage />,
        )}
      />

      <Route
        path="/admin/settings/system"
        element={adminPage(
          <SystemSettingsPage />,
        )}
      />

      <Route
        path="/admin/settings/security"
        element={adminPage(
          <SecuritySettingsPage />,
        )}
      />

      <Route
        path="/admin/settings/notification"
        element={adminPage(
          <NotificationSettingsPage />,
        )}
      />

      <Route
        path="/admin/settings/locale"
        element={adminPage(
          <LocaleSettingsPage />,
        )}
      />

      <Route
        path="/admin/settings/payment"
        element={adminPage(
          <PaymentSettingsPage />,
        )}
      />

      <Route
        path="/admin/settings/backup"
        element={adminPage(
          <BackupSettingsPage />,
        )}
      />

      {/* ================= ADMIN: TỔNG QUAN ================= */}
            <Route
        path="/admin/reviews"
        element={adminPage(
          <ReviewManagement />,
        )}
      />
      
      <Route
        path="/admin"
        element={adminPage(
          <AdminDashboardPage />,
        )}
      />
       <Route
  path="/admin/reviews/hidden"
  element={adminPage(
    <HiddenTourReviews />,
  )}
/>
      <Route
        path="/admin/reports"
        element={adminPage(
          <ReportStatisticsPage />,
        )}
      />

      {/* ================= ADMIN: BOOKING ================= */}

      <Route
        path="/admin/bookings"
        element={adminPage(
          <BookingManagementPage />,
        )}
      />
      <Route path="/admin/bookings/trash" element={adminPage(<BookingTrashPage />)} />

      <Route
        path="/admin/booking-cancellation-requests"
        element={adminPage(
          <BookingCancellationRequestsPage />,
        )}
      />

      {/* ================= ADMIN: DANH MỤC TOUR ================= */}

      <Route
        path="/admin/categories"
        element={adminPage(
          <TourTypeListPage />,
        )}
      />

      <Route
        path="/admin/categories/create"
        element={adminPage(
          <TourTypeCreatePage />,
        )}
      />

      <Route
        path="/admin/categories/:id/edit"
        element={adminPage(
          <TourTypeEditPage />,
        )}
      />

      <Route
        path="/admin/categories/trash"
        element={adminPage(
          <TourTypeTrashPage />,
        )}
      />

      {/* ================= ADMIN: TOUR ================= */}

      <Route
        path="/admin/tours"
        element={adminPage(
          <TourListPage />,
        )}
      />

      <Route
        path="/admin/tours/create"
        element={adminPage(
          <TourCreatePage />,
        )}
      />

      <Route
        path="/admin/tours/:id/edit"
        element={adminPage(
          <TourEditPage />,
        )}
      />

      <Route
        path="/admin/tours/hidden"
        element={adminPage(
          <TourHiddenPage />,
        )}
      />

      <Route
        path="/admin/tours/trash"
        element={adminPage(
          <TourTrashPage />,
        )}
      />

      <Route
        path="/admin/tours/:id"
        element={adminPage(
          <TourDetailPage />,
        )}
      />

      {/* ================= ADMIN: LỊCH KHỞI HÀNH ================= */}

      <Route
        path="/admin/tour-departures/guide-assignments"
        element={
          <Navigate
            to="/admin/tour-departures"
            replace
          />
        }
      />

      <Route
        path="/admin/tour-departures"
        element={adminPage(
          <TourDepartureListPage />,
        )}
      />

      <Route
        path="/admin/tour-departures/guide-replacement-requests"
        element={adminPage(
          <GuideReplacementRequestsPage />,
        )}
      />

      <Route
        path="/admin/tour-departures/create"
        element={adminPage(
          <TourDepartureCreatePage />,
        )}
      />

      <Route
        path="/admin/tour-departures/:tourId/edit/:departureId"
        element={adminPage(
          <TourDepartureEditPage />,
        )}
      />

      {/* ================= ADMIN: TỈNH/THÀNH VÀ ĐỊA ĐIỂM CHI TIẾT ================= */}

      <Route
        path="/admin/destination-places"
        element={adminPage(
          <DestinationPlaceManagementPage />,
        )}
      />

      <Route
        path="/admin/destination-places/create"
        element={adminPage(
          <DestinationPlaceCreatePage />,
        )}
      />

      <Route
        path="/admin/destination-places/:id/edit"
        element={adminPage(
          <DestinationPlaceEditPage />,
        )}
      />

      {/* ================= ADMIN: HƯỚNG DẪN VIÊN ================= */}

      <Route
        path="/admin/guides"
        element={adminPage(
          <GuideManagementPage />,
        )}
      />

      <Route
        path="/admin/guide-leave-requests"
        element={adminPage(
          <GuideLeaveRequestsPage />,
        )}
      />

      <Route
        path="/admin/guides/trash"
        element={adminPage(
          <GuideTrashPage />,
        )}
      />

      {/* ================= ADMIN: NHÂN VIÊN HỖ TRỢ ================= */}

      <Route
        path="/admin/support"
        element={adminPage(
          <SupportStaffManagementPage />,
        )}
      />

      <Route
        path="/admin/support/trash"
        element={adminPage(
          <SupportStaffTrashPage />,
        )}
      />

      {/* ================= ADMIN: THÔNG BÁO ================= */}

      <Route
        path="/admin/notifications/received"
        element={adminPage(
          <AdminReceivedNotificationsPage />,
        )}
      />

      <Route
        path="/admin/received-notifications"
        element={
          <Navigate
            to="/admin/notifications/received"
            replace
          />
        }
      />
    <Route
      path="/admin/reviews/tours/:tourId"
      element={adminPage(
        <TourReviewDetailManagement />,
      )}
    />

      <Route
        path="/admin/reviews/guides/:guideId"
        element={adminPage(
          <GuideReviewDetailManagement />,
        )}
      />

      <Route
        path="/admin/notifications"
        element={adminPage(
          <AdminNotificationsPage />,
        )}
      />

      {/* ================= ADMIN: NGÔN NGỮ, CHỨNG CHỈ ================= */}

      <Route
        path="/admin/languages"
        element={adminPage(
          <LanguageManagementPage />,
        )}
      />

      <Route
        path="/admin/certificates"
        element={adminPage(
          <CertificateManagementPage />,
        )}
      />

      {/* ================= FALLBACK ================= */}

      <Route
        path="/admin/*"
        element={
          <Navigate
            to="/admin"
            replace
          />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
    </Suspense>
  )
}

export default AppRoutes
