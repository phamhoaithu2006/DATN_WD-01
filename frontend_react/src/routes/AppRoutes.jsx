import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedAdminRoute from '../components/admin/ProtectedAdminRoute'
import AdminLayout from '../layouts/AdminLayout'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import GuideManagementPage from '../pages/admin/GuideManagementPage'
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
import CustomerPage from '../pages/customer/CustomerPage'

const protect = (page, allowedRoles = ['admin']) => (
  <ProtectedAdminRoute allowedRoles={allowedRoles}>{page}</ProtectedAdminRoute>
)
const adminPage = (page) => protect(<AdminLayout>{page}</AdminLayout>)

function AppRoutes() {
  return <Routes>
    {/* Quản lý người dùng */}
    <Route path="/" element={<CustomerPage />} />
    <Route path="/tours" element={<CustomerPage />} />
    <Route path="/destinations" element={<CustomerPage />} />
    <Route path="/deals" element={<CustomerPage />} />
    <Route path="/customer/profile" element={<CustomerPage />} />
    <Route path="/customer/profile/edit" element={<CustomerPage />} />
    <Route path="/customer/password" element={<CustomerPage />} />
    <Route path="/customer/favorites" element={<CustomerPage />} />
    <Route path="/customer/search" element={<CustomerPage />} />
    <Route path="/customer/bookings" element={<CustomerPage />} />
    <Route path="/customer/settings" element={<CustomerPage />} />
    {/* Đăng ký, đăng nhập */}
    <Route path="/auth" element={<AuthPage />} />
    {/* Quản lý cài đặt */}
    <Route path="/admin/settings" element={protect(<SettingsHomePage />)} />
    <Route path="/admin/settings/system" element={protect(<SystemSettingsPage />)} />
    <Route path="/admin/settings/security" element={protect(<SecuritySettingsPage />)} />
    <Route path="/admin/settings/notification" element={protect(<NotificationSettingsPage />)} />
    <Route path="/admin/settings/locale" element={protect(<LocaleSettingsPage />)} />
    <Route path="/admin/settings/payment" element={protect(<PaymentSettingsPage />)} />
    <Route path="/admin/settings/backup" element={protect(<BackupSettingsPage />)} />
    <Route path="/admin" element={adminPage(<AdminDashboardPage />)} />
    <Route path="/admin/users" element={adminPage(<UserManagementPage />)} />
    {/* Danh mục tour/loại tour */}
    <Route path="/admin/categories" element={adminPage(<TourTypeListPage />)} />
    <Route path="/admin/categories/create" element={adminPage(<TourTypeCreatePage />)} />
    <Route path="/admin/categories/:id/edit" element={adminPage(<TourTypeEditPage />)} />
    <Route path="/admin/categories/trash" element={adminPage(<TourTypeTrashPage />)} />
    {/* Quản lý tour */}
    <Route path="/admin/tours" element={adminPage(<TourListPage />)} />
    <Route path="/admin/tours/create" element={adminPage(<TourCreatePage />)} />
    <Route path="/admin/tours/:id/edit" element={adminPage(<TourEditPage />)} />
    <Route path="/admin/tours/hidden" element={adminPage(<TourHiddenPage />)} />
    {/* Quản lý điểm đến/địa chỉ tour */}
    <Route path="/admin/destinations" element={adminPage(<DestinationListPage />)} />
    <Route path="/admin/destinations/create" element={adminPage(<DestinationCreatePage />)} />
    <Route path="/admin/destinations/:id/edit" element={adminPage(<DestinationEditPage />)} />
    <Route path="/admin/destinations/trash" element={adminPage(<DestinationTrashPage />)} />
    {/* Quản lý hướng dẫn viên */}
    <Route path="/admin/guides" element={adminPage(<GuideManagementPage />)} />
    <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

export default AppRoutes
