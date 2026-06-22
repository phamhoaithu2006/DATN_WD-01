import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedAdminRoute from '../components/admin/ProtectedAdminRoute'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import BackupSettingsPage from '../pages/admin/settings/BackupSettingsPage'
import LocaleSettingsPage from '../pages/admin/settings/LocaleSettingsPage'
import NotificationSettingsPage from '../pages/admin/settings/NotificationSettingsPage'
import PaymentSettingsPage from '../pages/admin/settings/PaymentSettingsPage'
import SecuritySettingsPage from '../pages/admin/settings/SecuritySettingsPage'
import SettingsHomePage from '../pages/admin/settings/SettingsHomePage'
import SystemSettingsPage from '../pages/admin/settings/SystemSettingsPage'
import AuthPage from '../pages/auth/AuthPage'
import CustomerPage from '../pages/customer/CustomerPage'

const protect = (page) => <ProtectedAdminRoute>{page}</ProtectedAdminRoute>

function AppRoutes() {
  return <Routes>
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
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/admin/settings" element={protect(<SettingsHomePage />)} />
    <Route path="/admin/settings/system" element={protect(<SystemSettingsPage />)} />
    <Route path="/admin/settings/security" element={protect(<SecuritySettingsPage />)} />
    <Route path="/admin/settings/notification" element={protect(<NotificationSettingsPage />)} />
    <Route path="/admin/settings/locale" element={protect(<LocaleSettingsPage />)} />
    <Route path="/admin/settings/payment" element={protect(<PaymentSettingsPage />)} />
    <Route path="/admin/settings/backup" element={protect(<BackupSettingsPage />)} />
    <Route path="/admin/*" element={protect(<AdminDashboardPage />)} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

export default AppRoutes
