import { Navigate, Route, Routes } from 'react-router-dom'
import AuthPage from '../pages/auth/AuthPage'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import SystemSettingPage from '../pages/admin/SystemSettingPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/admin/settings" element={<SystemSettingPage />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default AppRoutes
