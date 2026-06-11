import { Navigate, Route, Routes } from 'react-router-dom'
import AuthPage from '../pages/auth/AuthPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  )
}

export default AppRoutes
