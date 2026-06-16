import { Navigate, Route, Routes } from 'react-router-dom'
import AuthPage from '../pages/auth/AuthPage'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import SystemSettingPage from '../pages/admin/SystemSettingPage'
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
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/admin/settings" element={<SystemSettingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
