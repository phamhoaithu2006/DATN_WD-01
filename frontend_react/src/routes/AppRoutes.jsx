import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedAdminRoute from '../components/admin/ProtectedAdminRoute'
import AdminLayout from '../layouts/AdminLayout'
import GuideLayout from '../layouts/GuideLayout'
import BookingManagementPage from '../pages/admin/BookingManagementPage'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import GuideManagementPage from '../pages/admin/GuideManagementPage'
import GuideTrashPage from '../pages/admin/GuideTrashPage'
import SupportStaffManagementPage from '../pages/admin/SupportStaffManagementPage'
import SupportStaffTrashPage from '../pages/admin/SupportStaffTrashPage'
import UserManagementPage from '../pages/admin/UserManagementPage'
import TourTypeCreatePage from '../pages/admin/categories/TourTypeCreatePage'
import TourTypeEditPage from '../pages/admin/categories/TourTypeEditPage'
import TourTypeListPage from '../pages/admin/categories/TourTypeListPage'
import TourTypeTrashPage from '../pages/admin/categories/TourTypeTrashPage'
import DestinationCreatePage from '../pages/admin/destinations/DestinationCreatePage'
import DestinationEditPage from '../pages/admin/destinations/DestinationEditPage'
import DestinationListPage from '../pages/admin/destinations/DestinationListPage'
import DestinationTrashPage from '../pages/admin/destinations/DestinationTrashPage'
import BackupSettingsPage from '../pages/admin/settings/BackupSettingsPage'
import LocaleSettingsPage from '../pages/admin/settings/LocaleSettingsPage'
import NotificationSettingsPage from '../pages/admin/settings/NotificationSettingsPage'
import PaymentSettingsPage from '../pages/admin/settings/PaymentSettingsPage'
import SecuritySettingsPage from '../pages/admin/settings/SecuritySettingsPage'
import SettingsHomePage from '../pages/admin/settings/SettingsHomePage'
import SystemSettingsPage from '../pages/admin/settings/SystemSettingsPage'
import TourCreatePage from '../pages/admin/tours/TourCreatePage'
import TourEditPage from '../pages/admin/tours/TourEditPage'
import TourHiddenPage from '../pages/admin/tours/TourHiddenPage'
import TourListPage from '../pages/admin/tours/TourListPage'
import AuthPage from '../pages/auth/AuthPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'
import CustomerPage from '../pages/customer/CustomerPage'
import GuideAttendancePage from '../pages/guide/GuideAttendancePage'
import GuideDashboardPage from '../pages/guide/GuideDashboardPage'
import GuideNotificationsPage from '../pages/guide/GuideNotificationsPage'
import GuideProfilePage from '../pages/guide/GuideProfilePage'
import GuideToursPage from '../pages/guide/GuideToursPage'
import SupportLayout from '../layouts/SupportLayout'
import SupportDashboardPage from '../pages/support/SupportDashboardPage'
import SupportProfilePage from '../pages/support/SupportProfilePage'
import SupportNotificationsPage from '../pages/support/SupportNotificationsPage'
import SupportRequestsPage from '../pages/support/SupportRequestsPage'
import SupportWorkSchedulePage from '../pages/support/SupportWorkSchedulePage'
import ReportStatisticsPage from '../pages/admin/reportStatistics/ReportStatisticsPage'
import TourDepartureListPage from "../pages/admin/tourDepartures/TourDepartureListPage";
import TourDepartureCreatePage from "../pages/admin/tourDepartures/TourDepartureCreatePage";
import TourDepartureEditPage from "../pages/admin/tourDepartures/TourDepartureEditPage";
import AdminNotificationsPage from '../pages/admin/Notifications/AdminNotificationsPage';
import TourDetailPage from '../pages/admin/tours/TourDetailPage';
import LanguageManagementPage from '../pages/admin/language/LanguageManagementPage';
import CertificateManagementPage from '../pages/admin/certificate/CertificateManagementPage'
import PartnerManagementPage from '../pages/admin/partners/PartnerManagementPage'
import PartnerTrashPage from '../pages/admin/partners/PartnerTrashPage'
import ServiceCategoryManagementPage from '../pages/admin/serviceCategories/ServiceCategoryManagementPage'
import GuideReviewsPage from '../pages/guide/GuideReviews/GuideReviewsPage'



const protect = (page, allowedRoles = ['admin']) => (
  <ProtectedAdminRoute allowedRoles={allowedRoles}>{page}</ProtectedAdminRoute>
)
const adminPage = (page) => protect(<AdminLayout>{page}</AdminLayout>)
const guidePage = (page) => protect(<GuideLayout>{page}</GuideLayout>, ['tour guide'])
const supportPage = (page) =>
  protect(<SupportLayout>{page}</SupportLayout>, ['support staff'])

function GuideComingSoonPage({ title }) {
  return <div className="guide-blank-page" aria-label={title} />
}

function AppRoutes() {
  return <Routes>
    {/* Quản lý người dùng */}
    <Route path="/" element={<CustomerPage />} />
    <Route path="/tours/*" element={<CustomerPage />} />
    <Route path="/destinations" element={<CustomerPage />} />
    <Route path="/deals" element={<CustomerPage />} />
    <Route path="/customer/profile" element={<CustomerPage />} />
    <Route path="/customer/profile/edit" element={<CustomerPage />} />
    <Route path="/customer/password" element={<CustomerPage />} />
    <Route path="/customer/favorites" element={<CustomerPage />} />
    <Route path="/customer/search" element={<CustomerPage />} />
    <Route path="/customer/bookings" element={<CustomerPage />} />
    <Route path="/customer/settings" element={<CustomerPage />} />
    {/* <Route path="/payment/vnpay/return" element={<VnpayPaymentResultPage />} /> */}
    {/* Trang hướng dẫn viên */}
    <Route path="/guide" element={guidePage(<GuideDashboardPage />)} />
    <Route path="/guide/tours" element={guidePage(<GuideToursPage />)} />
    <Route path="/guide/attendance" element={guidePage(<GuideAttendancePage />)} />
    <Route path="/guide/attendance/:tourId" element={guidePage(<GuideAttendancePage />)} />
    <Route path="/guide/history" element={guidePage(<GuideComingSoonPage title="Lịch sử Tour" />)} />
    <Route path="/guide/reviews" element={guidePage(<GuideComingSoonPage title="Đánh giá" />)} />
    <Route path="/guide/customers" element={guidePage(<GuideComingSoonPage title="Khách hàng" />)} />
    <Route path="/guide/messages" element={guidePage(<GuideComingSoonPage title="Tin nhắn" />)} />
    <Route path="/guide/notifications" element={guidePage(<GuideNotificationsPage />)} />
    <Route path="/guide/profile" element={guidePage(<GuideProfilePage />)} />
    <Route path="/support" element={supportPage(<SupportDashboardPage />)} />
    <Route path="/support/profile" element={supportPage(<SupportProfilePage />)} />
    <Route path="/support/work-schedule" element={supportPage(<SupportWorkSchedulePage />)} />
    <Route path="/support/requests" element={supportPage(<SupportRequestsPage />)} />
    <Route path="/support/notifications" element={supportPage(<SupportNotificationsPage />)} />
    <Route path="/admin/users" element={<Navigate to="/admin/users/customers" replace />} />
    <Route path="/admin/users/customers" element={adminPage(<UserManagementPage roleName="customer" />)} />
    <Route path="/admin/users/admins" element={adminPage(<UserManagementPage roleName="admin" />)} />
    <Route path="/admin/users/support-staff" element={adminPage(<UserManagementPage roleName="support staff" />)} />
    <Route path="/admin/users/tour-guides" element={adminPage(<UserManagementPage roleName="tour guide" />)} />
    {/* Đăng ký, đăng nhập */}
    <Route path="/auth" element={<Navigate to="/auth/login" replace />} />
    <Route path="/auth/login" element={<AuthPage />} />
    <Route path="/auth/register" element={<AuthPage />} />
    <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
    {/* Admin settings */}
    <Route path="/admin/settings" element={protect(<SettingsHomePage />)} />
    <Route path="/admin/settings/system" element={protect(<SystemSettingsPage />)} />
    <Route path="/admin/settings/security" element={protect(<SecuritySettingsPage />)} />
    <Route path="/admin/settings/notification" element={protect(<NotificationSettingsPage />)} />
    <Route path="/admin/settings/locale" element={protect(<LocaleSettingsPage />)} />
    <Route path="/admin/settings/payment" element={protect(<PaymentSettingsPage />)} />
    <Route path="/admin/settings/backup" element={protect(<BackupSettingsPage />)} />
    <Route path="/admin" element={adminPage(<AdminDashboardPage />)} />
    <Route path="/admin/reports" element={adminPage(<ReportStatisticsPage />)} />
    {/* quản lý Booking */}
    <Route path="/admin/bookings" element={adminPage(<BookingManagementPage />)} />
    {/* Danh sách tour/loại tour */}
    <Route path="/admin/categories" element={adminPage(<TourTypeListPage />)} />
    <Route path="/admin/categories/create" element={adminPage(<TourTypeCreatePage />)} />
    <Route path="/admin/categories/:id/edit" element={adminPage(<TourTypeEditPage />)} />
    <Route path="/admin/categories/trash" element={adminPage(<TourTypeTrashPage />)} />
    <Route path="/admin/service-categories" element={adminPage(<ServiceCategoryManagementPage />)} />
    <Route path="/admin/partners" element={adminPage(<PartnerManagementPage />)} />
    <Route path="/admin/partners/trash" element={adminPage(<PartnerTrashPage />)} />
    {/* Quản lý tour */}
    <Route path="/admin/tours" element={adminPage(<TourListPage />)} />
    <Route path="/admin/tours/create" element={adminPage(<TourCreatePage />)} />
    <Route path="/admin/tours/:id/edit" element={adminPage(<TourEditPage />)} />
    <Route path="/admin/tours/hidden" element={adminPage(<TourHiddenPage />)} />
    <Route path="/admin/tours/:id" element={adminPage(<TourDetailPage />)} />
    {/* Tour departures */}
    <Route path="/admin/tour-departures/guide-assignments" element={<Navigate to="/admin/tour-departures" replace />}/>
    <Route path="/admin/tour-departures" element={adminPage(<TourDepartureListPage />)}/>
    <Route path="/admin/tour-departures/create" element={adminPage(<TourDepartureCreatePage />)}/>
    <Route path="/admin/tour-departures/:tourId/edit/:departureId"  element={adminPage(<TourDepartureEditPage />)}/>
    {/* Quản lý điểm đến/địa chỉ tour */}
    <Route path="/admin/destinations" element={adminPage(<DestinationListPage />)} />
    <Route path="/admin/destinations/create" element={adminPage(<DestinationCreatePage />)} />
    <Route path="/admin/destinations/:id/edit" element={adminPage(<DestinationEditPage />)} />
    <Route path="/admin/destinations/trash" element={adminPage(<DestinationTrashPage />)} />
    {/* Quản lý hướng dẫn viên */}
    <Route path="/admin/guides" element={adminPage(<GuideManagementPage />)} />
    <Route path="/admin/guides/trash" element={adminPage(<GuideTrashPage />)} />
    <Route path="/guide/reviews" element={guidePage(<GuideReviewsPage />)} />
    {/* Quản lý nhân viên hỗ trợ */}
    <Route path="/admin/support" element={adminPage(<SupportStaffManagementPage />)} />
    <Route path="/admin/support/trash" element={adminPage(<SupportStaffTrashPage />)} />
    {/* Quản lý thông báo */}
    <Route path="/admin/notifications" element={adminPage(<AdminNotificationsPage />)} />
    <Route path="/admin/languages" element={adminPage(<LanguageManagementPage />)} />
    <Route path="/admin/certificates" element={adminPage(<CertificateManagementPage />)} />
    <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
  
}

export default AppRoutes