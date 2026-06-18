import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedAdminRoute from '../components/admin/ProtectedAdminRoute'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import SystemSettingPage from '../pages/admin/SystemSettingPage'
import AuthPage from '../pages/auth/AuthPage'
import CustomerPage from '../pages/customer/CustomerPage'

function AppRoutes() {
  return (
    <Routes>
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
      <Route
        path="/admin/settings"
        element={
          <ProtectedAdminRoute>
            <SystemSettingPage />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardPage />
          </ProtectedAdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
